/**
 * Genera docs/informe_casos_referencia.md ejecutando el MOTOR con la entrada de
 * cada caso de docs/casos_referencia.md. Lo que se imprime sale de la ejecución
 * del motor (no de las aserciones de las pruebas).
 *
 * Ejecutar: node --experimental-strip-types scripts/generar-informe-casos.ts
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ContextoReglas } from '../src/dominio/tipos.ts';
import { reglaAcod } from '../src/dominio/reglas/acod.ts';
import { reglaAvk } from '../src/dominio/reglas/antivitaminaK.ts';
import { reglaAas, reglaP2y12, evaluarStent, reglaTriflusal, reglaCilostazol } from '../src/dominio/reglas/antiagregantes.ts';
import { reglaHbpm, clasificarHbpm, reglaFondaparinux } from '../src/dominio/reglas/heparinas.ts';
import { reglaMetformina, reglaSglt2, reglaGlp1Semanal, reglaGlp1Diario, reglaBombaInsulina } from '../src/dominio/reglas/antidiabeticos.ts';
import { reglaInsulinaBasal, reglaInsulinaNph, reglaInsulinaPremezclada } from '../src/dominio/reglas/insulinas.ts';
import { reglaIecaAra2, reglaDiuretico, reglaSacubitriloValsartan } from '../src/dominio/reglas/cardiovasculares.ts';
import { reglaLitio, reglaMoclobemida, reglaImaoIrreversible, reglaImaoB } from '../src/dominio/reglas/psicofarmacos.ts';
import { reglaAine } from '../src/dominio/reglas/aine.ts';
import { reglaMetotrexato, reglaBiologico } from '../src/dominio/reglas/inmunosupresores.ts';
import { reglaAntiangiogenico } from '../src/dominio/reglas/oncologicos.ts';
import { reglaFitoterapia, reglaAnticonceptivoThs } from '../src/dominio/reglas/otros.ts';
import { avisoSugammadex } from '../src/dominio/reglas/sugammadex.ts';
import { calcularStopBang } from '../src/dominio/escalas/stopBang.ts';
import { calcularApfel } from '../src/dominio/escalas/apfel.ts';
import { calcularCha2ds2va } from '../src/dominio/escalas/cha2ds2va.ts';
import { calcularDasi } from '../src/dominio/escalas/dasi.ts';
import { calcularAclaramiento } from '../src/dominio/escalas/cockcroftGault.ts';
import { calcular4AT } from '../src/dominio/escalas/cuatroAT.ts';
import { calcularEgri } from '../src/dominio/escalas/egri.ts';
import { calcularLangeron } from '../src/dominio/escalas/langeron.ts';
import { calcularMorfinaEquivalente } from '../src/dominio/escalas/morfinaEquivalente.ts';
import { calcularAuditC } from '../src/dominio/escalas/auditC.ts';
import { calcularHemstop } from '../src/dominio/escalas/hemstop.ts';
import { derivarRiesgoYPruebas, type EntradaRiesgoPruebas } from '../src/dominio/entrevista/riesgoYPruebas.ts';
import { calcularAyuno } from '../src/dominio/ayuno/ayuno.ts';
import { evaluarMtnd4 } from '../src/dominio/mtnd4/mtnd4.ts';
import { tarjetaFarmacoAEnfermedad, tarjetasEnfermedadAFarmaco } from '../src/dominio/coherencia/coherencia.ts';
import { combinacionFija } from '../src/dominio/reglas/motor.ts';
import { textoHojaPaciente, confirmar } from '../src/dominio/salidas/hojaFarmaco.ts';
import { parseCsv } from '../src/datos/csv.ts';
import type { ResultadoFarmaco } from '../src/dominio/tipos.ts';

const IV = new Date(2026, 9, 15, 8, 0);
const IV13 = new Date(2026, 9, 15, 13, 0);
/** "Hoy" fijo (29/09/2026): el informe no depende del día de ejecución (plazo no alcanzable). */
const HOY_FIJO = new Date(2026, 8, 29, 9, 0);
function ctx(p: Partial<ContextoReglas> = {}): ContextoReglas {
  return { fechaHoraIntervencion: IV, riesgoHemorragico: 'alto', riesgoCardiovascular: 'intermedio', grupoOftalmologico: 'no_aplica', neuroaxial: false, bloqueoProfundo: false, riesgoTromboticoAlto: false, espacioCerrado: false, retina: false, pesoKg: 80, aclaramiento: null, fechaReferencia: HOY_FIJO, ...p };
}
const P = (...horas: string[]) => ({ horas });
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fh(d?: Date): string {
  if (!d) return '—';
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function farmacoResumen(r: ResultadoFarmaco): string {
  const partes = [`acción: ${r.accion}`, `última toma: ${fh(r.fechaHoraUltimaToma)}`];
  if (r.requiereConfirmacion) partes.push('requiere confirmación');
  if (r.datoQueFalta) partes.push(`falta: ${r.datoQueFalta}`);
  return partes.join('; ');
}
function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// —— Esperado LITERAL leído de docs/casos_referencia.md ——
const __dirnameParse = dirname(fileURLToPath(import.meta.url));
const mdCasos = readFileSync(join(__dirnameParse, '..', 'docs', 'casos_referencia.md'), 'utf8');
const ESPERADO_LITERAL: Record<string, string> = {};
{
  const lineas = mdCasos.split('\n');
  let idActual: string | null = null;
  for (const linea of lineas) {
    const mId = linea.match(/^\*\*([A-Z][0-9]+[a-z]?)\.\*\*/);
    if (mId) { idActual = mId[1] ?? null; continue; }
    const mEsp = linea.match(/^Esperado:\s*(.*)$/);
    if (mEsp && idActual) { ESPERADO_LITERAL[idActual] = mEsp[1] ?? ''; idActual = null; }
  }
}

// —— Catálogo de fármacos (datos/farmacos.csv): indicaciones reales por id ——
const mdFarmacos = readFileSync(join(__dirnameParse, '..', 'datos', 'farmacos.csv'), 'utf8');
const catalogo = parseCsv(mdFarmacos);
function indicacionesDe(idFarmaco: string): string[] {
  const fila = catalogo.filas.find((f) => f.valores.id === idFarmaco);
  return (fila?.valores.indicaciones_posibles ?? '').split('|').map((s) => s.trim()).filter(Boolean);
}

type Veredicto = 'coincide' | 'dudoso' | 'revision_manual';
interface Fila {
  id: string;
  calculado: string;
  textoPaciente: string;
  esperado: string; // literal de casos_referencia.md
  veredicto: Veredicto;
  /** Tokens del esperado que NO se encontraron en la salida del motor. */
  faltantes: string[];
}
const filas: Fila[] = [];

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/**
 * Expande las fechas en formato largo ("5 de octubre", "lunes 15 de octubre") a su
 * equivalente numérico "dd/mm" y lo añade al texto, para que la comprobación por
 * dd/mm reconozca las fechas que el motor emite como fecha larga.
 */
function expandirFechasLargas(s: string): string {
  const extra: string[] = [];
  const re = /(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const dia = parseInt(m[1] ?? '0', 10);
    const mes = MESES[m[2] ?? ''] ?? 0;
    if (dia && mes) extra.push(`${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`);
  }
  return extra.length > 0 ? `${s} ${extra.join(' ')}` : s;
}

/**
 * Normaliza texto para comparar tokens: minúsculas, coma decimal → punto,
 * elimina espacios alrededor de unidades ("80 %"→"80%", "70 kg"→"70kg",
 * "24 ui"→"24ui", "25 ml/min"→"25ml/min"), expande fechas largas a dd/mm y
 * colapsa espacios.
 */
function normalizar(s: string): string {
  const conFechas = expandirFechasLargas(s.toLowerCase());
  return conFechas
    .replace(/(\d),(\d)/g, '$1.$2') // 24,2 → 24.2
    .replace(/(\d)\s+(%|ui|mg|ml\/min|ml|kg|h|días|dias|semanas|día|dia)\b/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae del esperado LITERAL los datos comprobables: fechas dd/mm, horas hh:mm,
 * dosis (UI, mg, mL/min, mL, %), pesos (kg), plazos (N h / N días / N semanas) y
 * puntuaciones de escalas. Devuelve los tokens ya normalizados.
 */
function extraerTokens(esperadoRaw: string): string[] {
  const esperado = normalizar(esperadoRaw);
  const tokens = new Set<string>();
  const push = (arr: RegExpMatchArray | null) => {
    if (arr) for (const m of arr) tokens.add(m);
  };
  // Fechas dd/mm (evita capturar 1 mg/kg: exige dos números separados por / sin letras).
  push(esperado.match(/\b\d{1,2}\/\d{1,2}\b(?!\/)/g));
  // Horas hh:mm.
  push(esperado.match(/\b\d{1,2}:\d{2}\b/g));
  // Dosis y magnitudes con unidad (ya normalizadas sin espacio).
  // (No se extraen plazos en h/días/semanas: son la explicación del esperado y el
  //  motor los expresa como fecha/hora de última toma, ya comprobada por sí misma.)
  push(esperado.match(/\b\d+(?:\.\d+)?(?:ui|mg|ml\/min|ml|kg|%)\b/g));
  // Puntuaciones de escalas: "escala N" (STOP-Bang, Apfel, CHA2DS2-VA, 4AT, DASI, EGRI, Langeron, AUDIT-C).
  const escalas = esperado.match(/\b(?:stop-bang|apfel|cha2ds2-va|4at|dasi|egri|langeron|audit-c|hemstop|mets?)\s+\d+(?:\.\d+)?/g);
  push(escalas);
  return [...tokens];
}

/**
 * El esperado SIEMPRE sale del literal de docs/casos_referencia.md.
 * Veredicto por comprobación de datos (no por booleanos escritos a mano):
 *  - Se extraen del esperado todas las fechas, horas, dosis y puntuaciones.
 *  - Si TODOS aparecen en la salida del motor (calculado + textoPaciente) → coincide.
 *  - Si falta alguno → dudoso (con la lista de tokens faltantes).
 *  - Si el esperado no contiene ningún dato comprobable → revisión manual.
 * Firma con compatibilidad: los 4.º/5.º argumentos antiguos se ignoran.
 */
function add(id: string, calculado: string, textoPaciente: string, _a?: string | boolean, _b?: boolean): void {
  const esperado = ESPERADO_LITERAL[id] ?? '(no encontrado en casos_referencia.md)';
  const tokens = extraerTokens(esperado);
  const salida = normalizar(`${calculado} ${textoPaciente}`);
  let veredicto: Veredicto;
  let faltantes: string[] = [];
  if (tokens.length === 0) {
    veredicto = 'revision_manual';
  } else {
    faltantes = tokens.filter((t) => !salida.includes(t));
    veredicto = faltantes.length === 0 ? 'coincide' : 'dudoso';
  }
  filas.push({ id, calculado, textoPaciente, esperado, veredicto, faltantes });
}

// ————————————————————— A —————————————————————
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }));
  const cha = calcularCha2ds2va({ insuficienciaCardiaca: false, hta: true, edadAnios: 70, diabetes: false, ictusAitTromboembolismo: false, enfermedadVascular: false });
  add('A1', `${farmacoResumen(r)}; CHA2DS2-VA ${cha.puntuacion}; nota: ${r.textoAnestesiologo ?? '—'}`, r.textoPaciente, '48 h; adelantar mar 13/10 09:00→08:00; nota 24 h; CHA2DS2-VA 2', fh(r.fechaHoraUltimaToma) === 'mar 13/10 08:00' && cha.puntuacion === 2 && !!r.textoAnestesiologo);
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 25, pautaFarmaco: P('09:00', '21:00') }));
  add('A2', farmacoResumen(r), r.textoPaciente, '72 h; adelantar lun 12/10 09:00→08:00; sin nota 24 h', fh(r.fechaHoraUltimaToma) === 'lun 12/10 08:00' && !r.textoAnestesiologo);
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, { ...ctx({ riesgoHemorragico: 'bajo', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }), fechaHoraIntervencion: IV13 });
  add('A2b', farmacoResumen(r), r.textoPaciente, 'no adelanta; última mar 13/10 09:00', fh(r.fechaHoraUltimaToma) === 'mar 13/10 09:00');
}
{
  const r = reglaAcod({ idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principioActivo: 'rivaroxaban', subtipo: 'antixa' }, ctx({ neuroaxial: true, aclaramiento: 25, pautaFarmaco: P('21:00') }));
  add('A3', farmacoResumen(r), r.textoPaciente, '96 h; no adelanta; última sáb 10/10 21:00', fh(r.fechaHoraUltimaToma) === 'sáb 10/10 21:00');
}
{
  const r = reglaAcod({ idFarmaco: 'rivaroxaban', nombreComercial: 'Xarelto', principioActivo: 'rivaroxaban', subtipo: 'antixa' }, { ...ctx({ neuroaxial: true, aclaramiento: 60, pautaFarmaco: P('21:00') }), fechaHoraIntervencion: IV13 });
  add('A3b', farmacoResumen(r), r.textoPaciente, 'adelantar lun 12/10 21:00→13:00', fh(r.fechaHoraUltimaToma) === 'lun 12/10 13:00');
}
{
  const r = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, ctx({ neuroaxial: true, aclaramiento: 90, pautaFarmaco: P('09:00', '21:00') }));
  add('A4', farmacoResumen(r), r.textoPaciente, '72 h; adelantar lun 12/10 09:00→08:00', fh(r.fechaHoraUltimaToma) === 'lun 12/10 08:00');
}
{
  const r = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, ctx({ neuroaxial: true, aclaramiento: 65, pautaFarmaco: P('09:00', '21:00') }));
  add('A5', farmacoResumen(r), r.textoPaciente, '96 h; adelantar dom 11/10 09:00→08:00', fh(r.fechaHoraUltimaToma) === 'dom 11/10 08:00');
}
{
  const r = reglaAcod({ idFarmaco: 'dabigatran', nombreComercial: 'Pradaxa', principioActivo: 'dabigatran', subtipo: 'dabigatran' }, ctx({ neuroaxial: true, aclaramiento: 45, pautaFarmaco: P('09:00', '21:00') }));
  add('A6', farmacoResumen(r), r.textoPaciente, '120 h; adelantar sáb 10/10 09:00→08:00', fh(r.fechaHoraUltimaToma) === 'sáb 10/10 08:00');
}
{
  const r = reglaAcod({ idFarmaco: 'edoxaban', nombreComercial: 'Lixiana', principioActivo: 'edoxaban', subtipo: 'antixa' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: null, pautaFarmaco: P('09:00') }));
  add('A7', farmacoResumen(r), r.textoPaciente, 'requiere confirmación; falta aclaramiento', r.requiereConfirmacion && (r.datoQueFalta ?? '').includes('aclaramiento'));
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa', altoRiesgoTromboticoConfirmar: true }, ctx({ pautaFarmaco: P('09:00', '21:00') }));
  add('A8', `${farmacoResumen(r)}; nota anestesiólogo: ${r.textoAnestesiologo ?? '—'}`, r.textoPaciente, r.requiereConfirmacion && (r.textoAnestesiologo ?? '').includes('acenocumarol'));
}
{
  const r = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false }, ctx({ riesgoHemorragico: 'bajo', pautaFarmaco: P('18:00') }));
  add('A9', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, '3 días; última dom 11/10 18:00; sin puente', fh(r.farmaco.fechaHoraUltimaToma) === 'dom 11/10 18:00' && !r.puente);
}
{
  const r = reglaAvk({ idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: false }, ctx({ riesgoHemorragico: 'alto', pautaFarmaco: P('18:00') }));
  add('A10', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, '5 días; última vie 09/10 18:00; sin puente', fh(r.farmaco.fechaHoraUltimaToma) === 'vie 09/10 18:00' && !r.puente);
}
{
  const r = reglaAvk({ idFarmaco: 'warfarina', nombreComercial: 'Aldocumar', principio: 'warfarina', altoRiesgoTromboembolico: false, portadorValvulaMecanicaOStent: true }, ctx({ riesgoHemorragico: 'alto', pautaFarmaco: P('18:00') }));
  const a11antes = textoHojaPaciente(r.farmaco);
  const a11despues = textoHojaPaciente(confirmar(r.farmaco, 'Dr. X'));
  add('A11', farmacoResumen(r.farmaco), `SIN confirmar: "${a11antes}" // CONFIRMADO: "${a11despues}"`, r.farmaco.requiereConfirmacion && !r.puente);
}
{
  const r = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: true }, ctx({ pesoKg: 70, aclaramiento: 25, pautaFarmaco: P('18:00') }));
  add('A12', `${farmacoResumen(r.farmaco)}; puente enoxaparina ${r.puente?.dosisMgPorToma} mg/${r.puente?.intervaloHoras} h; nota anestesiólogo: ${r.farmaco.textoAnestesiologo ?? '—'}`, r.farmaco.textoPaciente, r.puente?.dosisMgPorToma === 70 && r.puente?.intervaloHoras === 24 && r.farmaco.requiereConfirmacion);
}
{
  const r = reglaAvk({ idFarmaco: 'acenocumarol', nombreComercial: 'Sintrom', principio: 'acenocumarol', altoRiesgoTromboembolico: false }, ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'bajo', pautaFarmaco: P('18:00') }));
  add('A13', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, 'suspender 3 días (no mantener); última dom 11/10 18:00', r.farmaco.accion === 'suspender' && fh(r.farmaco.fechaHoraUltimaToma) === 'dom 11/10 18:00');
}

