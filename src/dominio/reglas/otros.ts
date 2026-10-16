/**
 * Reglas genéricas y utilidades transversales — docs/documento_fuente.md §8.0.
 * - Fármaco no catalogado: mantener y consultar con el anestesiólogo.
 * - Mantener genérico.
 * - Detección de plazo no alcanzable (R3.2.5): si la fecha límite calculada ya
 *   pasó o cae hoy, el fármaco pasa a requerir confirmación y se alerta.
 */
import type { ContextoReglas, ResultadoFarmaco, Alerta, Via } from '../tipos.ts';
import { esViaOral } from '../tipos.ts';
import { TEXTO_MANTENER } from './motor.ts';
// (textoMantener y ViaAdministracion se importan más abajo junto a plazoDesdeDias)
import { plazoNoAlcanzable } from '../fechas/plazos.ts';
import { plazoDesdeDias, aplicarHoraAsumida, textoMantener, type ViaAdministracion } from './motor.ts';
import { avisoSugammadex } from './sugammadex.ts';

const FUENTE = 'docs/documento_fuente.md §8.0';

export function reglaNoCatalogado(nombre: string): ResultadoFarmaco {
  // Punto 8 (9.1): se propone MANTENER por defecto (el programa no le aplica reglas) y
  // queda un punto amarillo para que el anestesiólogo revise el manejo.
  return {
    idFarmaco: `no_catalogado:${nombre}`,
    nombreComercial: nombre,
    principiosActivos: [],
    accion: 'mantener',
    textoPaciente: 'Siga tomándolo como siempre, salvo que el anestesiólogo le indique otra cosa.',
    reglaAplicada: 'Fármaco no catalogado: mantener por defecto (el programa no le aplica reglas)',
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Fármaco no incluido en el catálogo: el programa no le aplica reglas; revisar el manejo.',
    puntoValidacion: { tipo: 'validar', motivo: 'Fármaco no catalogado: se propone mantener; revisar el manejo.' },
  };
}

export function reglaMantener(
  idFarmaco: string,
  nombreComercial: string,
  principiosActivos: string[],
  motivo = 'mantener',
  via: ViaAdministracion = 'oral',
): ResultadoFarmaco {
  return {
    idFarmaco,
    nombreComercial,
    principiosActivos,
    accion: 'mantener',
    textoPaciente: textoMantener(via),
    reglaAplicada: motivo,
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}

// ————————————— Fitoterapia y suplementos (§8.11) —————————————

export interface EntradaFitoterapia {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

/** Fitoterapia/suplementos con efecto sobre coagulación/metabolismo: suspender 14 días (mínimo 7). */
export function reglaFitoterapia(e: EntradaFitoterapia, ctx: ContextoReglas): ResultadoFarmaco {
  const plazo = plazoDesdeDias(ctx, 14); // no tomar 14 días previos ni el día de la IQ
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: `Deje de tomarlo 14 días antes si es posible (mínimo 7). ${plazo.textoPaciente}`,
    reglaAplicada: 'Fitoterapia/suplemento con efecto sobre coagulación: suspender 14 días (mínimo 7)',
    fuente: 'docs/documento_fuente.md §8.11',
    requiereConfirmacion: false,
  }, plazo);
}

// ————————————— Anticonceptivos / THS (§8.11, Decisión 4) —————————————

export interface EntradaAnticonceptivoThs {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Vía de administración (para el texto de "mantener" y la advertencia del sugammadex, §8.15). */
  via?: Via;
}

/** Nota del anestesiólogo con la advertencia del sugammadex (§8.15) según la vía. */
function notaSugammadex(via: Via): string {
  const sg = avisoSugammadex({
    mujerConAnticonceptivoHormonal: true,
    tipo: esViaOral(via) ? 'oral' : 'no_oral',
    posibleAnestesiaGeneral: true,
  });
  return `${sg.textoPaciente} ${sg.textoAnestesiologo}`.trim();
}

/**
 * Anticonceptivos hormonales combinados y THS: en procedimientos de riesgo
 * trombótico alto, requiere confirmación. La sugerencia de suspensión va solo en
 * las notas del anestesiólogo; la hoja del paciente muestra la línea general de
 * requiere confirmación referida al anticonceptivo hasta que se confirme.
 * En ambos casos, la nota del anestesiólogo incluye la advertencia del sugammadex
 * (§8.15) según la vía (oral: "dosis olvidada"; no oral: barrera 7 días).
 */
