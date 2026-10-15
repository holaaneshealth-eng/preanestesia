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
  /** Técnicas marcadas en el paso 7 (puede haber varias). */
  tecnicas: DatosIntervencion['tecnicas'];
  neuroaxialProbable: boolean;
  subtipoNeuroaxial?: DatosIntervencion['subtipoNeuroaxial'];
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
 * Devuelve las claves de sección a mostrar, en orden de presentación. Con varias
 * técnicas marcadas, se muestran las secciones de TODAS. Vacío si no procede nada.
 */
export function seccionesRiesgoAnestesia(e: EntradaRiesgos): ClaveRiesgo[] {
  const esNino = e.edadAnios <= e.edadPediatricaMaxima;
  const claves: ClaveRiesgo[] = [];
  // La sección «general» se sustituye por «nino» en pacientes pediátricos.
  const seccionGeneral: ClaveRiesgo = esNino ? 'nino' : 'general';
  const anadir = (c: ClaveRiesgo) => { if (!claves.includes(c)) claves.push(c); };

  const tecnicas = e.tecnicas;
  const esNeuroaxial = tecnicas.includes('neuroaxial');
  const esBloqueo = tecnicas.includes('bloqueo_periferico') || tecnicas.includes('bloqueo_profundo');

  // Oftalmología: tópica → sedación; retrobulbar/peribulbar → sedación + bloqueo del ojo.
  if (e.oftalmologico) {
    if (tecnicas.includes('topica')) anadir('sedacion');
    if (tecnicas.includes('retrobulbar_peribulbar')) { anadir('sedacion'); anadir('bloqueo_ojo'); }
    if (tecnicas.includes('general')) anadir(seccionGeneral);
    if (tecnicas.includes('sedacion')) anadir('sedacion');
    // En oftalmología no hay neuroaxial/bloqueo/local; si ya hay algo, devolver.
    if (claves.length > 0) return claves;
  }

  if (tecnicas.includes('general')) anadir(seccionGeneral);
  if (tecnicas.includes('sedacion')) anadir('sedacion');

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

  // Anestesia local: solo la frase breve, y solo si no hay ninguna otra sección.
  if (tecnicas.includes('local') && claves.length === 0) anadir('local_sola');

  // «No se sabe» sin ninguna otra técnica efectiva: si NO es neuroaxial probable, se
  // da la información general (o la de niño); si es probable, se trata como neuroaxial.
  if (tecnicas.includes('no_se_sabe') && claves.length === 0) {
    if (e.neuroaxialProbable) {
      anadir('raquidea');
      anadir('epidural_no_especificada');
    } else {
      anadir(seccionGeneral);
    }
  }

  return claves;
}

/**
 * Texto legible de las técnicas previstas para el resumen del anestesiólogo (§8.17).
 * Con varias técnicas, se listan todas; el subtipo acompaña a la neuroaxial.
 */
export function textoTecnicaPrevista(e: {
  tecnicas: DatosIntervencion['tecnicas'];
  subtipoNeuroaxial?: DatosIntervencion['subtipoNeuroaxial'];
}): string {
  const BASE: Record<DatosIntervencion['tecnicas'][number], string> = {
    general: 'anestesia general',
    sedacion: 'sedación',
    neuroaxial: 'neuroaxial',
    bloqueo_periferico: 'bloqueo periférico',
    bloqueo_profundo: 'bloqueo profundo',
    local: 'anestesia local',
    topica: 'tópica',
    retrobulbar_peribulbar: 'retrobulbar o peribulbar',
    no_se_sabe: 'sin decidir',
  };
  if (e.tecnicas.length === 0) return 'Sin decidir';
  const SUB: Record<NonNullable<DatosIntervencion['subtipoNeuroaxial']>, string> = {
    raquidea: 'raquídea',
    epidural: 'epidural',
    combinada: 'combinada raquídea-epidural',
  };
  const partes = e.tecnicas.map((t) => {
    if (t === 'neuroaxial' && e.subtipoNeuroaxial) return `${BASE[t]} (${SUB[e.subtipoNeuroaxial]})`;
    return BASE[t];
  });
  // Primera letra en mayúscula.
  const txt = partes.join(' + ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
