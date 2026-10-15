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

  // —— Troponina ultrasensible (ESC 2022): mismo grupo que el NT-proBNP ——
  it('troponina y BNP juntos cuando hay comorbilidad CV significativa en cirugía intermedia', () => {
    const r = derivarRiesgoYPruebas(base({ enfermedades: new Set(['insuficiencia_cardiaca']) }));
    const n = nombres(r);
    expect(n).toContain('troponina');
    expect(n).toContain('bnp');
  });

  it('troponina por fragilidad (CFS ≥ 5) en cirugía intermedia', () => {
    const r = derivarRiesgoYPruebas(base({ fragilidad: true }));
    expect(nombres(r)).toContain('troponina');
  });

  it('HTA, diabetes o edad ≥ 65 por sí solas NO indican troponina ni BNP', () => {
    const r = derivarRiesgoYPruebas(base({ edadAnios: 75, enfermedades: new Set(['hta', 'diabetes']) }));
    const n = nombres(r);
    expect(n).not.toContain('troponina');
    expect(n).not.toContain('bnp');
  });

  it('en cirugía de bajo riesgo no hay troponina aunque haya comorbilidad CV', () => {
    const r = derivarRiesgoYPruebas(base({ riesgoCardiovascular: 'bajo', enfermedades: new Set(['insuficiencia_cardiaca']) }));
    expect(nombres(r)).not.toContain('troponina');
  });
});
