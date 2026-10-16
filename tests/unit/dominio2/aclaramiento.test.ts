/**
 * Resolución del aclaramiento de creatinina de la entrevista (§8.2/§8.4):
 * módulo renal/trasplante (prioritario) o dato manual del paso 8 (aclaramiento,
 * creatinina → Cockcroft-Gault, o «no disponible» → requiere confirmación, A7).
 */
import { describe, it, expect } from '../../_harness.ts';
import { resolverAclaramiento, aclaramientoDeMasDe3Meses } from '../../../src/dominio/entrevista/aclaramiento.ts';

const DATOS = { edadAnios: 70, pesoKg: 70, sexo: 'hombre' as const };

describe('§8.2/§8.4 · resolverAclaramiento', () => {
  it('si el módulo aporta el aclaramiento, manda (fuente módulo), ignorando el manual', () => {
    const r = resolverAclaramiento(45, { tipo: 'aclaramiento', valor: 90 }, DATOS);
    expect(r.valor).toBe(45);
    expect(r.fuente).toBe('modulo');
  });

  it('sin módulo y con aclaramiento manual: usa el manual', () => {
    const r = resolverAclaramiento(null, { tipo: 'aclaramiento', valor: 55 }, DATOS);
    expect(r.valor).toBe(55);
    expect(r.fuente).toBe('manual');
  });

  it('sin módulo y con creatinina manual: calcula Cockcroft-Gault', () => {
    // ((140-70)*70)/(72*1) = 68,06 mL/min (varón, creatinina 1,0).
    const r = resolverAclaramiento(null, { tipo: 'creatinina', valor: 1.0 }, DATOS);
    expect(r.valor).toBeCloseTo(68.1, 1);
    expect(r.fuente).toBe('manual');
  });

  it('«no disponible» → usa el filtrado glomerular del paso de pruebas si lo hay (punto 8, 1.1)', () => {
    const r = resolverAclaramiento(null, { tipo: 'no_disponible' }, DATOS, null, 40);
    expect(r.valor).toBe(40);
    expect(r.fuente).toBe('filtrado_glomerular');
  });

  it('«no disponible» sin filtrado → null (fuente manual)', () => {
    const r = resolverAclaramiento(null, { tipo: 'no_disponible' }, DATOS);
    expect(r.valor).toBe(null);
    expect(r.fuente).toBe('manual');
  });

  it('sin creatinina ni aclaramiento, con filtrado glomerular → usa el filtrado (punto 8, 1.1)', () => {
    const r = resolverAclaramiento(null, null, DATOS, null, 35);
    expect(r.valor).toBe(35);
    expect(r.fuente).toBe('filtrado_glomerular');
  });

  it('el dato manual (creatinina/aclaramiento) tiene prioridad sobre el filtrado glomerular', () => {
    const r = resolverAclaramiento(null, { tipo: 'aclaramiento', valor: 55 }, DATOS, null, 35);
    expect(r.valor).toBe(55);
    expect(r.fuente).toBe('manual');
  });

  it('el módulo renal tiene prioridad sobre el filtrado glomerular', () => {
    const r = resolverAclaramiento(45, null, DATOS, '2026-06-01', 35);
    expect(r.valor).toBe(45);
    expect(r.fuente).toBe('modulo');
  });

  it('sin módulo y sin manual → null, fuente ninguno', () => {
    const r = resolverAclaramiento(null, null, DATOS);
    expect(r.valor).toBe(null);
    expect(r.fuente).toBe('ninguno');
  });

  it('aclaramiento manual no positivo se trata como desconocido', () => {
    expect(resolverAclaramiento(null, { tipo: 'aclaramiento', valor: 0 }, DATOS).valor).toBe(null);
  });

  it('la fuente módulo lleva la fecha de la analítica del módulo', () => {
    const r = resolverAclaramiento(45, null, DATOS, '2026-06-01');
    expect(r.fuente).toBe('modulo');
    expect(r.fecha).toBe('2026-06-01');
  });

  it('la fuente manual lleva la fecha del dato manual', () => {
    const r = resolverAclaramiento(null, { tipo: 'creatinina', valor: 1.0, fecha: '2026-05-10' }, DATOS);
    expect(r.fuente).toBe('manual');
    expect(r.fecha).toBe('2026-05-10');
  });
});

describe('§6.7 · aclaramientoDeMasDe3Meses', () => {
  const REF = new Date(2026, 10, 5); // 5 nov 2026

  it('analítica de hace más de 3 meses → true', () => {
    const r = resolverAclaramiento(45, null, DATOS, '2026-06-01'); // ~5 meses antes
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeTrue();
  });

  it('analítica reciente (menos de 3 meses) → false', () => {
    const r = resolverAclaramiento(45, null, DATOS, '2026-10-01'); // ~1 mes antes
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeFalse();
  });

  it('poco menos de 3 meses no se considera antiguo', () => {
    const r = resolverAclaramiento(45, null, DATOS, '2026-08-10'); // ~87 días (< 3 meses)
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeFalse();
  });

  it('sin fecha de analítica → false (no se afirma nada)', () => {
    const r = resolverAclaramiento(45, null, DATOS, null);
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeFalse();
  });

  it('sin valor de aclaramiento → false aunque haya fecha', () => {
    const r = resolverAclaramiento(null, { tipo: 'no_disponible' }, DATOS);
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeFalse();
  });

  it('fecha manual de hace más de 3 meses → true', () => {
    const r = resolverAclaramiento(null, { tipo: 'aclaramiento', valor: 55, fecha: '2026-01-10' }, DATOS);
    expect(aclaramientoDeMasDe3Meses(r, REF)).toBeTrue();
  });
});
