import { describe, it, expect } from '../../_harness.ts';
import type { ContextoReglas } from '../../../src/dominio/tipos.ts';
import { clasificarHbpm, reglaHbpm, reglaHeparinaSodica, reglaFondaparinux } from '../../../src/dominio/reglas/heparinas.ts';
import { reglaImaoIrreversible, reglaMoclobemida, reglaImaoB } from '../../../src/dominio/reglas/psicofarmacos.ts';
import { reglaInmunosupresorClasico, reglaMetotrexato, reglaFameMantener, reglaJak, reglaBiologico } from '../../../src/dominio/reglas/inmunosupresores.ts';
import { reglaTirosinaCinasa, reglaAntiangiogenico } from '../../../src/dominio/reglas/oncologicos.ts';
import { reglaFitoterapia, reglaAnticonceptivoThs, reglaCorticoide } from '../../../src/dominio/reglas/otros.ts';
import { avisoSugammadex } from '../../../src/dominio/reglas/sugammadex.ts';
import { reglaTriflusal, reglaDipiridamol, reglaCilostazol, reglaSulodexida, reglaGpIibIiia, reglaAas } from '../../../src/dominio/reglas/antiagregantes.ts';
import { reglaSglt2, reglaMetformina } from '../../../src/dominio/reglas/antidiabeticos.ts';
import { combinacionFija } from '../../../src/dominio/reglas/motor.ts';

const IV = new Date(2026, 9, 15, 8, 0);
function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV, fechaReferencia: new Date(2026, 8, 29), riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento: null,
    // Pauta a las 08:00: plazos en horas caen en el límite exacto; plazos en días,
    // última toma el día (N+1) a las 08:00. (Fechas exactas: docs/casos_referencia.)
    pautaFarmaco: { horas: ['08:00'] },
    ...p,
  };
}
const H = (d?: Date) => (d ? Math.round((IV.getTime() - d.getTime()) / 3_600_000) : NaN);
const D = (d?: Date) => (d ? Math.round((IV.getTime() - d.getTime()) / 86_400_000) : NaN);

