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
  PuntoValidacionFarmaco,
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
  aclaramientoAproximadoFiltrado = false,
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
  if (aclaramientoAproximadoFiltrado) ctx.aclaramientoAproximadoFiltrado = true;
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
  /**
   * Punto 8 (11.1): true si no había hora de toma registrada y se ha asumido la
   * toma más tardía del día (23:59). La regla añade un punto de validación amarillo
   * para confirmar la hora real.
   */
  horaAsumida: boolean;
}

/** Señal de que falta la hora de la toma del fármaco. */
export const FALTA_HORA_TOMA = 'hora de la toma';

/**
 * Resultado de un cálculo de plazo. Punto 8 (11.1): ya nunca «falta la hora»; si no
 * hay pauta horaria se asume la toma más tardía (23:59) y se marca `horaAsumida`.
 */
export type PlazoResultado = PlazoCalculado;

/** Compatibilidad: tras el punto 8 nunca falta la hora (siempre se asume 23:59). */
export function faltaHora(_p: PlazoResultado): _p is never {
  return false;
}

/** Punto de validación amarillo por hora de toma asumida (punto 8, 11.1). */
export const PUNTO_HORA_ASUMIDA: PuntoValidacionFarmaco = {
  tipo: 'validar',
  motivo: 'Falta la hora de la toma: el plazo se ha calculado con la toma más tardía del día (23:59); confirmar la hora real.',
};

/**
 * Hora de toma asumida cuando el paciente no la ha registrado (punto 8, 11.1): la
 * toma más tardía posible del día, de modo que la última dosis permitida nunca
 * quede dentro del plazo.
 */
const PAUTA_HORA_TARDIA = { horas: ['23:59'] };

/**
 * ResultadoFarmaco cuando falta la hora: tras el punto 8 ya no se usa (el plazo se
 * calcula con la hora asumida). Se conserva por compatibilidad de llamadas antiguas.
 */
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
 * Plazo en HORAS. Punto 8 (11.1): si no hay horas registradas, se asume la toma más
 * tardía del día (23:59) y se marca `horaAsumida` (la regla deja un punto amarillo).
 * @param permitirAdelanto true solo para anticoagulantes (ACOD/heparinas/fondaparinux).
 */
export function plazoDesdeHoras(
  ctx: ContextoReglas,
  horas: number,
  opts: { permitirAdelanto?: boolean } = {},
): PlazoResultado {
  const pautaReal = ctx.pautaFarmaco;
  const horaAsumida = !pautaReal || pautaReal.horas.length === 0;
  const pauta = horaAsumida ? PAUTA_HORA_TARDIA : pautaReal!;
  const r = ultimaTomaPorHoras(ctx.fechaHoraIntervencion, horas, pauta, opts.permitirAdelanto === true);
  return { horas, fechaHoraUltimaToma: r.ultimaToma, textoPaciente: textoUltimaToma(r), horaAsumida };
}

/** Plazo en DÍAS: no tomar los N días previos ni el día de la intervención. */
export function plazoDesdeDias(ctx: ContextoReglas, dias: number): PlazoResultado {
  const pautaReal = ctx.pautaFarmaco;
  const horaAsumida = !pautaReal || pautaReal.horas.length === 0;
  const pauta = horaAsumida ? PAUTA_HORA_TARDIA : pautaReal!;
  const ultima = ultimaTomaPorDias(ctx.fechaHoraIntervencion, dias, pauta);
  return { horas: diasAHoras(dias), fechaHoraUltimaToma: ultima, textoPaciente: textoUltimaTomaDias(ultima), horaAsumida };
}

/**
 * Si el plazo se calculó con la hora asumida (11.1), añade el punto de validación
 * amarillo al resultado (sin pisar un punto rojo ya puesto por la regla).
 */
export function aplicarHoraAsumida(r: ResultadoFarmaco, plazo: PlazoCalculado): ResultadoFarmaco {
  if (!plazo.horaAsumida) return r;
  const punto = puntoMasRestrictivo([r.puntoValidacion, PUNTO_HORA_ASUMIDA]);
  return punto ? { ...r, puntoValidacion: punto } : r;
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
  const ganador = resultados.reduce((mejor, actual) => {
    // Requiere confirmación gana siempre (apenas quedan reglas que lo usen tras el
    // punto 8; solo el override del catálogo o el fármaco no catalogado).
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
  // El punto de validación más restrictivo de todos los componentes (rojo > amarillo).
  const punto = puntoMasRestrictivo(resultados.map((r) => r.puntoValidacion));
  return punto ? { ...ganador, puntoValidacion: punto } : ganador;
}

/** El punto de validación más restrictivo (🔴 'posponer' gana a 🟡 'validar'). */
export function puntoMasRestrictivo(
  puntos: Array<PuntoValidacionFarmaco | undefined>,
): PuntoValidacionFarmaco | undefined {
  let mejor: PuntoValidacionFarmaco | undefined;
  for (const p of puntos) {
    if (!p) continue;
    if (!mejor || (p.tipo === 'posponer' && mejor.tipo !== 'posponer')) mejor = p;
  }
  return mejor;
}

/**
 * Construye un ResultadoFarmaco que PROPONE una pauta y, a la vez, deja un punto de
 * validación para el anestesiólogo (punto 8). Nunca marca `requiereConfirmacion`.
 */
export function conPuntoValidacion(
  r: ResultadoFarmaco,
  punto: PuntoValidacionFarmaco,
): ResultadoFarmaco {
  return { ...r, requiereConfirmacion: false, puntoValidacion: punto };
}
