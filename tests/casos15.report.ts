/**
 * Informe de los casos de docs/documento_fuente.md §15 y de las reglas de
 * medicación, con la intervención el JUEVES 15/10/2026 a las 08:00.
 * Para cada punto muestra: horas, fecha/hora de la última toma permitida y el
 * texto exacto que leerá el paciente. NO es un test con aserciones.
 *
 * Ejecutar: node --experimental-strip-types tests/casos15.report.ts
 */
import type { ContextoReglas } from '../src/dominio/tipos.ts';
import { reglaAcod } from '../src/dominio/reglas/acod.ts';
import { calcularCha2ds2va } from '../src/dominio/escalas/cha2ds2va.ts';
import { reglaP2y12, evaluarStent, reglaP2y12Oftalmo, reglaAas } from '../src/dominio/reglas/antiagregantes.ts';
import { reglaAvk } from '../src/dominio/reglas/antivitaminaK.ts';
import { reglaLitio } from '../src/dominio/reglas/psicofarmacos.ts';
import { reglaMetformina, reglaSglt2, reglaGlp1Semanal, reglaGlp1Diario, reglaBombaInsulina } from '../src/dominio/reglas/antidiabeticos.ts';
import { calcularStbur } from '../src/dominio/escalas/stbur.ts';
import { calcularPovoc } from '../src/dominio/escalas/povoc.ts';
import { calcularEgri } from '../src/dominio/escalas/egri.ts';
import { calcularMorfinaEquivalente } from '../src/dominio/escalas/morfinaEquivalente.ts';
import { calcularAuditC } from '../src/dominio/escalas/auditC.ts';
import { evaluarCfs } from '../src/dominio/escalas/cfs.ts';
import { calcular4AT } from '../src/dominio/escalas/cuatroAT.ts';
import { reglaNoCatalogado, aplicarPlazoNoAlcanzable } from '../src/dominio/reglas/otros.ts';
import { fechaHoraLimite } from '../src/dominio/fechas/plazos.ts';
import { evaluarMtnd4 } from '../src/dominio/mtnd4/mtnd4.ts';
import { decidirPruebas, type FactoresPruebas } from '../src/dominio/pruebas/tablaPruebas.ts';
import { serializar, deserializar, cabeEnQr, type Payload } from '../src/dominio/salidas/qr/serializar.ts';
import { tarjetaFarmacoAEnfermedad, tarjetasEnfermedadAFarmaco, tarjetasDatoQueFalta } from '../src/dominio/coherencia/coherencia.ts';
import type { ResultadoFarmaco } from '../src/dominio/tipos.ts';

const IV = new Date(2026, 9, 15, 8, 0); // jueves 15 oct 2026, 08:00
const H = (d?: Date) => (d ? Math.round((IV.getTime() - d.getTime()) / 3_600_000) : NaN);


