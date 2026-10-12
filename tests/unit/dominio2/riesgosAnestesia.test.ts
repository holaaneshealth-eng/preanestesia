/**
 * Qué secciones de información de riesgos de la anestesia ve el paciente según la
 * técnica (§8.17), y el texto de la técnica prevista para el resumen. Estos subcampos
 * SOLO deciden la información del paciente; no cambian ninguna regla (eso lo garantiza
 * la batería de casos de referencia, que no varía).
 */
import { describe, it, expect } from '../../_harness.ts';
import { seccionesRiesgoAnestesia, textoTecnicaPrevista } from '../../../src/dominio/entrevista/riesgosAnestesia.ts';

const BASE = {
  neuroaxialProbable: false,
  grupoOftalmologico: 'no_aplica' as const,
  oftalmologico: false,
  edadAnios: 45,
  edadPediatricaMaxima: 17,
};

describe('§8.17 · seccionesRiesgoAnestesia', () => {
  it('general en adulto → sección general', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'general' })).toEqual(['general']);
  });

  it('general en niño → sección niño en vez de general', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'general', edadAnios: 6 })).toEqual(['nino']);
  });

  it('raquídea (subtipo raquídea) → solo raquídea', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'raquidea' }))
      .toEqual(['raquidea']);
  });

  it('epidural o combinada → sección epidural y combinada', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'epidural' }))
      .toEqual(['epidural_combinada']);
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'combinada' }))
      .toEqual(['epidural_combinada']);
  });

  it('neuroaxial sin subtipo → raquídea + frase de epidural', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial' }))
      .toEqual(['raquidea', 'epidural_no_especificada']);
  });

  it('neuroaxial «no se sabe» con neuroaxial probable → como neuroaxial', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'no_se_sabe', neuroaxialProbable: true }))
      .toEqual(['raquidea', 'epidural_no_especificada']);
  });

  it('raquídea + «con sedación» añade la sedación', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'raquidea', conSedacion: true }))
      .toEqual(['raquidea', 'sedacion']);
  });

  it('raquídea + «combinada con general» añade general (o niño si procede)', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'raquidea', combinadaConGeneral: true }))
      .toEqual(['raquidea', 'general']);
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'neuroaxial', subtipoNeuroaxial: 'raquidea', combinadaConGeneral: true, edadAnios: 6 }))
      .toEqual(['raquidea', 'nino']);
  });

  it('bloqueo periférico → sección bloqueo; profundo usa la misma', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'bloqueo_periferico' })).toEqual(['bloqueo']);
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'bloqueo_profundo' })).toEqual(['bloqueo']);
  });

  it('bloqueo de hombro/brazo añade el párrafo propio', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'bloqueo_periferico', bloqueoMiembroSuperior: true }))
      .toEqual(['bloqueo', 'bloqueo_hombro_brazo']);
  });

  it('bloqueo + sedación + general', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'bloqueo_periferico', conSedacion: true, combinadaConGeneral: true }))
      .toEqual(['bloqueo', 'general', 'sedacion']);
  });

  it('sedación sola → sección sedación', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'sedacion' })).toEqual(['sedacion']);
  });

  it('local sin sedación → solo la frase de local', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'local' })).toEqual(['local_sola']);
  });

  it('oftalmología tópica → sedación', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'topica', oftalmologico: true, grupoOftalmologico: 'riesgo_bajo' }))
      .toEqual(['sedacion']);
  });

  it('oftalmología retrobulbar/peribulbar → sedación + frase del bloqueo del ojo', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'retrobulbar_peribulbar', oftalmologico: true, grupoOftalmologico: 'riesgo_moderado_alto' }))
      .toEqual(['sedacion', 'bloqueo_ojo']);
  });

  it('«no se sabe» sin neuroaxial probable → sección general (adulto)', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'no_se_sabe' })).toEqual(['general']);
  });

  it('«no se sabe» sin neuroaxial probable, niño → sección niño', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'no_se_sabe', edadAnios: 6 })).toEqual(['nino']);
  });

  it('«no se sabe» con neuroaxial probable → como neuroaxial (sin general)', () => {
    expect(seccionesRiesgoAnestesia({ ...BASE, tecnica: 'no_se_sabe', neuroaxialProbable: true }))
      .toEqual(['raquidea', 'epidural_no_especificada']);
  });
});

describe('§8.17 · textoTecnicaPrevista', () => {
  it('neuroaxial con subtipo y combinaciones', () => {
    expect(textoTecnicaPrevista({ tecnica: 'neuroaxial', subtipoNeuroaxial: 'raquidea', conSedacion: true }))
      .toBe('Neuroaxial (raquídea), con sedación');
    expect(textoTecnicaPrevista({ tecnica: 'neuroaxial', subtipoNeuroaxial: 'combinada', combinadaConGeneral: true, conSedacion: true }))
      .toBe('Neuroaxial (combinada raquídea-epidural), combinada con anestesia general y con sedación');
  });

  it('técnica simple sin subcampos', () => {
    expect(textoTecnicaPrevista({ tecnica: 'general' })).toBe('Anestesia general');
    expect(textoTecnicaPrevista({ tecnica: 'bloqueo_periferico', combinadaConGeneral: true })).toBe('Bloqueo periférico, combinada con anestesia general');
  });
});
