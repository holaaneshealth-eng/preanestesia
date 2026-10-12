/**
 * Hechos clínicos derivados de la entrevista (§5/§7) y su efecto en el despachador.
 * Cubre en particular los tres fallos comunicados por el servicio:
 *  1) al marcar cardiopatía isquémica se pregunta por el stent y el motivo,
 *  2) Plavix sin Adiro (monoterapia) sugiere pasar a AAS,
 *  3) con FA + raquídea + Eliquis, la creatinina del módulo renal da aclaramiento
 *     y ya no se queda bloqueado "falta aclaramiento".
 */
import { describe, it, expect } from '../../_harness.ts';
import type { ContextoReglas } from '../../../src/dominio/tipos.ts';
import { derivarHechosClinicos, type EntradaDerivacion } from '../../../src/dominio/entrevista/hechosClinicos.ts';
import { evaluarFarmacoUi, type DatosFarmacoUi } from '../../../src/dominio/reglas/despachador.ts';

const IV = new Date(2026, 9, 15, 8, 0);

function entrada(p: Partial<EntradaDerivacion> = {}): EntradaDerivacion {
  return {
    respuestas: {},
    enfermedades: new Set(),
    medicacion: [],
    edadAnios: 70,
    pesoKg: 80,
    sexo: 'hombre',
    fechaIntervencion: IV,
    ...p,
  };
}
// Fecha de referencia fija (29/09/2026, la misma del resto de pruebas): hace la
// prueba determinista, sin depender del reloj real (si no, al pasar la fecha de la
// intervención el plazo deja de ser alcanzable y el resultado cambia).
const REF = new Date(2026, 8, 29);
function ctx(aclaramiento: number | null, p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV, fechaReferencia: REF, riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento, ...p,
  };
}
function farmaco(idRegla: string, p: Partial<DatosFarmacoUi> & { nombreComercial: string; principiosActivos: string[] }): DatosFarmacoUi {
  return { idFarmaco: idRegla, idRegla, via: 'oral', horas: ['09:00'], ...p };
}

