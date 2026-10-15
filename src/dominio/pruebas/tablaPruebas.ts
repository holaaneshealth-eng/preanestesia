/**
 * Pruebas complementarias — docs/documento_fuente.md §7 (tabla de decisión y validez).
 * Decide qué pruebas pedir según riesgo quirúrgico × clase de riesgo del paciente,
 * con las excepciones de las notas *, ** y ***. La sulodexida NO interviene aquí (§7.3).
 */
import type { RiesgoCardiovascular } from '../tipos.ts';
import type { ClaseRiesgoPaciente } from '../riesgo/claseRiesgoPaciente.ts';

export type Prueba =
  | 'hemograma'
  | 'coagulacion'
  | 'bioquimica'
  | 'ecg'
  | 'rx_torax'
  | 'ecocardiograma'
  | 'bnp'
  | 'troponina';

export interface PruebaSolicitada {
  prueba: Prueba;
  motivo: string;
}

/** Factores del paciente relevantes para las excepciones de la tabla. */
export interface FactoresPruebas {
  /** Sospecha o antecedente de anemia (Hb < 13) — nota *. */
  anemiaOHbBaja: boolean;
  /** Trastorno de la coagulación o anticoagulante — nota *. */
  trastornoCoagulacionOAnticoagulante: boolean;
  /** Posibilidad de anestesia regional (neuroaxial o bloqueo periférico) — nota *. */
  anestesiaRegionalPosible: boolean;
  /** Sangrado importante previsible — nota *. */
  sangradoPrevisible: boolean;
  /** HEMSTOP positivo (≥ 2) — nota * y §5.5. */
  hemstopPositivo: boolean;
  /** Supuestos de Rx de tórax (nota ***): síntoma/enfermedad pulmonar nueva o empeoramiento. */
  supuestoRxTorax: boolean;
  /** Ecocardiograma (§7.3): sospecha/valvulopatía sin eco reciente/empeoramiento. */
  supuestoEcocardiograma: boolean;
  /** Comorbilidad cardiovascular significativa (nota **): cardiopatía isquémica, IC,
   *  valvulopatía moderada-grave, FA/arritmia, arteriopatía periférica o aneurisma de
   *  aorta, ictus/AIT previo, miocardiopatía, hipertensión pulmonar. La HTA aislada NO cuenta. */
  comorbilidadCardiovascularSignificativa: boolean;
  /** Fragilidad (CFS ≥ 5) — nota **. */
  fragilidad: boolean;
  /** Capacidad funcional reducida (< 4 METs o DASI ≤ 34) — nota **. */
  capacidadFuncionalReducida: boolean;
  /**
   * Troponina ultrasensible indicada por el criterio ESC 2022: cirugía de riesgo
   * intermedio o alto en pacientes con enfermedad cardiovascular conocida, factores
   * de riesgo cardiovascular (incluida la edad ≥ 65) o síntomas sugestivos. El
   * llamador ya resuelve «el paciente cumple el perfil»; aquí se combina con el riesgo
   * quirúrgico (intermedio/alto).
   */
  perfilTroponinaEsc2022: boolean;
}

/**
 * Vigencia de cada prueba el día de la intervención (§7.4). Una prueba marcada
 * como vigente (`true`) se descuenta de la lista: no se vuelve a pedir. `undefined`
 * o `false` ⇒ se pide si la tabla la indica. Lo calcula el llamador con
 * {@link pruebaVigente} a partir de las fechas de pruebas recientes del paciente.
 */
export type VigenciaPruebas = Partial<Record<Prueba, boolean>>;

const CLASES_QUE_PIDEN = new Set<ClaseRiesgoPaciente>(['bajo-moderado', 'moderado', 'alto']);

/**
 * Aplica la tabla de decisión §7.3.
 * @param riesgoQuirurgico riesgo cardiovascular del procedimiento (bajo/intermedio/alto).
 * @param clasePaciente clase de riesgo del paciente (§7.2).
 * @param f factores para las excepciones.
 */