describe('Heparinas y fondaparinux (§8.4)', () => {
  it('clasifica enoxaparina por dosis/pauta/peso/aclaramiento; dosis intermedia → indeterminada', () => {
    const enox = { unidad: 'mg' as const, profilaxis_max_por_kg_dia: 1.0, tratamiento_min_por_kg_dia: 1.5, tratamiento_min_por_kg_dia_crcl_lt30: 1.0 };
    expect(clasificarHbpm({ dosisPorToma: 40, tomasDia: 1, pesoKg: 70, aclaramiento: 80 }, enox)).toBe('profilactica');
    expect(clasificarHbpm({ dosisPorToma: 70, tomasDia: 2, pesoKg: 70, aclaramiento: 80 }, enox)).toBe('terapeutica');
    // 1,2 mg/kg/día con función renal normal: entre profilaxis y tratamiento → preguntar.
    expect(clasificarHbpm({ dosisPorToma: 84, tomasDia: 1, pesoKg: 70, aclaramiento: 80 }, enox)).toBe('indeterminada');
  });
  it('clasifica profilaxis y tratamiento de tinzaparina, bemiparina, nadroparina y dalteparina (SETH)', () => {
    const P70 = { pesoKg: 70, aclaramiento: 80 };
    const tinzaparina = { unidad: 'UI' as const, profilaxis_dia_bandas: { umbral_kg: 60, hasta: 3500, desde: 4500 }, tratamiento_por_kg_dia: 175 };
    expect(clasificarHbpm({ dosisPorToma: 4500, tomasDia: 1, ...P70 }, tinzaparina)).toBe('profilactica');
    expect(clasificarHbpm({ dosisPorToma: 175 * 70, tomasDia: 1, ...P70 }, tinzaparina)).toBe('terapeutica');

    const bemiparina = { unidad: 'UI' as const, profilaxis_dia: 3500, profilaxis_crcl_lt30_dia: 2500, tratamiento_por_kg_dia: 115, tratamiento_por_kg_dia_crcl_lt30: 85 };
    expect(clasificarHbpm({ dosisPorToma: 3500, tomasDia: 1, ...P70 }, bemiparina)).toBe('profilactica');
    expect(clasificarHbpm({ dosisPorToma: 115 * 70, tomasDia: 1, ...P70 }, bemiparina)).toBe('terapeutica');

    const nadroparina = { unidad: 'UI' as const, profilaxis_dia: 2850, tratamiento_por_kg_dia: 172 };
    expect(clasificarHbpm({ dosisPorToma: 2850, tomasDia: 1, ...P70 }, nadroparina)).toBe('profilactica');
    expect(clasificarHbpm({ dosisPorToma: 86 * 70, tomasDia: 2, ...P70 }, nadroparina)).toBe('terapeutica');

    const dalteparina = { unidad: 'UI' as const, profilaxis_dia: 5000, tratamiento_por_kg_dia: 200 };
    expect(clasificarHbpm({ dosisPorToma: 5000, tomasDia: 1, ...P70 }, dalteparina)).toBe('profilactica');
    expect(clasificarHbpm({ dosisPorToma: 100 * 70, tomasDia: 2, ...P70 }, dalteparina)).toBe('terapeutica');
  });
  it('HBPM profiláctica (dosis a las 20:00) → 12 h', () => {
    const r = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'profilactica' }, ctx({ pautaFarmaco: { horas: ['20:00'] } }));
    expect(H(r.fechaHoraUltimaToma)).toBe(12);
  });
  it('HBPM terapéutica (dosis a las 08:00) → 24 h + nota anti-Xa', () => {
    const r = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'terapeutica' }, ctx({ pautaFarmaco: { horas: ['08:00'] } }));
    expect(H(r.fechaHoraUltimaToma)).toBe(24);
    expect(r.textoAnestesiologo).toContain('anti-Xa');
  });
  it('HBPM indeterminada → se asume terapéutica (24 h) + validación (punto 8)', () => {
    const r = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'indeterminada' }, ctx());
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(H(r.fechaHoraUltimaToma)).toBe(24);
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('heparina sódica IV → 6 h (uso hospitalario)', () => {
    const r = reglaHeparinaSodica('heparina_sodica', 'Heparina', ctx());
    expect(H(r.fechaHoraUltimaToma)).toBe(6);
  });
  it('fondaparinux profiláctico → 36 h; 48 h con neuroaxial (dosis en la hora del límite)', () => {
    // Pauta a las 20:00: 36 h antes de las 08:00 cae a las 20:00 → última dosis en el límite exacto.
    expect(H(reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'profilactico' }, ctx({ riesgoHemorragico: 'bajo', pautaFarmaco: { horas: ['20:00'] } })).farmaco.fechaHoraUltimaToma)).toBe(36);
    // 48 h antes de las 08:00 cae a las 08:00 → pauta a las 08:00.
    expect(H(reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'profilactico' }, ctx({ neuroaxial: true, pautaFarmaco: { horas: ['08:00'] } })).farmaco.fechaHoraUltimaToma)).toBe(48);
  });
  it('fondaparinux profiláctico CrCl < 20 → suspender 72 h (plazo más largo) + punto rojo + alerta roja (punto 8)', () => {
    const r = reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'profilactico' }, ctx({ aclaramiento: 15, pautaFarmaco: { horas: ['08:00'] } }));
    expect(r.farmaco.accion).toBe('suspender');
    expect(r.farmaco.requiereConfirmacion).toBeFalse();
    expect(H(r.farmaco.fechaHoraUltimaToma)).toBe(72);
    expect(r.farmaco.puntoValidacion?.tipo).toBe('posponer');
    expect(r.alerta?.gravedad).toBe('roja');
  });
  it('fondaparinux terapéutico → 48 h; 72 h con CrCl < 50 (dosis a las 08:00)', () => {
    expect(H(reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'terapeutico' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 80, pautaFarmaco: { horas: ['08:00'] } })).farmaco.fechaHoraUltimaToma)).toBe(48);
    expect(H(reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'terapeutico' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 40, pautaFarmaco: { horas: ['08:00'] } })).farmaco.fechaHoraUltimaToma)).toBe(72);
  });
});

