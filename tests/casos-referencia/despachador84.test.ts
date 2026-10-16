/**
 * Punto 4 de la tarea: "mismo resultado en pantalla".
 * Ejecuta los casos de medicación de docs/casos_referencia.md (series A-E) A TRAVÉS
 * DEL DESPACHADOR, con los datos como los introduciría la enfermera en el paso 8
 * (id_regla, horas de toma, dosis, hechos clínicos de los módulos), y comprueba que
 * el resultado es IDÉNTICO (todos los campos) al de la regla llamada directamente
 * con los mismos datos.
 *
 * Las series F (escalas), G (pruebas), H (ayuno) e I (mtND4/coherencia) no pasan por
 * el despachador de fármacos; su comparación con el texto literal la hace el informe
 * (scripts/generar-informe-casos.ts) y la batería (bateria.test.ts).
 */
import { describe, it, expect } from '../_harness.ts';
import type { ContextoReglas } from '../../src/dominio/tipos.ts';
import type { DatosClinicos } from '../../src/dominio/entrevista/hechosClinicos.ts';
import { HECHOS_VACIOS } from '../../src/dominio/entrevista/hechosClinicos.ts';
import { evaluarFarmacoUi, evaluarCombinacionUi, type DatosFarmacoUi } from '../../src/dominio/reglas/despachador.ts';
import { combinacionFija } from '../../src/dominio/reglas/motor.ts';
import { reglaAcod } from '../../src/dominio/reglas/acod.ts';
import { reglaAvk } from '../../src/dominio/reglas/antivitaminaK.ts';
import { reglaAas, reglaP2y12, reglaTriflusal, reglaCilostazol } from '../../src/dominio/reglas/antiagregantes.ts';
import { reglaHbpm, reglaFondaparinux } from '../../src/dominio/reglas/heparinas.ts';
import { reglaMetformina, reglaSglt2, reglaGlp1Semanal, reglaGlp1Diario, reglaDpp4, reglaAntidiabeticoNoDiaIq } from '../../src/dominio/reglas/antidiabeticos.ts';
import { reglaInsulinaBasal, reglaInsulinaNph, reglaInsulinaPremezclada } from '../../src/dominio/reglas/insulinas.ts';
import { reglaIecaAra2, reglaDiuretico, reglaSacubitriloValsartan } from '../../src/dominio/reglas/cardiovasculares.ts';
import { reglaLitio, reglaMoclobemida, reglaImaoIrreversible, reglaImaoB } from '../../src/dominio/reglas/psicofarmacos.ts';
import { reglaAine } from '../../src/dominio/reglas/aine.ts';
import { reglaMetotrexato, reglaBiologico } from '../../src/dominio/reglas/inmunosupresores.ts';
import { reglaAntiangiogenico } from '../../src/dominio/reglas/oncologicos.ts';
import { reglaFitoterapia, reglaAnticonceptivoThs } from '../../src/dominio/reglas/otros.ts';

const IV = new Date(2026, 9, 15, 8, 0);
const IV13 = new Date(2026, 9, 15, 13, 0);

/** "Hoy" fijo para las pruebas: así el plazo no alcanzable no depende del día de
 *  ejecución del CI. Se usa el 29/09/2026, anterior a la última toma más temprana de
 *  la batería (ginkgo, 14 días → 30/09), para que todos los plazos sean alcanzables y
 *  los resultados coincidan con la regla directa. */
const HOY = new Date(2026, 8, 29, 9, 0);
function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV, riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento: null,
    fechaReferencia: HOY, ...p,
  };
}
const P = (...horas: string[]) => ({ horas });
function clin(p: Partial<DatosClinicos> = {}): DatosClinicos {
  return { ...HECHOS_VACIOS, ...p };
}
/** Base de DatosFarmacoUi; se completa por caso. */
function d(idRegla: string, x: Partial<DatosFarmacoUi> & { nombreComercial: string; principiosActivos: string[] }): DatosFarmacoUi {
  return { idFarmaco: x.idFarmaco ?? idRegla, idRegla, via: 'oral', horas: [], ...x };
}

