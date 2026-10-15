import { describe, it, expect } from '../../_harness.ts';
import { decidirPruebas, pruebaVigente, type FactoresPruebas } from '../../../src/dominio/pruebas/tablaPruebas.ts';
import { evaluarMtnd4 } from '../../../src/dominio/mtnd4/mtnd4.ts';
import { calcularAyuno } from '../../../src/dominio/ayuno/ayuno.ts';

const SIN_FACTORES: FactoresPruebas = {
  anemiaOHbBaja: false,
  trastornoCoagulacionOAnticoagulante: false,
  anestesiaRegionalPosible: false,
  sangradoPrevisible: false,
  hemstopPositivo: false,
  supuestoRxTorax: false,
  supuestoEcocardiograma: false,
  comorbilidadCardiovascularSignificativa: false,
  fragilidad: false,
  capacidadFuncionalReducida: false,
};
const IV = new Date(2026, 9, 15, 8, 0);
const nombres = (ps: { prueba: string }[]) => ps.map((p) => p.prueba).sort();

describe('Tabla de pruebas §7 (caso 11)', () => {
  it('mujer sana, tumorectomía (bajo/bajo), sin factores → ninguna prueba', () => {
    const r = decidirPruebas('bajo', 'bajo', SIN_FACTORES);
    expect(r).toHaveLength(0);
  });

  it('misma con bloqueo paravertebral previsto (anestesia regional) → hemograma y coagulación', () => {
    const r = decidirPruebas('bajo', 'bajo', { ...SIN_FACTORES, anestesiaRegionalPosible: true });
    expect(nombres(r)).toEqual(['coagulacion', 'hemograma']);
  });

  it('misma con HEMSTOP positivo → coagulación (y hemograma por la nota *)', () => {
    const r = decidirPruebas('bajo', 'bajo', { ...SIN_FACTORES, hemstopPositivo: true });
    expect(nombres(r)).toContain('coagulacion');
  });

  it('cirugía intermedia, paciente bajo → hemograma y coagulación (sin bioquímica ni ECG)', () => {
    const r = decidirPruebas('intermedio', 'bajo', SIN_FACTORES);
    expect(nombres(r)).toEqual(['coagulacion', 'hemograma']);
  });

  it('cirugía intermedia, paciente bajo-moderado → hemograma, coagulación, bioquímica, ECG', () => {
    const r = decidirPruebas('intermedio', 'bajo-moderado', SIN_FACTORES);
    expect(nombres(r)).toEqual(['bioquimica', 'coagulacion', 'ecg', 'hemograma']);
  });

  it('cirugía alta, paciente bajo → hemograma, coagulación y ECG (ECG por alto riesgo)', () => {
    const r = decidirPruebas('alto', 'bajo', SIN_FACTORES);
    expect(nombres(r)).toEqual(['coagulacion', 'ecg', 'hemograma']);
  });

  it('Rx tórax: cirugía intermedia + paciente alto → sí', () => {
    const r = decidirPruebas('intermedio', 'alto', SIN_FACTORES);
    expect(nombres(r)).toContain('rx_torax');
  });

  it('ecocardiograma por supuesto §7.3', () => {
    const r = decidirPruebas('bajo', 'bajo', { ...SIN_FACTORES, supuestoEcocardiograma: true });
    expect(nombres(r)).toContain('ecocardiograma');
  });

  // —— BNP o NT-proBNP (§7.3 nota **) ——
  it('BNP: cirugía intermedia + comorbilidad CV significativa → se pide', () => {
    const r = decidirPruebas('intermedio', 'bajo-moderado', { ...SIN_FACTORES, comorbilidadCardiovascularSignificativa: true });
    expect(nombres(r)).toContain('bnp');
  });
  it('BNP: cirugía intermedia + fragilidad → se pide', () => {
    const r = decidirPruebas('intermedio', 'bajo-moderado', { ...SIN_FACTORES, fragilidad: true });
    expect(nombres(r)).toContain('bnp');
  });
  it('BNP: cirugía intermedia + capacidad funcional reducida → se pide', () => {
    const r = decidirPruebas('intermedio', 'bajo-moderado', { ...SIN_FACTORES, capacidadFuncionalReducida: true });
    expect(nombres(r)).toContain('bnp');
  });
  it('BNP NO en cirugía de bajo riesgo aunque haya comorbilidad CV', () => {
    const r = decidirPruebas('bajo', 'bajo-moderado', { ...SIN_FACTORES, comorbilidadCardiovascularSignificativa: true });
    expect(nombres(r)).not.toContain('bnp');
  });
  it('BNP NO sin ninguno de los tres factores aunque la cirugía sea alta', () => {
    const r = decidirPruebas('alto', 'alto', SIN_FACTORES);
    expect(nombres(r)).not.toContain('bnp');
  });

  // —— Descuento de pruebas vigentes (§7.4) ——
  it('vigencia: una coagulación vigente se descuenta de la lista', () => {
    const base = decidirPruebas('intermedio', 'bajo', SIN_FACTORES);
    expect(nombres(base)).toContain('coagulacion');
    const conVigente = decidirPruebas('intermedio', 'bajo', SIN_FACTORES, { coagulacion: true });
    expect(nombres(conVigente)).not.toContain('coagulacion');
    expect(nombres(conVigente)).toContain('hemograma'); // el resto sigue
  });
});

