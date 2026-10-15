/**
 * Motor de reglas de medicación — docs/documento_fuente.md §8.0 (design.md).
 * - Resuelve la técnica anestésica efectiva ("no se sabe" → neuroaxial si el
 *   procedimiento tiene neuroaxial probable, R3.2.3).
 * - Convierte plazos (días/horas) en fecha/hora límite y texto de paciente.
 * - Resuelve la regla "más restrictiva" en combinaciones.
 *
 * Los números salen de datos/reglas_farmacos.json; la lógica condicional vive aquí.
 */
import type {
  ContextoReglas,
  DatosIntervencion,
  ResultadoFarmaco,
  AccionFarmaco,
  Via,
} from '../tipos.ts';
import { diasAHoras } from '../fechas/plazos.ts';
import { esNeuroaxialEfectiva, hayBloqueoProfundo } from '../entrevista/tecnicasAnestesia.ts';
import {
  ultimaTomaPorHoras,
  ultimaTomaPorDias,
  textoUltimaToma,
  textoUltimaTomaDias,
  fechaLarga,
  horaReloj,
} from '../fechas/ultimaToma.ts';

/** Resuelve el contexto de reglas a partir de la intervención y el aclaramiento. */
export function construirContexto(
  intervencion: DatosIntervencion,
  pesoKg: number,
  aclaramiento: number | null,
  indicacion?: string,
  fechaReferencia?: Date,
): ContextoReglas {
  // Técnica efectiva: puede haber varias marcadas. Es neuroaxial si alguna lo es (o
  // "no se sabe" + neuroaxial probable, R3.2.3); bloqueo profundo si alguna lo es.
  const neuroaxial = esNeuroaxialEfectiva(intervencion.tecnicas, intervencion.neuroaxialProbable);
  const bloqueoProfundo = hayBloqueoProfundo(intervencion.tecnicas);

  // El contexto con fechas solo se construye cuando hay fecha de intervención.
  // Sin fecha (§8.16), las instrucciones se generan como margen (véase la hoja
  // del paciente del QR: recalcularHoja), no por este camino.
  if (intervencion.fechaHora === null) {
    throw new Error('construirContexto requiere fecha de intervención; sin fecha se usa el modo margen (§8.16).');
  }

  // Oftalmología de riesgo moderado-alto se trata como riesgo hemorrágico alto para
  // los anticoagulantes (decisión del servicio, §8.1-8.3).
  const riesgoHemorragico =
    intervencion.grupoOftalmologico === 'riesgo_moderado_alto' ? 'alto' : intervencion.riesgoHemorragico;

  const ctx: ContextoReglas = {
    fechaHoraIntervencion: intervencion.fechaHora,
    riesgoHemorragico,
    riesgoCardiovascular: intervencion.riesgoCardiovascular,
    grupoOftalmologico: intervencion.grupoOftalmologico,
    neuroaxial,
    bloqueoProfundo,
    riesgoTromboticoAlto: intervencion.riesgoTromboticoAlto,
    espacioCerrado: intervencion.espacioCerrado,
    retina: intervencion.retina,
    pesoKg,
    aclaramiento,
  };
  if (indicacion !== undefined) ctx.indicacion = indicacion;
  if (fechaReferencia !== undefined) ctx.fechaReferencia = fechaReferencia;
  return ctx;
}

/** ¿La técnica efectiva exige plazos de neuroaxial o bloqueo profundo? */
export function neuroaxialOProfundo(ctx: ContextoReglas): boolean {
  return ctx.neuroaxial || ctx.bloqueoProfundo;
}

export interface PlazoCalculado {
  horas: number;
  fechaHoraUltimaToma: Date;
  textoPaciente: string;
}

/** Señal de que falta la hora de la toma del fármaco (§8.0 v4: nunca se asume). */
export const FALTA_HORA_TOMA = 'hora de la toma';

/** Resultado de un cálculo de plazo: o bien la fecha, o bien que falta la hora. */
export type PlazoResultado = PlazoCalculado | { faltaHora: true };

export function faltaHora(p: PlazoResultado): p is { faltaHora: true } {
  return 'faltaHora' in p;
}

/** ResultadoFarmaco cuando falta la hora de la toma para calcular el plazo. */
export function resultadoFaltaHora(base: {
  idFarmaco: string;
  nombreComercial: string;
  principiosActivos: string[];
  fuente: string;
}): ResultadoFarmaco {
  return {
    ...base,
    accion: 'consultar',
    textoPaciente:
      'Sobre este medicamento, el anestesiólogo le confirmará qué hacer. No lo cambie por su cuenta.',
    reglaAplicada: 'Falta la hora de la toma habitual para calcular el plazo',
    requiereConfirmacion: true,
    datoQueFalta: FALTA_HORA_TOMA,
  };
}

/**
 * Plazo en HORAS (§8.0 v4). Requiere la pauta horaria del paciente; si no hay
 * horas registradas, devuelve { faltaHora: true } (nunca asume una hora).
 * @param permitirAdelanto true solo para anticoagulantes (ACOD/heparinas/fondaparinux).
 */
export function plazoDesdeHoras(
  ctx: ContextoReglas,
  horas: number,
  opts: { permitirAdelanto?: boolean } = {},
): PlazoResultado {
  const pauta = ctx.pautaFarmaco;
  if (!pauta || pauta.horas.length === 0) return { faltaHora: true };
  const r = ultimaTomaPorHoras(ctx.fechaHoraIntervencion, horas, pauta, opts.permitirAdelanto === true);
  return { horas, fechaHoraUltimaToma: r.ultimaToma, textoPaciente: textoUltimaToma(r) };
}

