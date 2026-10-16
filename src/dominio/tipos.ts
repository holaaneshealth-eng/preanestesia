/**
 * Tipos de dominio compartidos (R modelo de datos de design.md).
 * Motor de dominio en TypeScript puro, sin dependencias de UI ni de red.
 */

// ————————————————————————————————————————————————————————————————
// Entrada de la entrevista (estado en memoria)
// ————————————————————————————————————————————————————————————————

export type Modalidad = 'presencial' | 'telefonica';

export type TecnicaAnestesica =
  | 'general'
  | 'sedacion'
  | 'neuroaxial'
  | 'bloqueo_periferico'
  | 'bloqueo_profundo'
  | 'local'
  | 'topica'
  | 'retrobulbar_peribulbar'
  | 'no_se_sabe';

export type RiesgoCardiovascular = 'bajo' | 'intermedio' | 'alto';
export type RiesgoHemorragico = 'minimo' | 'bajo' | 'alto';
export type GrupoOftalmologico = 'no_aplica' | 'riesgo_bajo' | 'riesgo_moderado_alto';

/** Vía de administración concreta (§8.0). Determina el texto de "mantener". */
export type Via =
  | 'oral'
  | 'sublingual'
  | 'subcutanea'
  | 'intramuscular'
  | 'intravenosa'
  | 'transdermica'
  | 'inhalada'
  | 'colirio'
  | 'intravitrea'
  | 'vaginal'
  | 'intrauterina'
  | 'implante';

/** Vías por las que se toma "con un sorbo de agua" (a efectos de sugammadex y texto). */
export function esViaOral(via: Via): boolean {
  return via === 'oral';
}

export interface DatosIntervencion {
  /** Fecha/hora prevista, o null si aún no se conoce (§8.16a). */
  fechaHora: Date | null;
  /** true si la fecha de la intervención aún no se conoce (§8.16a). */
  fechaDesconocida: boolean;
  /** true si la hora era desconocida y se asumieron las 08:00 (R3.2.2). */
  horaAsumida: boolean;
  procedimientoId: string | null;
  riesgoCardiovascular: RiesgoCardiovascular;
  riesgoHemorragico: RiesgoHemorragico;
  grupoOftalmologico: GrupoOftalmologico;
  /** El procedimiento tiene técnica neuroaxial o bloqueo profundo probable. */
  neuroaxialProbable: boolean;
  duracionMayor30min: boolean;
  riesgoTromboticoAlto: boolean;
  /** Cirugía en espacio cerrado: intracraneal o del canal medular (§8.3, AAS). */
  espacioCerrado: boolean;
  /** Cirugía de retina (muy alto riesgo de sangrado para el AAS, §8.3). */
  retina: boolean;
  /** ¿Se prevé administrar contraste yodado? (afecta a la metformina, §8.5). */
  contrasteYodado: 'si' | 'no' | 'no_se_sabe';
  /**
   * Técnicas anestésicas previstas (se eligen en el paso 7). Puede haber VARIAS a la
   * vez (p. ej. general + bloqueo, o raquídea + sedación). Para las reglas: es
   * neuroaxial si alguna lo es (o «no se sabe» + neuroaxial probable), y es bloqueo
   * profundo si alguna lo es. Para la información de riesgos (§8.17) se muestran las
   * secciones de todas las técnicas marcadas.
   */
  tecnicas: TecnicaAnestesica[];
  /**
   * Subtipo de la técnica neuroaxial, SOLO para elegir qué información de riesgos
   * ve el paciente (§8.17). NO cambia ninguna regla ni plazo: para las reglas, una
   * técnica neuroaxial sigue siendo «neuroaxial». undefined = sin especificar.
   */
  subtipoNeuroaxial?: 'raquidea' | 'epidural' | 'combinada';
  /** Zona del procedimiento respecto a un dispositivo cardiaco implantable (§5.1 bis). */
  zonaDispositivo?: 'supraumbilical' | 'infraumbilical' | 'cardiaca' | 'ocular' | 'endoscopia' | 'dental' | 'litotricia' | 'neurocirugia';
}

export type Sexo = 'hombre' | 'mujer';

export interface DatosBasicos {
  edadAnios: number;
  /** Edad en meses para < 2 años (opcional). */
  edadMeses?: number;
  sexo: Sexo;
  pesoKg: number;
  tallaCm: number;
  embarazada?: boolean;
}

/** Resultado de una escala: puntuación, categoría y componentes que sumaron. */
export interface ResultadoEscala {
  puntuacion: number;
  categoria: string;
  /** Componentes que han contribuido (para mostrarlos, R6). */
  componentes: string[];
}

// ————————————————————————————————————————————————————————————————
// Medicación y reglas
// ————————————————————————————————————————————————————————————————

export type PautaTipica = 'diaria' | 'dos_veces_dia' | 'semanal' | 'mensual' | 'ciclica';

export interface FarmacoCatalogo {
  id: string;
  principiosActivos: string[];
  nombresComerciales: string[];
  grupo: string;
  subgrupo: string;
  pautaTipica: PautaTipica;
  /** Vía de administración concreta (§8.0). Por defecto 'oral'. */
  via?: Via;
  /** id de regla por principio activo (se aplica la más restrictiva). */
  idRegla: string[];
  textoPaciente?: string;
  textoAnestesiologo?: string;
  requiereConfirmacion: boolean;
  indicacionesPosibles: string[];
  fuente: string;
  fechaRevision: string;
  verificadoCima: boolean;
}