// ————————————————————— B —————————————————————
{
  const r = reglaHbpm({ idFarmaco: 'enox', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'profilactica' }, ctx({ neuroaxial: true, pautaFarmaco: P('18:00') }));
  add('B1', farmacoResumen(r), r.textoPaciente, '12 h; última mié 14/10 18:00', fh(r.fechaHoraUltimaToma) === 'mié 14/10 18:00');
}
{
  // B2: enoxaparina profiláctica con la dosis a las 21:00 (raquídea). El límite 12 h
  // antes es el mié 14/10 20:00; la dosis de las 21:00 cae después → se adelanta a las 20:00.
  const r = reglaHbpm({ idFarmaco: 'enox', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'profilactica' }, ctx({ neuroaxial: true, pautaFarmaco: P('21:00') }));
  add('B2', farmacoResumen(r), r.textoPaciente, fh(r.fechaHoraUltimaToma) === 'mié 14/10 20:00');
}
{
  const clas = clasificarHbpm({ dosisPorToma: 80, tomasDia: 2, pesoKg: 80, aclaramiento: 60 }, { unidad: 'mg', profilaxis_max_por_kg_dia: 1.0, tratamiento_min_por_kg_dia: 1.5, tratamiento_min_por_kg_dia_crcl_lt30: 1.0 });
  const r = reglaHbpm({ idFarmaco: 'enox', nombreComercial: 'Clexane', principio: 'enoxaparina', tipo: 'terapeutica' }, ctx({ aclaramiento: 60, pautaFarmaco: P('09:00', '21:00') }));
  add('B3', `clasificación: ${clas}; ${farmacoResumen(r)}`, r.textoPaciente, 'terapéutica; 24 h; adelantar mié 14/10 09:00→08:00', clas === 'terapeutica' && fh(r.fechaHoraUltimaToma) === 'mié 14/10 08:00');
}
{
  const r = reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'profilactico' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 60, pautaFarmaco: P('09:00') }));
  add('B4', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, '36 h; no adelanta; última mar 13/10 09:00', fh(r.farmaco.fechaHoraUltimaToma) === 'mar 13/10 09:00');
}
{
  const r = reglaFondaparinux({ idFarmaco: 'f', nombreComercial: 'Arixtra', dosis: 'terapeutico' }, ctx({ riesgoHemorragico: 'bajo', aclaramiento: 40, pautaFarmaco: P('09:00') }));
  add('B5', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, '72 h; adelantar lun 12/10 09:00→08:00', fh(r.farmaco.fechaHoraUltimaToma) === 'lun 12/10 08:00');
}

