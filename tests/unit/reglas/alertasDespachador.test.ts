/**
 * El despachador conserva las alertas que devuelven las reglas de medicación (§8)
 * y aplica el post-proceso de "plazo no alcanzable" (§4, paso 1). También conecta la
 * variante de P2Y12 en oftalmología de riesgo moderado/alto, y respeta la oftalmología
 * de riesgo bajo (no suspende).
 */
import { describe, it, expect } from '../../_harness.ts';
import type { ContextoReglas } from '../../../src/dominio/tipos.ts';
import { evaluarFarmacoUi, type DatosFarmacoUi } from '../../../src/dominio/reglas/despachador.ts';
import { HECHOS_VACIOS } from '../../../src/dominio/entrevista/hechosClinicos.ts';

// Fecha de intervención lejana para que los plazos SÍ se puedan cumplir (evita que
// "plazo no alcanzable" dispare en los casos que no lo prueban).
// Intervención muy lejana (hoy + 120 días) y fecha de referencia = hoy: la prueba
// se ancla al reloj (ref siempre antes de la intervención), nunca a una fecha de
// calendario concreta, así que es determinista sin depender del día real.
const AHORA = new Date();
const IV_LEJANA = new Date(AHORA.getTime() + 120 * 86_400_000);

function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV_LEJANA, fechaReferencia: AHORA, riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento: null, ...p,
  };
}
function d(idRegla: string, x: Partial<DatosFarmacoUi> & { nombreComercial: string; principiosActivos: string[] }): DatosFarmacoUi {
  return { idFarmaco: x.idFarmaco ?? idRegla, idRegla, via: 'oral', horas: [], ...x };
}
const mensajes = (r: ReturnType<typeof evaluarFarmacoUi>) => (r.alertas ?? []).map((a) => `${a.gravedad}:${a.mensaje}`);

describe('§8 · el despachador conserva las alertas de las reglas', () => {
  it('fondaparinux con aclaramiento < 20 → alerta ROJA de contraindicado en el resultado', () => {
    const r = evaluarFarmacoUi(
      d('fondaparinux', { nombreComercial: 'Arixtra', principiosActivos: ['fondaparinux'], horas: ['09:00'] }),
      ctx({ aclaramiento: 15 }), HECHOS_VACIOS,
    );
    const roja = (r.alertas ?? []).find((a) => a.gravedad === 'roja');
    expect(roja?.mensaje).toMatch(/contraindicaci/i);
  });

  it('antiangiogénico sistémico reciente → alerta ROJA de diferir 6-8 semanas (punto 8)', () => {
    const r = evaluarFarmacoUi(
      d('antiangiogenico', { idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principiosActivos: ['bevacizumab'], via: 'subcutanea', fechaUltimaDosis: new Date(IV_LEJANA.getTime() - 28 * 86_400_000) }),
      ctx(), HECHOS_VACIOS,
    );
    expect(mensajes(r).some((m) => m.startsWith('roja') && /6-8 semanas/.test(m))).toBeTrue();
  });

  /**
   * Barrido: toda regla que, en el caso que la dispara, devuelve una alerta, debe
   * reflejarla en resultado.alertas al pasar por el despachador. Si se añade una
   * regla nueva con alerta, basta con añadir aquí su disparador.
   */
  it('barrido: cada regla con alerta eleva su alerta al pasar por el despachador', () => {
    const casos: Array<{ nombre: string; datos: DatosFarmacoUi; ctx: ContextoReglas; clin?: typeof HECHOS_VACIOS }> = [
      {
        nombre: 'fondaparinux CrCl<20 (roja)',
        datos: d('fondaparinux', { nombreComercial: 'Arixtra', principiosActivos: ['fondaparinux'], horas: ['09:00'] }),
        ctx: ctx({ aclaramiento: 15 }),
      },
      {
        nombre: 'antiangiogénico reciente (amarilla)',
        datos: d('antiangiogenico', { idFarmaco: 'bevacizumab', nombreComercial: 'Avastin', principiosActivos: ['bevacizumab'], via: 'subcutanea', fechaUltimaDosis: new Date(IV_LEJANA.getTime() - 28 * 86_400_000) }),
        ctx: ctx(),
      },
      {
        nombre: 'plazo no alcanzable (roja) — ginkgo con intervención inminente',
        datos: d('fitoterapia', { idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principiosActivos: ['ginkgo'], horas: ['09:00'] }),
        ctx: ctx({ fechaHoraIntervencion: new Date(Date.now() + 2 * 86_400_000) }), // deadline 14 días → en el pasado
      },
    ];
    const sinAlerta = casos.filter((c) => evaluarFarmacoUi(c.datos, c.ctx, c.clin ?? HECHOS_VACIOS).alertas === undefined || (evaluarFarmacoUi(c.datos, c.ctx, c.clin ?? HECHOS_VACIOS).alertas ?? []).length === 0);
    expect(sinAlerta.map((c) => c.nombre)).toEqual([]);
  });
});

describe('§4 paso 1 · plazo no alcanzable en el despachador', () => {
  it('ginkgo (14 días) con intervención en 2 días → plazo no alcanzable: «no tome más dosis» + punto rojo + alerta roja (punto 8)', () => {
    const r = evaluarFarmacoUi(
      d('fitoterapia', { idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principiosActivos: ['ginkgo'], horas: ['09:00'] }),
      ctx({ fechaHoraIntervencion: new Date(Date.now() + 2 * 86_400_000) }), HECHOS_VACIOS,
    );
    expect(r.accion).toBe('suspender');
    expect(r.requiereConfirmacion).toBeFalse();
    expect(r.textoPaciente).toContain('No tome más dosis');
    expect(r.puntoValidacion?.tipo).toBe('posponer');
    expect((r.alertas ?? []).some((a) => a.gravedad === 'roja' && /no se puede cumplir el plazo/i.test(a.mensaje))).toBeTrue();
  });

  it('ginkgo con intervención lejana → se mantiene la pauta de suspender (sin alerta de plazo)', () => {
    const r = evaluarFarmacoUi(
      d('fitoterapia', { idFarmaco: 'ginkgo', nombreComercial: 'Ginkgo', principiosActivos: ['ginkgo'], horas: ['09:00'] }),
      ctx(), HECHOS_VACIOS,
    );
    expect(r.accion).toBe('suspender');
    expect((r.alertas ?? []).some((a) => /no se puede cumplir el plazo/i.test(a.mensaje))).toBeFalse();
  });
});

describe('§8.3 · P2Y12 en oftalmología', () => {
  it('oftalmología moderada/alta (vitrectomía): sustituir por AAS 100 y suspender el P2Y12', () => {
    const r = evaluarFarmacoUi(
      d('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], horas: ['09:00'] }),
      ctx({ grupoOftalmologico: 'riesgo_moderado_alto' }), HECHOS_VACIOS,
    );
    expect(r.accion).toBe('suspender');
    expect(r.reglaAplicada).toMatch(/Oftalmología moderada\/alta/);
    expect(r.textoPaciente).toMatch(/AAS 100 mg/);
  });

  it('oftalmología de riesgo bajo (catarata tópica): NO se suspende el P2Y12', () => {
    const r = evaluarFarmacoUi(
      d('p2y12_clopidogrel', { nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], horas: ['09:00'] }),
      ctx({ grupoOftalmologico: 'riesgo_bajo' }), HECHOS_VACIOS,
    );
    expect(r.accion).toBe('mantener');
  });
});
