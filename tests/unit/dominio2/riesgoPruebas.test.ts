/**
 * Derivación de clase de riesgo del paciente y pruebas complementarias (§7) desde
 * los módulos. Caso pedido por el servicio: EPOC en un paciente de 40 años con una
 * colecistectomía debe cambiar las pruebas propuestas.
 */
import { describe, it, expect } from '../../_harness.ts';
import { derivarRiesgoYPruebas, type EntradaRiesgoPruebas } from '../../../src/dominio/entrevista/riesgoYPruebas.ts';

function base(p: Partial<EntradaRiesgoPruebas> = {}): EntradaRiesgoPruebas {
  return {
    respuestas: {},
    enfermedades: new Set(),
    edadAnios: 40,
    imc: 24,
    hemstopPositivo: false,
    medicacionGrupos: new Set(),
    riesgoCardiovascular: 'intermedio', // colecistectomía laparoscópica
    riesgoHemorragico: 'bajo',
    neuroaxialProbable: false,
    tecnicas: ['general'],
    ...p,
  };
}
const nombres = (r: ReturnType<typeof derivarRiesgoYPruebas>) => r.pruebas.map((p) => p.prueba).sort();

describe('§7 · clase de riesgo y pruebas desde módulos', () => {
  it('40 años sano + colecistectomía: clase bajo → solo hemograma y coagulación', () => {
    const r = derivarRiesgoYPruebas(base());
    expect(r.clase.clase).toBe('bajo');
    expect(nombres(r)).toEqual(['coagulacion', 'hemograma']);
  });

  it('40 años + EPOC + colecistectomía: clase moderado → se añaden bioquímica y ECG', () => {
    const r = derivarRiesgoYPruebas(base({
      enfermedades: new Set(['asma_epoc']),
      respuestas: { asma_epoc: { enfermedad: 'epoc' } },
    }));
    expect(r.clase.clase).toBe('moderado');
    expect(nombres(r)).toEqual(['bioquimica', 'coagulacion', 'ecg', 'hemograma']);
  });

  it('EPOC con oxígeno domiciliario: clase alto', () => {
    const r = derivarRiesgoYPruebas(base({
      enfermedades: new Set(['asma_epoc']),
      respuestas: { asma_epoc: { enfermedad: 'epoc', oxigeno_domiciliario: true } },
    }));
    expect(r.clase.clase).toBe('alto');
  });
});