// ————————————————————— C —————————————————————
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 100 }, ctx());
  add('C1', farmacoResumen(r), r.textoPaciente, 'mantener', r.accion === 'mantener');
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 100 }, ctx({ espacioCerrado: true, pautaFarmaco: P('09:00') }));
  add('C2', farmacoResumen(r), r.textoPaciente, 'suspender 5 días + validación', r.accion === 'suspender' && r.puntoValidacion?.tipo === 'validar');
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300 }, ctx({ pautaFarmaco: P('09:00') }));
  add('C3', farmacoResumen(r), r.textoPaciente, 'mantener (colecistectomía no es de muy alto riesgo de sangrado y no hay neuroaxial)', r.accion === 'mantener');
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, ctx());
  add('C4', `${farmacoResumen(r)}; nota anestesiólogo: ${r.textoAnestesiologo ?? '—'}`, textoHojaPaciente(r), r.accion === 'mantener' && !r.requiereConfirmacion);
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300 }, ctx({ neuroaxial: true, pautaFarmaco: P('09:00') }));
  add('C3b', farmacoResumen(r), r.textoPaciente, 'suspender 5 días; última viernes 09/10 09:00', fh(r.fechaHoraUltimaToma) === 'vie 09/10 09:00');
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300, indicacionCardiovascular: true }, ctx({ espacioCerrado: true, pautaFarmaco: P('09:00') }));
  add('C4b', farmacoResumen(r), r.textoPaciente, 'espacio cerrado: suspender 5 días + validación', r.accion === 'suspender' && r.puntoValidacion?.tipo === 'validar');
}
{
  const r = reglaAas({ idFarmaco: 'aas', nombreComercial: 'Adiro', dosisDiariaMg: 300 }, ctx({ retina: true, pautaFarmaco: P('09:00') }));
  add('C4c', farmacoResumen(r), r.textoPaciente, 'suspender 5 días; última viernes 09/10 09:00', fh(r.fechaHoraUltimaToma) === 'vie 09/10 09:00');
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'alto', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }));
  add('A14', farmacoResumen(r), r.textoPaciente, 'oftalmología moderada-alta como hemorrágico alto: 72 h; adelantar lun 12/10 09:00→08:00', fh(r.fechaHoraUltimaToma) === 'lun 12/10 08:00');
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ grupoOftalmologico: 'riesgo_bajo', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }));
  add('A15', farmacoResumen(r), r.textoPaciente, 'catarata tópica (oftalmología bajo): no suspender', r.accion === 'mantener');
}
{
  const r = reglaAcod({ idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principioActivo: 'apixaban', subtipo: 'antixa' }, ctx({ grupoOftalmologico: 'riesgo_moderado_alto', riesgoHemorragico: 'alto', aclaramiento: 70, pautaFarmaco: P('09:00', '21:00') }));
  add('A16', farmacoResumen(r), r.textoPaciente, 'catarata peribulbar (moderada-alta): 72 h; adelantar lun 12/10 09:00→08:00', fh(r.fechaHoraUltimaToma) === 'lun 12/10 08:00');
}
{
  const s = evaluarStent({ mesesDesdeImplante: 4, traSca: false }, ctx());
  add('C5', `stent reciente: ${s.recienteRequiereConfirmacion}; sin pauta en hoja: ${s.suprimirPautaAntiagregantesEnHoja}; alerta: ${s.alertas[0]?.gravedad}`, '(hoja del paciente sin pauta de antiagregantes)', 'alerta roja diferir; confirmación; sin pauta en hoja', s.recienteRequiereConfirmacion && s.suprimirPautaAntiagregantesEnHoja && s.alertas[0]?.gravedad === 'roja');
}
{
  const s = evaluarStent({ mesesDesdeImplante: 14, traSca: true }, ctx());
  const r = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: false, portadorStent: true }, ctx({ pautaFarmaco: P('09:00') }));
  add('C6', `stent reciente: ${s.recienteRequiereConfirmacion}; ${farmacoResumen(r)}`, textoHojaPaciente(r), !s.recienteRequiereConfirmacion && fh(r.fechaHoraUltimaToma) === 'vie 09/10 09:00' && r.requiereConfirmacion);
}
{
  const r = reglaP2y12({ idFarmaco: 'clopidogrel', nombreComercial: 'Plavix', principio: 'clopidogrel', monoterapia: true }, ctx({ neuroaxial: true, pautaFarmaco: P('09:00') }));
  const antes = textoHojaPaciente(r);
  const despues = textoHojaPaciente(confirmar(r, 'Dr. X'));
  add('C7', `${farmacoResumen(r)}; nota anestesiólogo: ${r.textoAnestesiologo ?? '—'}`, `SIN confirmar: "${antes}" // CONFIRMADO: "${despues}"`);
}
{
  const r = reglaTriflusal('t', 'Disgren', ctx({ pautaFarmaco: P('09:00', '21:00') }));
  add('C8', farmacoResumen(r), r.textoPaciente, '7 días; última mié 07/10 21:00', fh(r.fechaHoraUltimaToma) === 'mié 07/10 21:00');
}
{
  const r = reglaCilostazol('c', 'Pletal', ctx({ riesgoHemorragico: 'bajo' }));
  add('C9', farmacoResumen(r), r.textoPaciente, 'mantener', r.accion === 'mantener');
}
{
  const r = reglaCilostazol('c', 'Pletal', ctx({ neuroaxial: true, riesgoHemorragico: 'bajo', pautaFarmaco: P('09:00', '21:00') }));
  add('C10', farmacoResumen(r), r.textoPaciente, '3 días; última dom 11/10 21:00', fh(r.fechaHoraUltimaToma) === 'dom 11/10 21:00');
}

