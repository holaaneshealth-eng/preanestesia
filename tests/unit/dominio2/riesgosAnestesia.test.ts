/**
 * Qué secciones de información de riesgos de la anestesia ve el paciente según las
 * técnicas marcadas (§8.17), y el texto de la técnica prevista para el resumen. Estos
 * campos SOLO deciden la información del paciente; no cambian ninguna regla (eso lo
 * garantiza la batería de casos de referencia, que no varía).
 */
import { describe, it, expect } from '../../_harness.ts';
import { seccionesRiesgoAnestesia, textoTecnicaPrevista } from '../../../src/dominio/entrevista/riesgosAnestesia.ts';
import type { TecnicaAnestesica } from '../../../src/dominio/tipos.ts';

const BASE = {
  neuroaxialProbable: false,
  grupoOftalmologico: 'no_aplica' as const,
  oftalmologico: false,
  edadAnios: 45,
  edadPediatricaMaxima: 17,
};
const con = (tecnicas: TecnicaAnestesica[], extra = {}) => seccionesRiesgoAnestesia({ ...BASE, tecnicas, ...extra });

describe('§8.17 · seccionesRiesgoAnestesia', () => {
  it('general en adulto → sección general', () => {
    expect(con(['general'])).toEqual(['general']);
  });

  it('general en niño → sección niño en vez de general', () => {
    expect(con(['general'], { edadAnios: 6 })).toEqual(['nino']);
  });

  it('raquídea (subtipo raquídea) → solo raquídea', () => {
    expect(con(['neuroaxial'], { subtipoNeuroaxial: 'raquidea' })).toEqual(['raquidea']);
  });

  it('epidural o combinada → sección epidural y combinada', () => {
    expect(con(['neuroaxial'], { subtipoNeuroaxial: 'epidural' })).toEqual(['epidural_combinada']);
    expect(con(['neuroaxial'], { subtipoNeuroaxial: 'combinada' })).toEqual(['epidural_combinada']);
  });

  it('neuroaxial sin subtipo → raquídea + frase de epidural', () => {
    expect(con(['neuroaxial'])).toEqual(['raquidea', 'epidural_no_especificada']);
  });

  it('«no se sabe» con neuroaxial probable → como neuroaxial', () => {
    expect(con(['no_se_sabe'], { neuroaxialProbable: true })).toEqual(['raquidea', 'epidural_no_especificada']);
  });

  it('raquídea + sedación (dos técnicas marcadas) → sedación y raquídea', () => {
    expect(con(['neuroaxial', 'sedacion'], { subtipoNeuroaxial: 'raquidea' }))
      .toEqual(['sedacion', 'raquidea']);
  });

  it('general + bloqueo (dos técnicas marcadas) → general y bloqueo', () => {
    expect(con(['general', 'bloqueo_periferico'])).toEqual(['general', 'bloqueo']);
  });

  it('bloqueo + general en niño → niño y bloqueo', () => {
    expect(con(['general', 'bloqueo_periferico'], { edadAnios: 6 })).toEqual(['nino', 'bloqueo']);
  });

  it('bloqueo periférico → sección bloqueo; profundo usa la misma', () => {
    expect(con(['bloqueo_periferico'])).toEqual(['bloqueo']);
    expect(con(['bloqueo_profundo'])).toEqual(['bloqueo']);
  });

  it('bloqueo de hombro/brazo añade el párrafo propio', () => {
    expect(con(['bloqueo_periferico'], { bloqueoMiembroSuperior: true }))
      .toEqual(['bloqueo', 'bloqueo_hombro_brazo']);
  });

  it('sedación sola → sección sedación', () => {
    expect(con(['sedacion'])).toEqual(['sedacion']);
  });

  it('local sin sedación → solo la frase de local', () => {
    expect(con(['local'])).toEqual(['local_sola']);
  });

  it('local + sedación → sedación (la frase de local no aparece si hay otra sección)', () => {
    expect(con(['local', 'sedacion'])).toEqual(['sedacion']);
  });

  it('oftalmología tópica → sedación', () => {
    expect(con(['topica'], { oftalmologico: true, grupoOftalmologico: 'riesgo_bajo' })).toEqual(['sedacion']);
  });

  it('oftalmología retrobulbar/peribulbar → sedación + frase del bloqueo del ojo', () => {
    expect(con(['retrobulbar_peribulbar'], { oftalmologico: true, grupoOftalmologico: 'riesgo_moderado_alto' }))
      .toEqual(['sedacion', 'bloqueo_ojo']);
  });

  it('«no se sabe» sin neuroaxial probable → sección general (adulto)', () => {
    expect(con(['no_se_sabe'])).toEqual(['general']);
  });

  it('«no se sabe» sin neuroaxial probable, niño → sección niño', () => {
    expect(con(['no_se_sabe'], { edadAnios: 6 })).toEqual(['nino']);
  });

  it('sin ninguna técnica → ninguna sección', () => {
    expect(con([])).toEqual([]);
  });
});

describe('§8.17 · textoTecnicaPrevista', () => {
  it('neuroaxial con subtipo', () => {
    expect(textoTecnicaPrevista({ tecnicas: ['neuroaxial'], subtipoNeuroaxial: 'raquidea' }))
      .toBe('Neuroaxial (raquídea)');
  });

  it('dos técnicas marcadas se listan con «+»', () => {
    expect(textoTecnicaPrevista({ tecnicas: ['neuroaxial', 'sedacion'], subtipoNeuroaxial: 'raquidea' }))
      .toBe('Neuroaxial (raquídea) + sedación');
    expect(textoTecnicaPrevista({ tecnicas: ['general', 'bloqueo_periferico'] }))
      .toBe('Anestesia general + bloqueo periférico');
  });

  it('sin técnicas → «Sin decidir»', () => {
    expect(textoTecnicaPrevista({ tecnicas: [] })).toBe('Sin decidir');
  });
});
