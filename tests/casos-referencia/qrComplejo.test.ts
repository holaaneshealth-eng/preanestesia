/**
 * QR de máxima complejidad — docs/documento_fuente.md §11.3.
 * Verifica el tamaño con la entrevista más compleja posible (anestesiólogo) y con
 * la hoja completa (paciente). Imprime los bytes.
 */
import { describe, it, expect } from '../_harness.ts';
import { serializar, deserializar, cabeEnQr, type Payload } from '../../src/dominio/salidas/qr/serializar.ts';
import { construirContenidoQrPaciente, payloadPaciente } from '../../src/dominio/salidas/qr/construirContenido.ts';
import type { ExtrasHojaQr } from '../../src/dominio/salidas/qr/hojaPaciente.ts';

const IV = new Date(2026, 9, 15, 8, 0);
const X = IV.getTime() + 60 * 86_400_000;

// Entrevista completa del anestesiólogo: muchas patologías, 12 fármacos con plan,
// escalas, alertas y puntos pendientes. Claves cortas y catálogos por id (§11.3).
const entrevistaAnestesiologo = {
  m: 'p', // modalidad presencial
  pac: { ed: 78, sx: 'm', p: 82, t: 170 },
  mod: ['cv_hta', 'cv_fa', 'cv_ic', 'endo_dm', 'endo_obes', 'resp_epoc', 'resp_saos', 'renal_erc', 'hemato_anemia', 'neuro_deterioro', 'onco_activo', 'reuma_ar'],
  med: [
    { id: 'apixaban', d: '5mg/12h', h: ['09:00', '21:00'], a: 'susp', f: [2026, 9, 12, 8, 0] },
    { id: 'enalapril', d: '20mg/24h', h: ['09:00'], a: 'susp', f: [2026, 9, 14, 9, 0] },
    { id: 'metformina', d: '850mg/12h', h: ['09:00', '21:00'], a: 'susp', f: [2026, 9, 14, 21, 0] },
    { id: 'empagliflozina', d: '10mg/24h', h: ['09:00'], a: 'susp', f: [2026, 9, 11, 9, 0] },
    { id: 'bisoprolol', d: '5mg/24h', h: ['09:00'], a: 'mant' },
    { id: 'atorvastatina', d: '40mg/24h', h: ['22:00'], a: 'mant' },
    { id: 'furosemida', d: '40mg/24h', h: ['09:00'], a: 'susp', f: [2026, 9, 14, 9, 0] },
    { id: 'omeprazol', d: '20mg/24h', h: ['09:00'], a: 'mant' },
    { id: 'metotrexato', d: '15mg/sem', h: ['09:00'], a: 'mant' },
    { id: 'prednisona', d: '5mg/24h', h: ['09:00'], a: 'mant' },
    { id: 'tramadol', d: '100mg/8h', h: ['08:00', '16:00', '00:00'], a: 'mant' },
    { id: 'salbutamol', d: 'inh', h: ['prn'], a: 'mant' },
  ],
  esc: { asa: 3, egri: 4, sb: 5, apfel: 3, cha: 5, dasi: 20, mets: 3.8, crcl: 38, cfs: 6, at4: 2, audit: 2, morf: 60 },
  al: [
    { g: 'r', m: 'FA anticoagulada; ACOD con neuroaxial' },
    { g: 'r', m: 'deterioro cognitivo: riesgo de delirium' },
    { g: 'a', m: 'anemia: optimizar antes de cirugía' },
    { g: 'a', m: 'EPOC: traer inhaladores' },
    { g: 'a', m: 'SAOS: traer CPAP' },
    { g: 'i', m: 'obesidad IMC 28,4' },
  ],
  pend: [
    { id: 'apixaban', m: 'confirmar plazo con hematología' },
    { id: 'metotrexato', m: 'valorar omitir dosis' },
  ],
  pru: ['hemograma', 'coagulacion', 'bioquimica_bnp', 'ecg', 'rx_torax', 'ferritina'],
  ay: { solidos: '00:00', ligera: '02:00', claros: '06:00' },
  vc: '0.1.0',
};

