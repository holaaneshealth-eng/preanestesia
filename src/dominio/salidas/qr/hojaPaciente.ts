/**
 * Contenido estructurado del QR del PACIENTE y recálculo con fecha —
 * docs/documento_fuente.md §8.16 y §11.
 *
 * El QR lleva, para cada fármaco, todo lo necesario para recalcular las
 * instrucciones cuando el paciente introduzca (o cambie) la fecha, SIN volver al
 * estado clínico: tipo de plazo, duración, horas habituales de toma, si admite
 * adelanto y si es anticoagulante; además del teléfono del servicio, la fecha de
 * la intervención (si se conoce) y la caducidad. La futura vista del paciente solo
 * tiene que llamar a `recalcularHoja` sobre el contenido decodificado.
 */
import type { Via } from '../../tipos.ts';
import type { PautaHoraria } from '../../fechas/ultimaToma.ts';
import {
  ultimaTomaPorHoras,
  ultimaTomaPorDias,
  textoUltimaToma,
  textoUltimaTomaDias,
} from '../../fechas/ultimaToma.ts';
import { plazoNoAlcanzable } from '../../fechas/plazos.ts';
import { fraseNoConfirmado } from '../hojaFarmaco.ts';

/** Tipo de plazo de un fármaco en el QR (claves cortas para el payload). */
export type TipoPlazo =
  | 'dias' // suspender N días (última toma el día N+1 antes)
  | 'horas' // última toma N horas antes (anticoagulantes: puede adelantar)
  | 'no_dia_iq' // no tomar el día de la intervención (la última toma es el día previo)
  | 'sin_plazo'; // mantener / consultar / sin cálculo de fecha

/** Un fármaco en el QR del paciente, con todo lo necesario para recalcular (§8.16d). */
export interface FarmacoQr {
  /** Nombre comercial. */
  n: string;
  /** Tipo de plazo. */
  pt: TipoPlazo;
  /** Duración del plazo (días para 'dias', horas para 'horas'); ausente si no aplica. */
  pd?: number;
  /** Horas habituales de toma ("HH:MM"). */
  hh: string[];
  /** Admite adelanto de la toma a la hora límite (solo anticoagulantes). */
  ad: boolean;
  /** Es anticoagulante. */
  ac: boolean;
  /** Requiere confirmación del anestesiólogo. */
  rc: boolean;
  /** Nombre del anestesiólogo que ha confirmado (si `rc`); ausente = no confirmado. */
  cf?: string;
  /** Texto fijo del paciente para fármacos sin plazo (mantener/consultar). */
  tx?: string;
  /** Variante de «mantener» (para localizar sin texto libre): la vía de administración. */
  mv?: Via;
  /** Ajuste de insulina estructurado (para localizar sin texto libre). */
  ins?: InsulinaQr;
}

/** Ajuste de insulina estructurado en el QR (§8.5), para localizar y recalcular fechas. */
export interface InsulinaQr {
  tipo: 'basal' | 'nph' | 'premezclada' | 'rapida';
  /** Basal: tomas reducidas (momento, dosis ajustada, dosis original, hora). */
  tomas?: Array<{ m: 'noche_previa' | 'manana_intervencion'; d: number; o: number; h: string }>;
  /** NPH: dosis de la noche (completa) y de la mañana (50 %) con su original. */
  nocheUi?: number;
  mananaUi?: number;
  mananaOrig?: number;
  horaNoche?: string;
  horaManana?: string;
  /** Rápida: hora del desayuno. */
  horaDesayuno?: string;
}

/** Margen de un plazo (para el modo sin fecha y la coletilla). */
export interface MargenPlazo {
  tipo: 'dias' | 'horas';
  n: number;
}

/**
 * Instrucción de medicación en forma ESTRUCTURADA (idioma-independiente), para
 * poder renderizarla en castellano o catalán en la vista del paciente (§10.2, punto 4).
 */
export type InstruccionEstructurada =
  | { k: 'confirmacion' }
  | { k: 'no_cumplible' }
  | { k: 'mantener'; mv: Via }
  | { k: 'texto_fijo'; tx: string }
  | { k: 'suspender'; fecha: number; adelantada: boolean; horaOriginal?: string; margen: MargenPlazo }
  | { k: 'no_dia_iq' }
  | { k: 'insulina'; ins: InsulinaQr }
  | { k: 'margen'; margen: MargenPlazo };

