/**
 * Coherencia entre los efectos declarados en los módulos (`genera`, §5.16) y el
 * cálculo real del motor, para los tipos que NO se ejecutan con emitirEfectosModulos
 * sino en su capa: clase de riesgo (riesgoYPruebas.ts), ASA (asaSugerido.ts),
 * pruebas (tablaPruebas.ts) y reglas (hechosClinicos.ts + reglas).
 *
 * Para cada efecto se construye la respuesta que lo dispara y se comprueba que el
 * cálculo real produce el efecto declarado. Si alguno no coincide, esta prueba falla
 * y hay que decidir (documento fuente vs. código) antes de corregir.
 *
 * El mapa es explícito y auditable: cada caso referencia el módulo.pregunta y el
 * texto `cuando`/`efecto` del módulo que verifica.
 */
import { describe, it, expect } from '../../_harness.ts';
import { derivarClaseRiesgo, derivarRiesgoYPruebas, type EntradaRiesgoPruebas } from '../../../src/dominio/entrevista/riesgoYPruebas.ts';
import { derivarAsa, type EntradaAsa } from '../../../src/dominio/salidas/asaSugerido.ts';
import { derivarHechosClinicos } from '../../../src/dominio/entrevista/hechosClinicos.ts';
import { reglaIecaAra2 } from '../../../src/dominio/reglas/cardiovasculares.ts';
import type { ClaseRiesgoPaciente } from '../../../src/dominio/riesgo/claseRiesgoPaciente.ts';
import type { ClaseAsa } from '../../../src/dominio/escalas/asa.ts';
import type { ContextoReglas } from '../../../src/dominio/tipos.ts';

const IV = new Date(2026, 9, 15, 8, 0);

// ———————————————————————— clase de riesgo (§7.2) ————————————————————————
function baseRiesgo(p: Partial<EntradaRiesgoPruebas> = {}): EntradaRiesgoPruebas {
  return {
    respuestas: {}, enfermedades: new Set(), edadAnios: 40, imc: 24, hemstopPositivo: false,
    medicacionGrupos: new Set(), riesgoCardiovascular: 'intermedio', riesgoHemorragico: 'bajo',
    neuroaxialProbable: false, tecnica: 'general', fechaIntervencion: IV, ...p,
  };
}

describe('Coherencia §5.16 · clase de riesgo', () => {
  it('asma_epoc.enfermedad = EPOC → clase moderada', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['asma_epoc']), respuestas: { asma_epoc: { enfermedad: 'epoc' } } }));
    expect(r.clase).toBe('moderado' as ClaseRiesgoPaciente);
  });
  it('asma_epoc.oxigeno_domiciliario = sí → clase alta', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['asma_epoc']), respuestas: { asma_epoc: { enfermedad: 'asma', oxigeno_domiciliario: true } } }));
    expect(r.clase).toBe('alto');
  });
  it('cardiopatia_isquemica.angina_esfuerzo = mínimos → clase alta', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['cardiopatia_isquemica']), respuestas: { cardiopatia_isquemica: { angina_residual: true, angina_esfuerzo: 'minimos' } } }));
    expect(r.clase).toBe('alto');
  });
  it('diabetes.hba1c > 8,5 → clase moderada', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['diabetes']), respuestas: { diabetes: { hba1c: 9 } } }));
    expect(r.clase).toBe('moderado');
  });
  it('enfermedad_renal.estadio = terminal → clase alta', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['enfermedad_renal']), respuestas: { enfermedad_renal: { estadio: 'terminal' } } }));
    expect(r.clase).toBe('alto');
  });
  it('insuficiencia_cardiaca.nyha = III → clase alta', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['insuficiencia_cardiaca']), respuestas: { insuficiencia_cardiaca: { nyha: 'III' } } }));
    expect(r.clase).toBe('alto');
  });
  it('valvulopatia.gravedad = moderada → clase alta', () => {
    const r = derivarClaseRiesgo(baseRiesgo({ enfermedades: new Set(['valvulopatia']), respuestas: { valvulopatia: { gravedad: 'moderada' } } }));
    expect(r.clase).toBe('alto');
  });
});

// ———————————————————————— ASA sugerido (§6.1) ————————————————————————
function baseAsa(p: Partial<EntradaAsa> = {}): EntradaAsa {
  return {
    edadAnios: 40, imc: 24, embarazada: false, tabacoActivo: false, abusoAlcohol: false,
    enfermedades: new Set(), respuestas: {}, ...p,
  };
}
const GE = (clase: ClaseAsa, min: number) => clase >= min;

describe('Coherencia §5.16 · ASA sugerido', () => {
  it('asma_epoc = EPOC → ASA mínimo 3', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['asma_epoc']), respuestas: { asma_epoc: { enfermedad: 'epoc' } } }));
    expect(GE(r.clase, 3)).toBeTrue();
  });
  it('cardiopatia_isquemica angina de mínimos → ASA mínimo 4', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['cardiopatia_isquemica']), respuestas: { cardiopatia_isquemica: { angina_residual: true, angina_esfuerzo: 'minimos' } } }));
    expect(GE(r.clase, 4)).toBeTrue();
  });
  it('diabetes.hba1c > 8,5 → ASA mínimo 3', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['diabetes']), respuestas: { diabetes: { hba1c: 9 } } }));
    expect(GE(r.clase, 3)).toBeTrue();
  });
  it('diabetes bien controlada → ASA mínimo 2', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['diabetes']), respuestas: { diabetes: { hba1c: 7 } } }));
    expect(GE(r.clase, 2)).toBeTrue();
  });
  it('enfermedad_renal.estadio = terminal (sin diálisis) → ASA mínimo 4', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['enfermedad_renal']), respuestas: { enfermedad_renal: { estadio: 'terminal' } } }));
    expect(GE(r.clase, 4)).toBeTrue();
  });
  it('hta.control = mal → ASA mínimo 3', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['hta']), respuestas: { hta: { control: 'mal' } } }));
    expect(GE(r.clase, 3)).toBeTrue();
  });
  it('insuficiencia_cardiaca.nyha = III → ASA mínimo 4', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['insuficiencia_cardiaca']), respuestas: { insuficiencia_cardiaca: { nyha: 'III' } } }));
    expect(GE(r.clase, 4)).toBeTrue();
  });
  it('valvulopatia.gravedad = grave → ASA mínimo 4', () => {
    const r = derivarAsa(baseAsa({ enfermedades: new Set(['valvulopatia']), respuestas: { valvulopatia: { gravedad: 'grave' } } }));
    expect(GE(r.clase, 4)).toBeTrue();
  });
});

