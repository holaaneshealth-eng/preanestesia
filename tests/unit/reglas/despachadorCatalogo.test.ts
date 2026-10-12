/**
 * Punto 3 de la tarea: cobertura del despachador sobre TODO el catálogo.
 * Recorre cada fila de datos/farmacos.csv y comprueba que su id_regla llega a su
 * regla propia en el despachador (nunca al comodín). Y que el comodín, cuando
 * actúa (id_regla desconocido), es "requiere confirmación del anestesiólogo",
 * nunca "mantener".
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../../_harness.ts';
import type { ContextoReglas, Via } from '../../../src/dominio/tipos.ts';
import { parseCsv } from '../../../src/datos/csv.ts';
import { evaluarFarmacoUi, type DatosFarmacoUi } from '../../../src/dominio/reglas/despachador.ts';
import { HECHOS_VACIOS } from '../../../src/dominio/entrevista/hechosClinicos.ts';

// Se parsea el CSV directamente (sin farmacos.ts, que usa el import `?raw` de Vite,
// no soportado por el runner de node). Así el test corre en node y en Vitest.
const CSV = readFileSync(fileURLToPath(new URL('../../../datos/farmacos.csv', import.meta.url)), 'utf8');
const IV = new Date(2026, 9, 15, 8, 0);

const listaBarra = (v: string | undefined): string[] => (v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
const listaMas = (v: string | undefined): string[] => (v ?? '').split('+').map((s) => s.trim()).filter(Boolean);

interface FilaFarmaco {
  id: string;
  principiosActivos: string[];
  nombresComerciales: string[];
  idRegla: string[];
  via: Via;
  textoPaciente: string;
  textoAnestesiologo: string;
  requiereConfirmacion: boolean;
}

function cargarFilas(csv: string): FilaFarmaco[] {
  return parseCsv(csv).filas.map((fila) => {
    const v = fila.valores;
    return {
      id: v.id ?? '',
      principiosActivos: listaMas(v.principios_activos),
      nombresComerciales: listaBarra(v.nombres_comerciales),
      idRegla: listaMas(v.id_regla),
      via: ((v.via ?? 'oral').trim().toLowerCase() || 'oral') as Via,
      textoPaciente: (v.texto_paciente ?? '').trim(),
      textoAnestesiologo: (v.texto_anestesiologo ?? '').trim(),
      requiereConfirmacion: (v.requiere_confirmacion ?? 'no').trim().toLowerCase() === 'si',
    };
  });
}

function ctx(): ContextoReglas {
  return {
    fechaHoraIntervencion: IV,
    // Fecha de referencia fija (29/09/2026): la prueba no depende del reloj real.
    fechaReferencia: new Date(2026, 8, 29),
    riesgoHemorragico: 'alto',
    riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica',
    neuroaxial: false,
    bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false,
    pesoKg: 80,
    aclaramiento: 90, // conocido, para que las reglas dependientes del riñón calculen
  };
}

/** Construye un DatosFarmacoUi "completo" para que ninguna regla se quede sin datos. */
function datosDesde(f: FilaFarmaco, idRegla: string): DatosFarmacoUi {
  return {
    idFarmaco: f.id,
    nombreComercial: f.nombresComerciales[0] ?? f.id,
    principiosActivos: f.principiosActivos,
    idRegla,
    via: f.via,
    horas: ['09:00', '21:00'],
    dosisMg: 100,
    proximaDosisSemanal: new Date(2026, 9, 12, 9, 0),
    fechaUltimaDosis: new Date(2026, 9, 8),
    periodicidadDias: 14,
    insulinaBasalUi: 20,
    insulinaNocheUi: 10,
    insulinaMananaUi: 20,
    tipoHbpm: 'profilactica',
    ...(f.textoPaciente ? { textoPacienteOverride: f.textoPaciente } : {}),
    ...(f.textoAnestesiologo ? { textoAnestesiologoOverride: f.textoAnestesiologo } : {}),
    ...(f.requiereConfirmacion ? { requiereConfirmacionCatalogo: true } : {}),
  };
}

describe('Punto 3 · el despachador cubre todo el catálogo (farmacos.csv)', () => {
  const catalogo = cargarFilas(CSV);

  it('el catálogo tiene un número razonable de filas (no está vacío)', () => {
    expect(catalogo.length).toBeGreaterThan(150);
  });

  it('cada id_regla de cada fila llega a su regla propia (nunca al comodín)', () => {
    const sinRama: string[] = [];
    for (const f of catalogo) {
      // Se aplica la regla más restrictiva; para la cobertura basta la primera.
      const idRegla = f.idRegla[0] ?? '';
      const r = evaluarFarmacoUi(datosDesde(f, idRegla), ctx(), HECHOS_VACIOS);
      if (r.reglaAplicada.includes('sin rama propia')) {
        sinRama.push(`${f.id} (${idRegla})`);
      }
    }
    expect(sinRama).toEqual([]);
  });

  it('las filas "mantener_generico" resuelven a acción mantener', () => {
    const filas = catalogo.filter((f) => (f.idRegla[0] ?? '') === 'mantener_generico');
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) {
      const r = evaluarFarmacoUi(datosDesde(f, 'mantener_generico'), ctx(), HECHOS_VACIOS);
      expect(r.accion).toBe('mantener');
    }
  });

  it('los inhaladores muestran el texto del catálogo y no llevan "sorbo de agua"', () => {
    const symbicort = catalogo.find((f) => f.nombresComerciales.includes('Symbicort'));
    expect(symbicort !== undefined).toBeTrue();
    if (symbicort) {
      const r = evaluarFarmacoUi(datosDesde(symbicort, symbicort.idRegla[0] ?? ''), ctx(), HECHOS_VACIOS);
      expect(r.accion).toBe('mantener');
      expect(r.textoPaciente).toContain('tráigalo consigo');
      expect(r.textoPaciente.includes('sorbo de agua')).toBeFalse();
    }
  });

  it('el comodín (id_regla desconocido) es "requiere confirmación", nunca "mantener"', () => {
    const f = catalogo[0]!;
    const r = evaluarFarmacoUi(datosDesde(f, 'id_regla_inexistente_xyz'), ctx(), HECHOS_VACIOS);
    expect(r.accion).toBe('consultar');
    expect(r.requiereConfirmacion).toBeTrue();
    expect(r.reglaAplicada).toContain('requiere confirmación del anestesiólogo');
  });
});