export interface InstruccionPacienteEstructurada {
  nombre: string;
  plazoNoCumplible: boolean;
  e: InstruccionEstructurada;
}

/** Una línea de ayuno en el QR: código, horas antes y (opcional) cota del rango. */
export interface LineaAyunoQr {
  c: string;
  ha: number;
  hf?: number;
}

/** Ayuno estructurado en el QR (§8.14): se recalculan las horas de reloj con la fecha. */
export interface AyunoQr {
  /** Pauta pediátrica. */
  ped: boolean;
  /** Situación especial (código). */
  sit: string;
  /** Líneas del ayuno. */
  ln: LineaAyunoQr[];
}

/** Elementos condicionales de la hoja (§10.2). */
export interface ExtrasHojaQr {
  /** Traer la CPAP (SAOS). */
  cpap: boolean;
  /** Traer los inhaladores (asma/EPOC). */
  inhaladores: boolean;
  /** Traer la tarjeta del marcapasos/DAI (§5.1 bis). */
  tarjetaDispositivo?: boolean;
  /** Recomendaciones de prevención del delirium (§6.10). */
  delirium: boolean;
  /** Consejo de tabaco. */
  tabaco: boolean;
  /** Consejo/hoja de alcohol. */
  alcohol: boolean;
  /** Ids de las hojas anexas que aplican (§8.14 bis). */
  anexos: string[];
  /**
   * Claves de las secciones de la información de riesgos de la anestesia (§8.17) que
   * ve el paciente, según la técnica prevista. SOLO viajan las CLAVES (texto cortas);
   * el texto completo lo pinta la vista del paciente desde `riesgos_anestesia.json`.
   * Ausente o vacío = no se muestra el anexo de riesgos.
   */
  riesgos?: string[];
  /** Estado del consentimiento (§10) para la línea de la hoja del paciente. */
  cons?: 'entregado' | 'pendiente' | 'no_procede';
  /**
   * Revisión pendiente (§13 bis): hay puntos de validación clínica activos. Mientras
   * sea true, la hoja del paciente muestra el aviso de que el anestesiólogo revisará
   * su caso y, si es necesario, se pondrá en contacto.
   */
  revisionPendiente?: boolean;
  /**
   * Advertencia del sugammadex (§8.15) para la paciente con anticonceptivo hormonal
   * y posible anestesia general: 'oral' (equivale a olvidar una toma) o 'no_oral'
   * (método de barrera 7 días). Ausente si no procede (incluida la THS, que no es
   * anticonceptiva).
   */
  sugammadex?: 'oral' | 'no_oral';
  /**
   * Preparación para la operación (punto 9): los apartados «Higiene», «Joyas y
   * piercings» y «El día de la intervención» se muestran siempre que esto sea true.
   * El texto literal lo pinta la vista desde `preparacion.json` (en el QR solo viaja
   * esta clave).
   */
  prep?: boolean;
  /**
   * El paso 4 de «El día de la intervención» (bloqueo de nervios) solo se muestra si
   * hay un bloqueo entre las técnicas marcadas.
   */
  prepBloqueo?: boolean;
  /**
   * Claves de pruebas que el paciente tiene pero NO ha traído (punto 3): la hoja añade
   * la frase para traer o enviar el informe. Solo viajan las claves; el texto lo pinta
   * la vista con el correo de config.
   */
  pruebasNoTraidas?: string[];
}

/** Datos del paciente que viajan en el QR (campo `d` del Payload, §8.16d). */
export interface ContenidoQrPaciente {
  /** Teléfono del servicio (para el mensaje de plazo no cumplible). */
  tel: string;
  /** Fecha/hora de la intervención (epoch ms) o null si aún no se conoce. */
  fi: number | null;
  /** Fármacos. */
  far: FarmacoQr[];
  /** Ayuno estructurado (§8.14). */
  ay?: AyunoQr;
  /** Elementos condicionales de la hoja (§10.2). */
  ex?: ExtrasHojaQr;
}

