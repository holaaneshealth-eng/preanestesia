/**
 * Estado en memoria de la entrevista mientras se recorren los pasos de la interfaz.
 * (No se persiste: privacidad, caso 23.) Cada paso rellena su parte.
 */
import type { DatosIntervencion, DatosBasicos, Sexo, Via } from '../dominio/tipos.ts';
import type { EntradaMtnd4 } from '../dominio/mtnd4/mtnd4.ts';
import type { Procedimiento } from '../datos/procedimientos.ts';

/** Datos del paso 2 recogidos en la interfaz (superset de DatosBasicos). */
export interface DatosBasicosUi extends DatosBasicos {
  /** Posibilidad de embarazo (mujeres 12-55). undefined si no se ha preguntado. */
  posibleEmbarazo?: boolean;
  /** Fecha de la última regla (ISO yyyy-mm-dd), si aplica. */
  fechaUltimaRegla?: string;
  /** Módulo obstétrico activo (procedimiento obstétrico o embarazo confirmado). */
  moduloObstetrico?: boolean;
  /** Testigo de Jehová o rechazo de hemoderivados (§5.8). Pregunta opcional. */
  rechazaHemoderivados?: boolean;
}

/** Una intervención previa (paso 3, R3.2.10). */
export interface IntervencionPrevia {
  procedimiento: string;
  anio: string;
  tipoAnestesia: 'general' | 'neuroaxial' | 'sedacion' | 'local' | 'no_lo_sabe';
  incidencias: string[];
}

/** Antecedentes del paso 3 (R3.2.10–R3.2.12). */
export interface AntecedentesUi {
  intervencionesPrevias: IntervencionPrevia[];
}

/** Condiciones especiales del paso de enfermedades (§5.15): personal o familiar. */
export interface CondicionesEspeciales {
  hipertermiaMalignaPersonal: boolean;
  hipertermiaMalignaFamiliar: boolean;
  pseudocolinesterasaPersonal: boolean;
  pseudocolinesterasaFamiliar: boolean;
}

export const CONDICIONES_ESPECIALES_VACIO: CondicionesEspeciales = {
  hipertermiaMalignaPersonal: false,
  hipertermiaMalignaFamiliar: false,
  pseudocolinesterasaPersonal: false,
  pseudocolinesterasaFamiliar: false,
};

export const PREGUNTAS_CONDICIONES_ESPECIALES: Array<{ id: keyof CondicionesEspeciales; etiqueta: string }> = [
  { id: 'hipertermiaMalignaPersonal', etiqueta: 'Hipertermia maligna (personal)' },
  { id: 'hipertermiaMalignaFamiliar', etiqueta: 'Hipertermia maligna (familiar)' },
  { id: 'pseudocolinesterasaPersonal', etiqueta: 'Déficit de pseudocolinesterasa (personal)' },
  { id: 'pseudocolinesterasaFamiliar', etiqueta: 'Déficit de pseudocolinesterasa (familiar)' },
];

/** Una alergia a medicamento con su reacción (paso 5, R3.2.14). */
export interface AlergiaMedicamento {
  farmaco: string;
  reaccion: string;
}

/** Alergias del paso 5 (R3.2.14–R3.2.15). */
export interface AlergiasUi {
  /** «No alergias conocidas» marcado explícitamente (R3.2.15). */
  ningunaConocida: boolean;
  medicamentos: AlergiaMedicamento[];
  latex: boolean;
  contrastesYodados: boolean;
  clorhexidina: boolean;
  adhesivos: boolean;
  /** Alimentos relevantes marcados (huevo, soja, frutos secos, frutas tropicales). */
  alimentos: string[];
}