describe('Hechos clínicos · derivación desde módulos', () => {
  it('bug 1: cardiopatía isquémica con stent por SCA → hecho stent con motivo, y P2Y12 requiere confirmación', () => {
    const hechos = derivarHechosClinicos(entrada({
      enfermedades: new Set(['cardiopatia_isquemica']),
      respuestas: { cardiopatia_isquemica: { portador_stent: true, stent_fecha: '2026-06-15', stent_motivo: 'sca' } },
      medicacion: [{ principiosActivos: ['acido_acetilsalicilico'], idRegla: 'aas' }, { principiosActivos: ['clopidogrel'], idRegla: 'p2y12_clopidogrel' }],
    }));
    expect(hechos.stent !== null).toBeTrue();
    expect(hechos.stent?.traSca).toBeTrue();
    expect(hechos.tieneAas).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'] }), ctx(90), hechos);
    expect(r.requiereConfirmacion).toBeTrue();
  });

  it('bug 2: Plavix sin Adiro (monoterapia) → sugerencia de pasar a AAS', () => {
    const hechos = derivarHechosClinicos(entrada({
      medicacion: [{ principiosActivos: ['clopidogrel'], idRegla: 'p2y12_clopidogrel' }],
    }));
    expect(hechos.tieneAas).toBeFalse();
    const r = evaluarFarmacoUi(farmaco('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'] }), ctx(90), hechos);
    expect(r.requiereConfirmacion).toBeTrue();
    expect(r.textoAnestesiologo ?? '').toContain('AAS 100 mg/día');
  });

  it('bug 2 bis: Plavix CON Adiro (no monoterapia) → sin la sugerencia de AAS', () => {
    const hechos = derivarHechosClinicos(entrada({
      medicacion: [{ principiosActivos: ['clopidogrel'], idRegla: 'p2y12_clopidogrel' }, { principiosActivos: ['acido_acetilsalicilico'], idRegla: 'aas' }],
    }));
    const r = evaluarFarmacoUi(farmaco('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'] }), ctx(90), hechos);
    expect(r.textoAnestesiologo).toBeUndefined();
  });

  it('bug 3: FA + raquídea + Eliquis SIN creatinina → requiere confirmación (falta aclaramiento)', () => {
    const hechos = derivarHechosClinicos(entrada({ enfermedades: new Set(['fibrilacion_auricular']) }));
    expect(hechos.aclaramiento).toBe(null);
    const r = evaluarFarmacoUi(farmaco('acod_antixa', { nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), ctx(hechos.aclaramiento, { neuroaxial: true }), hechos);
    expect(r.requiereConfirmacion).toBeTrue();
    expect(r.datoQueFalta ?? '').toContain('aclaramiento');
  });

  it('bug 3: FA + raquídea + Eliquis CON creatinina del módulo renal → calcula el plazo (sin bloqueo)', () => {
    const hechos = derivarHechosClinicos(entrada({
      enfermedades: new Set(['fibrilacion_auricular', 'enfermedad_renal']),
      respuestas: { enfermedad_renal: { creatinina: 1.0, creatinina_fecha: '2026-09-01' } },
    }));
    expect(hechos.aclaramiento !== null).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('acod_antixa', { nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), ctx(hechos.aclaramiento, { neuroaxial: true }), hechos);
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
  });

  it('válvula mecánica mitral → alto riesgo trombótico y warfarina requiere confirmación', () => {
    const hechos = derivarHechosClinicos(entrada({
      enfermedades: new Set(['protesis_mecanica']),
      respuestas: { valvulopatia: { protesis: 'mecanica', protesis_posicion: 'mitral' } },
    }));
    expect(hechos.valvulaMecanica).toBeTrue();
    expect(hechos.altoRiesgoTrombotico).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('avk_warfarina', { nombreComercial: 'Aldocumar', principiosActivos: ['warfarina'], horas: ['18:00'] }), ctx(null), hechos);
    expect(r.requiereConfirmacion).toBeTrue();
  });

  it('IC con FEVI 30 % → IECA se mantiene', () => {
    const hechos = derivarHechosClinicos(entrada({
      enfermedades: new Set(['insuficiencia_cardiaca']),
      respuestas: { insuficiencia_cardiaca: { fevi: 30 } },
    }));
    expect(hechos.icDisfuncionSistolica).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('ieca_ara2', { nombreComercial: 'Renitec', principiosActivos: ['enalapril'] }), ctx(null), hechos);
    expect(r.accion).toBe('mantener');
  });

  it('espacio cerrado (neurocirugía intracraneal/medular) → AAS requiere confirmación', () => {
    const hechos = derivarHechosClinicos(entrada({ espacioCerrado: true }));
    expect(hechos.neurocirugiaIntracranealOMedular).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('aas', { nombreComercial: 'Adiro', principiosActivos: ['acido_acetilsalicilico'], dosisMg: 100 }), ctx(90, { espacioCerrado: true }), hechos);
    expect(r.requiereConfirmacion).toBeTrue();
  });

  it('contraste yodado "no se sabe" → metformina con nota al anestesiólogo', () => {
    const hechos = derivarHechosClinicos(entrada({ contrasteYodado: 'no_se_sabe' }));
    expect(hechos.contrasteYodadoDesconocido).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('metformina', { nombreComercial: 'Dianben', principiosActivos: ['metformina'] }), ctx(90), hechos);
    expect(r.textoAnestesiologo ?? '').toContain('contraste yodado');
  });

  it('corticoterapia ≥ 5 mg prednisona > 3 semanas → dosis de estrés', () => {
    const hechos = derivarHechosClinicos(entrada({
      enfermedades: new Set(['artritis_reumatoide']),
      respuestas: { artritis_reumatoide: { corticoides_3m: true, cortico_farmaco: 'prednisona', cortico_dosis_dia: 10, cortico_semanas: 8 } },
    }));
    expect(hechos.corticoideDosisEstres).toBeTrue();
    const r = evaluarFarmacoUi(farmaco('corticoide_sistemico', { nombreComercial: 'Dacortin', principiosActivos: ['prednisona'] }), ctx(null), hechos);
    expect(r.textoAnestesiologo ?? '').toContain('dosis de estrés');
  });

  it('corticoterapia con dexametasona 1 mg (equivale a > 5 mg prednisona) → dosis de estrés', () => {
    const hechos = derivarHechosClinicos(entrada({
      respuestas: { lupus: { corticoides_3m: true, cortico_farmaco: 'dexametasona', cortico_dosis_dia: 1, cortico_semanas: 4 } },
    }));
    expect(hechos.corticoideDosisEstres).toBeTrue();
  });
});