/** Instrucción recalculada para un fármaco. */
export interface InstruccionPaciente {
  nombre: string;
  /** Texto para el paciente (margen si no hay fecha; fecha + margen si la hay). */
  texto: string;
  /** true si con la fecha dada el plazo ya no se puede cumplir (§8.16e). */
  plazoNoCumplible: boolean;
}

// ————————————————————— textos de margen (sin fecha, §8.16b) —————————————————————

function textoMargenSinFecha(f: FarmacoQr): string {
  switch (f.pt) {
    case 'dias':
      return `No lo tome los ${f.pd} días anteriores a la intervención ni ese mismo día.`;
    case 'horas':
      return `Su última toma debe ser como mínimo ${f.pd} horas antes de la hora de la intervención.`;
    case 'no_dia_iq':
      return 'No lo tome el día de la intervención.';
    case 'sin_plazo':
      return f.tx ?? '';
  }
}

/** Texto del margen entre paréntesis para añadir tras la fecha calculada (§8.16c). */
function coletillaMargen(f: FarmacoQr): string {
  switch (f.pt) {
    case 'dias':
      return ` (como mínimo ${f.pd} días antes de la intervención)`;
    case 'horas':
      return ` (como mínimo ${f.pd} horas antes de la intervención)`;
    default:
      return '';
  }
}

// ————————————————————— caducidad del QR (§8.16f) —————————————————————

const MS_DIA = 86_400_000;

/**
 * Caducidad (epoch ms) del QR del paciente:
 *  - Sin fecha de intervención: creación + diasSinFecha (90 por defecto).
 *  - Con fecha: fecha de intervención + diasConFecha (30 por defecto). Si el
 *    paciente introduce una fecha nueva, se recalcula sobre ella.
 */
export function caducidadQrPaciente(
  creacion: Date,
  fechaIntervencion: Date | null,
  diasConFecha = 30,
  diasSinFecha = 90,
): number {
  if (fechaIntervencion === null) {
    return creacion.getTime() + diasSinFecha * MS_DIA;
  }
  return fechaIntervencion.getTime() + diasConFecha * MS_DIA;
}

// ————————————————————— recálculo (§8.16) —————————————————————

/**
 * Recalcula todas las instrucciones del paciente a partir del contenido del QR.
 * @param contenido contenido decodificado del QR.
 * @param fechaIntervencion fecha/hora de la intervención; si es null, se usa la del
 *        contenido (contenido.fi). Si ambas son null → textos de margen (sin fecha).
 */
export function recalcularHoja(
  contenido: ContenidoQrPaciente,
  fechaIntervencion: Date | null = null,
  ahora: Date = new Date(),
): InstruccionPaciente[] {
  const fiMs = fechaIntervencion ? fechaIntervencion.getTime() : contenido.fi;
  const iv = fiMs !== null ? new Date(fiMs) : null;

  return contenido.far.map((f) => {
    // Requiere confirmación y NO confirmado: nunca se muestra la pauta, ni con
    // fecha ni sin ella. Se muestra la frase única de §12 (garantía §8.16/§12).
    if (f.rc && (f.cf === undefined || f.cf === '')) {
      return { nombre: f.n, texto: fraseNoConfirmado(f.n), plazoNoCumplible: false };
    }
    // Sin fecha: instrucción como margen, sin adelantos (§8.16b).
    if (iv === null) {
      return { nombre: f.n, texto: textoMargenSinFecha(f), plazoNoCumplible: false };
    }
    return recalcularFarmaco(f, iv, contenido.tel, ahora);
  });
}

/**
 * Versión ESTRUCTURADA del recálculo (para la vista del paciente en es/ca).
 * Devuelve, por fármaco, qué hay que decir sin texto ya redactado.
 */
export function recalcularHojaEstructurada(
  contenido: ContenidoQrPaciente,
  fechaIntervencion: Date | null = null,
  ahora: Date = new Date(),
): InstruccionPacienteEstructurada[] {
  const fiMs = fechaIntervencion ? fechaIntervencion.getTime() : contenido.fi;
  const iv = fiMs !== null ? new Date(fiMs) : null;
  return contenido.far.map((f) => instruccionEstructurada(f, iv, ahora));
}

function mantenerODeTexto(f: FarmacoQr): InstruccionEstructurada {
  if (f.mv) return { k: 'mantener', mv: f.mv };
  return { k: 'texto_fijo', tx: f.tx ?? '' };
}