/** Hábitos y capacidad funcional del paso 6 (R3.2.16–R3.2.20). */
export interface HabitosUi {
  tabaco: 'nunca' | 'activo' | 'exfumador';
  /** Datos de exfumador. */
  paquetesAnio?: number;
  fechaAbandonoTabaco?: string;
  /** Descripción libre del consumo (si fumador activo o exfumador). Opcional. */
  descripcionTabaco?: string;
  /**
   * AUDIT-C (0-4 cada pregunta). Ninguna es obligatoria; `undefined` = sin contestar.
   * La puntuación solo se calcula si las tres están contestadas (§6.9, decisión
   * del servicio 2026-10-04); si falta alguna, el resumen dice «AUDIT-C no completado».
   */
  auditFrecuencia?: number;
  auditCantidad?: number;
  auditAtracon?: number;
  /** Capacidad funcional: ¿sube dos pisos sin parar? */
  subeDosPisos: 'si' | 'no' | 'dudoso';
  /** Ítems DASI positivos (solo si no sube dos pisos con claridad). */
  itemsDasi: string[];
  /** Consumo de cocaína en la última semana (§5.7). Pregunta opcional. */
  cocainaUltimaSemana?: boolean;
  /** Solo si edad >= 65: CFS 1-9 y 4AT. */
  cfs?: number;
  cuatroAt?: {
    alerta: 'normal' | 'alterado';
    amt4: '0_errores' | '1_error' | '2_o_mas_o_no_valorable';
    meses: '7_o_mas' | 'menos_de_7' | 'no_valorable';
    cambioAgudo: 'no' | 'si';
  };
}

import type { EntradaHemstop } from '../dominio/escalas/hemstop.ts';
import type { RespuestasModulos } from '../datos/modulos.ts';

/**
 * Pruebas recientes del paciente (§7.4): fecha (ISO yyyy-mm-dd) de la última de
 * cada tipo. Todas opcionales. El motor descuenta las que sigan vigentes el día de
 * la intervención (o, sin fecha, las que sigan vigentes hoy).
 */
export interface PruebasRecientesUi {
  hemograma?: string;
  coagulacion?: string;
  bioquimica?: string;
  ecg?: string;
  rx_torax?: string;
  ecocardiograma?: string;
}

/** Tipos de prueba reciente con fecha, para la UI del paso 6. */
export const PRUEBAS_RECIENTES: Array<{ id: keyof PruebasRecientesUi; etiqueta: string }> = [
  { id: 'hemograma', etiqueta: 'Hemograma' },
  { id: 'coagulacion', etiqueta: 'Coagulación' },
  { id: 'bioquimica', etiqueta: 'Bioquímica' },
  { id: 'ecg', etiqueta: 'ECG' },
  { id: 'rx_torax', etiqueta: 'Radiografía de tórax' },
  { id: 'ecocardiograma', etiqueta: 'Ecocardiograma' },
];

/**
 * Paso «Pruebas complementarias» (§7, fase ágil). Para cada prueba la enfermera elige
 * si el paciente la tiene y la ha traído, la tiene pero no la ha traído, o no la tiene,
 * con fecha opcional. De la analítica general se anotan, opcionales, la hemoglobina y
 * el filtrado glomerular. Nada es obligatorio.
 */
export type EstadoPruebaComplementaria = 'tiene_y_trajo' | 'tiene_no_trajo' | 'no_tiene';

export interface PruebaComplementariaUi {
  estado?: EstadoPruebaComplementaria;
  /** Fecha (ISO yyyy-mm-dd) de la prueba, opcional. */
  fecha?: string;
}

/** Clave de cada prueba del paso de pruebas complementarias. */
export type ClavePruebaComplementaria = 'analitica' | 'nt_probnp' | 'troponina' | 'ecg' | 'rx_torax' | 'ecocardiograma';

export interface PruebasComplementariasUi {
  analitica: PruebaComplementariaUi;
  nt_probnp: PruebaComplementariaUi;
  troponina: PruebaComplementariaUi;
  ecg: PruebaComplementariaUi;
  rx_torax: PruebaComplementariaUi;
  ecocardiograma: PruebaComplementariaUi;
  /** Hemoglobina (g/dL) de la analítica, opcional. */
  hemoglobina?: number;
  /** Filtrado glomerular (mL/min/1,73 m²) de la analítica, opcional. */
  filtradoGlomerular?: number;
}

/** Catálogo de pruebas del paso de pruebas complementarias, con su etiqueta. */
export const PRUEBAS_COMPLEMENTARIAS: Array<{ id: ClavePruebaComplementaria; etiqueta: string }> = [
  { id: 'analitica', etiqueta: 'Analítica general (hemograma, bioquímica y coagulación)' },
  { id: 'nt_probnp', etiqueta: 'NT-proBNP' },
  { id: 'troponina', etiqueta: 'Troponina ultrasensible' },
  { id: 'ecg', etiqueta: 'Electrocardiograma (ECG)' },
  { id: 'rx_torax', etiqueta: 'Radiografía de tórax' },
  { id: 'ecocardiograma', etiqueta: 'Ecocardiograma' },
];

