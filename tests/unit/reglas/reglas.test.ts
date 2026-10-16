import { describe, it, expect } from '../../_harness.ts';
import type { ContextoReglas } from '../../../src/dominio/tipos.ts';
import { reglaAcod } from '../../../src/dominio/reglas/acod.ts';
import {
  reglaAas,
  reglaP2y12,
  evaluarStent,
  reglaP2y12Oftalmo,
} from '../../../src/dominio/reglas/antiagregantes.ts';
import { reglaAvk } from '../../../src/dominio/reglas/antivitaminaK.ts';
import { reglaLitio } from '../../../src/dominio/reglas/psicofarmacos.ts';
import { reglaAine } from '../../../src/dominio/reglas/aine.ts';
import { reglaMetformina, reglaSglt2, reglaGlp1Semanal, reglaGlp1Diario, reglaBombaInsulina } from '../../../src/dominio/reglas/antidiabeticos.ts';
import { reglaSacubitriloValsartan, reglaIecaAra2 } from '../../../src/dominio/reglas/cardiovasculares.ts';
import { reglaNoCatalogado, reglaMantener, aplicarPlazoNoAlcanzable } from '../../../src/dominio/reglas/otros.ts';
import { fechaHoraLimite } from '../../../src/dominio/fechas/plazos.ts';
import { textoHojaPaciente } from '../../../src/dominio/salidas/hojaFarmaco.ts';

// Intervención de referencia: jueves 15 de octubre de 2026, 08:00.
const IV = new Date(2026, 9, 15, 8, 0);

function ctx(parcial: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV,
    fechaReferencia: new Date(2026, 8, 29),
    riesgoHemorragico: 'alto',
    riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica',
    neuroaxial: false,
    bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false,
    pesoKg: 80,
    aclaramiento: null,
    // Pauta a las 08:00 (igual que la hora de la intervención): así, para un plazo
    // en horas, la última toma cae EXACTAMENTE en el límite y `horasAntes` mide el
    // plazo aplicado; y para un plazo en días, la última toma es el día (N+1) a las 08:00.
    // Las fechas/horas EXACTAS con pautas realistas se verifican en la batería de
    // docs/casos_referencia.md (tests/casos-referencia).
    pautaFarmaco: { horas: ['08:00'] },
    ...parcial,
  };
}

/** Horas entre la fecha límite y la intervención. */
function horasAntes(limite: Date): number {
  return Math.round((IV.getTime() - limite.getTime()) / 3_600_000);
}

/** Días entre la última toma y la intervención (para plazos en días con pauta 08:00). */
function diasAntes(ultima: Date): number {
  return Math.round((IV.getTime() - ultima.getTime()) / 86_400_000);
}

/** Contexto SIN pauta horaria (para probar el caso "falta la hora de la toma"). */
function ctxSinPauta(parcial: Partial<ContextoReglas> = {}): ContextoReglas {
  const base = ctx(parcial);
  const { pautaFarmaco: _omit, ...resto } = base;
  return resto;
}

