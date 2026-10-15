/**
 * Derivación de la clase de riesgo del paciente (§7.2) y de las pruebas
 * complementarias (§7.3) a partir de los módulos de la entrevista. Alimenta el
 * resumen: así al marcar, por ejemplo, EPOC cambian las pruebas propuestas.
 *
 * Las asignaciones concretas por respuesta salen de los módulos; esta función las
 * agrega. No inventa datos: lo que no consta, no suma.
 */
import type { RiesgoCardiovascular, RiesgoHemorragico, TecnicaAnestesica } from '../tipos.ts';
import {
  calcularClaseRiesgoPaciente,
  type AsignacionRiesgo,
  type ResultadoClaseRiesgo,
} from '../riesgo/claseRiesgoPaciente.ts';
import {
  decidirPruebas,
  pruebaVigente,
  type FactoresPruebas,
  type PruebaSolicitada,
  type PruebaConVigencia,
  type VigenciaPruebas,
} from '../pruebas/tablaPruebas.ts';

type Resp = Record<string, Record<string, unknown>>;

/** Fechas de pruebas recientes del paciente (ISO yyyy-mm-dd o Date), opcionales (§7.4). */
export interface FechasPruebasRecientes {
  hemograma?: Date;
  coagulacion?: Date;
  bioquimica?: Date;
  ecg?: Date;
  rx_torax?: Date;
  ecocardiograma?: Date;
}

export interface EntradaRiesgoPruebas {
  respuestas: Resp;
  enfermedades: Set<string>;
  edadAnios: number;
  imc: number | null;
  hemstopPositivo: boolean;
  /** Grupos de fármaco presentes: 'anticoagulante', 'antiagregante'. */
  medicacionGrupos: Set<string>;
  riesgoCardiovascular: RiesgoCardiovascular;
  riesgoHemorragico: RiesgoHemorragico;
  neuroaxialProbable: boolean;
  tecnicas: TecnicaAnestesica[];
  /** Fragilidad (CFS ≥ 5), para la nota ** del BNP. Opcional. */
  fragilidad?: boolean;
  /** Capacidad funcional reducida (< 4 METs o DASI ≤ 34), para la nota ** del BNP. Opcional. */
  capacidadFuncionalReducida?: boolean;
  /** Fecha prevista de la intervención; sin ella, se usa `fechaReferencia` ("hoy") para la vigencia (§7.4, §8.16). */
  fechaIntervencion?: Date | null;
  /** "Hoy" para la vigencia cuando no hay fecha de intervención. La UI pasa la real; las pruebas, una fija. Si falta, `new Date()`. */
  fechaReferencia?: Date;
  /** Fechas de pruebas recientes para descontar las vigentes (§7.4). */
  pruebasRecientes?: FechasPruebasRecientes;
  /** Ecocardiograma con función ventricular conocida y estable (18 meses de validez). */
  ecocardiogramaEstable?: boolean;
}

export interface ResultadoRiesgoPruebas {
  clase: ResultadoClaseRiesgo;
  factores: FactoresPruebas;
  pruebas: PruebaSolicitada[];
  /** Vigencia aplicada (§7.4): true = prueba vigente, descontada de la lista. */
  vigencia: VigenciaPruebas;
}

/**
 * Enfermedades que cuentan como "comorbilidad cardiovascular significativa" para
 * la nota ** del BNP (§7.3). La HTA aislada NO cuenta (decisión del servicio).
 */
const COMORBILIDAD_CV_SIGNIFICATIVA = new Set([
  'cardiopatia_isquemica',
  'stent_o_infarto',
  'insuficiencia_cardiaca',
  'fibrilacion_auricular',
  'arteriopatia_periferica',
  'aneurisma_aorta',
  'ictus_o_tvp',
  'miocardiopatia',
  'hipertension_pulmonar',
]);