function instruccionEstructurada(f: FarmacoQr, iv: Date | null, ahora: Date): InstruccionPacienteEstructurada {
  const base = { nombre: f.n, plazoNoCumplible: false };
  if (f.rc && (f.cf === undefined || f.cf === '')) {
    return { ...base, e: { k: 'confirmacion' } };
  }
  if (f.ins) {
    return { ...base, e: { k: 'insulina', ins: f.ins } };
  }
  if (iv === null) {
    if (f.pt === 'sin_plazo') return { ...base, e: mantenerODeTexto(f) };
    if (f.pt === 'no_dia_iq') return { ...base, e: { k: 'no_dia_iq' } };
    return { ...base, e: { k: 'margen', margen: { tipo: f.pt, n: f.pd ?? 0 } } };
  }
  if (f.pt === 'sin_plazo') return { ...base, e: mantenerODeTexto(f) };

  const pauta: PautaHoraria = { horas: f.hh };
  if (f.pt === 'no_dia_iq') {
    const ultima = ultimaTomaPorDias(iv, 0, pauta);
    if (plazoNoAlcanzable(ultima, ahora)) return { nombre: f.n, plazoNoCumplible: true, e: { k: 'no_cumplible' } };
    return { ...base, e: { k: 'no_dia_iq' } };
  }
  if (f.pt === 'dias') {
    const ultima = ultimaTomaPorDias(iv, f.pd ?? 0, pauta);
    if (plazoNoAlcanzable(ultima, ahora)) return { nombre: f.n, plazoNoCumplible: true, e: { k: 'no_cumplible' } };
    return { ...base, e: { k: 'suspender', fecha: ultima.getTime(), adelantada: false, margen: { tipo: 'dias', n: f.pd ?? 0 } } };
  }
  // horas
  const r = ultimaTomaPorHoras(iv, f.pd ?? 0, pauta, f.ad);
  if (plazoNoAlcanzable(r.ultimaToma, ahora)) return { nombre: f.n, plazoNoCumplible: true, e: { k: 'no_cumplible' } };
  const e: InstruccionEstructurada = {
    k: 'suspender',
    fecha: r.ultimaToma.getTime(),
    adelantada: r.tipo === 'adelantada',
    margen: { tipo: 'horas', n: f.pd ?? 0 },
  };
  if (r.tipo === 'adelantada' && r.horaOriginal) e.horaOriginal = `${String(r.horaOriginal.getHours()).padStart(2, '0')}:${String(r.horaOriginal.getMinutes()).padStart(2, '0')}`;
  return { ...base, e };
}

function recalcularFarmaco(f: FarmacoQr, iv: Date, telefono: string, ahora: Date): InstruccionPaciente {
  // Fármacos sin plazo calculable: texto fijo (mantener/consultar).
  if (f.pt === 'sin_plazo') {
    return { nombre: f.n, texto: f.tx ?? '', plazoNoCumplible: false };
  }

  const pauta: PautaHoraria = { horas: f.hh };

  let ultima: Date;
  let texto: string;
  if (f.pt === 'dias') {
    ultima = ultimaTomaPorDias(iv, f.pd ?? 0, pauta);
    texto = textoUltimaTomaDias(ultima);
  } else if (f.pt === 'horas') {
    const r = ultimaTomaPorHoras(iv, f.pd ?? 0, pauta, f.ad);
    ultima = r.ultimaToma;
    texto = textoUltimaToma(r);
  } else {
    // no_dia_iq: última toma el día previo a la hora habitual más tardía.
    ultima = ultimaTomaPorDias(iv, 0, pauta);
    texto = `No lo tome el día de la intervención.`;
  }

  // Plazo ya no cumplible con esta fecha (§8.16e): no se da pauta, se remite al teléfono.
  if (plazoNoAlcanzable(ultima, ahora)) {
    return {
      nombre: f.n,
      texto: `Con esta fecha ya no es posible seguir la pauta de ${f.n}. Llame al ${telefono} lo antes posible.`,
      plazoNoCumplible: true,
    };
  }

  // Con fecha: la instrucción con fecha + el margen entre paréntesis (§8.16c).
  return { nombre: f.n, texto: `${texto}${coletillaMargen(f)}`, plazoNoCumplible: false };
}