function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    fechaHoraIntervencion: IV, fechaReferencia: new Date(2026, 8, 29), riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio',
    grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false,
    riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento: null, ...p,
  };
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fh(d?: Date): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${DIAS[d.getDay()]} ${dd}/${mm} ${hh}:${mi}`;
}

function imprimirFarmaco(titulo: string, r: ResultadoFarmaco): void {
  console.log(`  · ${titulo}`);
  console.log(`      accion: ${r.accion}${r.requiereConfirmacion ? ' (requiere confirmación)' : ''}`);
  console.log(`      horas antes: ${Number.isNaN(H(r.fechaHoraUltimaToma)) ? 'n/a' : H(r.fechaHoraUltimaToma)}`);
  console.log(`      última toma: ${fh(r.fechaHoraUltimaToma)}`);
  console.log(`      texto paciente: ${r.textoPaciente}`);
}

console.log('\n===== CASOS §15 (intervención jueves 15/10/2026 08:00) =====');
console.log('Pautas horarias de referencia usadas: apixabán 09:00/21:00, enalapril 09:00, warfarina 20:00.\n');

// Caso 1
{
  console.log('Caso 1 · varón 72 a, HTA+DM, FA con apixabán 5 mg/12h (09:00/21:00), CrCl 45, prótesis rodilla + raquídea');
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ riesgoHemorragico: 'alto', neuroaxial: true, aclaramiento: 45 }));
  const cha = calcularCha2ds2va({ insuficienciaCardiaca: false, hta: true, edadAnios: 72, diabetes: true, ictusAitTromboembolismo: false, enfermedadVascular: false });
  imprimirFarmaco('Apixabán (Eliquis)', r);
  console.log(`      CHA2DS2-VA: ${cha.puntuacion} (esperado 3); plazo esperado 72 h`);
}
// Caso 2
{
  console.log('\nCaso 2 · mujer 58 a, dabigatrán 150 mg/12h, CrCl 40, colecistectomía laparoscópica AG');
  const r = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, ctx({ riesgoHemorragico: 'bajo', neuroaxial: false, aclaramiento: 40 }));
  imprimirFarmaco('Dabigatrán (Pradaxa)', r);
  console.log('      esperado: 96 h (48+48)');
}
// Caso 3
{
  console.log('\nCaso 3 · stent farmacoactivo 4 m tras SCA, AAS + ticagrelor, hernioplastia inguinal');
  const s = evaluarStent({ mesesDesdeImplante: 4, traSca: true }, ctx({ neuroaxial: false }));
  console.log(`      stent reciente: ${s.recienteRequiereConfirmacion}; sin pauta antiagregantes en hoja: ${s.suprimirPautaAntiagregantesEnHoja}`);
  console.log(`      alerta[0]: ${s.alertas[0]?.gravedad} — ${s.alertas[0]?.mensaje}`);
}
// Caso 4
{
  console.log('\nCaso 4 · DM2 con semaglutida semanal (próxima dosis lun 12/10), empagliflozina y metformina, cirugía intermedia');
  const sem = reglaGlp1Semanal({ idFarmaco: 'semaglutida', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 12, 9, 0) }, ctx());
  const emp = reglaSglt2({ idFarmaco: 'empagliflozina', nombreComercial: 'Jardiance', principio: 'empagliflozina' }, ctx());
  const met = reglaMetformina({ idFarmaco: 'metformina', nombreComercial: 'Dianben' }, ctx());
  imprimirFarmaco('Semaglutida semanal (Ozempic)', sem);
  imprimirFarmaco('Empagliflozina (Jardiance)', emp);
  imprimirFarmaco('Metformina (Dianben)', met);
}
// Caso 5
{
  console.log('\nCaso 5 · catarata tópica + acenocumarol');
  const r = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false }, ctx({ grupoOftalmologico: 'riesgo_bajo' }));
  imprimirFarmaco('Acenocumarol (Sintrom)', r.farmaco);
}
// Caso 6
{
  console.log('\nCaso 6 · vitrectomía (oftalmo moderado/alto) + clopidogrel monoterapia');
  const r = reglaP2y12Oftalmo({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: true }, ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'minimo' }));
  imprimirFarmaco('Clopidogrel (Plavix)', r);
  console.log(`      nota anestesiólogo: ${r.textoAnestesiologo}`);
}
// Caso 7
{
  console.log('\nCaso 7 · prótesis de cadera con raquídea + ticagrelor');
  const r = reglaP2y12({ idFarmaco: 'ticagrelor', nombreComercial: 'Brilique', principio: 'ticagrelor', monoterapia: false }, ctx({ neuroaxial: true }));
  imprimirFarmaco('Ticagrelor (Brilique)', r);
}
// Caso 8
{
  console.log('\nCaso 8 · niño 5 a, amigdalectomía, ronquido y apneas');
  const stbur = calcularStbur({ roncaMasMitadNoches: true, roncaFuerte: true, esfuerzoRespiratorioDormido: false, dejaDeRespirarDormido: true, cansadoOSomnolientoDia: false });
  const povoc = calcularPovoc({ cirugiaMayor30min: true, edadMayorIgual3: true, cirugiaEstrabismo: false, nvpoNinioOFamiliares: false });
  console.log(`      STBUR ${stbur.puntuacion} (${stbur.categoria}); POVOC ${povoc.probabilidad}% ; STOP-Bang: no aplica en pediatría`);
}
// Caso 9
{
  console.log('\nCaso 9 · adulto con madre venezolana (sin test)');
  const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: true, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'no_hecho' });
  console.log(`      alerta: ${r.alerta?.gravedad ?? 'ninguna'} — ${r.alerta?.mensaje ?? ''}`);
  console.log(`      texto paciente (neutro): ${r.textoPaciente}`);
}
// Caso 10
{
  console.log('\nCaso 10 · AB 3,5 / DTM 5,5 / Mallampati III / 95 kg');
  const r = calcularEgri({ aperturaBucal: 'lt_4', distanciaTiromentoniana: 'lt_6', mallampati: 3, movilidadCervical: 'gt_90', puedeProtruir: true, pesoKg: 95, intubacionDificilPrevia: 'no' });
  console.log(`      EGRI ${r.puntuacion} (${r.categoria}); esperado 6, riesgo elevado`);
}
// Caso 11
{
  console.log('\nCaso 11 · mujer 45 a sana, tumorectomía de mama (bajo/bajo)');
  const sinFactores: FactoresPruebas = { anemiaOHbBaja: false, trastornoCoagulacionOAnticoagulante: false, anestesiaRegionalPosible: false, sangradoPrevisible: false, hemstopPositivo: false, supuestoRxTorax: false, supuestoEcocardiograma: false, comorbilidadCardiovascularSignificativa: false, fragilidad: false, capacidadFuncionalReducida: false };
  const a = decidirPruebas('bajo', 'bajo', sinFactores);
  const b = decidirPruebas('bajo', 'bajo', { ...sinFactores, anestesiaRegionalPosible: true });
  const c = decidirPruebas('bajo', 'bajo', { ...sinFactores, hemstopPositivo: true });
  console.log(`      AG sola: [${a.map((p) => p.prueba).join(', ') || 'ninguna'}]`);
  console.log(`      con bloqueo paravertebral: [${b.map((p) => p.prueba).sort().join(', ')}]`);
  console.log(`      con HEMSTOP 2 positivos: [${c.map((p) => p.prueba).sort().join(', ')}]`);
}
// Caso 12
{
  console.log('\nCaso 12 · warfarina (20:00) por prótesis mitral mecánica, 80 kg');
  const r = reglaAvk({ idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: true }, ctx({ pesoKg: 80, aclaramiento: 90 }));
  imprimirFarmaco('Warfarina (Aldocumar)', r.farmaco);
  console.log(`      puente: enoxaparina ${r.puente?.dosisMgPorToma} mg cada ${r.puente?.intervaloHoras} h`);
  console.log(`      nota anestesiólogo: ${r.farmaco.textoAnestesiologo}`);
}
// Caso 13
{
  console.log('\nCaso 13 · litio + cirugía de alto riesgo');
  const r = reglaLitio({ idFarmaco: 'litio', nombreComercial: 'Plenur' }, ctx({ riesgoCardiovascular: 'alto' }));
  imprimirFarmaco('Litio (Plenur)', r);
}
// Caso 14
{
  console.log('\nCaso 14 · sin hora de cirugía → se asume 08:00 y la hoja avisa');
  console.log('      (comportamiento del paso 1: hora asumida = 08:00; los plazos de este informe ya usan 08:00.)');
  console.log('      aviso hoja paciente: si cambia la fecha o la hora, debe llamar (§8.0).');
}
// Caso 15
{
  console.log('\nCaso 15 · intervención dentro de 3 días con clopidogrel (plazo 5 días)');
  const r = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false }, ctx({ neuroaxial: false }));
  const ahora = fechaHoraLimite(IV, 3 * 24);
  const { resultado, alerta } = aplicarPlazoNoAlcanzable(r, ctx(), ahora);
  imprimirFarmaco('Clopidogrel (Plavix)', resultado);
  console.log(`      alerta: ${alerta?.gravedad} — ${alerta?.mensaje}`);
}
// Caso 16
{
  console.log('\nCaso 16 · oxicodona 20 mg/12h + tramadol 100 mg/8h');
  const r = calcularMorfinaEquivalente([{ id: 'oxicodona', dosisDiaria: 40 }, { id: 'tramadol', dosisDiaria: 300 }]);
  console.log(`      morfina equivalente: ${r.mgDia} mg/día (${r.categoria}); esperado 120, alerta alta`);
}
// Caso 17
{
  console.log('\nCaso 17 · mujer 78 a, CFS 6, 4AT 2, Hb 11,5, artroplastia de cadera');
  const cfs = evaluarCfs(6);
  const at = calcular4AT({ alerta: 'normal', amt4: '2_o_mas_o_no_valorable', meses: '7_o_mas', cambioAgudo: 'no' });
  console.log(`      CFS ${cfs.puntuacion} (fragilidad=${cfs.fragilidad}); 4AT ${at.puntuacion} (${at.categoria}); anemia Hb 11,5 → optimizar + ferritina`);
  console.log('      prehabilitación: solo si config.prehabilitacion_activa = true');
}
// Caso 18
{
  console.log('\nCaso 18 · AUDIT-C 9 en varón');
  const r = calcularAuditC({ frecuenciaConsumo: 4, cantidadTipica: 3, frecuenciaAtracon: 2, sexo: 'hombre' });
  console.log(`      AUDIT-C ${r.puntuacion} (${r.categoria}); alerta de abstinencia + hoja de alcohol`);
}
// Caso 19
{
  console.log('\nCaso 19 · QR: round-trip, tamaño, caducidad, aviso de versión');
  await (async () => {
    const p: Payload = { t: 'paciente', e: 1, v: '0.1.0', c: IV.getTime(), x: IV.getTime() + 30 * 86_400_000, d: { f: [{ n: 'Eliquis', a: 'suspender', h: 'lun 12/10 21:00' }], ay: '06:00' } };
    const s = await serializar(p);
    const ok = await deserializar(s, IV, '0.1.0');
    const cad = await deserializar(await serializar({ ...p, x: IV.getTime() - 86_400_000 }), IV, '0.1.0');
    const ver = await deserializar(await serializar({ ...p, v: '0.0.9' }), IV, '0.1.0');
    console.log(`      round-trip: ${ok.estado}; cabe en QR: ${cabeEnQr(s)} (${s.length} bytes)`);
    console.log(`      caducado: ${cad.estado}; aviso de versión distinta: ${ver.estado === 'ok' ? ver.avisoVersion : 'n/a'}`);
  })();
}
// Caso 20
{
  console.log('\nCaso 20 · fármaco no catalogado escrito a mano');
  const r = reglaNoCatalogado('MedicamentoRaro');
  imprimirFarmaco('MedicamentoRaro (no catalogado)', r);
}
// Caso 21
{
  console.log('\nCaso 21 · farmacos.csv con regla inexistente → validador bloquea (ver tests/unit/datos)');
}
// Caso 22
{
  console.log('\nCaso 22 · coherencia: enalapril sin HTA/IC; FA sin anticoagulante; diabetes sin HbA1c');
  const t1 = tarjetaFarmacoAEnfermedad({ nombre: 'Enalapril', indicacionesPosibles: ['hipertension', 'insuficiencia_cardiaca', 'nefropatia_proteinuria'] }, new Set());
  const t2 = tarjetasEnfermedadAFarmaco(new Set(['fibrilacion_auricular']), new Set());
  const t3 = tarjetasDatoQueFalta(new Set(['diabetes']), new Set());
  console.log(`      fármaco→enfermedad: ${t1?.mensaje}`);
  console.log(`      enfermedad→fármaco: ${t2[0]?.mensaje}`);
  console.log(`      dato que falta: ${t3[0]?.mensaje}`);
}
// Caso 23
{
  console.log('\nCaso 23 · privacidad (localStorage/SW): se verificará en la fase de interfaz (E2E)');
}

// AAS>200 cardiovascular (prueba de medicación pedida con texto)
{
  console.log('\n— Prueba adicional: AAS > 200 mg con indicación cardiovascular —');
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, ctx());
  imprimirFarmaco('AAS 300 mg (Adiro)', r);
  console.log(`      nota anestesiólogo: ${r.textoAnestesiologo}`);
}
// Bomba de insulina CMA vs ingreso
{
  console.log('\n— Prueba adicional: bomba de insulina CMA bajo riesgo vs ingreso —');
  imprimirFarmaco('Bomba (cirugía riesgo bajo)', reglaBombaInsulina({ idFarmaco: 'bomba', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'bajo' })));
  imprimirFarmaco('Bomba (cirugía riesgo intermedio)', reglaBombaInsulina({ idFarmaco: 'bomba', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'intermedio' })));
}
// GLP-1 diario y semanal en 3 posiciones
{
  console.log('\n— Prueba adicional: GLP-1 diario (Rybelsus) y semanal (Ozempic) —');
  imprimirFarmaco('GLP-1 diario (Rybelsus)', reglaGlp1Diario({ idFarmaco: 'semaglutida_oral', nombreComercial: 'Rybelsus', principio: 'semaglutida' }, ctx()));
  for (const [etq, dosis] of [['7 días antes (mié 8/10)', new Date(2026, 9, 8, 9, 0)], ['3 días antes (lun 12/10)', new Date(2026, 9, 12, 9, 0)], ['el mismo día (jue 15/10)', new Date(2026, 9, 15, 6, 0)]] as const) {
    const r = reglaGlp1Semanal({ idFarmaco: 'semaglutida', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: dosis }, ctx());
    console.log(`  · Ozempic, dosis ${etq}: ${r.accion} — ${r.textoPaciente}`);
  }
}

console.log('');