export function reglaAnticonceptivoThs(e: EntradaAnticonceptivoThs, ctx: ContextoReglas): ResultadoFarmaco {
  const via: Via = e.via ?? 'oral';
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: 'docs/documento_fuente.md §8.11',
  };
  if (ctx.riesgoTromboticoAlto) {
    // Punto 8 (9.2): se propone MANTENER (no se suspende de forma rutinaria por una
    // cirugía) con nota de valorar suspensión 4-6 semanas solo en cirugía de muy alto
    // riesgo trombótico; punto amarillo.
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: textoMantener(via),
      reglaAplicada: 'Anticonceptivo/THS con riesgo trombótico alto: mantener por defecto (no se suspende de rutina por la cirugía)',
      requiereConfirmacion: false,
      textoAnestesiologo: `Valorar suspender 4-6 semanas antes y método alternativo solo en cirugía de muy alto riesgo trombótico con profilaxis. ${notaSugammadex(via)}`,
      puntoValidacion: { tipo: 'validar', motivo: 'Anticonceptivo/THS con riesgo trombótico alto: se propone mantener; confirmar si procede suspender 4-6 semanas.' },
    };
  }
  return {
    ...base,
    accion: 'mantener',
    // El texto de "mantener" se ajusta a la vía (parche, DIU, implante… no "con un sorbo de agua").
    textoPaciente: textoMantener(via),
    reglaAplicada: 'Anticonceptivo/THS sin riesgo trombótico alto: mantener',
    requiereConfirmacion: false,
    textoAnestesiologo: notaSugammadex(via),
  };
}

// ————————————— Alfabloqueantes urológicos (§8) —————————————

/**
 * Alfabloqueantes urológicos (tamsulosina, silodosina): mantener. Si el
 * procedimiento es oftalmológico (catarata), nota al anestesiólogo por el riesgo
 * de síndrome de iris flácido intraoperatorio.
 */
export function reglaAlfabloqueanteFlacido(
  idFarmaco: string,
  nombreComercial: string,
  principio: string,
  ctx: ContextoReglas,
): ResultadoFarmaco {
  const res = reglaMantener(idFarmaco, nombreComercial, [principio], 'Alfabloqueante urológico: mantener', 'oral');
  if (ctx.grupoOftalmologico !== 'no_aplica') {
    res.textoAnestesiologo = 'Riesgo de síndrome de iris flácido intraoperatorio: avisar al oftalmólogo.';
  }
  return res;
}

// ————————————— Corticoides sistémicos (§8.11 / §5.3) —————————————

export interface EntradaCorticoide {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** true si cumple el criterio de dosis de estrés (≥ 5 mg/día prednisona > 3 sem). */
  dosisEstres?: boolean;
}

export function reglaCorticoide(e: EntradaCorticoide): ResultadoFarmaco {
  const res: ResultadoFarmaco = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente: TEXTO_MANTENER,
    reglaAplicada: 'Corticoide sistémico: mantener',
    fuente: 'docs/documento_fuente.md §8.11',
    requiereConfirmacion: false,
  };
  if (e.dosisEstres) {
    res.textoAnestesiologo = 'Valorar dosis de estrés perioperatoria (§5.3).';
  }
  return res;
}

/**
 * Comprueba si el plazo de suspensión de un fármaco ya no se puede cumplir
 * (R3.2.5). Si es así, marca el fármaco como "requiere confirmación" y devuelve
 * una alerta por fármaco. Muta y devuelve una COPIA del resultado.
 */
export function aplicarPlazoNoAlcanzable(
  r: ResultadoFarmaco,
  _ctx: ContextoReglas,
  ahora: Date,
): { resultado: ResultadoFarmaco; alerta?: Alerta } {
  if (r.fechaHoraUltimaToma === undefined || r.accion === 'mantener') {
    return { resultado: r };
  }
  if (!plazoNoAlcanzable(r.fechaHoraUltimaToma, ahora)) {
    return { resultado: r };
  }
  // Punto 8 (9.3): nunca se deja sin pauta. Se da la instrucción prudente «No tome
  // más dosis desde hoy» (nunca «tómela lo antes posible») y queda un punto ROJO
  // para que el anestesiólogo valore retrasar la cirugía.
  const resultado: ResultadoFarmaco = {
    ...r,
    accion: 'suspender',
    requiereConfirmacion: false,
    reglaAplicada: `${r.reglaAplicada} — plazo no alcanzable (§8.16)`,
    textoPaciente:
      'No tome más dosis de este medicamento desde hoy. El anestesiólogo revisará su caso y le avisará si hay algún cambio.',
    puntoValidacion: { tipo: 'posponer', motivo: `${r.nombreComercial}: ya no se puede cumplir el plazo de suspensión; valorar retrasar la cirugía.` },
  };
  const alerta: Alerta = {
    gravedad: 'roja',
    mensaje: `${r.nombreComercial}: ya no se puede cumplir el plazo de suspensión; valorar retrasar la cirugía.`,
    origen: 'plazos §3.2.5',
    soloAnestesiologo: false,
  };
  return { resultado, alerta };
}