// Hoja del paciente: textos finales estructurados (códigos, no textos largos).
const hojaPaciente = {
  dh: [2026, 9, 15, 8, 0],
  med: [
    { n: 'Eliquis', a: 'S', f: 'lun 12/10 08:00' },
    { n: 'Renitec', a: 'S', f: 'mié 14/10 09:00' },
    { n: 'Dianben', a: 'S', f: 'mié 14/10 21:00' },
    { n: 'Jardiance', a: 'S', f: 'dom 11/10 09:00' },
    { n: 'Emconcor', a: 'M' },
    { n: 'Seguril', a: 'S', f: 'mié 14/10 09:00' },
  ],
  ay: '06:00',
  traer: ['medicación', 'informes', 'CPAP', 'inhaladores', 'gafas', 'audífonos'],
  anx: ['delirium', 'tabaco'],
  tel: '000000000',
  vt: '0.1.0',
  idioma: 'es',
};

describe('QR de máxima complejidad (§11.3)', () => {
  it('QR del anestesiólogo con 12 fármacos, muchas patologías, alertas y pendientes: cabe y round-trip', async () => {
    const p: Payload = { t: 'anestesiologo', e: 1, v: '0.1.0', c: IV.getTime(), x: X, d: entrevistaAnestesiologo };
    const s = await serializar(p);
    console.log(`\n[QR anestesiólogo] ${s.length} bytes (límite ${'2900'})`);
    const r = await deserializar(s, IV, '0.1.0');
    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') expect(JSON.stringify(r.payload.d)).toBe(JSON.stringify(entrevistaAnestesiologo));
    expect(cabeEnQr(s)).toBeTrue();
  });

  it('QR del paciente con hoja completa: cabe y round-trip', async () => {
    const p: Payload = { t: 'paciente', e: 1, v: '0.1.0', c: IV.getTime(), x: X, d: hojaPaciente };
    const s = await serializar(p);
    console.log(`[QR paciente] ${s.length} bytes (límite 2900)`);
    const r = await deserializar(s, IV, '0.1.0');
    expect(r.estado).toBe('ok');
    expect(cabeEnQr(s)).toBeTrue();
  });

  it('§8.17: la info de riesgos solo añade las CLAVES al QR, no el texto (crece pocos bytes)', async () => {
    // Extras base (sin riesgos) y con el peor caso de claves de secciones (§8.17).
    const extrasBase: ExtrasHojaQr = {
      cpap: false, inhaladores: false, delirium: false, tabaco: false, alcohol: false, anexos: [],
    };
    const extrasConRiesgos: ExtrasHojaQr = {
      ...extrasBase,
      // Peor caso: todas las secciones y las frases sueltas a la vez, más la
      // preparación (punto 9) y todas las pruebas no traídas (punto 3). Solo claves.
      riesgos: ['general', 'raquidea', 'epidural_combinada', 'bloqueo', 'bloqueo_hombro_brazo', 'sedacion', 'nino', 'epidural_no_especificada', 'bloqueo_ojo', 'local_sola'],
      prep: true,
      prepBloqueo: true,
      pruebasNoTraidas: ['analitica', 'nt_probnp', 'troponina', 'ecg', 'rx_torax', 'ecocardiograma'],
    };
    const hacer = (ex: ExtrasHojaQr) => payloadPaciente(
      construirContenidoQrPaciente([], '000000000', IV, undefined, ex), '0.1.0', IV, X,
    );
    const sinR = await serializar(hacer(extrasBase));
    const conR = await serializar(hacer(extrasConRiesgos));
    const delta = conR.length - sinR.length;
    console.log(`[QR paciente §8.17+§7+§9] sin extras ${sinR.length} b · con extras ${conR.length} b · +${delta} b`);
    // Cabe de sobra y el texto NO viaja (solo las claves): el aumento es pequeño.
    expect(cabeEnQr(conR)).toBeTrue();
    expect(delta).toBeLessThan(300);
    // El texto literal de las secciones NO debe aparecer en el QR.
    expect(conR.includes('anestesia general')).toBeFalse();
    expect(conR.includes('Náuseas')).toBeFalse();
    expect(conR.includes('Dúchese')).toBeFalse();
    // Round-trip correcto.
    const r = await deserializar(conR, IV, '0.1.0');
    expect(r.estado).toBe('ok');
  });
});