/** Estado inicial vacío del paso de pruebas complementarias. */
export const PRUEBAS_COMPLEMENTARIAS_VACIO: PruebasComplementariasUi = {
  analitica: {},
  nt_probnp: {},
  troponina: {},
  ecg: {},
  rx_torax: {},
  ecocardiograma: {},
};

/** Cribado por aparatos del paso 7 (R3.2.21–R3.2.23). */
export interface CribadoUi {
  /** «Ninguna enfermedad conocida» marcado explícitamente (R3.2.22). */
  ningunaConocida: boolean;
  /** Enfermedades marcadas (ids del catálogo por aparatos). */
  enfermedades: string[];
  /** Respuestas de los módulos de patología desplegados (moduloId → respuestas). */
  respuestasModulos: RespuestasModulos;
  /** HEMSTOP, que se hace siempre (R3.2.23). */
  hemstop: EntradaHemstop;
  /** Condiciones especiales (§5.15): hipertermia maligna y pseudocolinesterasa. */
  condicionesEspeciales: CondicionesEspeciales;
  /** Pruebas recientes y su fecha (§7.4), para descontar las vigentes. Opcional. */
  pruebasRecientes?: PruebasRecientesUi;
  /**
   * Otras enfermedades escritas a mano, no incluidas en el catálogo por aparatos
   * (§6). Cada una con un nombre obligatorio y un detalle opcional. El programa NO
   * les aplica reglas ni alertas: solo las documenta en el SAP y avisa al
   * anestesiólogo para que las revise. Opcional.
   */
  otrasEnfermedades?: OtraEnfermedad[];
}

/** Una enfermedad escrita a mano en el paso 6, fuera del catálogo (§6). */
export interface OtraEnfermedad {
  /** Nombre de la enfermedad (obligatorio). */
  nombre: string;
  /** Detalle libre opcional (multilínea). */
  detalle?: string;
}

/** Texto de una «otra enfermedad» para el SAP y el resumen: «nombre (detalle)» o «nombre». */
export function textoOtraEnfermedad(o: OtraEnfermedad): string {
  const detalle = o.detalle?.trim();
  return detalle ? `${o.nombre} (${detalle})` : o.nombre;
}

/** Un fármaco que el paciente toma, recogido en el paso 8. */
export interface FarmacoTomadoUi {
  idFarmaco: string;
  nombreComercial: string;
  principiosActivos: string[];
  /** id de regla principal (primero del catálogo). */
  idRegla: string;
  /** Todos los id_regla del catálogo (para combinaciones fijas, §8.0). */
  idReglas: string[];
  grupo: string;
  subgrupo: string;
  pautaTipica: string;
  via: Via;
  requiereConfirmacionCatalogo: boolean;
  indicacionesPosibles: string[];
  /** Horas de toma ("HH:MM"). */
  horas: string[];
  dosisMg?: number;
  /** Día de la semana (0-6) del fármaco semanal. */
  diaSemana?: number;
  /** Fecha de la última dosis (ISO) para biológicos/antiangiogénicos. */
  fechaUltimaDosis?: string;
  periodicidadDias?: number;
  insulinaBasalUi?: number;
  insulinaNocheUi?: number;
  insulinaMananaUi?: number;
  tipoHbpm?: 'profilactica' | 'terapeutica' | 'indeterminada';
  /** HBPM (§8.4): dosis por toma (mg o UI) y tomas al día, para clasificarla. */
  hbpmDosis?: number;
  hbpmTomasDia?: number;
  /** Opioides (§5.7): dosis por toma (mg) o tasa del parche (µg/h). */
  opioideDosis?: number;
  /** Opioides: número de tomas al día (no aplica en parches). */
  opioideTomasDia?: number;
  /** Texto para el paciente del catálogo (sobrescribe el de la regla, §3). */
  textoPaciente?: string;
  /** Texto para el anestesiólogo del catálogo (§3). */
  textoAnestesiologo?: string;
  /** Nombre del anestesiólogo que confirma el punto pendiente (§12). */
  confirmadoPor?: string;
  /** Marcado explícitamente como «le llamaremos» (§12): se muestra la frase única. */
  leLlamaremos?: boolean;
  /**
   * Dosis informativa (cantidad + unidad), opcional. Para los fármacos cuya regla NO
   * exige ya una dosis numérica propia (AAS, metotrexato, HBPM, insulinas, opioides);
   * en esos, la dosis es su campo específico y no se duplica. Aparece, cuando se
   * conoce, en el plan del resumen y en la hoja del paciente.
   */
  dosisCantidad?: number;
  /** Unidad de la dosis: mg, mcg, UI, mL, comprimidos, inhalaciones, gotas u «otra». */
  dosisUnidad?: string;
  /** Texto libre de la unidad cuando `dosisUnidad === 'otra'`. */
  dosisUnidadOtra?: string;
  /** Frecuencia de la toma (§8): c/24h, c/12h, c/8h, c/6h, semanal, a_demanda u «otra». */
  frecuencia?: string;
  /** Texto libre de la frecuencia cuando `frecuencia === 'otra'`. */
  frecuenciaOtra?: string;
}