describe('ACOD (§8.2)', () => {
  it('caso 1 §15: apixabán (anti-Xa), prótesis rodilla (hemorrágico alto) + raquídea, CrCl 45 → 72 h', () => {
    const r = reglaAcod(
      { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' },
      ctx({ riesgoHemorragico: 'alto', neuroaxial: true, aclaramiento: 45 }),
    );
    expect(r.accion).toBe('suspender');
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(72);
    expect(r.requiereConfirmacion).toBeFalse();
  });

  it('caso 2 §15: dabigatrán, CrCl 40, colecistectomía AG (sin neuroaxial) → 48 + 48 = 96 h', () => {
    const r = reglaAcod(
      { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' },
      // colecistectomía laparoscópica: riesgo hemorrágico bajo, sin neuroaxial → base 48
      ctx({ riesgoHemorragico: 'bajo', neuroaxial: false, aclaramiento: 40 }),
    );
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(96);
  });

  it('dabigatrán + neuroaxial: 72/96/120 h según CrCl', () => {
    const mk = (crcl: number) =>
      reglaAcod(
        { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' },
        ctx({ neuroaxial: true, aclaramiento: crcl }),
      );
    expect(horasAntes(mk(90).fechaHoraUltimaToma as Date)).toBe(72);
    expect(horasAntes(mk(60).fechaHoraUltimaToma as Date)).toBe(96);
    expect(horasAntes(mk(40).fechaHoraUltimaToma as Date)).toBe(120);
  });

  it('anti-Xa + neuroaxial + CrCl < 30 → 96 h', () => {
    const r = reglaAcod(
      { idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principioActivo: 'rivaroxaban', subtipo: 'antixa' },
      ctx({ neuroaxial: true, aclaramiento: 25 }),
    );
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(96);
  });

  it('oftalmología riesgo bajo: no suspender', () => {
    const r = reglaAcod(
      { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' },
      ctx({ grupoOftalmologico: 'riesgo_bajo' }),
    );
    expect(r.accion).toBe('mantener');
  });

  it('sin aclaramiento → tramo más prudente + validación (punto 8, 1.1)', () => {
    const r = reglaAcod(
      { idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' },
      ctx({ neuroaxial: false, riesgoHemorragico: 'bajo', aclaramiento: null }),
    );
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    expect(r.textoAnestesiologo).toContain('función renal');
  });
});

describe('Antiagregantes (§8.3)', () => {
  it('AAS 100 mg: mantener', () => {
    const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 100 }, ctx());
    expect(r.accion).toBe('mantener');
  });

  it('caso 7 §15: prótesis de cadera con raquídea y ticagrelor → 7 días (última toma día 8 previo)', () => {
    const r = reglaP2y12(
      { idFarmaco: 'ticagrelor', nombreComercial: 'Brilique', principio: 'ticagrelor', monoterapia: false },
      ctx({ neuroaxial: true }),
    );
    expect(diasAntes(r.fechaHoraUltimaToma as Date)).toBe(8);
  });

  it('clopidogrel sin neuroaxial → 5 días (última toma día 6 previo)', () => {
    const r = reglaP2y12(
      { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false },
      ctx({ neuroaxial: false }),
    );
    expect(diasAntes(r.fechaHoraUltimaToma as Date)).toBe(6);
  });

  it('caso 6 §15: vitrectomía (oftalmo moderado/alto) con clopidogrel monoterapia → sustituir por AAS y suspender 5 días', () => {
    const r = reglaP2y12Oftalmo(
      { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: true },
      ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'minimo' }),
    );
    expect(diasAntes(r.fechaHoraUltimaToma as Date)).toBe(6);
    expect(r.textoAnestesiologo).toContain('AAS 100');
  });

  it('caso 3 §15: stent farmacoactivo 4 meses tras SCA → alerta de diferir, requiere confirmación, suprime pauta en hoja', () => {
    const s = evaluarStent({ mesesDesdeImplante: 4, traSca: true }, ctx({ neuroaxial: false }));
    expect(s.recienteRequiereConfirmacion).toBeTrue();
    expect(s.suprimirPautaAntiagregantesEnHoja).toBeTrue();
    expect(s.alertas[0]?.gravedad).toBe('roja');
  });

  it('caso Decisión 3: stent reciente + neuroaxial → doble alerta, stent primero y en rojo', () => {
    const s = evaluarStent({ mesesDesdeImplante: 4, traSca: true }, ctx({ neuroaxial: true }));
    expect(s.alertas).toHaveLength(2);
    expect(s.alertas[0]?.gravedad).toBe('roja');
    expect(s.alertas[0]?.origen).toContain('§8.3');
  });

  it('stent antiguo (SCA hace 18 meses) → no reciente', () => {
    const s = evaluarStent({ mesesDesdeImplante: 18, traSca: true }, ctx());
    expect(s.recienteRequiereConfirmacion).toBeFalse();
  });
});

describe('Antivitamina K (§8.1)', () => {
  it('caso 5 §15: catarata (oftalmo riesgo bajo) con acenocumarol → no suspender', () => {
    const r = reglaAvk(
      { idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false },
      ctx({ grupoOftalmologico: 'riesgo_bajo' }),
    );
    expect(r.farmaco.accion).toBe('mantener');
  });

  it('caso 12 §15: warfarina por prótesis mitral mecánica, 80 kg → puente enoxaparina 80 mg/12 h + punto rojo (punto 8)', () => {
    const r = reglaAvk(
      { idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: true },
      ctx({ pesoKg: 80, aclaramiento: 90 }),
    );
    expect(r.farmaco.accion).toBe('suspender');
    expect(r.farmaco.requiereConfirmacion).toBeFalse();
    expect(r.farmaco.puntoValidacion?.tipo).toBe('posponer');
    expect(r.puente?.dosisMgPorToma).toBe(80);
    expect(r.puente?.intervaloHoras).toBe(12);
    expect(r.farmaco.textoAnestesiologo).toContain('80 mg');
  });

  it('puente con CrCl < 30 → cada 24 h', () => {
    const r = reglaAvk(
      { idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: true },
      ctx({ pesoKg: 70, aclaramiento: 25 }),
    );
    expect(r.puente?.intervaloHoras).toBe(24);
  });

  it('acenocumarol estándar → suspender 3 días (última toma día 4 previo)', () => {
    const r = reglaAvk(
      { idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false },
      ctx({ riesgoHemorragico: 'alto' }),
    );
    expect(diasAntes(r.farmaco.fechaHoraUltimaToma as Date)).toBe(4);
  });
});

describe('Litio (§8.7)', () => {
  it('caso 13 §15: litio y cirugía de alto riesgo → 72 h', () => {
    const r = reglaLitio({ idFarmaco: 'litio', nombreComercial: 'Plenur' }, ctx({ riesgoCardiovascular: 'alto' }));
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(72);
  });
  it('litio riesgo bajo → 24 h', () => {
    const r = reglaLitio({ idFarmaco: 'litio', nombreComercial: 'Plenur' }, ctx({ riesgoCardiovascular: 'bajo' }));
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(24);
  });
});

describe('AINE (§8.6)', () => {
  it('ibuprofeno → 24 h con nota de alternativa', () => {
    const r = reglaAine({ idFarmaco: 'ibuprofeno', nombreComercial: 'Neobrufen', principio: 'ibuprofeno' }, ctx());
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(24);
    expect(r.textoPaciente).toContain('paracetamol o metamizol');
  });
  it('naproxeno → 72 h', () => {
    const r = reglaAine({ idFarmaco: 'naproxeno', nombreComercial: 'Naprosyn', principio: 'naproxeno' }, ctx());
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(72);
  });
  it('celecoxib → mantener', () => {
    const r = reglaAine({ idFarmaco: 'celecoxib', nombreComercial: 'Celebrex', principio: 'celecoxib' }, ctx());
    expect(r.accion).toBe('mantener');
  });
});

describe('Antidiabéticos (§8.5)', () => {
  it('caso 4 §15: metformina → no tomar el día de la IQ (suspender, última toma el día previo)', () => {
    const r = reglaMetformina({ idFarmaco: 'metformina', nombreComercial: 'Dianben' }, ctx());
    expect(r.accion).toBe('suspender');
    expect(r.textoPaciente).toContain('No la tome el día');
    // Última toma el día previo (miércoles 14).
    expect((r.fechaHoraUltimaToma as Date).getDate()).toBe(14);
  });

  it('caso 4 §15: empagliflozina (SGLT2) → 3 días (última toma día 4 previo)', () => {
    const r = reglaSglt2({ idFarmaco: 'empagliflozina', nombreComercial: 'Jardiance', principio: 'empagliflozina' }, ctx());
    expect(diasAntes(r.fechaHoraUltimaToma as Date)).toBe(4);
  });

  it('ertugliflozina → 4 días (última toma día 5 previo)', () => {
    const r = reglaSglt2({ idFarmaco: 'ertugliflozina', nombreComercial: 'Steglatro', principio: 'ertugliflozina' }, ctx());
    expect(diasAntes(r.fechaHoraUltimaToma as Date)).toBe(5);
  });

  it('caso 4 §15: semaglutida semanal cuya dosis cae en la ventana de 7 días → omitir + dieta líquida', () => {
    const proxima = new Date(2026, 9, 12, 9, 0); // lunes 12, dentro de los 7 días previos al jueves 15
    const r = reglaGlp1Semanal(
      { idFarmaco: 'semaglutida', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: proxima },
      ctx(),
    );
    expect(r.accion).toBe('suspender');
    expect(r.textoPaciente).toContain('líquidos claros');
  });

  it('GLP-1 semanal: dosis el mismo día de la intervención también se omite (ambos incluidos)', () => {
    const r = reglaGlp1Semanal(
      { idFarmaco: 'semaglutida', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 15, 12, 0) },
      ctx(),
    );
    expect(r.accion).toBe('suspender');
  });

  it('GLP-1 semanal: dosis fuera de la ventana (8 días antes) → mantener', () => {
    const r = reglaGlp1Semanal(
      { idFarmaco: 'semaglutida', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 7, 9, 0) },
      ctx(),
    );
    expect(r.accion).toBe('mantener');
  });

  it('GLP-1 diario → última dosis 4 días antes', () => {
    const r = reglaGlp1Diario({ idFarmaco: 'semaglutida_oral', nombreComercial: 'Rybelsus', principio: 'semaglutida' }, ctx());
    const dias = Math.round((IV.getTime() - (r.fechaHoraUltimaToma as Date).getTime()) / 86_400_000);
    expect(dias).toBe(4);
  });

  it('bomba de insulina: cirugía de riesgo bajo → sin confirmación', () => {
    const r = reglaBombaInsulina({ idFarmaco: 'bomba', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'bajo' }));
    expect(r.requiereConfirmacion).toBeFalse();
  });

  it('bomba de insulina: cirugía de riesgo intermedio o alto → venir con la bomba + validación (punto 8)', () => {
    const rInter = reglaBombaInsulina({ idFarmaco: 'bomba', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'intermedio' }));
    expect(rInter.requiereConfirmacion).toBeFalse();
    expect(rInter.puntoValidacion?.tipo).toBe('validar');
    expect(rInter.textoPaciente).toContain('material de recambio');
    const rAlto = reglaBombaInsulina({ idFarmaco: 'bomba', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'alto' }));
    expect(rAlto.requiereConfirmacion).toBeFalse();
    expect(rAlto.puntoValidacion?.tipo).toBe('validar');
  });
});