describe('Psicofármacos IMAO (§8.7)', () => {
  it('IMAO irreversible → mantener + anestesia segura + validación (punto 8)', () => {
    const r = reglaImaoIrreversible({ idFarmaco: 'tranilcipromina', nombreComercial: 'Parnate', principio: 'tranilcipromina' });
    expect(r.accion).toBe('mantener');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(r.textoAnestesiologo).toContain('meperidina');
  });
  it('moclobemida → suspender 24 h + nota', () => {
    const r = reglaMoclobemida({ idFarmaco: 'moclobemida', nombreComercial: 'Manerix', principio: 'moclobemida' }, ctx());
    expect(H(r.fechaHoraUltimaToma)).toBe(24);
    expect(r.textoAnestesiologo).toContain('azul de metileno');
  });
  it('IMAO-B → mantener + nota', () => {
    const r = reglaImaoB({ idFarmaco: 'rasagilina', nombreComercial: 'Azilect', principio: 'rasagilina' });
    expect(r.accion).toBe('mantener');
    expect(r.textoAnestesiologo).toContain('vasopresores directos');
  });
});

describe('Inmunosupresores y reumatología (§8.8)', () => {
  it('tacrolimus por trasplante → mantener', () => {
    const r = reglaInmunosupresorClasico({ idFarmaco: 'tacrolimus', nombreComercial: 'Prograf', principio: 'tacrolimus', indicacion: 'trasplante' });
    expect(r.accion).toBe('mantener');
  });
  it('azatioprina por autoinmune → mantener + validación (punto 8)', () => {
    const r = reglaInmunosupresorClasico({ idFarmaco: 'azatioprina', nombreComercial: 'Imurel', principio: 'azatioprina', indicacion: 'autoinmune' });
    expect(r.accion).toBe('mantener');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('metotrexato ≤ 20 mg → mantener; > 20 mg → mantener + validación (punto 8)', () => {
    expect(reglaMetotrexato({ idFarmaco: 'mtx', nombreComercial: 'Metoject', dosisSemanalMg: 15 }).accion).toBe('mantener');
    const alta = reglaMetotrexato({ idFarmaco: 'mtx', nombreComercial: 'Metoject', dosisSemanalMg: 25 });
    expect(alta.accion).toBe('mantener');
    expect(alta.requiereConfirmacion).toBeFalse();
    expect(alta.puntoValidacion?.tipo).toBe('validar');
  });
  it('leflunomida → mantener', () => {
    expect(reglaFameMantener({ idFarmaco: 'leflunomida', nombreComercial: 'Arava', principio: 'leflunomida' }).accion).toBe('mantener');
  });
  it('JAK → suspender 3 días (última toma día 4 previo)', () => {
    const r = reglaJak({ idFarmaco: 'tofacitinib', nombreComercial: 'Xeljanz', principio: 'tofacitinib' }, ctx());
    expect(D(r.fechaHoraUltimaToma)).toBe(4);
  });
  it('biológico sin fecha → programar al final del ciclo + validación; nota de confirmar fecha (punto 8)', () => {
    const r = reglaBiologico({ idFarmaco: 'adalimumab', nombreComercial: 'Humira', principio: 'adalimumab' });
    expect(r.accion).toBe('mantener');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(r.textoAnestesiologo).toContain('última dosis');
  });
});

describe('Oncológicos (§8.9)', () => {
  it('imatinib → continuar hasta la cirugía', () => {
    expect(reglaTirosinaCinasa({ idFarmaco: 'imatinib', nombreComercial: 'Glivec', principio: 'imatinib' }).accion).toBe('mantener');
  });
  it('bevacizumab < 8 semanas → valorar diferir + punto rojo + alerta roja (punto 8)', () => {
    const r = reglaAntiangiogenico({ idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principio: 'bevacizumab', semanasDesdeUltimaDosis: 4 });
    expect(r.farmaco.requiereConfirmacion).toBeFalse();
    expect(r.farmaco.puntoValidacion?.tipo).toBe('posponer');
    expect(r.alerta?.gravedad).toBe('roja');
    expect(r.alerta?.mensaje).toContain('6-8 semanas');
  });
  it('bevacizumab ≥ 8 semanas → mantener', () => {
    const r = reglaAntiangiogenico({ idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principio: 'bevacizumab', semanasDesdeUltimaDosis: 10 });
    expect(r.farmaco.accion).toBe('mantener');
  });
  it('aflibercept intravítreo → mantener (no activa regla)', () => {
    const r = reglaAntiangiogenico({ idFarmaco: 'aflibercept', nombreComercial: 'Eylea', principio: 'aflibercept', intravitreo: true });
    expect(r.farmaco.accion).toBe('mantener');
    expect(r.alerta).toBeUndefined();
  });
});

describe('Otros (§8.11)', () => {
  it('fitoterapia → suspender 14 días (última toma día 15 previo)', () => {
    const r = reglaFitoterapia({ idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principio: 'ginkgo' }, ctx());
    expect(D(r.fechaHoraUltimaToma)).toBe(15);
  });
  it('anticonceptivo con riesgo trombótico alto → mantener + validación; nota 4-6 semanas (punto 8)', () => {
    const r = reglaAnticonceptivoThs({ idFarmaco: 'aco', nombreComercial: 'ACO', principio: 'etinilestradiol', via: 'oral' }, ctx({ riesgoTromboticoAlto: true }));
    expect(r.accion).toBe('mantener');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(r.textoAnestesiologo).toContain('4-6 semanas');
  });
  it('anticonceptivo sin riesgo trombótico alto → mantener', () => {
    const r = reglaAnticonceptivoThs({ idFarmaco: 'aco', nombreComercial: 'ACO', principio: 'etinilestradiol', via: 'oral' }, ctx({ riesgoTromboticoAlto: false }));
    expect(r.accion).toBe('mantener');
  });
  it('corticoide → mantener; nota de dosis de estrés si aplica', () => {
    const r = reglaCorticoide({ idFarmaco: 'prednisona', nombreComercial: 'Dacortin', principio: 'prednisona', dosisEstres: true });
    expect(r.accion).toBe('mantener');
    expect(r.textoAnestesiologo).toContain('dosis de estrés');
  });
});

describe('Sugammadex (§8.15)', () => {
  it('anticonceptivo oral + posible AG → aviso de dosis olvidada', () => {
    const a = avisoSugammadex({ mujerConAnticonceptivoHormonal: true, tipo: 'oral', posibleAnestesiaGeneral: true });
    expect(a.aplica).toBeTrue();
    expect(a.textoPaciente).toContain('dosis olvidada'.slice(0, 5)); // "dosis"
    expect(a.textoPaciente).toContain('olvidada');
    expect(a.textoAnestesiologo).toContain('al alta');
  });
  it('implante (no oral) + posible AG → método de barrera 7 días', () => {
    const a = avisoSugammadex({ mujerConAnticonceptivoHormonal: true, tipo: 'no_oral', posibleAnestesiaGeneral: true });
    expect(a.aplica).toBeTrue();
    expect(a.textoPaciente).toContain('7 días');
  });
  it('sin anestesia general → no aplica', () => {
    const a = avisoSugammadex({ mujerConAnticonceptivoHormonal: true, tipo: 'oral', posibleAnestesiaGeneral: false });
    expect(a.aplica).toBeFalse();
  });
});

describe('Otros antiagregantes (§8.3)', () => {
  it('triflusal → 7 días (última toma día 8); 10 días con neuroaxial (día 11)', () => {
    expect(D(reglaTriflusal('t', 'Disgren', ctx()).fechaHoraUltimaToma)).toBe(8);
    expect(D(reglaTriflusal('t', 'Disgren', ctx({ neuroaxial: true })).fechaHoraUltimaToma)).toBe(11);
  });
  it('dipiridamol → 24 h; 48 h con bloqueo profundo', () => {
    expect(H(reglaDipiridamol('d', 'Persantin', ctx()).fechaHoraUltimaToma)).toBe(24);
    expect(H(reglaDipiridamol('d', 'Persantin', ctx({ bloqueoProfundo: true })).fechaHoraUltimaToma)).toBe(48);
  });
  it('cilostazol → mantener si riesgo bajo; 3 días si alto (última toma día 4 previo)', () => {
    expect(reglaCilostazol('c', 'Pletal', ctx({ riesgoHemorragico: 'bajo' })).accion).toBe('mantener');
    expect(D(reglaCilostazol('c', 'Pletal', ctx({ riesgoHemorragico: 'alto' })).fechaHoraUltimaToma)).toBe(4);
  });
  it('sulodexida → mantener si riesgo bajo; 48 h si neuroaxial', () => {
    expect(reglaSulodexida('s', 'Aterina', ctx({ riesgoHemorragico: 'bajo' })).accion).toBe('mantener');
    expect(H(reglaSulodexida('s', 'Aterina', ctx({ riesgoHemorragico: 'bajo', neuroaxial: true })).fechaHoraUltimaToma)).toBe(48);
  });
  it('GP IIb/IIIa (cangrelor) → 1 h; 3 h neuroaxial; siempre confirmación', () => {
    const r = reglaGpIibIiia('c', 'Kengrexal', 'cangrelor', ctx());
    expect(H(r.fechaHoraUltimaToma)).toBe(1);
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(H(reglaGpIibIiia('c', 'Kengrexal', 'cangrelor', ctx({ neuroaxial: true })).fechaHoraUltimaToma)).toBe(3);
  });
});

describe('AAS > 200 mg con indicación cardiovascular (§8.3)', () => {
  it('espacio cerrado: cualquier dosis de AAS se suspende 5 días + validación (corrección C4b)', () => {
    const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, ctx({ espacioCerrado: true }));
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('fuera del espacio cerrado (neuroaxial) con indicación cardiovascular: bajar a 100 mg/día + validación', () => {
    const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, ctx({ neuroaxial: true }));
    expect(r.accion).toBe('ajustar');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(r.textoAnestesiologo).toContain('100 mg');
  });
});

describe('Combinación fija Synjardy (§8.0 / Decisión 5)', () => {
  it('una sola instrucción, plazo 3 días (SGLT2), y nota de glucemia por la metformina', () => {
    const sglt2 = reglaSglt2({ idFarmaco: 'empagliflozina', nombreComercial: 'Synjardy', principio: 'empagliflozina' }, ctx());
    const met = reglaMetformina({ idFarmaco: 'metformina', nombreComercial: 'Synjardy' }, ctx());
    const r = combinacionFija('empagliflozina_metformina', 'Synjardy', [sglt2, met], true);
    expect(D(r.fechaHoraUltimaToma)).toBe(4); // SGLT2 3 días → última toma día 4 previo
    expect(r.textoPaciente).toContain('Synjardy');
    expect(r.textoAnestesiologo).toContain('glucemia');
    // Una sola instrucción: principios activos combinados.
    expect(r.principiosActivos).toContain('empagliflozina');
    expect(r.principiosActivos).toContain('metformina');
  });
});