// ————————————————————— D —————————————————————
{
  // D1: Synjardy = combinación fija empagliflozina + metformina (09:00 y 21:00).
  // Una sola instrucción, gobernada por el componente más restrictivo (SGLT2, 3 días);
  // como retira la metformina antes de su plazo, añade nota de vigilar glucemia.
  const cSyn = ctx({ pautaFarmaco: P('09:00', '21:00') });
  const empSyn = reglaSglt2({ idFarmaco: 'synjardy', nombreComercial: 'Synjardy', principio: 'empagliflozina' }, cSyn);
  const metSyn = reglaMetformina({ idFarmaco: 'synjardy', nombreComercial: 'Synjardy' }, cSyn);
  const syn = combinacionFija('synjardy', 'Synjardy', [empSyn, metSyn], true);
  add('D1', `${farmacoResumen(syn)}; nota anestesiólogo: ${syn.textoAnestesiologo ?? '—'}`, syn.textoPaciente, fh(syn.fechaHoraUltimaToma) === 'dom 11/10 21:00' && (syn.textoAnestesiologo ?? '').toLowerCase().includes('glucemia'));
}
{
  const emp = reglaSglt2({ idFarmaco: 'e', nombreComercial: 'Jardiance', principio: 'empagliflozina' }, ctx({ pautaFarmaco: P('09:00') }));
  const met = reglaMetformina({ idFarmaco: 'm', nombreComercial: 'Dianben' }, ctx({ pautaFarmaco: P('09:00', '21:00') }));
  add('D2', `empagliflozina: ${fh(emp.fechaHoraUltimaToma)}; metformina: ${fh(met.fechaHoraUltimaToma)}`, `${emp.textoPaciente} // ${met.textoPaciente}`, 'empagliflozina dom 11/10 09:00; metformina mié 14/10 21:00', fh(emp.fechaHoraUltimaToma) === 'dom 11/10 09:00' && fh(met.fechaHoraUltimaToma) === 'mié 14/10 21:00');
}
{
  const r = reglaSglt2({ idFarmaco: 'e', nombreComercial: 'Steglatro', principio: 'ertugliflozina' }, ctx({ pautaFarmaco: P('09:00') }));
  add('D3', farmacoResumen(r), r.textoPaciente, '4 días; última sáb 10/10 09:00', fh(r.fechaHoraUltimaToma) === 'sáb 10/10 09:00');
}
{
  const r = reglaGlp1Semanal({ idFarmaco: 's', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 12, 9, 0) }, ctx());
  add('D4', `acción: ${r.accion}`, r.textoPaciente, 'omitir dosis del lunes 12/10; dieta líquida 24 h', r.accion === 'suspender' && r.textoPaciente.includes('lunes 12'));
}
{
  const omit = reglaGlp1Semanal({ idFarmaco: 's', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 15, 6, 0) }, ctx());
  const previa = reglaGlp1Semanal({ idFarmaco: 's', nombreComercial: 'Ozempic', principio: 'semaglutida', proximaDosis: new Date(2026, 9, 8, 9, 0) }, ctx());
  add('D5', `dosis jue 15/10: ${omit.accion}; dosis jue 08/10: ${previa.accion}`, omit.textoPaciente, 'se omite jue 15/10; la de jue 08/10 (7 días) se administra', omit.accion === 'suspender' && previa.accion === 'mantener');
}
{
  const r = reglaGlp1Diario({ idFarmaco: 'r', nombreComercial: 'Rybelsus', principio: 'semaglutida' }, ctx({ pautaFarmaco: P('08:00') }));
  add('D6', farmacoResumen(r), r.textoPaciente, 'última dom 11/10', fh(r.fechaHoraUltimaToma) === 'dom 11/10 08:00');
}
{
  const r = reglaInsulinaBasal({ idFarmaco: 't', nombreComercial: 'Tresiba', principio: 'insulina_degludec', tomas: [{ hora: '09:00', dosisUi: 30 }], intervencion: IV });
  const manana = r.ajustes.find((a) => a.momento === 'manana_intervencion')?.dosisUi;
  const noche7 = r.ajustes.find((a) => a.momento === 'noche_previa');
  add('D7', `mañana IQ: ${manana} UI (80 % de 30); noche previa: ${noche7 ? noche7.dosisUi + ' UI' : 'no aplica (dosis diaria)'}`, r.textoPaciente, manana === 24 && noche7 === undefined);
}
{
  const r = reglaInsulinaNph({ idFarmaco: 'n', nombreComercial: 'Insulatard', dosisNocheUi: 10, dosisMananaUi: 20, intervencion: IV, horaNoche: '21:00', horaManana: '08:00' });
  const noche = r.ajustes.find((a) => a.momento === 'noche_previa')?.dosisUi;
  const man = r.ajustes.find((a) => a.momento === 'manana_intervencion')?.dosisUi;
  add('D8', `noche: ${noche} UI (completa); mañana: ${man} UI (50 %)`, r.textoPaciente, 'noche 10 UI completa; mañana 10 UI (50 %)', noche === 10 && man === 10);
}
{
  const r = reglaInsulinaPremezclada({ idFarmaco: 'nm', nombreComercial: 'NovoMix 30', dosisMananaUi: 20, intervencion: IV, horaManana: '08:00' });
  const man = r.ajustes.find((a) => a.momento === 'manana_intervencion')?.dosisUi;
  add('D9', `mañana: ${man} UI (50 %)`, r.textoPaciente, 'mañana 10 UI (50 % de 20)', man === 10);
}
{
  // D10: bomba + cirugía de riesgo bajo → sin confirmación (decide solo el riesgo).
  const r = reglaBombaInsulina({ idFarmaco: 'b', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'bajo' }));
  add('D10', farmacoResumen(r), r.textoPaciente, !r.requiereConfirmacion && r.textoPaciente.includes('80 %'));
}
{
  // D11: bomba + cirugía de riesgo intermedio → requiere confirmación.
  const r = reglaBombaInsulina({ idFarmaco: 'b', nombreComercial: 'Bomba' }, ctx({ riesgoCardiovascular: 'intermedio' }));
  add('D11', farmacoResumen(r), r.textoPaciente, 'requiere confirmación', r.requiereConfirmacion);
}