describe('Validez de pruebas §7.4', () => {
  it('coagulación caduca a los 14 días', () => {
    expect(pruebaVigente('coagulacion', new Date(2026, 9, 5), IV)).toBeTrue(); // 10 días antes
    expect(pruebaVigente('coagulacion', new Date(2026, 8, 20), IV)).toBeFalse(); // 25 días antes
  });
  it('ECG vale 3 meses', () => {
    expect(pruebaVigente('ecg', new Date(2026, 7, 1), IV)).toBeTrue();
  });
  it('ecocardiograma: 12 meses normal, 18 si estable', () => {
    const hace13meses = new Date(2025, 8, 15);
    expect(pruebaVigente('ecocardiograma', hace13meses, IV, false)).toBeFalse();
    expect(pruebaVigente('ecocardiograma', hace13meses, IV, true)).toBeTrue();
  });
});

describe('mtND4 §9 (caso 9)', () => {
  it('caso 9: madre venezolana, sin test → alerta roja + texto neutro', () => {
    const r = evaluarMtnd4({
      ascendenciaVenezolanaMaterna: true,
      origenMaternoDesconocidoUOvodonacion: false,
      antecedentesFamiliaresCompatibles: false,
      testGenetico: 'no_hecho',
    });
    expect(r.alerta?.gravedad).toBe('roja');
    expect(r.textoPaciente).toContain('El anestesiólogo hablará con usted');
    expect(r.notasAnestesiologo.length).toBeGreaterThan(0);
  });
  it('test positivo → roja + vigilancia postoperatoria', () => {
    const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: false, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'positivo' });
    expect(r.alerta?.gravedad).toBe('roja');
    expect(r.notasAnestesiologo[0]).toContain('Vigilancia postoperatoria');
  });
  it('test negativo → informativa', () => {
    const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: false, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'negativo' });
    expect(r.alerta?.gravedad).toBe('informativa');
    expect(r.alerta?.mensaje).toContain('ausente');
  });
  it('sin factores de línea materna ni test → ninguna alerta ni línea en la hoja', () => {
    const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: false, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'no_hecho' });
    expect(r.alerta).toBe(null);
    expect(r.textoPaciente).toBe('');
  });
});

describe('Ayuno §8.14', () => {
  it('adulto sin factores: líquidos claros hasta 2 h antes (06:00) y sólidos ligeros hasta 6 h (02:00)', () => {
    const r = calcularAyuno({ induccion: IV, pediatrico: false, situacion: 'ninguna' });
    const claros = r.lineas.find((l) => l.horasAntes === 2);
    const ligera = r.lineas.find((l) => l.concepto.includes('ligera'));
    expect(claros?.hora).toBe('06:00');
    expect(ligera?.hora).toBe('02:00');
    // Bebida de carbohidratos permitida.
    expect(r.lineas.some((l) => l.concepto.includes('carbohidratos'))).toBeTrue();
  });

  it('pediátrico: líquidos claros 1 h, leche materna 3 h, fórmula/sólidos 6 h', () => {
    const r = calcularAyuno({ induccion: IV, pediatrico: true, situacion: 'ninguna' });
    expect(r.lineas.find((l) => l.concepto === 'Líquidos claros')?.horasAntes).toBe(1);
    expect(r.lineas.find((l) => l.concepto === 'Leche materna')?.horasAntes).toBe(3);
  });

  it('lactante < 6 meses: fórmula 4 h', () => {
    const r = calcularAyuno({ induccion: IV, pediatrico: true, edadMeses: 4, situacion: 'ninguna' });
    expect(r.lineas.some((l) => l.concepto.includes('menor de 6 meses') && l.horasAntes === 4)).toBeTrue();
  });

  it('GLP-1 semanal no suspendido: alerta de estómago lleno y sin bebida de carbohidratos', () => {
    const r = calcularAyuno({ induccion: IV, pediatrico: false, situacion: 'glp1_semanal_no_suspendido' });
    expect(r.alertas.some((a) => a.mensaje.includes('estómago lleno'))).toBeTrue();
    expect(r.lineas.some((l) => l.concepto.includes('carbohidratos'))).toBeFalse();
    expect(r.notasAnestesiologo.length).toBeGreaterThan(0);
  });

  it('bariátrica sintomática: ayuno de sólidos de 8 h', () => {
    const r = calcularAyuno({ induccion: IV, pediatrico: false, situacion: 'bariatrica_sintomatica' });
    expect(r.lineas[0]?.concepto).toContain('8 h');
    expect(r.lineas[0]?.hora).toBe('00:00'); // 8 h antes de las 08:00
  });
});