describe('Cardiovasculares (§8.10)', () => {
  it('sacubitrilo/valsartán → suspender 24 h + punto de validación (punto 8)', () => {
    const r = reglaSacubitriloValsartan({ idFarmaco: 'sacubitrilo_valsartan', nombreComercial: 'Entresto' }, ctx());
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('IECA sin IC con disfunción sistólica (todas las excepciones false) → suspender 24 h', () => {
    const r = reglaIecaAra2(
      { idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: false, infartoReciente: false, proteinuriaONefropatia: false },
      ctx(),
    );
    expect(r.accion).toBe('suspender');
    expect(horasAntes(r.fechaHoraUltimaToma as Date)).toBe(24);
  });
  it('IECA con IC con disfunción sistólica → mantener', () => {
    const r = reglaIecaAra2(
      { idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: true, infartoReciente: false, proteinuriaONefropatia: false },
      ctx(),
    );
    expect(r.accion).toBe('mantener');
  });
  it('IECA con información incompleta → no tomar el día de la IQ + validación (punto 8, 5.1)', () => {
    const r = reglaIecaAra2(
      { idFarmaco: 'enalapril', nombreComercial: 'Renitec', principio: 'enalapril' },
      ctx(),
    );
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
});

describe('Texto no oral y comportamiento de requiere-confirmación (§8.0, §12)', () => {
  it('fármaco no oral: "mantener" no dice "con un sorbo de agua"', () => {
    const r = reglaMantener('fent', 'Durogesic', ['fentanilo'], 'parche: mantener', 'transdermica');
    expect(r.textoPaciente).not.toContain('sorbo de agua');
    expect(r.textoPaciente).toContain('parche');
  });
  it('fármaco oral: "mantener" mantiene "con un sorbo de agua"', () => {
    const r = reglaMantener('ena', 'Renitec', ['enalapril'], 'mantener');
    expect(r.textoPaciente).toContain('sorbo de agua');
  });
  it('punto 8: un fármaco con punto de validación propone la pauta en la hoja (sin «le llamará»)', () => {
    // Monoterapia P2Y12: ahora propone la suspensión y deja un punto amarillo, sin
    // «requiere confirmación»; la hoja del paciente muestra la pauta directamente.
    const r = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: true }, ctx({ neuroaxial: true }));
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
    const texto = textoHojaPaciente(r);
    expect(texto).not.toContain('el anestesiólogo le llamará');
    expect(texto).toContain('Tome la última dosis');
  });
});

describe('Hora de la toma asumida (punto 8, 11.1)', () => {
  it('ACOD sin pauta horaria → asume la toma más tardía (23:59), genera fecha + validación', () => {
    const r = reglaAcod(
      { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' },
      ctxSinPauta({ riesgoHemorragico: 'bajo', aclaramiento: 70 }),
    );
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.fechaHoraUltimaToma !== undefined).toBeTrue();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('AINE sin pauta → asume 23:59, genera fecha', () => {
    const r = reglaAine({ idFarmaco: 'ibu', nombreComercial: 'Neobrufen', principio: 'ibuprofeno' }, ctxSinPauta());
    expect(r.fechaHoraUltimaToma !== undefined).toBeTrue();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
  it('litio sin pauta → asume 23:59, genera fecha + validación', () => {
    const r = reglaLitio({ idFarmaco: 'li', nombreComercial: 'Plenur' }, ctxSinPauta({ riesgoCardiovascular: 'alto' }));
    expect(r.fechaHoraUltimaToma !== undefined).toBeTrue();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });
});

describe('Genéricas y plazo no alcanzable', () => {
  it('caso 20 §15: fármaco no catalogado → mantener + validación (punto 8, 9.1)', () => {
    const r = reglaNoCatalogado('MedicamentoRaro');
    expect(r.accion).toBe('mantener');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.puntoValidacion?.tipo).toBe('validar');
  });

  it('caso 15 §15: clopidogrel con IQ dentro de 3 días → plazo no alcanzable: «no tome más dosis» + punto rojo (punto 8, 9.3)', () => {
    // Plazo 5 días para clopidogrel, pero "ahora" es 3 días antes de la IQ.
    const r = reglaP2y12(
      { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false },
      ctx({ neuroaxial: false }),
    );
    const ahora = fechaHoraLimite(IV, 3 * 24); // 3 días antes de la IQ
    const { resultado, alerta } = aplicarPlazoNoAlcanzable(r, ctx(), ahora);
    expect(resultado.requiereConfirmacion).toBeFalse();
    expect(resultado.accion).toBe('suspender');
    expect(resultado.textoPaciente).toContain('No tome más dosis');
    expect(resultado.puntoValidacion?.tipo).toBe('posponer');
    expect(alerta?.gravedad).toBe('roja');
  });

  it('plazo alcanzable no altera el resultado', () => {
    const r = reglaP2y12(
      { idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false },
      ctx({ neuroaxial: false }),
    );
    const ahora = fechaHoraLimite(IV, 10 * 24); // 10 días antes: hay margen
    const { resultado, alerta } = aplicarPlazoNoAlcanzable(r, ctx(), ahora);
    expect(resultado.requiereConfirmacion).toBeFalse();
    expect(alerta).toBeUndefined();
  });
});