export function decidirPruebas(
  riesgoQuirurgico: RiesgoCardiovascular,
  clasePaciente: ClaseRiesgoPaciente,
  f: FactoresPruebas,
  vigentes: VigenciaPruebas = {},
): PruebaSolicitada[] {
  const out: PruebaSolicitada[] = [];
  const pacientePide = CLASES_QUE_PIDEN.has(clasePaciente);

  // —— Hemograma y coagulación ——
  if (riesgoQuirurgico === 'intermedio' || riesgoQuirurgico === 'alto') {
    out.push({ prueba: 'hemograma', motivo: `cirugía de riesgo ${riesgoQuirurgico}` });
    out.push({ prueba: 'coagulacion', motivo: `cirugía de riesgo ${riesgoQuirurgico}` });
  } else {
    // Cirugía de bajo riesgo.
    if (pacientePide) {
      out.push({ prueba: 'hemograma', motivo: `paciente clase ${clasePaciente}` });
      out.push({ prueba: 'coagulacion', motivo: `paciente clase ${clasePaciente}` });
    } else {
      // Nota *: paciente de bajo riesgo + cirugía de bajo riesgo.
      const motivos: string[] = [];
      if (f.anemiaOHbBaja) motivos.push('sospecha/antecedente de anemia');
      if (f.trastornoCoagulacionOAnticoagulante) motivos.push('trastorno de coagulación o anticoagulante');
      if (f.anestesiaRegionalPosible) motivos.push('posible anestesia regional');
      if (f.sangradoPrevisible) motivos.push('sangrado importante previsible');
      if (f.hemstopPositivo) motivos.push('HEMSTOP positivo');
      if (motivos.length > 0) {
        const motivo = `nota *: ${motivos.join(', ')}`;
        out.push({ prueba: 'hemograma', motivo });
        out.push({ prueba: 'coagulacion', motivo });
      }
    }
  }

  // —— Bioquímica y ECG: sí desde bajo-moderado en adelante (cualquier cirugía) ——
  if (pacientePide) {
    out.push({ prueba: 'bioquimica', motivo: `paciente clase ${clasePaciente}` });
    out.push({ prueba: 'ecg', motivo: `paciente clase ${clasePaciente}` });
  } else if (riesgoQuirurgico === 'alto') {
    // Paciente de bajo riesgo pero cirugía de alto riesgo: ECG sí (tabla), bioquímica no.
    out.push({ prueba: 'ecg', motivo: 'cirugía de alto riesgo' });
  }

  // —— Rx de tórax ——
  // Regla base de la tabla: intermedio+alto(paciente) o alto+(bajo-moderado en adelante).
  const rxPorTabla =
    (riesgoQuirurgico === 'intermedio' && clasePaciente === 'alto') ||
    (riesgoQuirurgico === 'alto' && pacientePide);
  if (rxPorTabla || f.supuestoRxTorax) {
    out.push({
      prueba: 'rx_torax',
      motivo: f.supuestoRxTorax ? 'nota ***: sospecha/empeoramiento pulmonar' : `tabla (${riesgoQuirurgico}/${clasePaciente})`,
    });
  }

  // —— BNP o NT-proBNP (nota **) ——
  // Solo en cirugía de riesgo intermedio o alto, con comorbilidad cardiovascular
  // significativa, fragilidad (CFS ≥ 5) o capacidad funcional reducida (< 4 METs).
  if (riesgoQuirurgico === 'intermedio' || riesgoQuirurgico === 'alto') {
    const motivosBnp: string[] = [];
    if (f.comorbilidadCardiovascularSignificativa) motivosBnp.push('comorbilidad cardiovascular significativa');
    if (f.fragilidad) motivosBnp.push('fragilidad (CFS ≥ 5)');
    if (f.capacidadFuncionalReducida) motivosBnp.push('capacidad funcional reducida (< 4 METs)');
    if (motivosBnp.length > 0) {
      out.push({ prueba: 'bnp', motivo: `nota **: cirugía de riesgo ${riesgoQuirurgico} con ${motivosBnp.join(', ')}` });
    }
  }

  // —— Troponina ultrasensible (ESC 2022) ——
  // Cirugía de riesgo intermedio o alto en pacientes con enfermedad cardiovascular
  // conocida, factores de riesgo cardiovascular (incluida la edad ≥ 65) o síntomas.
  if ((riesgoQuirurgico === 'intermedio' || riesgoQuirurgico === 'alto') && f.perfilTroponinaEsc2022) {
    out.push({ prueba: 'troponina', motivo: `troponina basal (ESC 2022): cirugía de riesgo ${riesgoQuirurgico} con perfil de riesgo cardiovascular` });
  }

  // —— Ecocardiograma (§7.3) ——
  if (f.supuestoEcocardiograma) {
    out.push({ prueba: 'ecocardiograma', motivo: 'sospecha o valvulopatía sin eco reciente/empeoramiento' });
  }

  // Descontar las pruebas que siguen vigentes el día de la intervención (§7.4).
  return dedupe(out).filter((p) => vigentes[p.prueba] !== true);
}

function dedupe(ps: PruebaSolicitada[]): PruebaSolicitada[] {
  const vistas = new Set<Prueba>();
  const out: PruebaSolicitada[] = [];
  for (const p of ps) {
    if (!vistas.has(p.prueba)) {
      vistas.add(p.prueba);
      out.push(p);
    }
  }
  return out;
}

// —————————————————— Validez de pruebas (§7.4) ——————————————————

/**
 * Pruebas con fecha de caducidad conocida (§7.4). El BNP/NT-proBNP se pide por
 * indicación (nota **), no se "renueva" por fecha, así que no tiene ventana de
 * validez y no entra en {@link VALIDEZ_DIAS} ni en {@link pruebaVigente}.
 */
export type PruebaConVigencia = Exclude<Prueba, 'bnp' | 'troponina'>;

export const VALIDEZ_DIAS: Record<PruebaConVigencia, number> = {
  hemograma: 30,
  bioquimica: 30,
  coagulacion: 14,
  ecg: 90,
  rx_torax: 90,
  ecocardiograma: 365, // 18 meses (548) si función ventricular conocida y estable
};

export const ECO_VALIDEZ_ESTABLE_DIAS = 548;

/**
 * ¿Sigue vigente la prueba el día de la intervención (o la fecha de referencia)?
 * Si caduca antes, se pide. §7.4.
 * @param prueba tipo de prueba (con ventana de validez).
 * @param fechaPrueba fecha en que se hizo.
 * @param fechaReferencia fecha prevista de la intervención (o, sin fecha, "hoy").
 * @param ecoEstable solo para ecocardiograma: función ventricular conocida y estable.
 */
export function pruebaVigente(
  prueba: PruebaConVigencia,
  fechaPrueba: Date,
  fechaReferencia: Date,
  ecoEstable = false,
): boolean {
  const dias =
    prueba === 'ecocardiograma' && ecoEstable ? ECO_VALIDEZ_ESTABLE_DIAS : VALIDEZ_DIAS[prueba];
  const caducidad = new Date(fechaPrueba.getTime() + dias * 86_400_000);
  return caducidad.getTime() >= fechaReferencia.getTime();
}