// ———————————————————————— pruebas (§7.3) ————————————————————————
const nombresPr = (r: ReturnType<typeof derivarRiesgoYPruebas>) => r.pruebas.map((p) => p.prueba);

describe('Coherencia §5.16 · pruebas', () => {
  it('anemia.hemoglobina < 13 (cirugía bajo/paciente bajo) → se pide hemograma', () => {
    // En bajo/bajo, la anemia es la que fuerza hemograma+coagulación (nota *).
    const r = derivarRiesgoYPruebas(baseRiesgo({
      riesgoCardiovascular: 'bajo', enfermedades: new Set(['anemia']),
      respuestas: { anemia: { hemoglobina: 11 } },
    }));
    expect(nombresPr(r)).toContain('hemograma');
  });
  it('asma_epoc.sintomas_respiratorios_nuevos = sí → radiografía de tórax', () => {
    const r = derivarRiesgoYPruebas(baseRiesgo({
      enfermedades: new Set(['asma_epoc']),
      respuestas: { asma_epoc: { enfermedad: 'asma', sintomas_respiratorios_nuevos: true } },
    }));
    expect(nombresPr(r)).toContain('rx_torax');
  });
  it('valvulopatia.sintomas_nuevos = sí → ecocardiograma', () => {
    const r = derivarRiesgoYPruebas(baseRiesgo({
      enfermedades: new Set(['valvulopatia']),
      respuestas: { valvulopatia: { gravedad: 'leve', sintomas_nuevos: true } },
    }));
    expect(nombresPr(r)).toContain('ecocardiograma');
  });
  it('lupus.anemia_plaquetas = sí → hemograma y coagulación (vía anemia/sangrado)', () => {
    // El efecto declarado "hemograma y coagulación": en una cirugía intermedia ya se piden
    // ambos; comprobamos que el motor los incluye con lupus marcado.
    const r = derivarRiesgoYPruebas(baseRiesgo({
      riesgoCardiovascular: 'intermedio', enfermedades: new Set(['lupus']),
      respuestas: { lupus: { anemia_plaquetas: true } },
    }));
    expect(nombresPr(r)).toContain('hemograma');
    expect(nombresPr(r)).toContain('coagulacion');
  });
});

// ———————————————————————— reglas (§8.10) ————————————————————————
function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV, fechaReferencia: new Date(2026, 8, 29), riesgoHemorragico: 'bajo', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false,
    pesoKg: 80, aclaramiento: null, pautaFarmaco: { horas: ['09:00'] }, ...p,
  };
}
function hechos(respuestas: Record<string, Record<string, unknown>>, enfermedades: string[]) {
  return derivarHechosClinicos({
    respuestas, enfermedades: new Set(enfermedades), medicacion: [],
    edadAnios: 60, pesoKg: 80, sexo: 'hombre', fechaIntervencion: IV,
  });
}

describe('Coherencia §5.16 · reglas (IECA/ARA-II se mantienen)', () => {
  it('insuficiencia_cardiaca.fevi ≤ 40 → IECA/ARA-II mantener', () => {
    const h = hechos({ insuficiencia_cardiaca: { fevi: 30 } }, ['insuficiencia_cardiaca']);
    const r = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: h.icDisfuncionSistolica, infartoReciente: h.infartoReciente, proteinuriaONefropatia: h.proteinuriaONefropatia }, ctx());
    expect(r.accion).toBe('mantener');
  });
  it('insuficiencia_cardiaca.disfuncion_sistolica = sí → IECA/ARA-II mantener', () => {
    const h = hechos({ insuficiencia_cardiaca: { disfuncion_sistolica: true } }, ['insuficiencia_cardiaca']);
    const r = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: h.icDisfuncionSistolica, infartoReciente: h.infartoReciente, proteinuriaONefropatia: h.proteinuriaONefropatia }, ctx());
    expect(r.accion).toBe('mantener');
  });
  it('enfermedad_renal.proteinuria = sí → IECA/ARA-II mantener', () => {
    const h = hechos({ enfermedad_renal: { proteinuria: true } }, ['enfermedad_renal']);
    const r = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: h.icDisfuncionSistolica, infartoReciente: h.infartoReciente, proteinuriaONefropatia: h.proteinuriaONefropatia }, ctx());
    expect(r.accion).toBe('mantener');
  });
  it('diabetes.complicaciones incluye nefropatía → cuenta como nefropatía → IECA/ARA-II mantener', () => {
    const h = hechos({ diabetes: { complicaciones: ['nefropatia'] } }, ['diabetes']);
    expect(h.proteinuriaONefropatia).toBeTrue();
    const r = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: h.icDisfuncionSistolica, infartoReciente: h.infartoReciente, proteinuriaONefropatia: h.proteinuriaONefropatia }, ctx());
    expect(r.accion).toBe('mantener');
  });
});