// ————————————————————— E —————————————————————
{
  const r = reglaIecaAra2({ idFarmaco: 'e', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: false, infartoReciente: false, proteinuriaONefropatia: false }, ctx({ pautaFarmaco: P('09:00') }));
  add('E1', farmacoResumen(r), r.textoPaciente, 'no tomar el día; última mié 14/10 09:00', fh(r.fechaHoraUltimaToma) === 'mié 14/10 09:00');
}
{
  const r = reglaIecaAra2({ idFarmaco: 'l', nombreComercial: 'Cozaar', principio: 'losartan', icDisfuncionSistolica: false, infartoReciente: false, proteinuriaONefropatia: false }, ctx({ pautaFarmaco: P('21:00') }));
  add('E1b', farmacoResumen(r), r.textoPaciente, 'no tomar el día; última mié 14/10 21:00', fh(r.fechaHoraUltimaToma) === 'mié 14/10 21:00');
}
{
  const r = reglaIecaAra2({ idFarmaco: 'e', nombreComercial: 'Renitec', principio: 'enalapril', icDisfuncionSistolica: true, infartoReciente: false, proteinuriaONefropatia: false }, ctx());
  add('E2', farmacoResumen(r), r.textoPaciente, 'mantener', r.accion === 'mantener');
}
{
  const r = reglaSacubitriloValsartan({ idFarmaco: 's', nombreComercial: 'Entresto' }, ctx({ pautaFarmaco: P('09:00') }));
  add('E3', farmacoResumen(r), r.textoPaciente, 'suspender 24 h + validar', r.accion === 'suspender' && r.puntoValidacion?.tipo === 'validar');
}
{
  const r = reglaDiuretico({ idFarmaco: 'f', nombreComercial: 'Seguril', principio: 'furosemida' }, ctx({ pautaFarmaco: P('09:00') }));
  add('E4', farmacoResumen(r), r.textoPaciente, 'no la mañana; última mié 14/10 09:00', fh(r.fechaHoraUltimaToma) === 'mié 14/10 09:00');
}
{
  const r = reglaLitio({ idFarmaco: 'li', nombreComercial: 'Plenur' }, ctx({ riesgoCardiovascular: 'intermedio', pautaFarmaco: P('09:00', '21:00') }));
  add('E5', farmacoResumen(r), r.textoPaciente, '48 h; última lun 12/10 21:00', fh(r.fechaHoraUltimaToma) === 'lun 12/10 21:00');
}
{
  const r = reglaMoclobemida({ idFarmaco: 'm', nombreComercial: 'Manerix', principio: 'moclobemida' }, ctx({ pautaFarmaco: P('09:00', '21:00') }));
  add('E6', farmacoResumen(r), r.textoPaciente, '24 h; última mar 13/10 21:00; nota IMAO', fh(r.fechaHoraUltimaToma) === 'mar 13/10 21:00' && (r.textoAnestesiologo ?? '').includes('meperidina'));
}
{
  const r = reglaImaoIrreversible({ idFarmaco: 't', nombreComercial: 'Parnate', principio: 'tranilcipromina' });
  add('E7', farmacoResumen(r), r.textoPaciente, 'confirmación; nota IMAO', r.requiereConfirmacion && (r.textoAnestesiologo ?? '').includes('azul de metileno'));
}
{
  const r = reglaImaoB({ idFarmaco: 'r', nombreComercial: 'Azilect', principio: 'rasagilina' });
  add('E8', farmacoResumen(r), r.textoPaciente, 'mantener; nota', r.accion === 'mantener' && !!r.textoAnestesiologo);
}
{
  const r = reglaAine({ idFarmaco: 'i', nombreComercial: 'Neobrufen', principio: 'ibuprofeno' }, ctx({ pautaFarmaco: P('00:00', '08:00', '16:00') }));
  add('E9', farmacoResumen(r), r.textoPaciente, '24 h; última mié 14/10 08:00 (en el límite)', fh(r.fechaHoraUltimaToma) === 'mié 14/10 08:00');
}
{
  const r = reglaAine({ idFarmaco: 'n', nombreComercial: 'Naprosyn', principio: 'naproxeno' }, ctx({ pautaFarmaco: P('09:00', '21:00') }));
  add('E10', farmacoResumen(r), r.textoPaciente, '72 h; última dom 11/10 21:00 (AINE no adelanta)', fh(r.fechaHoraUltimaToma) === 'dom 11/10 21:00');
}
{
  const r = reglaMetotrexato({ idFarmaco: 'm', nombreComercial: 'Metoject', dosisSemanalMg: 15 });
  add('E11', farmacoResumen(r), r.textoPaciente, 'mantener', r.accion === 'mantener');
}
{
  const r = reglaBiologico({ idFarmaco: 'a', nombreComercial: 'Humira', principio: 'adalimumab', periodicidadDias: 14, fechaUltimaDosis: new Date(2026, 9, 8) }, IV);
  add('E12', `${farmacoResumen(r)}; nota anestesiólogo: ${r.textoAnestesiologo ?? '—'}`, r.textoPaciente, r.requiereConfirmacion && (r.textoAnestesiologo ?? '').includes('mitad de ciclo'));
}
{
  const r = reglaAntiangiogenico({ idFarmaco: 'b', nombreComercial: 'Avastin', principio: 'bevacizumab', semanasDesdeUltimaDosis: 4 });
  add('E13', `${farmacoResumen(r.farmaco)}; alerta: ${r.alerta?.mensaje ?? '—'}`, r.farmaco.textoPaciente, 'alerta diferir 6-8 semanas; confirmación', r.farmaco.requiereConfirmacion && (r.alerta?.mensaje ?? '').includes('6-8'));
}
{
  const r = reglaAntiangiogenico({ idFarmaco: 'e', nombreComercial: 'Eylea', principio: 'aflibercept', intravitreo: true });
  add('E14', farmacoResumen(r.farmaco), r.farmaco.textoPaciente, 'mantener', r.farmaco.accion === 'mantener');
}
{
  const r = reglaFitoterapia({ idFarmaco: 'g', nombreComercial: 'Ginkgo', principio: 'ginkgo' }, ctx({ pautaFarmaco: P('09:00') }));
  add('E15', farmacoResumen(r), r.textoPaciente, 'suspender 14 días (mínimo 7); última mié 30/09 09:00', fh(r.fechaHoraUltimaToma) === 'mié 30/09 09:00');
}
{
  const r = reglaAnticonceptivoThs({ idFarmaco: 'a', nombreComercial: 'ACO', principio: 'etinilestradiol', via: 'oral' }, ctx({ riesgoTromboticoAlto: true }));
  const sg = avisoSugammadex({ mujerConAnticonceptivoHormonal: true, tipo: 'oral', posibleAnestesiaGeneral: true });
  add('E16', `${farmacoResumen(r)}; sugammadex: ${sg.textoPaciente}`, r.textoPaciente, 'confirmación; sugammadex oral (dosis olvidada)', r.requiereConfirmacion && sg.textoPaciente.includes('olvidada'));
}
{
  const r = reglaAnticonceptivoThs({ idFarmaco: 'i', nombreComercial: 'Implante', principio: 'etonogestrel', via: 'implante' }, ctx({ riesgoTromboticoAlto: false }));
  const sg = avisoSugammadex({ mujerConAnticonceptivoHormonal: true, tipo: 'no_oral', posibleAnestesiaGeneral: true });
  add('E17', `${farmacoResumen(r)}; sugammadex: barrera 7 días=${sg.textoPaciente.includes('7 días')}`, r.textoPaciente, 'sin regla trombótica; sugammadex no oral (barrera 7 días)', r.accion === 'mantener' && sg.textoPaciente.includes('7 días'));
}