/** Clase de riesgo del paciente (§7.2) a partir de los módulos, la edad y el IMC. */
export function derivarClaseRiesgo(e: EntradaRiesgoPruebas): ResultadoClaseRiesgo {
  const r = e.respuestas;
  const a: AsignacionRiesgo[] = [];

  if (e.edadAnios >= 65) a.push({ clase: 'bajo-moderado', motivo: '≥ 65 años' });
  if (e.imc !== null && e.imc >= 40) a.push({ clase: 'moderado', motivo: 'IMC ≥ 40' });
  else if (e.imc !== null && e.imc >= 30) a.push({ clase: 'bajo-moderado', motivo: 'IMC 30-40' });

  if (e.enfermedades.has('hta')) a.push({ clase: 'bajo-moderado', motivo: 'HTA' });

  if (e.enfermedades.has('diabetes')) {
    const hba1c = num((r['diabetes'] ?? {}).hba1c);
    if (hba1c !== null && hba1c > 8.5) a.push({ clase: 'moderado', motivo: 'diabetes mal controlada (HbA1c > 8,5 %)' });
    else a.push({ clase: 'bajo-moderado', motivo: 'diabetes' });
  }

  if (e.enfermedades.has('asma_epoc')) {
    const m = r['asma_epoc'] ?? {};
    if (m.oxigeno_domiciliario === true) a.push({ clase: 'alto', motivo: 'oxigenoterapia domiciliaria' });
    else if (m.enfermedad === 'epoc' || m.enfermedad === 'ambas') a.push({ clase: 'moderado', motivo: 'EPOC' });
    else a.push({ clase: 'bajo-moderado', motivo: 'asma' });
  }

  if (e.enfermedades.has('saos')) a.push({ clase: 'bajo-moderado', motivo: 'SAOS' });

  if (e.enfermedades.has('insuficiencia_cardiaca')) {
    const nyha = str((r['insuficiencia_cardiaca'] ?? {}).nyha);
    if (nyha === 'III' || nyha === 'IV') a.push({ clase: 'alto', motivo: `insuficiencia cardiaca NYHA ${nyha}` });
    else a.push({ clase: 'moderado', motivo: 'insuficiencia cardiaca' });
  }

  if (e.enfermedades.has('enfermedad_renal')) {
    const estadio = str((r['enfermedad_renal'] ?? {}).estadio);
    if (estadio === 'terminal') a.push({ clase: 'alto', motivo: 'ERC terminal (filtrado < 15)' });
    else if (estadio === 'grave' || estadio === 'moderada') a.push({ clase: 'moderado', motivo: 'ERC (filtrado 15-45)' });
    else a.push({ clase: 'bajo-moderado', motivo: 'enfermedad renal crónica' });
  }

  if (e.enfermedades.has('valvulopatia') || e.enfermedades.has('protesis_mecanica')) {
    const grav = str((r['valvulopatia'] ?? {}).gravedad);
    if (grav === 'moderada' || grav === 'grave') a.push({ clase: 'alto', motivo: 'valvulopatía moderada-grave' });
    else a.push({ clase: 'bajo-moderado', motivo: 'valvulopatía' });
  }

  if (e.enfermedades.has('cardiopatia_isquemica') || e.enfermedades.has('stent_o_infarto')) {
    const m = r['cardiopatia_isquemica'] ?? {};
    const esf = str(m.angina_esfuerzo);
    if (m.angina_residual === true && (esf === 'minimos' || esf === 'reposo')) a.push({ clase: 'alto', motivo: 'angina de mínimos esfuerzos/reposo' });
    else a.push({ clase: 'moderado', motivo: 'cardiopatía isquémica' });
  }

  if (e.enfermedades.has('enfermedad_hepatica')) a.push({ clase: 'moderado', motivo: 'hepatopatía crónica' });

  return calcularClaseRiesgoPaciente(a);
}

/**
 * ¿Hay comorbilidad cardiovascular significativa (nota ** del BNP)? La valvulopatía
 * solo cuenta si es moderada o grave; el resto, por presencia de la enfermedad.
 * La HTA aislada NO cuenta (decisión del servicio).
 */
function tieneComorbilidadCvSignificativa(e: EntradaRiesgoPruebas): boolean {
  for (const id of e.enfermedades) {
    if (id === 'valvulopatia' || id === 'protesis_mecanica') {
      const grav = str((e.respuestas['valvulopatia'] ?? {}).gravedad);
      if (grav === 'moderada' || grav === 'grave') return true;
      continue;
    }
    if (COMORBILIDAD_CV_SIGNIFICATIVA.has(id)) return true;
  }
  return false;
}