/** Opciones de unidad de dosis para el paso 8 (§8). */
export const UNIDADES_DOSIS: Array<{ valor: string; etiqueta: string }> = [
  { valor: 'mg', etiqueta: 'mg' },
  { valor: 'mcg', etiqueta: 'µg' },
  { valor: 'UI', etiqueta: 'UI' },
  { valor: 'mL', etiqueta: 'mL' },
  { valor: 'comprimidos', etiqueta: 'comprimidos' },
  { valor: 'inhalaciones', etiqueta: 'inhalaciones' },
  { valor: 'gotas', etiqueta: 'gotas' },
  { valor: 'otra', etiqueta: 'otra' },
];

/** Opciones de frecuencia para el paso 8 (§8), con las horas de toma que implican. */
export const FRECUENCIAS: Array<{ valor: string; etiqueta: string; horasEsperadas?: number }> = [
  { valor: 'c24h', etiqueta: 'Cada 24 h', horasEsperadas: 1 },
  { valor: 'c12h', etiqueta: 'Cada 12 h', horasEsperadas: 2 },
  { valor: 'c8h', etiqueta: 'Cada 8 h', horasEsperadas: 3 },
  { valor: 'c6h', etiqueta: 'Cada 6 h', horasEsperadas: 4 },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'a_demanda', etiqueta: 'A demanda' },
  { valor: 'otra', etiqueta: 'Otra' },
];

/** Nº de horas de toma que implica una frecuencia (undefined si no aplica). */
export function horasEsperadasDeFrecuencia(frecuencia: string | undefined): number | undefined {
  return FRECUENCIAS.find((f) => f.valor === frecuencia)?.horasEsperadas;
}

/** Texto legible «dosis unidad frecuencia» para el resumen y la hoja (vacío si no hay nada). */
export function textoDosisFrecuencia(f: {
  dosisCantidad?: number; dosisUnidad?: string; dosisUnidadOtra?: string;
  frecuencia?: string; frecuenciaOtra?: string;
  dosisMg?: number; idRegla?: string;
}): string {
  const partes: string[] = [];
  // Dosis: la genérica si existe; si no, la específica (mg) de la regla.
  if (f.dosisCantidad !== undefined && f.dosisCantidad > 0) {
    const u = f.dosisUnidad === 'otra' ? (f.dosisUnidadOtra ?? '').trim() : etiquetaUnidad(f.dosisUnidad);
    partes.push(`${f.dosisCantidad}${u ? ' ' + u : ''}`);
  } else if (f.dosisMg !== undefined && f.dosisMg > 0) {
    partes.push(`${f.dosisMg} mg`);
  }
  const fr = f.frecuencia === 'otra' ? (f.frecuenciaOtra ?? '').trim() : etiquetaFrecuencia(f.frecuencia);
  if (fr) partes.push(fr.toLowerCase());
  return partes.join(' ');
}

function etiquetaUnidad(valor: string | undefined): string {
  return UNIDADES_DOSIS.find((u) => u.valor === valor)?.etiqueta ?? valor ?? '';
}
function etiquetaFrecuencia(valor: string | undefined): string {
  if (!valor || valor === 'a_demanda' || valor === 'otra') return valor === 'a_demanda' ? 'a demanda' : '';
  return FRECUENCIAS.find((f) => f.valor === valor)?.etiqueta ?? '';
}