// ————————————————————— F —————————————————————
{
  const r = calcularStopBang({ ronquidoFuerte: true, cansancioDiurno: false, apneasObservadas: false, htaEnTratamiento: true, imcMayor35: true, edadMayor50: true, cuelloMayor40: true, varon: true });
  add('F1', `STOP-Bang ${r.puntuacion} (${r.categoria})`, '—', '6, riesgo alto', r.puntuacion === 6 && r.categoria === 'alto');
}
{
  const r = calcularStopBang({ ronquidoFuerte: true, cansancioDiurno: true, apneasObservadas: false, htaEnTratamiento: false, imcMayor35: false, edadMayor50: false, cuelloMayor40: false, varon: false });
  add('F2', `STOP-Bang ${r.puntuacion} (${r.categoria})`, '—', '2, riesgo bajo', r.puntuacion === 2 && r.categoria === 'bajo');
}
{
  const r = calcularApfel({ mujer: true, noFumador: true, nvpoOCinetosisPrevias: true, riesgoQuirurgico: 'intermedio' });
  add('F3', `Apfel ${r.puntuacion} (${r.probabilidad} %)`, '—', '4, 80 %', r.puntuacion === 4 && r.probabilidad === 80);
}
{
  const r = calcularCha2ds2va({ insuficienciaCardiaca: true, hta: false, edadAnios: 76, diabetes: true, ictusAitTromboembolismo: false, enfermedadVascular: false });
  add('F4', `CHA2DS2-VA ${r.puntuacion}`, '—', '4', r.puntuacion === 4);
}
{
  const r = calcularDasi(['autocuidado', 'caminarDentroCasa', 'caminar1a2Manzanas', 'subirUnPisoOCuesta', 'tareasLigerasCasa', 'tareasModeradasCasa', 'relacionesSexuales']);
  add('F5', `DASI ${r.dasi}; METs ${r.mets}; reducida ${r.capacidadReducida}`, '—', 'DASI 24,2; capacidad reducida', Math.abs(r.dasi - 24.2) < 0.1 && r.capacidadReducida);
}
{
  const h = calcularAclaramiento({ edadAnios: 80, pesoKg: 60, sexo: 'hombre', creatinina: 1.2, unidad: 'mg_dl' });
  const m = calcularAclaramiento({ edadAnios: 80, pesoKg: 60, sexo: 'mujer', creatinina: 1.2, unidad: 'mg_dl' });
  add('F6', `varón ${Math.round(h ?? 0)} mL/min; mujer ${Math.round(m ?? 0)} mL/min`, '—');
}
{
  const r = calcular4AT({ alerta: 'normal', amt4: '1_error', meses: 'menos_de_7', cambioAgudo: 'no' });
  add('F7', `4AT ${r.puntuacion} (${r.categoria})`, '—', '2, posible deterioro', r.puntuacion === 2 && r.categoria === 'posible_deterioro_cognitivo');
}
{
  const r = calcular4AT({ alerta: 'normal', amt4: '0_errores', meses: '7_o_mas', cambioAgudo: 'si' });
  add('F8', `4AT ${r.puntuacion} (${r.categoria})`, '—', '4, posible delirium', r.puntuacion === 4 && r.categoria === 'posible_delirium');
}
{
  const r = calcularEgri({ pesoKg: 115, intubacionDificilPrevia: 'dudoso' });
  add('F9', `EGRI parcial ${r.puntuacion}`, '—', '3', r.puntuacion === 3);
}
{
  const r = calcularLangeron({ barba: true, imc: 27, edentulo: false, edadAnios: 60, ronquido: false });
  add('F10', `Langeron ${r.puntuacion} (${r.categoria})`, '—', '3, riesgo', r.puntuacion === 3 && r.categoria === 'riesgo');
}
{
  const r = calcularMorfinaEquivalente([{ id: 'fentanilo_transdermico', dosisDiaria: 25 }, { id: 'tapentadol', dosisDiaria: 200 }]);
  add('F11', `${r.mgDia} mg/día (${r.categoria})`, '—', '140 mg/día, alerta alta', r.mgDia === 140 && r.categoria === 'alerta_alta');
}
{
  const r = calcularAuditC({ frecuenciaConsumo: 1, cantidadTipica: 1, frecuenciaAtracon: 1, sexo: 'mujer' });
  add('F12', `AUDIT-C ${r.puntuacion} (${r.categoria})`, '—', 'positivo sin abstinencia', r.positivo && !r.riesgoAbstinencia);
}
{
  const r = calcularHemstop({ hematomasSinTrauma: true, sangradoProlongadoHeridas: true, menstruacionAbundante: false, sangradoTrasCirugia: false, sangradoTrasDental: false, sangradoEnParto: false, familiaresTrastornoCoagulacion: false });
  add('F13', `HEMSTOP ${r.puntuacion} (${r.categoria}); pedir coagulación: ${r.pedirCoagulacion}; alerta: ${r.alerta?.gravedad ?? '—'}`, '—', 'positivo → coagulación + alerta', r.positivo && r.pedirCoagulacion && r.alerta?.gravedad === 'amarilla');
}