// ————————————————————— A. Anticoagulantes —————————————————————
describe('Punto 4 · A anticoagulantes: despachador == regla directa', () => {
  it('A1 apixabán antiXa, CrCl 70, riesgo bajo', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, c);
    const via = evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), c, clin());
    expect(via).toEqual(directo);
  });
  it('A2 apixabán CrCl 25', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: 25, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('A2b apixabán, intervención 13:00', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: 70, fechaHoraIntervencion: IV13, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('A3 rivaroxabán CrCl 25, raquídea', () => {
    const c = ctx({ neuroaxial: true, aclaramiento: 25, pautaFarmaco: P('21:00') });
    const directo = reglaAcod({ idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principioActivo: 'rivaroxaban', subtipo: 'antixa' }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principiosActivos: ['rivaroxaban'], horas: ['21:00'] }), c, clin())).toEqual(directo);
  });
  it('A3b rivaroxabán CrCl 60, raquídea, intervención 13:00', () => {
    const c = ctx({ neuroaxial: true, aclaramiento: 60, fechaHoraIntervencion: IV13, pautaFarmaco: P('21:00') });
    const directo = reglaAcod({ idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principioActivo: 'rivaroxaban', subtipo: 'antixa' }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principiosActivos: ['rivaroxaban'], horas: ['21:00'] }), c, clin())).toEqual(directo);
  });
  it('A4 dabigatrán CrCl 90, raquídea', () => {
    const c = ctx({ neuroaxial: true, aclaramiento: 90, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, c);
    expect(evaluarFarmacoUi(d('acod_dabigatran', { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principiosActivos: ['dabigatran'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('A5 dabigatrán CrCl 65, raquídea', () => {
    const c = ctx({ neuroaxial: true, aclaramiento: 65, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, c);
    expect(evaluarFarmacoUi(d('acod_dabigatran', { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principiosActivos: ['dabigatran'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('A6 dabigatrán CrCl 45, raquídea', () => {
    const c = ctx({ neuroaxial: true, aclaramiento: 45, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, c);
    expect(evaluarFarmacoUi(d('acod_dabigatran', { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principiosActivos: ['dabigatran'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('A7 edoxabán sin creatinina', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: null, pautaFarmaco: P('09:00') });
    const directo = reglaAcod({ idFarmaco: 'edoxaban', nombreComercial: 'Lixiana', principioActivo: 'edoxaban', subtipo: 'antixa' }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'edoxaban', nombreComercial: 'Lixiana', principiosActivos: ['edoxaban'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('A8 apixabán, alto riesgo trombótico (ictus < 3 meses)', () => {
    const c = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa', altoRiesgoTromboticoConfirmar: true }, c);
    expect(evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), c, clin({ altoRiesgoTrombotico: true }))).toEqual(directo);
  });
  it('A9 acenocumarol FA sin alto riesgo', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', pautaFarmaco: P('18:00') });
    const directo = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false, portadorValvulaMecanicaOStent: false }, c).farmaco;
    expect(evaluarFarmacoUi(d('avk_acenocumarol', { idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principiosActivos: ['acenocumarol'], horas: ['18:00'] }), c, clin())).toEqual(directo);
  });
  it('A10 warfarina FA sin ictus reciente', () => {
    const c = ctx({ riesgoHemorragico: 'alto', pautaFarmaco: P('18:00') });
    const directo = reglaAvk({ idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: false, portadorValvulaMecanicaOStent: false }, c).farmaco;
    expect(evaluarFarmacoUi(d('avk_warfarina', { idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principiosActivos: ['warfarina'], horas: ['18:00'] }), c, clin())).toEqual(directo);
  });
  it('A11 warfarina válvula aórtica mecánica', () => {
    const c = ctx({ riesgoHemorragico: 'alto', pautaFarmaco: P('18:00') });
    const directo = reglaAvk({ idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: false, portadorValvulaMecanicaOStent: true }, c).farmaco;
    expect(evaluarFarmacoUi(d('avk_warfarina', { idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principiosActivos: ['warfarina'], horas: ['18:00'] }), c, clin({ valvulaMecanica: true }))).toEqual(directo);
  });
  it('A12 acenocumarol TVP 6 sem, CrCl 25, puente', () => {
    const c = ctx({ pesoKg: 70, aclaramiento: 25, pautaFarmaco: P('18:00') });
    const directo = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: true, portadorValvulaMecanicaOStent: false }, c).farmaco;
    expect(evaluarFarmacoUi(d('avk_acenocumarol', { idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principiosActivos: ['acenocumarol'], horas: ['18:00'] }), c, clin({ altoRiesgoTrombotico: true }))).toEqual(directo);
  });
  it('A13 acenocumarol, catarata con bloqueo retrobulbar (oftalmo moderado-alto)', () => {
    const c = ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'bajo', pautaFarmaco: P('18:00') });
    const directo = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false, portadorValvulaMecanicaOStent: false }, c).farmaco;
    expect(evaluarFarmacoUi(d('avk_acenocumarol', { idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principiosActivos: ['acenocumarol'], horas: ['18:00'] }), c, clin())).toEqual(directo);
  });
});

// ————————————————————— B. Heparinas —————————————————————
describe('Punto 4 · B heparinas: despachador == regla directa', () => {
  it('B1 enoxaparina profiláctica, raquídea', () => {
    const c = ctx({ neuroaxial: true, pautaFarmaco: P('18:00') });
    const directo = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'profilactica' }, c);
    expect(evaluarFarmacoUi(d('hbpm', { idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principiosActivos: ['enoxaparina'], via: 'subcutanea', horas: ['18:00'], tipoHbpm: 'profilactica' }), c, clin())).toEqual(directo);
  });
  it('B2 enoxaparina profiláctica 21:00, raquídea', () => {
    const c = ctx({ neuroaxial: true, pautaFarmaco: P('21:00') });
    const directo = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'profilactica' }, c);
    expect(evaluarFarmacoUi(d('hbpm', { idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principiosActivos: ['enoxaparina'], via: 'subcutanea', horas: ['21:00'], tipoHbpm: 'profilactica' }), c, clin())).toEqual(directo);
  });
  it('B3 enoxaparina terapéutica, CrCl 60', () => {
    const c = ctx({ aclaramiento: 60, pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaHbpm({ idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'terapeutica' }, c);
    expect(evaluarFarmacoUi(d('hbpm', { idFarmaco: 'enoxaparina', nombreComercial: 'Clexane', principiosActivos: ['enoxaparina'], via: 'subcutanea', horas: ['09:00', '21:00'], tipoHbpm: 'terapeutica' }), c, clin())).toEqual(directo);
  });
  it('B4 fondaparinux profiláctico, CrCl 60, riesgo bajo', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: 60, pautaFarmaco: P('09:00') });
    const directo = reglaFondaparinux({ idFarmaco: 'fondaparinux', nombreComercial: 'Arixtra', dosis: 'profilactico' }, c).farmaco;
    expect(evaluarFarmacoUi(d('fondaparinux', { idFarmaco: 'fondaparinux', nombreComercial: 'Arixtra', principiosActivos: ['fondaparinux'], via: 'subcutanea', horas: ['09:00'], tipoHbpm: 'profilactica' }), c, clin())).toEqual(directo);
  });
  it('B5 fondaparinux terapéutico, CrCl 40', () => {
    const c = ctx({ riesgoHemorragico: 'bajo', aclaramiento: 40, pautaFarmaco: P('09:00') });
    const directo = reglaFondaparinux({ idFarmaco: 'fondaparinux', nombreComercial: 'Arixtra', dosis: 'terapeutico' }, c).farmaco;
    expect(evaluarFarmacoUi(d('fondaparinux', { idFarmaco: 'fondaparinux', nombreComercial: 'Arixtra', principiosActivos: ['fondaparinux'], via: 'subcutanea', horas: ['09:00'], tipoHbpm: 'terapeutica' }), c, clin())).toEqual(directo);
  });
});

// ————————————————————— C. Antiagregantes —————————————————————
describe('Punto 4 · C antiagregantes: despachador == regla directa', () => {
  it('C1 AAS 100 prevención secundaria', () => {
    const c = ctx();
    const directo = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 100, indicacionCardiovascular: false }, c);
    expect(evaluarFarmacoUi(d('aas', { idFarmaco: 'aas', nombreComercial: 'Adiro', principiosActivos: ['acido_acetilsalicilico'], horas: ['09:00'], dosisMg: 100 }), c, clin())).toEqual(directo);
  });
  it('C2 AAS 100 craneotomía (espacio cerrado)', () => {
    const c = ctx({ espacioCerrado: true, pautaFarmaco: P('09:00') });
    const directo = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 100, indicacionCardiovascular: false }, c);
    expect(evaluarFarmacoUi(d('aas', { idFarmaco: 'aas', nombreComercial: 'Adiro', principiosActivos: ['acido_acetilsalicilico'], horas: ['09:00'], dosisMg: 100 }), c, clin({ neurocirugiaIntracranealOMedular: true }))).toEqual(directo);
  });
  it('C3 AAS 300 no cardiovascular', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: false }, c);
    expect(evaluarFarmacoUi(d('aas', { idFarmaco: 'aas', nombreComercial: 'Adiro', principiosActivos: ['acido_acetilsalicilico'], horas: ['09:00'], dosisMg: 300 }), c, clin())).toEqual(directo);
  });
  it('C4 AAS 300 cardiovascular', () => {
    const c = ctx();
    const directo = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, c);
    expect(evaluarFarmacoUi(d('aas', { idFarmaco: 'aas', nombreComercial: 'Adiro', principiosActivos: ['acido_acetilsalicilico'], horas: ['09:00'], dosisMg: 300, indicacionCardiovascular: true }), c, clin())).toEqual(directo);
  });
  it('C6 clopidogrel + AAS, stent por SCA 14 meses (portador de stent)', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false, portadorStent: true }, c);
    expect(evaluarFarmacoUi(d('p2y12_clopidogrel', { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], horas: ['09:00'] }), c, clin({ tieneAas: true, stent: { mesesDesdeImplante: 14, traSca: true } }))).toEqual(directo);
  });
  it('C7 clopidogrel monoterapia, raquídea', () => {
    const c = ctx({ neuroaxial: true, pautaFarmaco: P('09:00') });
    const directo = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: true, portadorStent: false }, c);
    expect(evaluarFarmacoUi(d('p2y12_clopidogrel', { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], horas: ['09:00'] }), c, clin({ tieneAas: false }))).toEqual(directo);
  });
  it('C8 triflusal', () => {
    const c = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaTriflusal('triflusal', 'Disgren', c);
    expect(evaluarFarmacoUi(d('triflusal', { idFarmaco: 'triflusal', nombreComercial: 'Disgren', principiosActivos: ['triflusal'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('C9 cilostazol artroscopia (riesgo bajo, sin neuroaxial): mantener', () => {
    const c = ctx({ riesgoHemorragico: 'bajo' });
    const directo = reglaCilostazol('cilostazol', 'Pletal', c);
    expect(evaluarFarmacoUi(d('cilostazol', { idFarmaco: 'cilostazol', nombreComercial: 'Pletal', principiosActivos: ['cilostazol'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('C10 cilostazol con raquídea', () => {
    const c = ctx({ neuroaxial: true, riesgoHemorragico: 'bajo', pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaCilostazol('cilostazol', 'Pletal', c);
    expect(evaluarFarmacoUi(d('cilostazol', { idFarmaco: 'cilostazol', nombreComercial: 'Pletal', principiosActivos: ['cilostazol'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
});

// ————————————————————— D. Antidiabéticos —————————————————————
describe('Punto 4 · D antidiabéticos: despachador == regla directa', () => {
  it('D1 Synjardy (combinación fija empagliflozina + metformina)', () => {
    const c = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const emp = reglaSglt2({ idFarmaco: 'synjardy', nombreComercial: 'Synjardy', principio: 'empagliflozina' }, c);
    const met = reglaMetformina({ idFarmaco: 'synjardy', nombreComercial: 'Synjardy' }, c);
    const directo = combinacionFija('synjardy', 'Synjardy', [emp, met], true);
    const base = d('sglt2', { idFarmaco: 'synjardy', nombreComercial: 'Synjardy', principiosActivos: ['empagliflozina', 'metformina'], horas: ['09:00', '21:00'] });
    expect(evaluarCombinacionUi(base, ['sglt2', 'metformina'], c, clin())).toEqual(directo);
  });
  it('D2 empagliflozina y metformina en pastillas separadas', () => {
    const cEmp = ctx({ pautaFarmaco: P('09:00') });
    const emp = reglaSglt2({ idFarmaco: 'empagliflozina', nombreComercial: 'Jardiance', principio: 'empagliflozina' }, cEmp);
    expect(evaluarFarmacoUi(d('sglt2', { idFarmaco: 'empagliflozina', nombreComercial: 'Jardiance', principiosActivos: ['empagliflozina'], horas: ['09:00'] }), cEmp, clin())).toEqual(emp);
    const cMet = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const met = reglaMetformina({ idFarmaco: 'metformina', nombreComercial: 'Dianben' }, cMet);
    expect(evaluarFarmacoUi(d('metformina', { idFarmaco: 'metformina', nombreComercial: 'Dianben', principiosActivos: ['metformina'], horas: ['09:00', '21:00'] }), cMet, clin())).toEqual(met);
  });
  it('D3 ertugliflozina', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaSglt2({ idFarmaco: 'ertugliflozina', nombreComercial: 'Steglatro', principio: 'ertugliflozina' }, c);
    expect(evaluarFarmacoUi(d('sglt2', { idFarmaco: 'ertugliflozina', nombreComercial: 'Steglatro', principiosActivos: ['ertugliflozina'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('D4 Ozempic semanal los lunes', () => {
    const c = ctx();
    const prox = new Date(2026, 9, 12, 9, 0);
    const directo = reglaGlp1Semanal({ idFarmaco: 'semaglutida_sem', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: prox }, c);
    expect(evaluarFarmacoUi(d('glp1_semanal', { idFarmaco: 'semaglutida_sem', nombreComercial: 'Ozempic', principiosActivos: ['semaglutida'], via: 'subcutanea', proximaDosisSemanal: prox }), c, clin())).toEqual(directo);
  });
  it('D6 Rybelsus diario', () => {
    const c = ctx({ pautaFarmaco: P('08:00') });
    const directo = reglaGlp1Diario({ idFarmaco: 'semaglutida_oral', nombreComercial: 'Rybelsus', principio: 'semaglutida' }, c);
    expect(evaluarFarmacoUi(d('glp1_diario', { idFarmaco: 'semaglutida_oral', nombreComercial: 'Rybelsus', principiosActivos: ['semaglutida'], horas: ['08:00'] }), c, clin())).toEqual(directo);
  });
  it('D7 Tresiba insulina basal', () => {
    const c = ctx();
    const directo = reglaInsulinaBasal({ idFarmaco: 'insulina_degludec', nombreComercial: 'Tresiba', principio: 'insulina_degludec', tomas: [{ hora: '09:00', dosisUi: 30 }], intervencion: IV });
    expect(evaluarFarmacoUi(d('insulina_basal', { idFarmaco: 'insulina_degludec', nombreComercial: 'Tresiba', principiosActivos: ['insulina_degludec'], via: 'subcutanea', horas: ['09:00'], insulinaBasalUi: 30 }), c, clin())).toEqual(directo);
  });
  it('D8 Insulatard NPH', () => {
    const c = ctx();
    const directo = reglaInsulinaNph({ idFarmaco: 'insulina_nph', nombreComercial: 'Insulatard', dosisNocheUi: 10, dosisMananaUi: 20, intervencion: IV, horaNoche: '21:00', horaManana: '08:00' });
    expect(evaluarFarmacoUi(d('insulina_nph', { idFarmaco: 'insulina_nph', nombreComercial: 'Insulatard', principiosActivos: ['insulina_nph'], via: 'subcutanea', horas: ['08:00', '21:00'], insulinaNocheUi: 10, insulinaMananaUi: 20 }), c, clin())).toEqual(directo);
  });
  it('D9 NovoMix 30 premezclada', () => {
    const c = ctx();
    const directo = reglaInsulinaPremezclada({ idFarmaco: 'novomix', nombreComercial: 'NovoMix 30', dosisMananaUi: 20, intervencion: IV, horaManana: '08:00' });
    expect(evaluarFarmacoUi(d('insulina_premezclada', { idFarmaco: 'novomix', nombreComercial: 'NovoMix 30', principiosActivos: ['insulina_aspart'], via: 'subcutanea', horas: ['08:00'], insulinaMananaUi: 20 }), c, clin())).toEqual(directo);
  });
});

// ————————————————————— E. Otros fármacos —————————————————————
describe('Punto 4 · E otros: despachador == regla directa', () => {
  it('E1 enalapril HTA sin IC', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: false, infartoReciente: false, proteinuriaONefropatia: false }, c);
    expect(evaluarFarmacoUi(d('ieca_ara2', { idFarmaco: 'enalapril', nombreComercial: 'Renitec', principiosActivos: ['enalapril'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E1b losartán HTA', () => {
    const c = ctx({ pautaFarmaco: P('21:00') });
    const directo = reglaIecaAra2({ idFarmaco: 'losartan', nombreComercial: 'Cozaar', principio: 'losartan', icDisfuncionSistolica: false, infartoReciente: false, proteinuriaONefropatia: false }, c);
    expect(evaluarFarmacoUi(d('ieca_ara2', { idFarmaco: 'losartan', nombreComercial: 'Cozaar', principiosActivos: ['losartan'], horas: ['21:00'] }), c, clin())).toEqual(directo);
  });
  it('E2 enalapril + IC FEVI 30 %: mantener', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaIecaAra2({ idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: true, infartoReciente: false, proteinuriaONefropatia: false }, c);
    expect(evaluarFarmacoUi(d('ieca_ara2', { idFarmaco: 'enalapril', nombreComercial: 'Renitec', principiosActivos: ['enalapril'], horas: ['09:00'] }), c, clin({ icDisfuncionSistolica: true }))).toEqual(directo);
  });
  it('E3 Entresto: suspender 24 h + validación (punto 8)', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaSacubitriloValsartan({ idFarmaco: 'entresto', nombreComercial: 'Entresto' }, c);
    expect(evaluarFarmacoUi(d('sacubitrilo_valsartan', { idFarmaco: 'entresto', nombreComercial: 'Entresto', principiosActivos: ['sacubitrilo', 'valsartan'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E4 furosemida', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaDiuretico({ idFarmaco: 'furosemida', nombreComercial: 'Seguril', principio: 'furosemida' }, c);
    expect(evaluarFarmacoUi(d('diuretico', { idFarmaco: 'furosemida', nombreComercial: 'Seguril', principiosActivos: ['furosemida'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E5 litio cirugía intermedia', () => {
    const c = ctx({ riesgoCardiovascular: 'intermedio', pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaLitio({ idFarmaco: 'litio', nombreComercial: 'Plenur' }, c);
    expect(evaluarFarmacoUi(d('litio', { idFarmaco: 'litio', nombreComercial: 'Plenur', principiosActivos: ['litio'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('E6 moclobemida', () => {
    const c = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaMoclobemida({ idFarmaco: 'moclobemida', nombreComercial: 'Manerix', principio: 'moclobemida' }, c);
    expect(evaluarFarmacoUi(d('moclobemida', { idFarmaco: 'moclobemida', nombreComercial: 'Manerix', principiosActivos: ['moclobemida'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('E7 tranilcipromina', () => {
    const c = ctx();
    const directo = reglaImaoIrreversible({ idFarmaco: 'tranilcipromina', nombreComercial: 'Parnate', principio: 'tranilcipromina' });
    expect(evaluarFarmacoUi(d('imao_irreversible', { idFarmaco: 'tranilcipromina', nombreComercial: 'Parnate', principiosActivos: ['tranilcipromina'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E8 rasagilina', () => {
    const c = ctx();
    const directo = reglaImaoB({ idFarmaco: 'rasagilina', nombreComercial: 'Azilect', principio: 'rasagilina' });
    expect(evaluarFarmacoUi(d('imao_b', { idFarmaco: 'rasagilina', nombreComercial: 'Azilect', principiosActivos: ['rasagilina'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E9 ibuprofeno', () => {
    const c = ctx({ pautaFarmaco: P('00:00', '08:00', '16:00') });
    const directo = reglaAine({ idFarmaco: 'ibuprofeno', nombreComercial: 'Neobrufen', principio: 'ibuprofeno' }, c);
    expect(evaluarFarmacoUi(d('aine_ibuprofeno', { idFarmaco: 'ibuprofeno', nombreComercial: 'Neobrufen', principiosActivos: ['ibuprofeno'], horas: ['00:00', '08:00', '16:00'] }), c, clin())).toEqual(directo);
  });
  it('E10 naproxeno', () => {
    const c = ctx({ pautaFarmaco: P('09:00', '21:00') });
    const directo = reglaAine({ idFarmaco: 'naproxeno', nombreComercial: 'Naprosyn', principio: 'naproxeno' }, c);
    expect(evaluarFarmacoUi(d('aine_naproxeno', { idFarmaco: 'naproxeno', nombreComercial: 'Naprosyn', principiosActivos: ['naproxeno'], horas: ['09:00', '21:00'] }), c, clin())).toEqual(directo);
  });
  it('E11 metotrexato 15 mg/sem', () => {
    const c = ctx();
    const directo = reglaMetotrexato({ idFarmaco: 'metotrexato', nombreComercial: 'Metoject', dosisSemanalMg: 15 });
    expect(evaluarFarmacoUi(d('metotrexato', { idFarmaco: 'metotrexato', nombreComercial: 'Metoject', principiosActivos: ['metotrexato'], via: 'subcutanea', dosisMg: 15 }), c, clin())).toEqual(directo);
  });
  it('E12 adalimumab biológico', () => {
    const c = ctx();
    const fecha = new Date(2026, 9, 8);
    const directo = reglaBiologico({ idFarmaco: 'adalimumab', nombreComercial: 'Humira', principio: 'adalimumab', periodicidadDias: 14, fechaUltimaDosis: fecha }, IV);
    expect(evaluarFarmacoUi(d('biologico', { idFarmaco: 'adalimumab', nombreComercial: 'Humira', principiosActivos: ['adalimumab'], via: 'subcutanea', fechaUltimaDosis: fecha, periodicidadDias: 14 }), c, clin())).toEqual(directo);
  });
  it('E13 bevacizumab, última dosis hace 4 semanas (el despachador conserva la alerta de la regla)', () => {
    const c = ctx();
    const directo = reglaAntiangiogenico({ idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principio: 'bevacizumab', semanasDesdeUltimaDosis: 4 });
    const fecha = new Date(2026, 8, 17); // 28 días antes de la intervención → 4 semanas
    const via = evaluarFarmacoUi(d('antiangiogenico', { idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principiosActivos: ['bevacizumab'], via: 'subcutanea', fechaUltimaDosis: fecha }), c, clin());
    // La pauta coincide con la regla directa…
    const { alertas, ...pauta } = via;
    expect(pauta).toEqual(directo.farmaco);
    // …y además el despachador eleva la alerta amarilla que la regla devuelve (antes se perdía).
    expect(alertas).toContainEqual(directo.alerta);
  });
  it('E14 Eylea intravítreo: mantener', () => {
    const c = ctx();
    const directo = reglaAntiangiogenico({ idFarmaco: 'aflibercept_intravitreo', nombreComercial: 'Eylea', principio: 'aflibercept', intravitreo: true }).farmaco;
    expect(evaluarFarmacoUi(d('antiangiogenico_intravitreo', { idFarmaco: 'aflibercept_intravitreo', nombreComercial: 'Eylea', principiosActivos: ['aflibercept'], via: 'subcutanea' }), c, clin())).toEqual(directo);
  });
  it('E15 ginkgo fitoterapia', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaFitoterapia({ idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principio: 'ginkgo' }, c);
    expect(evaluarFarmacoUi(d('fitoterapia', { idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principiosActivos: ['ginkgo'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E16 anticonceptivo oral, riesgo trombótico alto', () => {
    const c = ctx({ riesgoTromboticoAlto: true });
    const directo = reglaAnticonceptivoThs({ idFarmaco: 'aco', nombreComercial: 'ACO', principio: 'etinilestradiol', via: 'oral' }, c);
    expect(evaluarFarmacoUi(d('anticonceptivo_ths', { idFarmaco: 'aco', nombreComercial: 'ACO', principiosActivos: ['etinilestradiol'], via: 'oral', horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
  it('E17 implante anticonceptivo, sin riesgo trombótico alto', () => {
    const c = ctx({ riesgoTromboticoAlto: false });
    const directo = reglaAnticonceptivoThs({ idFarmaco: 'implante', nombreComercial: 'Implante', principio: 'etonogestrel', via: 'implante' }, c);
    expect(evaluarFarmacoUi(d('anticonceptivo_ths', { idFarmaco: 'implante', nombreComercial: 'Implante', principiosActivos: ['etonogestrel'], via: 'implante' }), c, clin())).toEqual(directo);
  });
});

// ————————————————————— Reglas nuevas conectadas —————————————————————
describe('Punto 4 · reglas nuevas del despachador (§8.5, §8.3, §8.4)', () => {
  it('DPP-4 (Januvia): tomar hasta el día previo, no la mañana', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaDpp4({ idFarmaco: 'sitagliptina', nombreComercial: 'Januvia', principio: 'sitagliptina' }, c);
    const r = evaluarFarmacoUi(d('dpp4', { idFarmaco: 'sitagliptina', nombreComercial: 'Januvia', principiosActivos: ['sitagliptina'], horas: ['09:00'] }), c, clin());
    expect(r).toEqual(directo);
    expect(r.accion).toBe('suspender');
    expect(r.textoPaciente).toContain('la mañana de la intervención');
  });
  it('sulfonilurea (gliclazida): no tomar el día de la intervención', () => {
    const c = ctx({ pautaFarmaco: P('09:00') });
    const directo = reglaAntidiabeticoNoDiaIq({ idFarmaco: 'gliclazida', nombreComercial: 'Diamicron', principio: 'gliclazida', grupo: 'sulfonilurea' }, c);
    expect(evaluarFarmacoUi(d('sulfonilurea', { idFarmaco: 'gliclazida', nombreComercial: 'Diamicron', principiosActivos: ['gliclazida'], horas: ['09:00'] }), c, clin())).toEqual(directo);
  });
});

// —————————— Independencia del reloj real (regresión del plazo no alcanzable) ——————————
// El despachador usa ctx.fechaReferencia como "hoy"; nunca el reloj del sistema cuando
// esa fecha está presente. Esta prueba simula que la máquina está en el futuro
// (01/01/2027, posterior a la intervención del 15/10/2026) y comprueba que los
// resultados de la batería NO cambian: así el CI no dependerá del día de ejecución.
describe('Punto 4 · los casos no dependen del reloj real (fechaReferencia fija)', () => {
  // Un conjunto representativo de fármacos con distintos tipos de plazo.
  function evaluarMuestra() {
    return [
      evaluarFarmacoUi(d('acod_antixa', { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], horas: ['09:00', '21:00'] }), ctx({ riesgoHemorragico: 'bajo', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }), clin()),
      evaluarFarmacoUi(d('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], horas: ['09:00'] }), ctx({ neuroaxial: true, pautaFarmaco: P('09:00') }), clin()),
      evaluarFarmacoUi(d('fitoterapia', { idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principiosActivos: ['ginkgo'], horas: ['09:00'] }), ctx({ pautaFarmaco: P('09:00') }), clin()),
      evaluarFarmacoUi(d('aine_naproxeno', { idFarmaco: 'naproxeno', nombreComercial: 'Naprosyn', principiosActivos: ['naproxeno'], horas: ['09:00', '21:00'] }), ctx({ pautaFarmaco: P('09:00', '21:00') }), clin()),
      evaluarFarmacoUi(d('avk_warfarina', { idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principiosActivos: ['warfarina'], horas: ['18:00'] }), ctx({ pautaFarmaco: P('18:00') }), clin()),
    ];
  }

  it('con el reloj del sistema en 01/01/2027 (posterior a la IQ), los resultados son idénticos', () => {
    const baseline = evaluarMuestra();
    const DateReal = globalThis.Date;
    const FUTURO = new DateReal(2027, 0, 1, 9, 0).getTime();
    // Sustituye el reloj: new Date() (sin argumentos) y Date.now() devuelven el futuro;
    // con argumentos se comporta como siempre.
    const DateFalsa = function (this: unknown, ...args: unknown[]) {
      return args.length === 0
        ? new DateReal(FUTURO)
        : new (DateReal as unknown as new (...a: unknown[]) => Date)(...args);
    } as unknown as DateConstructor;
    DateFalsa.now = () => FUTURO;
    DateFalsa.parse = DateReal.parse;
    DateFalsa.UTC = DateReal.UTC;
    (globalThis as { Date: DateConstructor }).Date = DateFalsa;
    try {
      const futuro = evaluarMuestra();
      expect(futuro).toEqual(baseline);
    } finally {
      (globalThis as { Date: DateConstructor }).Date = DateReal;
    }
  });
});