/** Vía aérea del paso 9 (§6.2). Todos opcionales; en telefónica solo anamnesis. */
export interface DatosViaAereaUi {
  mallampati?: 1 | 2 | 3 | 4;
  aperturaBucal?: 'ge_4' | 'lt_4';
  distanciaTiromentoniana?: 'gt_6_5' | '6_a_6_5' | 'lt_6';
  movilidadCervical?: 'gt_90' | '80_a_90' | 'lt_80';
  puedeProtruir?: boolean;
  denticion?: 'completa' | 'piezas_moviles' | 'protesis_removible' | 'protesis_fija' | 'edentulo';
  cuelloCortoGrueso?: boolean;
  perimetroCuello?: number;
  barba?: boolean;
  intubacionDificilPrevia?: 'no' | 'dudoso' | 'confirmado';
  radioterapiaCervical?: boolean;
  tumorCabezaCuello?: boolean;
  limitacionCervicalReumatologica?: boolean;
  ronquido?: boolean;
}

/** Consentimiento del paso 10 (§10, R3.2.28). */
export interface ConsentimientoUi {
  estado: 'entregado' | 'pendiente_entregar' | 'no_procede';
  /** Fecha (ISO) si está entregado. */
  fecha?: string;
}

export interface EstadoEntrevista {
  intervencion: DatosIntervencion | null;
  procedimiento: Procedimiento | null;
  basicos: DatosBasicosUi | null;
  antecedentes: AntecedentesUi | null;
  mtnd4: EntradaMtnd4 | null;
  alergias: AlergiasUi | null;
  habitos: HabitosUi | null;
  cribado: CribadoUi | null;
  /** Paso «Pruebas complementarias» (§7, fase ágil), entre enfermedades y técnica. */
  pruebasComplementarias: PruebasComplementariasUi | null;
  medicacion: FarmacoTomadoUi[] | null;
  viaAerea: DatosViaAereaUi | null;
  consentimiento: ConsentimientoUi | null;
  /**
   * Estado de los puntos de validación clínica (§13 bis): por id de punto, si lo ha
   * validado (nombre) o se ha marcado para posponer/derivar. Lo escribe el resumen
   * del anestesiólogo y lo lee la hoja del paciente (aviso de revisión pendiente).
   */
  validaciones: Record<string, EstadoPuntoValidacion>;
  /**
   * Aclaramiento de creatinina introducido en el paso 8 (§8.2/§8.4), cuando no se
   * conoce por un módulo renal/trasplante. Valor ÚNICO para toda la entrevista: si
   * se cambia aquí, se usa en todas las reglas renales. Si un módulo ya lo aporta,
   * ese valor manda y este se ignora.
   */
  aclaramientoManual: AclaramientoManual | null;
}

/** Resolución de un punto de validación en la UI (§13 bis). */
export interface EstadoPuntoValidacion {
  validadoPor?: string;
  posponer?: boolean;
}

/**
 * Aclaramiento introducido a mano en el paso 8 (§8.2/§8.4). Puede ser el aclaramiento
 * directo, la creatinina sérica (el programa calcula Cockcroft-Gault con edad/peso/
 * sexo) o «no disponible» (las reglas renales requieren confirmación, caso A7).
 */
export type AclaramientoManual =
  | { tipo: 'aclaramiento'; valor: number; fecha?: string }
  | { tipo: 'creatinina'; valor: number; fecha?: string }
  | { tipo: 'no_disponible' };

/** ¿La regla de este fármaco depende de la función renal (§8.2/§8.4)? */
export function reglaDependeAclaramiento(idRegla: string): boolean {
  return idRegla === 'acod_antixa' || idRegla === 'acod_dabigatran' || idRegla === 'fondaparinux' || idRegla === 'hbpm';
}

/** Horas más habituales para los botones rápidos del paso 8 (tablet). */
export const HORAS_FRECUENTES = ['08:00', '09:00', '14:00', '20:00', '21:00', '22:00'];

/** ¿La regla necesita las horas de toma para calcular un plazo? */
export function reglaNecesitaHoras(idRegla: string): boolean {
  const sinHoras = new Set([
    'biologico', 'antiangiogenico', 'antiangiogenico_intravitreo', 'tirosina_cinasa',
    'corticoide_sistemico', 'fame_mantener', 'inmunosupresor_clasico', 'jak',
    'mantener_generico', 'metotrexato', 'imao_irreversible', 'imao_b',
    'sacubitrilo_valsartan', 'glp1_semanal', 'anticonceptivo_ths',
  ]);
  return !sinHoras.has(idRegla);
}