// ————————————————————— G —————————————————————
// Los casos G se ejecutan por el MOTOR completo (derivarRiesgoYPruebas): la clase
// del paciente, los factores (incluida la comorbilidad CV para el BNP) y la vigencia
// de pruebas recientes se derivan de los datos del caso, no se fijan a mano.
const nombres = (ps: { prueba: string }[]) => ps.map((p) => p.prueba).sort().join(', ');
function baseRp(p: Partial<EntradaRiesgoPruebas> = {}): EntradaRiesgoPruebas {
  return {
    respuestas: {}, enfermedades: new Set(), edadAnios: 40, imc: 24, hemstopPositivo: false,
    medicacionGrupos: new Set(), riesgoCardiovascular: 'intermedio', riesgoHemorragico: 'bajo',
    neuroaxialProbable: false, tecnicas: ['general'], fechaIntervencion: IV,
    ...p,
  };
}
{
  // G1: varón 70 años, HTA controlada, METs ≥ 4, prótesis de rodilla (intermedio).
  // Clase bajo-moderado por edad ≥ 65 + HTA; sin comorbilidad CV significativa → sin BNP.
  const rp = derivarRiesgoYPruebas(baseRp({ edadAnios: 70, enfermedades: new Set(['hta']) }));
  add('G1', `clase: ${rp.clase.clase}; pruebas: ${nombres(rp.pruebas)}`, '—', 'hemograma, coagulación, bioquímica, ECG; sin Rx; sin BNP', nombres(rp.pruebas) === 'bioquimica, coagulacion, ecg, hemograma');
}
{
  // G2: mujer 40 años sana, colecistectomía (intermedio). Clase bajo → solo hemograma y coagulación.
  const rp = derivarRiesgoYPruebas(baseRp());
  add('G2', `clase: ${rp.clase.clase}; pruebas: ${nombres(rp.pruebas)}`, '—', 'hemograma y coagulación', nombres(rp.pruebas) === 'coagulacion, hemograma');
}
{
  // G3: varón 60 años, IC NYHA III, colectomía (intermedio). ECG de hace 2 meses (vigente),
  // coagulación de hace 20 días (caducada). Clase alto → +Rx y +BNP (comorbilidad CV);
  // ECG vigente se descuenta, coagulación caducada se pide.
  const ecgFecha = new Date(2026, 7, 15); // 15/08: ~2 meses antes de la IQ (15/10)
  const coagFecha = new Date(2026, 8, 25); // 25/09: 20 días antes
  const rp = derivarRiesgoYPruebas(baseRp({
    edadAnios: 60, enfermedades: new Set(['insuficiencia_cardiaca']),
    respuestas: { insuficiencia_cardiaca: { nyha: 'III' } },
    pruebasRecientes: { ecg: ecgFecha, coagulacion: coagFecha },
  }));
  const pide = (p: string) => rp.pruebas.some((x) => x.prueba === p);
  add('G3', `clase: ${rp.clase.clase}; pruebas: ${nombres(rp.pruebas)}; ECG vigente (descontado): ${rp.vigencia.ecg === true}; coagulación vigente: ${rp.vigencia.coagulacion === true}`, '—', 'paciente alto; +Rx; +BNP; ECG vigente no se repite; coagulación caducada sí', rp.clase.clase === 'alto' && pide('rx_torax') && pide('bnp') && pide('coagulacion') && !pide('ecg'));
}