/** Plazo en DÍAS (§8.0 v4): no tomar los N días previos ni el día de la intervención. */
export function plazoDesdeDias(ctx: ContextoReglas, dias: number): PlazoResultado {
  const pauta = ctx.pautaFarmaco;
  if (!pauta || pauta.horas.length === 0) return { faltaHora: true };
  const ultima = ultimaTomaPorDias(ctx.fechaHoraIntervencion, dias, pauta);
  return { horas: diasAHoras(dias), fechaHoraUltimaToma: ultima, textoPaciente: textoUltimaTomaDias(ultima) };
}

/** Texto estándar de "mantener" para fármacos ORALES (§8.0). */
export const TEXTO_MANTENER =
  'Siga tomándolo como siempre, también el día de la intervención, con un sorbo de agua.';

/** Vía de administración concreta (re-exporta el tipo de dominio). */
export type ViaAdministracion = Via;

/** Texto de "mantener" por vía de administración (§8.0). */
const MANTENER_POR_VIA: Record<Via, string> = {
  oral: TEXTO_MANTENER,
  sublingual: 'Siga poniéndose el comprimido debajo de la lengua como siempre, también el día de la intervención.',
  subcutanea: 'Siga con sus inyecciones como siempre.',
  intramuscular: 'Siga con sus inyecciones como siempre.',
  intravenosa: 'Este medicamento se administra en el hospital; usted no tiene que hacer nada.',
  transdermica: 'Siga con su parche como siempre, también el día de la intervención.',
  inhalada: 'Siga usándolo como siempre, también el día de la intervención, y tráigalo consigo.',
  colirio: 'Siga aplicándose las gotas como siempre, también el día de la intervención.',
  intravitrea: 'Este tratamiento se pone en el hospital (inyección en el ojo); usted no tiene que hacer nada.',
  vaginal: 'Siga usándolo por vía vaginal como siempre.',
  intrauterina: 'No tiene que hacer nada con su dispositivo (DIU); siga como siempre.',
  implante: 'No tiene que hacer nada con su implante; siga como siempre.',
};

/** Devuelve el texto de "mantener" adecuado a la vía. */
export function textoMantener(via: Via = 'oral'): string {
  return MANTENER_POR_VIA[via] ?? TEXTO_MANTENER;
}

/**
 * Combinación fija (una sola pastilla, §8.0 / Decisión 5): una única instrucción
 * por medicamento comercial con el plazo más restrictivo de sus componentes.
 * Si la combinación obliga a retirar la metformina antes de su plazo propio
 * (es decir, el ganador NO es la metformina pero la combinación la contiene),
 * añade la nota de vigilar glucemia a las notas del anestesiólogo.
 *
 * @param nombreComercial nombre de la combinación (p. ej. "Synjardy").
 * @param componentes resultados de cada principio activo evaluado por su regla.
 * @param contieneMetformina true si uno de los componentes es metformina.
 */
export function combinacionFija(
  idFarmaco: string,
  nombreComercial: string,
  componentes: ResultadoFarmaco[],
  contieneMetformina: boolean,
): ResultadoFarmaco {
  const ganador = masRestrictiva(componentes);
  const principios = componentes.flatMap((c) => c.principiosActivos);

  const combinado: ResultadoFarmaco = {
    ...ganador,
    idFarmaco,
    nombreComercial,
    principiosActivos: principios,
    // Texto del paciente referido al nombre comercial de la combinación.
    textoPaciente:
      ganador.accion === 'mantener'
        ? TEXTO_MANTENER
        : ganador.fechaHoraUltimaToma
          ? `Deje de tomar ${nombreComercial}: la última toma permitida es el ${fechaLarga(ganador.fechaHoraUltimaToma)} a las ${horaReloj(ganador.fechaHoraUltimaToma)}.`
          : ganador.textoPaciente,
    reglaAplicada: `Combinación fija ${nombreComercial}: se aplica el plazo más restrictivo (${ganador.reglaAplicada})`,
  };

  // Nota de glucemia si la metformina se retira antes de su plazo propio
  // (el componente ganador no es la metformina).
  const ganadorEsMetformina = ganador.principiosActivos.includes('metformina');
  if (contieneMetformina && !ganadorEsMetformina && ganador.accion !== 'mantener') {
    const nota = 'Vigilar glucemia en los días sin tratamiento (combinación fija que retira la metformina antes de su plazo).';
    combinado.textoAnestesiologo = combinado.textoAnestesiologo
      ? `${combinado.textoAnestesiologo} ${nota}`
      : nota;
  }

  return combinado;
}

/**
 * Resuelve la acción más restrictiva entre varios resultados de los componentes
 * de una combinación. Orden de restricción: consultar > suspender/ajustar (mayor
 * plazo) > mantener. Devuelve el resultado ganador.
 */
export function masRestrictiva(resultados: ResultadoFarmaco[]): ResultadoFarmaco {
  if (resultados.length === 0) throw new Error('masRestrictiva: sin resultados');
  const rango: Record<AccionFarmaco, number> = {
    consultar: 3,
    suspender: 2,
    ajustar: 2,
    mantener: 0,
  };
  return resultados.reduce((mejor, actual) => {
    // Requiere confirmación gana siempre.
    if (actual.requiereConfirmacion && !mejor.requiereConfirmacion) return actual;
    if (mejor.requiereConfirmacion && !actual.requiereConfirmacion) return mejor;
    // Mayor rango de acción.
    if (rango[actual.accion] !== rango[mejor.accion]) {
      return rango[actual.accion] > rango[mejor.accion] ? actual : mejor;
    }
    // A igual acción, el plazo más largo (fecha límite más temprana).
    const ta = actual.fechaHoraUltimaToma?.getTime() ?? Infinity;
    const tm = mejor.fechaHoraUltimaToma?.getTime() ?? Infinity;
    return ta < tm ? actual : mejor;
  });
}