export const ESTADO_INICIAL: EstadoEntrevista = {
  intervencion: null,
  procedimiento: null,
  basicos: null,
  antecedentes: null,
  mtnd4: null,
  alergias: null,
  habitos: null,
  cribado: null,
  pruebasComplementarias: null,
  medicacion: null,
  viaAerea: null,
  consentimiento: null,
  validaciones: {},
  aclaramientoManual: null,
};

/** HEMSTOP vacío (todas las respuestas en «no»). */
export const HEMSTOP_VACIO: EntradaHemstop = {
  hematomasSinTrauma: false,
  sangradoProlongadoHeridas: false,
  menstruacionAbundante: false,
  sangradoTrasCirugia: false,
  sangradoTrasDental: false,
  sangradoEnParto: false,
  familiaresTrastornoCoagulacion: false,
};

/** Preguntas del HEMSTOP (§5.5), en el orden del cuestionario. */
export const PREGUNTAS_HEMSTOP: Array<{ id: keyof EntradaHemstop; etiqueta: string }> = [
  { id: 'hematomasSinTrauma', etiqueta: '¿Hematomas o sangrados sin golpe que le llevaran a consultar o a tratamiento?' },
  { id: 'sangradoProlongadoHeridas', etiqueta: '¿Sangrado que dura mucho tras una herida?' },
  { id: 'menstruacionAbundante', etiqueta: '¿Reglas muy abundantes que motivaran consulta o tratamiento?' },
  { id: 'sangradoTrasCirugia', etiqueta: '¿Sangrado anómalo tras una operación?' },
  { id: 'sangradoTrasDental', etiqueta: '¿Sangrado anómalo tras una extracción dental?' },
  { id: 'sangradoEnParto', etiqueta: '¿Sangrado anómalo en el parto?' },
  { id: 'familiaresTrastornoCoagulacion', etiqueta: '¿Familiares con trastorno de la coagulación?' },
];

/**
 * Mapeo casilla del paso 7 → módulo de patología que despliega (§5).
 * Por defecto la casilla abre el módulo con su mismo id; aquí van las excepciones
 * (varias casillas que comparten un mismo módulo).
 */
export const MODULO_DE_ENFERMEDAD: Record<string, string> = {
  stent_o_infarto: 'cardiopatia_isquemica',
  protesis_mecanica: 'valvulopatia',
};

/** id del módulo que despliega una casilla del paso 7. */
export function moduloDeEnfermedad(idEnfermedad: string): string {
  return MODULO_DE_ENFERMEDAD[idEnfermedad] ?? idEnfermedad;
}

/** Cribado por aparatos (R3.2.21). Los ids que empiezan por una enfermedad de
 *  §5b.2 permiten al asistente de coherencia detectar tratamientos ausentes. */