/** Factores para las excepciones de la tabla de pruebas (§7.3). */
export function derivarFactoresPruebas(e: EntradaRiesgoPruebas): FactoresPruebas {
  const r = e.respuestas;
  const hbAnemia = num((r['anemia'] ?? {}).hemoglobina);
  const anemiaOHbBaja = e.enfermedades.has('anemia') || (hbAnemia !== null && hbAnemia < 13);

  const trastornoCoagulacionOAnticoagulante =
    e.enfermedades.has('trastorno_coagulacion') ||
    e.enfermedades.has('anticoagulacion') ||
    e.medicacionGrupos.has('anticoagulante') ||
    e.medicacionGrupos.has('antiagregante');

  const anestesiaRegionalPosible =
    e.neuroaxialProbable ||
    e.tecnicas.includes('neuroaxial') ||
    e.tecnicas.includes('bloqueo_periferico') ||
    e.tecnicas.includes('bloqueo_profundo');

  const asma = r['asma_epoc'] ?? {};
  const supuestoRxTorax = asma.sintomas_respiratorios_nuevos === true;

  const valv = r['valvulopatia'] ?? {};
  const tieneValvulopatia = e.enfermedades.has('valvulopatia') || e.enfermedades.has('protesis_mecanica');
  const ecoReciente = str(valv.ecocardiograma_fecha) !== null; // simplificación: si consta fecha, se asume vigente
  const supuestoEcocardiograma = valv.sintomas_nuevos === true || (tieneValvulopatia && !ecoReciente);

  return {
    anemiaOHbBaja,
    trastornoCoagulacionOAnticoagulante,
    anestesiaRegionalPosible,
    sangradoPrevisible: e.riesgoHemorragico === 'alto',
    hemstopPositivo: e.hemstopPositivo,
    supuestoRxTorax,
    supuestoEcocardiograma,
    comorbilidadCardiovascularSignificativa: tieneComorbilidadCvSignificativa(e),
    fragilidad: e.fragilidad === true,
    capacidadFuncionalReducida: e.capacidadFuncionalReducida === true,
    perfilTroponinaEsc2022: perfilTroponina(e),
  };
}

/**
 * Perfil de riesgo cardiovascular para la troponina basal (ESC 2022): enfermedad
 * cardiovascular conocida, factores de riesgo cardiovascular (edad ≥ 65, HTA,
 * diabetes, dislipidemia o tabaquismo) o síntomas cardiacos sugestivos. (El riesgo
 * quirúrgico intermedio/alto lo combina `decidirPruebas`.)
 */
function perfilTroponina(e: EntradaRiesgoPruebas): boolean {
  if (e.edadAnios >= 65) return true;
  if (tieneComorbilidadCvSignificativa(e)) return true;
  const FR_CV = ['hta', 'diabetes', 'dislipidemia', 'cardiopatia_isquemica', 'stent_o_infarto'];
  for (const id of FR_CV) if (e.enfermedades.has(id)) return true;
  // Tabaquismo activo (si el módulo de hábitos lo aportó entre las enfermedades/flags).
  if (e.enfermedades.has('tabaquismo') || e.enfermedades.has('fumador')) return true;
  // Síntomas cardiacos sugestivos: angina residual declarada en el módulo.
  if ((e.respuestas['cardiopatia_isquemica'] ?? {}).angina_residual === true) return true;
  return false;
}

/**
 * Vigencia de cada prueba datable (§7.4): compara la fecha de la prueba reciente
 * con la fecha de la intervención (o "hoy" si no hay fecha, §8.16). Solo marca
 * `true` las que siguen vigentes; las demás quedan sin marcar y se piden.
 */
export function derivarVigenciaPruebas(e: EntradaRiesgoPruebas): VigenciaPruebas {
  const recientes = e.pruebasRecientes ?? {};
  const referencia = e.fechaIntervencion ?? e.fechaReferencia ?? new Date();
  const vig: VigenciaPruebas = {};
  const pruebas: PruebaConVigencia[] = ['hemograma', 'coagulacion', 'bioquimica', 'ecg', 'rx_torax', 'ecocardiograma'];
  for (const p of pruebas) {
    const fecha = recientes[p];
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const estable = p === 'ecocardiograma' && e.ecocardiogramaEstable === true;
      if (pruebaVigente(p, fecha, referencia, estable)) vig[p] = true;
    }
  }
  return vig;
}

/** Clase de riesgo + factores + pruebas propuestas (§7), descontando las vigentes (§7.4). */
export function derivarRiesgoYPruebas(e: EntradaRiesgoPruebas): ResultadoRiesgoPruebas {
  const clase = derivarClaseRiesgo(e);
  const factores = derivarFactoresPruebas(e);
  const vigencia = derivarVigenciaPruebas(e);
  const pruebas = decidirPruebas(e.riesgoCardiovascular, clase.clase, factores, vigencia);
  return { clase, factores, pruebas, vigencia };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}