/** Fármaco tal como lo toma el paciente (recogido en el paso 8). */
export interface FarmacoTomado {
  idCatalogo: string | null; // null si "no catalogado"
  nombre: string;
  dosisMg?: number;
  dosisTexto?: string;
  pauta: PautaTipica;
  horaHabitual?: string; // "HH:MM"
  /** Indicación confirmada por la enfermera (para reglas que dependen de ella). */
  indicacion?: string;
  noCatalogado: boolean;
}

export type AccionFarmaco = 'mantener' | 'suspender' | 'ajustar' | 'consultar';

export interface ResultadoFarmaco {
  idFarmaco: string;
  nombreComercial: string;
  principiosActivos: string[];
  accion: AccionFarmaco;
  /** Fecha/hora límite de la última toma, si aplica. */
  fechaHoraUltimaToma?: Date;
  textoPaciente: string;
  textoAnestesiologo?: string;
  reglaAplicada: string;
  fuente: string;
  requiereConfirmacion: boolean;
  confirmadoPor?: string;
  /** Dato que falta y bloquea la recomendación (R12.5), si aplica. */
  datoQueFalta?: string;
  /**
   * Alertas de seguridad que la regla quiera elevar al resumen del anestesiólogo
   * (p. ej. antiangiogénico reciente, fondaparinux con aclaramiento < 20). El
   * despachador las conserva y el resumen las recoge de todo el plan (§8).
   */
  alertas?: Alerta[];
  /**
   * Punto de validación clínica que la regla deja para el anestesiólogo (punto 8).
   * La regla SIEMPRE propone una pauta (nunca «requiere confirmación»); cuando la
   * decisión clínica es relevante deja este punto, 🔴 'posponer' o 🟡 'validar'. Si
   * es 'posponer', la instrucción del paciente añade la línea de revisión por el
   * anestesiólogo (hoja/QR). El resumen lo recoge junto a los puntos del catálogo.
   */
  puntoValidacion?: PuntoValidacionFarmaco;
}

/** Punto de validación que una regla de medicación deja para el anestesiólogo (punto 8). */
export interface PuntoValidacionFarmaco {
  /** 🔴 'posponer' (revisar antes, línea de revisión en la hoja) o 🟡 'validar' (revisar). */
  tipo: 'posponer' | 'validar';
  /** Motivo clínico que ve el anestesiólogo en su resumen. */
  motivo: string;
}

// ————————————————————————————————————————————————————————————————
// Alertas y puntos pendientes
// ————————————————————————————————————————————————————————————————

export type GravedadAlerta = 'roja' | 'amarilla' | 'informativa';

export interface Alerta {
  gravedad: GravedadAlerta;
  mensaje: string;
  origen: string;
  /** No aparece en la hoja del paciente si es true. */
  soloAnestesiologo: boolean;
}

export interface PuntoConfirmacion {
  idFarmaco?: string;
  mensaje: string;
  datoQueFalta?: string;
}

// ————————————————————————————————————————————————————————————————
// Contexto de evaluación de reglas de medicación (design.md)
// ————————————————————————————————————————————————————————————————

/** Técnica anestésica "efectiva" tras resolver "no se sabe" (R3.2.3). */
export interface ContextoReglas {
  fechaHoraIntervencion: Date;
  riesgoHemorragico: RiesgoHemorragico;
  riesgoCardiovascular: RiesgoCardiovascular;
  grupoOftalmologico: GrupoOftalmologico;
  /** true si la técnica efectiva es neuroaxial (incluida la resolución de "no se sabe"). */
  neuroaxial: boolean;
  /** true si hay bloqueo profundo previsto. */
  bloqueoProfundo: boolean;
  riesgoTromboticoAlto: boolean;
  /** Cirugía en espacio cerrado (intracraneal/medular). */
  espacioCerrado: boolean;
  /** Cirugía de retina. */
  retina: boolean;
  pesoKg: number;
  /** Aclaramiento de creatinina (mL/min) o null si no se conoce (R6.7). */
  aclaramiento: number | null;
  /**
   * Punto 8 (1.1): true si el aclaramiento usado es una APROXIMACIÓN a partir del
   * filtrado glomerular apuntado en el paso de pruebas (no hay creatinina ni
   * aclaramiento propios). La regla deja una nota amarilla de que es una aproximación.
   */
  aclaramientoAproximadoFiltrado?: boolean;
  /** Indicación del fármaco (para reglas que dependen de ella). */
  indicacion?: string;
  /** Pauta horaria del fármaco en evaluación (horas de toma del paciente). */
  pautaFarmaco?: PautaHorariaCtx;
  /**
   * "Hoy" para los cálculos que comparan con la fecha actual (plazo no alcanzable,
   * §3.2.5/§4). La interfaz pasa la fecha real; las pruebas, el informe y el modo
   * entrenamiento pasan una fecha fija para no depender del día de ejecución. Si
   * falta, se usa `new Date()`.
   */
  fechaReferencia?: Date;
}

/** Pauta horaria: horas "HH:MM" de toma en un día. */
export interface PautaHorariaCtx {
  horas: string[];
}