export const APARATOS: Array<{ aparato: string; enfermedades: Array<{ id: string; etiqueta: string }> }> = [
  {
    aparato: 'Cardiovascular',
    enfermedades: [
      { id: 'hta', etiqueta: 'Hipertensión' },
      { id: 'fibrilacion_auricular', etiqueta: 'Fibrilación auricular' },
      { id: 'insuficiencia_cardiaca', etiqueta: 'Insuficiencia cardiaca' },
      { id: 'cardiopatia_isquemica', etiqueta: 'Cardiopatía isquémica / infarto' },
      { id: 'stent_o_infarto', etiqueta: 'Stent coronario' },
      { id: 'protesis_mecanica', etiqueta: 'Prótesis valvular mecánica' },
      { id: 'valvulopatia', etiqueta: 'Valvulopatía' },
      { id: 'miocardiopatia', etiqueta: 'Miocardiopatía' },
      { id: 'arteriopatia_periferica', etiqueta: 'Arteriopatía periférica' },
      { id: 'aneurisma_aorta', etiqueta: 'Aneurisma de aorta' },
      { id: 'marcapasos', etiqueta: 'Marcapasos o DAI' },
    ],
  },
  {
    aparato: 'Respiratorio',
    enfermedades: [
      { id: 'asma_epoc', etiqueta: 'Asma o EPOC' },
      { id: 'saos', etiqueta: 'Apnea del sueño (SAOS)' },
      { id: 'hipertension_pulmonar', etiqueta: 'Hipertensión pulmonar' },
      { id: 'infeccion_respiratoria', etiqueta: 'Infección respiratoria reciente' },
    ],
  },
  {
    aparato: 'Endocrino y metabolismo',
    enfermedades: [
      { id: 'diabetes', etiqueta: 'Diabetes' },
      { id: 'hipotiroidismo', etiqueta: 'Tiroides u otra enfermedad endocrina (suprarrenal)' },
      { id: 'obesidad', etiqueta: 'Obesidad' },
    ],
  },
  {
    aparato: 'Renal y hepático',
    enfermedades: [
      { id: 'enfermedad_renal', etiqueta: 'Enfermedad renal crónica' },
      { id: 'enfermedad_hepatica', etiqueta: 'Enfermedad hepática' },
    ],
  },
  {
    aparato: 'Hematológico',
    enfermedades: [
      { id: 'anticoagulacion', etiqueta: 'Toma anticoagulantes' },
      { id: 'trastorno_coagulacion', etiqueta: 'Trastorno de la coagulación conocido' },
      { id: 'anemia', etiqueta: 'Anemia' },
    ],
  },
  {
    aparato: 'Neurológico y psiquiátrico',
    enfermedades: [
      { id: 'epilepsia', etiqueta: 'Epilepsia' },
      { id: 'ictus_o_tvp', etiqueta: 'Ictus o AIT' },
      { id: 'parkinson', etiqueta: 'Parkinson' },
      { id: 'esclerosis_multiple', etiqueta: 'Esclerosis múltiple' },
      { id: 'distrofia_muscular', etiqueta: 'Distrofia o enfermedad neuromuscular' },
      { id: 'deterioro_cognitivo', etiqueta: 'Demencia o deterioro cognitivo' },
      { id: 'dolor_cronico', etiqueta: 'Dolor crónico' },
      { id: 'depresion_ansiedad', etiqueta: 'Depresión o ansiedad' },
    ],
  },
  {
    aparato: 'Musculoesquelético y reumatológico',
    enfermedades: [
      { id: 'artritis_reumatoide', etiqueta: 'Artritis reumatoide' },
      { id: 'lupus', etiqueta: 'Lupus u otra conectivopatía' },
      { id: 'dermatomiositis_polimiositis', etiqueta: 'Dermatomiositis o polimiositis' },
    ],
  },
  {
    aparato: 'Digestivo',
    enfermedades: [
      { id: 'reflujo', etiqueta: 'Reflujo gastroesofágico' },
      { id: 'enfermedad_inflamatoria_intestinal', etiqueta: 'Enfermedad inflamatoria intestinal' },
    ],
  },
  {
    aparato: 'Oncológico e infeccioso',
    enfermedades: [
      { id: 'cancer', etiqueta: 'Cáncer en tratamiento' },
      { id: 'trasplante', etiqueta: 'Trasplante de órgano' },
    ],
  },
];

/** Alimentos relevantes en alergias (R3.2.14). */
export const ALIMENTOS_ALERGIA: Array<{ id: string; etiqueta: string }> = [
  { id: 'huevo', etiqueta: 'Huevo' },
  { id: 'soja', etiqueta: 'Soja' },
  { id: 'frutos_secos', etiqueta: 'Frutos secos' },
  { id: 'frutas_tropicales', etiqueta: 'Frutas tropicales (si alergia al látex)' },
];

/** Incidencias anestésicas a preguntar de forma explícita (R3.2.11). */
export const INCIDENCIAS_ANESTESICAS: Array<{ id: string; etiqueta: string }> = [
  { id: 'intubacion_dificil', etiqueta: 'Intubación o ventilación difícil conocida' },
  { id: 'nvpo', etiqueta: 'Náuseas o vómitos postoperatorios (NVPO)' },
  { id: 'despertar_prolongado', etiqueta: 'Despertar prolongado' },
  { id: 'reaccion_alergica', etiqueta: 'Reacción alérgica en quirófano' },
  { id: 'despertar_intraoperatorio', etiqueta: 'Despertar intraoperatorio' },
  { id: 'dificultad_epidural_raquidea', etiqueta: 'Dificultad con epidural o raquídea' },
  { id: 'transfusiones', etiqueta: 'Transfusiones' },
  { id: 'reaccion_transfusional', etiqueta: 'Reacción transfusional' },
];

export const SEXOS: Array<{ valor: Sexo; etiqueta: string }> = [
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'mujer', etiqueta: 'Mujer' },
];

/** IMC redondeado a un decimal, o null si faltan datos válidos. */
export function calcularImc(pesoKg: number, tallaCm: number): number | null {
  if (!(pesoKg > 0) || !(tallaCm > 0)) return null;
  const m = tallaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}