// ————————————————————— H —————————————————————
{
  const r = calcularAyuno({ induccion: IV, pediatrico: false, situacion: 'ninguna' });
  const ligera = r.lineas.find((l) => l.concepto.includes('ligera'))?.hora;
  const claros = r.lineas.find((l) => l.horasAntes === 4)?.hora;
  // Se muestran TODAS las horas del ayuno: comida copiosa, comida ligera, líquidos
  // claros libres, ventana de 400 mL (nada después), y bebida de carbohidratos.
  const copiosa = r.lineas.find((l) => l.concepto.includes('copiosa'))?.hora;
  const ventana = r.lineas.find((l) => l.horasAntes === 2 && l.concepto.includes('400 mL'))?.hora;
  const carbo = r.lineas.find((l) => l.concepto.includes('carbohidratos'))?.hora;
  const todas =
    `comida copiosa ${copiosa}; comida ligera ${ligera}; líquidos claros libres hasta ${claros}; ` +
    `máx. 400 mL entre 4 y 2 h y nada desde las ${ventana} (salvo medicación con un sorbo); ` +
    `bebida de carbohidratos ${carbo}`;
  add('H1', todas, '—', copiosa === '00:00' && ligera === '02:00' && claros === '04:00' && ventana === '06:00' && !!carbo);
}
{
  const r = calcularAyuno({ induccion: IV, pediatrico: true, situacion: 'ninguna' });
  const solidos = r.lineas.find((l) => l.concepto.includes('fórmula y sólidos'))?.hora;
  const materna = r.lineas.find((l) => l.concepto === 'Leche materna')?.hora;
  const clarosP = r.lineas.find((l) => l.concepto === 'Líquidos claros')?.hora;
  add('H2', `fórmula/sólidos ${solidos}; materna ${materna}; claros ${clarosP}`, '—', 'sólidos 02:00; materna 05:00; claros 07:00', solidos === '02:00' && materna === '05:00' && clarosP === '07:00');
}
{
  const r = calcularAyuno({ induccion: IV, pediatrico: true, edadMeses: 4, situacion: 'ninguna' });
  const formula = r.lineas.find((l) => l.concepto.includes('menor de 6 meses'))?.hora;
  add('H3', `fórmula ${formula}; aviso hipoglucemia ${r.alertas.some((a) => a.mensaje.includes('hipoglucemia'))}`, '—', 'fórmula 04:00; aviso hipoglucemia', formula === '04:00' && r.alertas.some((a) => a.mensaje.includes('hipoglucemia')));
}
{
  const r = calcularAyuno({ induccion: IV, pediatrico: false, situacion: 'diabetes_gastroparesia' });
  add('H4', `sólidos ${r.lineas[0]?.hora}; carbohidratos ${r.lineas.some((l) => l.concepto.includes('carbohidratos'))}; alerta metoclopramida ${r.alertas.some((a) => a.mensaje.includes('metoclopramida'))}`, '—', 'sólidos 00:00 (8 h); sin carbohidratos; alerta metoclopramida', r.lineas[0]?.hora === '00:00' && !r.lineas.some((l) => l.concepto.includes('carbohidratos')));
}

// ————————————————————— I —————————————————————
{
  const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: true, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'negativo' });
  add('I1', `alerta: ${r.alerta?.gravedad ?? 'ninguna'} — ${r.alerta?.mensaje ?? ''}`, r.textoPaciente, r.alerta?.gravedad === 'informativa' && (r.alerta?.mensaje ?? '').includes('ausente'));
}
{
  const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: true, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'no_hecho' });
  add('I2', `alerta: ${r.alerta?.gravedad ?? 'ninguna'}`, r.textoPaciente, r.alerta?.gravedad === 'roja');
}
{
  const r = evaluarMtnd4({ ascendenciaVenezolanaMaterna: false, origenMaternoDesconocidoUOvodonacion: false, antecedentesFamiliaresCompatibles: false, testGenetico: 'no_hecho' });
  add('I3', `alerta: ${r.alerta === null ? 'ninguna' : r.alerta.gravedad}; texto hoja: ${r.textoPaciente === '' ? '(ninguno)' : r.textoPaciente}`, r.textoPaciente || '(ninguno)', r.alerta === null && r.textoPaciente === '');
}
{
  // Las indicaciones se leen del catálogo real (datos/farmacos.csv), no tecleadas.
  const t = tarjetaFarmacoAEnfermedad({ nombre: 'Prednisona', indicacionesPosibles: indicacionesDe('prednisona') }, new Set());
  add('I4', `tarjeta: ${t?.tipo ?? 'ninguna'}`, t?.mensaje ?? '—', undefined, undefined);
}
{
  const ts = tarjetasEnfermedadAFarmaco(new Set(['saos']), new Set());
  add('I5', `tarjetas: ${ts.length}`, ts[0]?.mensaje ?? '—', 'tarjeta inversa (preguntar por CPAP)', ts.some((t) => t.mensaje.toLowerCase().includes('cpap')));
}

// ————————————————————— Escritura del informe —————————————————————
const total = filas.length;
const nOk = filas.filter((f) => f.veredicto === 'coincide').length;
const nDudoso = filas.filter((f) => f.veredicto === 'dudoso').length;
const nManual = filas.filter((f) => f.veredicto === 'revision_manual').length;
const marca = (v: Veredicto) => (v === 'coincide' ? '✅' : v === 'dudoso' ? '❓' : '👁️');

let md = `# Informe de casos de referencia (ejecución del motor)\n\n`;
md += `> Generado automáticamente por \`scripts/generar-informe-casos.ts\` ejecutando el MOTOR con la entrada de cada caso de \`docs/casos_referencia.md\`.\n`;
md += `> La columna **"Motor"** sale de la ejecución del motor. La columna **"Esperado (literal)"** se copia tal cual de \`docs/casos_referencia.md\` (no se teclea en el script).\n`;
md += `> **Veredicto automático:** el script extrae del texto esperado todas las fechas (dd/mm), horas (hh:mm), dosis (UI, mg, mL, %) y puntuaciones, y comprueba que cada dato aparezca en la salida del motor. Si falta alguno, el caso sale como dudoso; si el esperado no contiene ningún dato comprobable, sale como revisión manual. No hay comprobaciones escritas a mano.\n`;
md += `> Intervención de referencia: jueves 15/10/2026 a las 08:00 (salvo A2b y A3b: 13:00).\n`;
md += `> Leyenda: ✅ coincide (todos los datos del esperado están en la salida) · ❓ dudoso (falta algún dato) · 👁️ revisión manual (el esperado no tiene datos comprobables).\n\n`;
md += `**Resultado: ${nOk} coinciden, ${nDudoso} dudosos, ${nManual} de revisión manual (de ${total}).**\n\n`;
md += `| Caso | Motor (cálculo) | Texto del paciente | Esperado (literal de casos_referencia.md) | Veredicto | Datos no encontrados |\n`;
md += `|---|---|---|---|---|---|\n`;
for (const f of filas) {
  const faltan = f.faltantes.length > 0 ? esc(f.faltantes.join(', ')) : '—';
  md += `| ${f.id} | ${esc(f.calculado)} | ${esc(f.textoPaciente)} | ${esc(f.esperado)} | ${marca(f.veredicto)} | ${faltan} |\n`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const salida = join(__dirname, '..', 'docs', 'informe_casos_referencia.md');
writeFileSync(salida, md, 'utf8');
console.log(`Informe escrito en ${salida}: ${nOk} coinciden, ${nDudoso} dudosos, ${nManual} de revisión manual (de ${total}).`);
if (nDudoso > 0) {
  console.log('Casos dudosos (con datos no encontrados):');
  for (const f of filas.filter((x) => x.veredicto === 'dudoso')) {
    console.log(`  ${f.id}: faltan [${f.faltantes.join(', ')}]`);
  }
}
