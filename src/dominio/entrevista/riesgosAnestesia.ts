/**
 * Qué información de riesgos de la anestesia ve el paciente (§8.17).
 *
 * A partir de la técnica prevista (y sus subcampos del paso 7), la edad y los datos
 * oftalmológicos, se decide la LISTA DE SECCIONES (claves cortas) que se mostrarán
 * en la hoja/QR del paciente. El TEXTO de cada sección NO vive aquí: está en
 * `datos/textos/{es,ca}/riesgos_anestesia.json` y lo pinta la vista del paciente.
 *
 * IMPORTANTE: estos subcampos SOLO deciden qué información ve el paciente. NO cambian
 * ninguna regla de medicación ni ningún plazo (para las reglas, una técnica neuroaxial
 * sigue siendo «neuroaxial»).
 *
 * Las claves se mantienen CORTAS a propósito: viajan en el QR (`ExtrasHojaQr.riesgos`)
 * y el presupuesto del QR es ajustado.
 */
import type { DatosIntervencion } from '../tipos.ts';

/** Claves de sección de la información de riesgos (§8.17). */
export type ClaveRiesgo =
  | 'general'
  | 'raquidea'
  | 'epidural_combinada'
  | 'bloqueo'
  | 'sedacion'
  | 'nino'
  | 'local_sola'
  | 'epidural_no_especificada'
  | 'bloqueo_ojo'
  | 'bloqueo_hombro_brazo';

export interface EntradaRiesgos {
  tecnica: DatosIntervencion['tecnica'];
  neuroaxialProbable: boolean;
  subtipoNeuroaxial?: DatosIntervencion['subtipoNeuroaxial'];
  combinadaConGeneral?: boolean;
  conSedacion?: boolean;
  grupoOftalmologico: DatosIntervencion['grupoOftalmologico'];
  /** El procedimiento es oftalmológico (especialidad). */
  oftalmologico: boolean;
  /** El procedimiento es de hombro o brazo (añade el párrafo de bloqueo de miembro superior). */
  bloqueoMiembroSuperior?: boolean;
  edadAnios: number;
  /** Edad a partir de la cual se usa la sección de adulto en vez de la de niño (§config). */
  edadPediatricaMaxima: number;
}

/**
 * Devuelve las claves de sección a mostrar, en orden de presentación. Vacío si no
 * procede mostrar nada (p. ej. técnica desconocida sin pistas, o sin datos).
 */
export function seccionesRiesgoAnestesia(e: EntradaRiesgos): ClaveRiesgo[] {
  const esNino = e.edadAnios <= e.edadPediatricaMaxima;
  const claves: ClaveRiesgo[] = [];

  // La sección «general» se sustituye por «nino» en pacientes pediátricos.
  const seccionGeneral: ClaveRiesgo = esNino ? 'nino' : 'general';
  const anadir = (c: ClaveRiesgo) => { if (!claves.includes(c)) claves.push(c); };

  // Oftalmología: tópica → sedación; retrobulbar/peribulbar → sedación + bloqueo del ojo.
  if (e.oftalmologico) {
    if (e.tecnica === 'topica') { anadir('sedacion'); return claves; }
    if (e.tecnica === 'retrobulbar_peribulbar') { anadir('sedacion'); anadir('bloqueo_ojo'); return claves; }
    // general/sedación oftálmicas siguen la lógica común de abajo.
  }

  // Técnica neuroaxial efectiva (incluye «no se sabe» con neuroaxial probable).
  const esNeuroaxial = e.tecnica === 'neuroaxial' || (e.tecnica === 'no_se_sabe' && e.neuroaxialProbable);
  const esBloqueo = e.tecnica === 'bloqueo_periferico' || e.tecnica === 'bloqueo_profundo';

  switch (e.tecnica) {
    case 'general':
      anadir(seccionGeneral);
      break;
    case 'sedacion':
      anadir('sedacion');
      break;
    case 'local':
      // Local sin sedación: solo la frase breve (ninguna sección de riesgos extensa).
      anadir('local_sola');
      break;
    case 'no_se_sabe':
      // Sin técnica decidida: si NO es neuroaxial probable, se da la información más
      // general (anestesia general, o la de niño). Si es neuroaxial probable, se trata
      // como neuroaxial (más abajo), sin la sección general.
      if (!e.neuroaxialProbable) anadir(seccionGeneral);
      break;
    default:
      break;
  }

  if (esNeuroaxial) {
    if (e.subtipoNeuroaxial === 'raquidea') {
      anadir('raquidea');
    } else if (e.subtipoNeuroaxial === 'epidural' || e.subtipoNeuroaxial === 'combinada') {
      anadir('epidural_combinada');
    } else {
      // Sin especificar: se muestra la raquídea y una frase sobre la epidural.
      anadir('raquidea');
      anadir('epidural_no_especificada');
    }
  }

  if (esBloqueo) {
    // El bloqueo profundo usa la misma sección que el bloqueo periférico.
    anadir('bloqueo');
    // El párrafo de hombro/brazo solo aparece si el procedimiento es de esa zona.
    if (e.bloqueoMiembroSuperior) anadir('bloqueo_hombro_brazo');
  }

  // Combinaciones (solo para neuroaxial y bloqueo): «con general» y «con sedación».
  if ((esNeuroaxial || esBloqueo) && e.combinadaConGeneral) anadir(seccionGeneral);
  if ((esNeuroaxial || esBloqueo) && e.conSedacion) anadir('sedacion');

  return claves;
}

/**
 * Texto legible de la técnica prevista para el resumen del anestesiólogo (§8.17),
 * incluyendo los subcampos (subtipo neuroaxial, «con general», «con sedación»).
 */
export function textoTecnicaPrevista(e: {
  tecnica: DatosIntervencion['tecnica'];
  subtipoNeuroaxial?: DatosIntervencion['subtipoNeuroaxial'];
  combinadaConGeneral?: boolean;
  conSedacion?: boolean;
}): string {
  const BASE: Record<DatosIntervencion['tecnica'], string> = {
    general: 'Anestesia general',
    sedacion: 'Sedación',
    neuroaxial: 'Neuroaxial',
    bloqueo_periferico: 'Bloqueo periférico',
    bloqueo_profundo: 'Bloqueo profundo',
    local: 'Anestesia local',
    topica: 'Tópica',
    retrobulbar_peribulbar: 'Retrobulbar o peribulbar',
    no_se_sabe: 'Sin decidir',
  };
  let txt = BASE[e.tecnica];
  if (e.tecnica === 'neuroaxial') {
    const SUB: Record<NonNullable<DatosIntervencion['subtipoNeuroaxial']>, string> = {
      raquidea: 'raquídea',
      epidural: 'epidural',
      combinada: 'combinada raquídea-epidural',
    };
    if (e.subtipoNeuroaxial) txt += ` (${SUB[e.subtipoNeuroaxial]})`;
  }
  const extras: string[] = [];
  if (e.combinadaConGeneral) extras.push('combinada con anestesia general');
  if (e.conSedacion) extras.push('con sedación');
  if (extras.length > 0) txt += `, ${extras.join(' y ')}`;
  return txt;
}
