/**
 * Salidas del paso 11 (§10.1 y §10.3): texto para SAP y resumen del anestesiólogo.
 * Reúne alertas por gravedad, ASA sugerido (modificable), escalas con sus
 * componentes, plan de medicación con regla y fuente, pruebas con su motivo, ayuno
 * y las notas técnicas plegables.
 */
import { useMemo, useState } from 'react';
import config from '../../../datos/config.json';
import plantillasSap from '../../../datos/plantillas_sap.json';
import type { GravedadAlerta } from '../../dominio/tipos.ts';
import { calcularImc, textoDosisFrecuencia, textoOtraEnfermedad, type EstadoEntrevista, type EstadoPuntoValidacion } from '../estadoEntrevista.ts';
import { MODULO_POR_ID, MODULOS } from '../../datos/modulosDatos.ts';
import type { RespuestasModulos } from '../../datos/modulos.ts';
import { derivarHechosClinicos } from '../../dominio/entrevista/hechosClinicos.ts';
import { resolverAclaramiento, aclaramientoDeMasDe3Meses } from '../../dominio/entrevista/aclaramiento.ts';
import { textoTecnicaPrevista } from '../../dominio/entrevista/riesgosAnestesia.ts';
import { posibleAnestesiaGeneral } from '../../dominio/entrevista/tecnicasAnestesia.ts';
import { emitirEfectosModulos } from '../../dominio/entrevista/efectosModulos.ts';
import { derivarPuntosValidacion } from '../../dominio/entrevista/puntosValidacion.ts';
import { VALIDACIONES } from '../../datos/validacionesDatos.ts';
import { construirHechosValidacion } from './hechosValidacionUi.ts';
import { derivarHojaExtras } from '../../dominio/entrevista/hojaExtras.ts';
import { derivarRiesgoYPruebas } from '../../dominio/entrevista/riesgoYPruebas.ts';
import { fechasPruebasRecientes } from './entradaPruebasUi.ts';
import { construirPlanPaciente } from '../paciente/construirPlanUi.ts';
import { construirContexto } from '../../dominio/reglas/motor.ts';
import { evaluarStent } from '../../dominio/reglas/antiagregantes.ts';
import { evaluarDispositivoCardiaco } from '../../dominio/reglas/dispositivosCardiacos.ts';
import { sugammadexParaHoja } from '../../dominio/reglas/sugammadex.ts';
import { calcularAyuno } from '../../dominio/ayuno/ayuno.ts';
import { calcularEgri, EGRI_UMBRAL_RIESGO } from '../../dominio/escalas/egri.ts';
import { calcularLangeron } from '../../dominio/escalas/langeron.ts';
import { calcularCha2ds2va } from '../../dominio/escalas/cha2ds2va.ts';
import { calcularApfel } from '../../dominio/escalas/apfel.ts';
import { calcularDasi } from '../../dominio/escalas/dasi.ts';
import { calcularAuditC } from '../../dominio/escalas/auditC.ts';
import { calcular4AT } from '../../dominio/escalas/cuatroAT.ts';
import { calcularHemstop } from '../../dominio/escalas/hemstop.ts';
import { calcularStopBang } from '../../dominio/escalas/stopBang.ts';
import { calcularStbur } from '../../dominio/escalas/stbur.ts';
import { calcularPovoc } from '../../dominio/escalas/povoc.ts';
import { derivarMorfina } from '../../dominio/salidas/dolorOpioides.ts';
import opioidesData from '../../../datos/opioides.json';
import { evaluarMtnd4 } from '../../dominio/mtnd4/mtnd4.ts';
import { derivarAsa } from '../../dominio/salidas/asaSugerido.ts';
import { construirSap, type EntradaSap } from '../../dominio/salidas/construirSap.ts';
import { resumenModuloSap } from '../../dominio/salidas/resumenModuloSap.ts';
import type { ClaseAsa } from '../../dominio/escalas/asa.ts';
import type { PruebaSolicitada } from '../../dominio/pruebas/tablaPruebas.ts';

interface Props {
  entrevista: EstadoEntrevista;
  modalidad: string;
  /** Confirma o marca «le llamaremos» un fármaco pendiente (§12), por su índice en la medicación. */
  onConfirmarFarmaco?: (indice: number, cambios: { confirmadoPor?: string; leLlamaremos?: boolean }) => void;
  /** Estado de los puntos de validación (§13 bis), elevado al estado de la entrevista. */
  validaciones?: Record<string, EstadoPuntoValidacion>;
  /** Resuelve un punto de validación: con nombre (validado) o posponer/derivar; null lo deshace. */
  onValidarPunto?: (id: string, estado: EstadoPuntoValidacion | null) => void;
  /** "Hoy" para los cálculos con fecha actual (plazo no alcanzable, vigencia sin fecha). La UI pasa la real; el modo entrenamiento, una fija. */
  fechaReferencia?: Date;
}

interface AlertaVista { gravedad: GravedadAlerta; mensaje: string; }
interface EscalaVista { nombre: string; valor: string; componentes: string[]; }

const ORDEN_GRAVEDAD: Record<GravedadAlerta, number> = { roja: 0, amarilla: 1, informativa: 2 };
/** Etiquetas legibles de cada prueba complementaria para las salidas. */
const ETIQUETA_PRUEBA: Record<string, string> = {
  hemograma: 'Hemograma',
  coagulacion: 'Coagulación',
  bioquimica: 'Bioquímica',
  ecg: 'ECG',
  rx_torax: 'Radiografía de tórax',
  ecocardiograma: 'Ecocardiograma',
  bnp: 'BNP o NT-proBNP',
};
function fechaCorta(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function Salidas({ entrevista, modalidad, validaciones, onValidarPunto, fechaReferencia }: Props) {
  const { intervencion, procedimiento, basicos, antecedentes, mtnd4, alergias, habitos, cribado, pruebasComplementarias, medicacion, viaAerea, consentimiento } = entrevista;
  const [soloAscii, setSoloAscii] = useState(false);
  const [asaManual, setAsaManual] = useState<ClaseAsa | ''>('');
  // Nombre tecleado para validar cada punto (transitorio). El estado resuelto vive
  // en la entrevista (prop `validaciones`), para que lo use también la hoja del paciente.
  const [valNombre, setValNombre] = useState<Record<string, string>>({});
  const valEstado = validaciones ?? {};
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const salida = useMemo(() => {
    if (!intervencion || !basicos || !cribado) return null;
    const hoy = fechaReferencia ?? new Date(); // "hoy" para plazo no alcanzable y vigencia sin fecha
    const enfermedades = new Set(cribado.enfermedades);
    const respuestas = cribado.respuestasModulos;
    const imc = calcularImc(basicos.pesoKg, basicos.tallaCm);
    // El módulo de pediatría se activa por edad, no por casilla: para que sus efectos
    // (p. ej. cardiopatía congénita) se emitan, se añade a los módulos «activos».
    const activos = new Set(enfermedades);
    if (basicos.edadAnios <= config.edad_pediatrica_maxima) activos.add('pediatria');
    const esObstetrica = basicos.moduloObstetrico === true || basicos.embarazada === true;
    if (esObstetrica) activos.add('obstetricia');
    // Datos obstétricos del módulo (§5.13): semanas de gestación y plaquetas.
    const obstetricia = respuestas['obstetricia'] ?? {};
    const semanasGestacion = typeof obstetricia['semanas_gestacion'] === 'number' ? (obstetricia['semanas_gestacion'] as number) : undefined;
    const plaquetasObst = typeof obstetricia['plaquetas'] === 'number' ? (obstetricia['plaquetas'] as number) : undefined;

    const clinBase = derivarHechosClinicos({
      respuestas, enfermedades,
      medicacion: (medicacion ?? []).map((f) => ({ principiosActivos: f.principiosActivos, idRegla: f.idRegla })),
      edadAnios: basicos.edadAnios, pesoKg: basicos.pesoKg, sexo: basicos.sexo,
      fechaIntervencion: intervencion.fechaHora, espacioCerrado: intervencion.espacioCerrado, contrasteYodado: intervencion.contrasteYodado,
    });
    // Aclaramiento efectivo (§8.2/§8.4): módulo renal/trasplante, el manual del paso 8
    // o, si falta (punto 8, 1.1), el filtrado glomerular del paso de pruebas (aproximación).
    const aclaramientoResuelto = resolverAclaramiento(
      clinBase.aclaramiento, entrevista.aclaramientoManual, basicos, clinBase.aclaramientoFecha,
      pruebasComplementarias?.filtradoGlomerular ?? null,
    );
    const aclaramiento = aclaramientoResuelto.valor;
    const aclaramientoAproximadoFiltrado = aclaramientoResuelto.fuente === 'filtrado_glomerular';
    const clin = { ...clinBase, aclaramiento };
    // ¿La analítica del aclaramiento es de hace más de 3 meses? (ref.: la intervención, o hoy).
    const aclaramientoAntiguo = aclaramientoDeMasDe3Meses(aclaramientoResuelto, intervencion.fechaHora ?? hoy);
    const plan = construirPlanPaciente(medicacion ?? [], intervencion, clin, basicos.pesoKg, hoy, aclaramientoAproximadoFiltrado);

    // AUDIT-C solo si las tres preguntas están contestadas (§6.9); si no, no genera alertas ni anexo.
    const auditCompleto = habitos !== null && habitos.auditFrecuencia !== undefined && habitos.auditCantidad !== undefined && habitos.auditAtracon !== undefined;
    const audit = auditCompleto
      ? calcularAuditC({ frecuenciaConsumo: habitos.auditFrecuencia!, cantidadTipica: habitos.auditCantidad!, frecuenciaAtracon: habitos.auditAtracon!, sexo: basicos.sexo })
      : null;
    const cuatroAt = habitos?.cuatroAt ? calcular4AT(habitos.cuatroAt) : null;
    const hemstop = calcularHemstop(cribado.hemstop);

    // Capacidad funcional reducida (< 4 METs o DASI ≤ 34, §6.6) para la nota ** del BNP.
    const dasiCapacidad = habitos && habitos.subeDosPisos !== 'si' && habitos.itemsDasi.length > 0
      ? calcularDasi(habitos.itemsDasi as never[])
      : null;
    const capacidadFuncionalReducida = habitos?.subeDosPisos === 'no' || (dasiCapacidad?.capacidadReducida ?? false);
    // Fechas de pruebas recientes (§7.4) desde el paso «Pruebas complementarias».
    const fechasRecientes = fechasPruebasRecientes(pruebasComplementarias);

    const rp = derivarRiesgoYPruebas({
      respuestas, enfermedades, edadAnios: basicos.edadAnios, imc,
      hemstopPositivo: hemstop.positivo,
      medicacionGrupos: new Set((medicacion ?? []).map((f) => grupoAntitrombotico(f.idRegla)).filter((g): g is string => g !== null)),
      riesgoCardiovascular: intervencion.riesgoCardiovascular, riesgoHemorragico: intervencion.riesgoHemorragico,
      neuroaxialProbable: intervencion.neuroaxialProbable, tecnicas: intervencion.tecnicas,
      fragilidad: habitos?.cfs !== undefined && habitos.cfs >= 5,
      capacidadFuncionalReducida,
      fechaIntervencion: intervencion.fechaHora ?? null,
      fechaReferencia: hoy,
      pruebasRecientes: fechasRecientes,
    });

    const posibleAnestesiaGeneralVal = posibleAnestesiaGeneral(intervencion.tecnicas);
    const sugammadex = sugammadexParaHoja((medicacion ?? []).map((f) => ({ idFarmaco: f.idFarmaco, via: f.via })), posibleAnestesiaGeneralVal);
    const extras = derivarHojaExtras({
      edadAnios: basicos.edadAnios, ...(semanasGestacion !== undefined ? { semanasGestacion } : {}),
      enfermedades, respuestas, tabacoActivo: habitos?.tabaco === 'activo', auditPositivo: audit?.positivo ?? false,
      ...(habitos?.cfs !== undefined ? { cfs: habitos.cfs } : {}), ...(cuatroAt ? { cuatroAtPuntuacion: cuatroAt.puntuacion } : {}),
      edadPediatricaMaxima: config.edad_pediatrica_maxima, glp1Semanal: (medicacion ?? []).some((f) => f.idRegla === 'glp1_semanal'), diabetes: enfermedades.has('diabetes'),
      ...(sugammadex ? { sugammadex } : {}),
    });
    const refFecha = intervencion.fechaHora ?? new Date(hoy.getTime() + 90 * 86_400_000);
    const ayuno = calcularAyuno({ induccion: refFecha, pediatrico: extras.pediatrico, ...(basicos.edadMeses !== undefined ? { edadMeses: basicos.edadMeses } : {}), situacion: extras.situacion });

    // ASA.
    const asa = derivarAsa({
      edadAnios: basicos.edadAnios, imc, embarazada: basicos.moduloObstetrico === true || basicos.embarazada === true,
      tabacoActivo: habitos?.tabaco === 'activo', abusoAlcohol: audit?.riesgoAbstinencia ?? false,
      enfermedades, respuestas, ...(asaManual !== '' ? { claseManual: asaManual } : {}),
    });

    // Escalas.
    const escalas: EscalaVista[] = [];
    if (viaAerea) {
      const egri = calcularEgri({ pesoKg: basicos.pesoKg, ...(viaAerea.aperturaBucal ? { aperturaBucal: viaAerea.aperturaBucal } : {}), ...(viaAerea.distanciaTiromentoniana ? { distanciaTiromentoniana: viaAerea.distanciaTiromentoniana } : {}), ...(viaAerea.mallampati ? { mallampati: viaAerea.mallampati } : {}), ...(viaAerea.movilidadCervical ? { movilidadCervical: viaAerea.movilidadCervical } : {}), ...(viaAerea.puedeProtruir !== undefined ? { puedeProtruir: viaAerea.puedeProtruir } : {}), ...(viaAerea.intubacionDificilPrevia ? { intubacionDificilPrevia: viaAerea.intubacionDificilPrevia } : {}) });
      escalas.push({ nombre: `EGRI${modalidad === 'telefonica' ? ' (parcial)' : ''}`, valor: `${egri.puntuacion} · ${egri.puntuacion >= EGRI_UMBRAL_RIESGO ? 'riesgo elevado' : 'sin riesgo elevado'}`, componentes: egri.componentes });
      const lang = calcularLangeron({ barba: viaAerea.barba === true, imc: imc ?? 0, edentulo: viaAerea.denticion === 'edentulo', edadAnios: basicos.edadAnios, ronquido: viaAerea.ronquido === true });
      escalas.push({ nombre: 'Langeron', valor: `${lang.puntuacion} · ${lang.categoria}`, componentes: lang.componentes });
    }
    if (enfermedades.has('fibrilacion_auricular')) {
      const fa = respuestas['fibrilacion_auricular'] ?? {};
      const cha = calcularCha2ds2va({ insuficienciaCardiaca: enfermedades.has('insuficiencia_cardiaca'), hta: enfermedades.has('hta'), edadAnios: basicos.edadAnios, diabetes: enfermedades.has('diabetes'), ictusAitTromboembolismo: fa.ictus_ait_previo === true, enfermedadVascular: enfermedades.has('cardiopatia_isquemica') || enfermedades.has('stent_o_infarto') || enfermedades.has('arteriopatia_periferica') || enfermedades.has('aneurisma_aorta') });
      escalas.push({ nombre: 'CHA2DS2-VA', valor: String(cha.puntuacion), componentes: cha.componentes });
    }
    const nvpoAntecedente = (antecedentes?.intervencionesPrevias ?? []).some((iq) => iq.incidencias.includes('nvpo'));
    const pediatriaResp = respuestas['pediatria'] ?? {};
    if (!extras.pediatrico) {
      // NVPO adultos: Apfel.
      const apfel = calcularApfel({ mujer: basicos.sexo === 'mujer', noFumador: habitos?.tabaco === 'nunca', nvpoOCinetosisPrevias: nvpoAntecedente, riesgoQuirurgico: intervencion.riesgoCardiovascular });
      escalas.push({ nombre: 'Apfel', valor: `${apfel.puntuacion} (${apfel.categoria})`, componentes: apfel.componentes });
    } else {
      // NVPO niños: POVOC (Eberhart).
      const povoc = calcularPovoc({
        cirugiaMayor30min: procedimiento?.duracionMayor30min ?? false,
        edadMayorIgual3: basicos.edadAnios >= 3,
        cirugiaEstrabismo: /estrabismo/.test(procedimiento?.id ?? ''),
        nvpoNinioOFamiliares: nvpoAntecedente || pediatriaResp['nvpo_familiares'] === true,
      });
      escalas.push({ nombre: 'POVOC', valor: `${povoc.puntuacion} (${povoc.categoria})`, componentes: povoc.componentes });
    }

    // SAOS: STOP-Bang (adultos sin diagnóstico) o STBUR (niños).
    let stopBang: ReturnType<typeof calcularStopBang> | null = null;
    let stbur: ReturnType<typeof calcularStbur> | null = null;
    if (extras.pediatrico) {
      stbur = calcularStbur({
        roncaMasMitadNoches: pediatriaResp['ronca_mitad_noches'] === true,
        roncaFuerte: pediatriaResp['ronca_fuerte'] === true,
        esfuerzoRespiratorioDormido: pediatriaResp['esfuerzo_respiratorio'] === true,
        dejaDeRespirarDormido: pediatriaResp['deja_de_respirar'] === true,
        cansadoOSomnolientoDia: pediatriaResp['cansado_dia'] === true,
      });
      escalas.push({ nombre: 'STBUR', valor: `${stbur.puntuacion} · ${stbur.categoria.replace(/_/g, ' ')}`, componentes: stbur.componentes });
    } else {
      const saosResp = respuestas['saos'] ?? {};
      const saosDiagnosticado = saosResp['diagnosticado'] === true;
      if (enfermedades.has('saos') && !saosDiagnosticado) {
        const cuelloCm = typeof saosResp['perimetro_cuello'] === 'number'
          ? (saosResp['perimetro_cuello'] as number)
          : viaAerea?.perimetroCuello ?? 0;
        stopBang = calcularStopBang({
          ronquidoFuerte: saosResp['ronquido_fuerte'] === true,
          cansancioDiurno: saosResp['cansancio_diurno'] === true,
          apneasObservadas: saosResp['apneas_observadas'] === true,
          htaEnTratamiento: enfermedades.has('hta'),
          imcMayor35: imc !== null && imc > 35,
          edadMayor50: basicos.edadAnios > 50,
          cuelloMayor40: cuelloCm > 40,
          varon: basicos.sexo === 'hombre',
        });
        escalas.push({ nombre: 'STOP-Bang', valor: `${stopBang.puntuacion} · riesgo ${stopBang.categoria}`, componentes: stopBang.componentes });
      }
    }

    // Dolor crónico y opioides (§5.7, §6.8): dosis equivalente de morfina oral.
    const opioidesTomados = (medicacion ?? [])
      .filter((f) => f.grupo === 'opioides')
      .map((f) => ({ idFarmaco: f.idFarmaco, via: f.via, ...(f.opioideDosis !== undefined ? { dosis: f.opioideDosis } : {}), ...(f.opioideTomasDia !== undefined ? { tomasDia: f.opioideTomasDia } : {}) }));
    const morfina = opioidesTomados.length > 0 ? derivarMorfina(opioidesTomados, opioidesData.factores) : null;
    if (morfina) {
      const sc = morfina.sinConversion.length > 0 ? ` (sin conversión: ${morfina.sinConversion.join(', ')})` : '';
      escalas.push({ nombre: 'Morfina equivalente', valor: `${morfina.mgDia} mg/día${sc}`, componentes: morfina.componentes });
    }
    if (habitos && habitos.subeDosPisos !== 'si' && habitos.itemsDasi.length > 0) {
      const dasi = calcularDasi(habitos.itemsDasi as never[]);
      escalas.push({ nombre: 'DASI', valor: `${dasi.dasi} · ${dasi.categoria}`, componentes: [] });
    }
    if (habitos?.cfs !== undefined) escalas.push({ nombre: 'CFS', valor: String(habitos.cfs), componentes: [] });
    if (cuatroAt) escalas.push({ nombre: '4AT', valor: `${cuatroAt.puntuacion} · ${cuatroAt.categoria}`, componentes: cuatroAt.componentes });
    if (audit) escalas.push({ nombre: 'AUDIT-C', valor: `${audit.puntuacion} · ${audit.categoria}`, componentes: [] });
    escalas.push({ nombre: 'HEMSTOP', valor: `${hemstop.puntuacion} · ${hemstop.positivo ? 'positivo' : 'negativo'}`, componentes: [] });
    if (clin.aclaramiento !== null) escalas.push({ nombre: 'Aclaramiento (Cockcroft-Gault)', valor: `${clin.aclaramiento} mL/min`, componentes: [] });

    // Alertas.
    const alertas: AlertaVista[] = [];
    const mt = mtnd4 ? evaluarMtnd4(mtnd4) : null;
    if (mt?.alerta) alertas.push({ gravedad: mt.alerta.gravedad, mensaje: mt.alerta.mensaje });
    if (hemstop.positivo) alertas.push({ gravedad: 'amarilla', mensaje: 'HEMSTOP positivo: se solicita estudio de coagulación.' });
    if (viaAerea?.radioterapiaCervical) alertas.push({ gravedad: 'amarilla', mensaje: 'Radioterapia cervical: vía aérea difícil.' });
    if (viaAerea?.tumorCabezaCuello) alertas.push({ gravedad: 'amarilla', mensaje: 'Tumor de cabeza y cuello: vía aérea difícil.' });
    if (viaAerea?.intubacionDificilPrevia === 'confirmado') alertas.push({ gravedad: 'amarilla', mensaje: 'Intubación difícil previa confirmada.' });
    if (cuatroAt && cuatroAt.puntuacion >= 4) alertas.push({ gravedad: 'roja', mensaje: '4AT ≥ 4: posible delirium actual.' });
    else if (cuatroAt && cuatroAt.puntuacion >= 1) alertas.push({ gravedad: 'amarilla', mensaje: '4AT 1-3: riesgo de delirium.' });
    if (habitos?.cfs !== undefined && habitos.cfs >= 5) alertas.push({ gravedad: 'amarilla', mensaje: 'Fragilidad (CFS ≥ 5).' });
    if (audit?.riesgoAbstinencia) alertas.push({ gravedad: 'amarilla', mensaje: 'AUDIT-C ≥ 8: riesgo de síndrome de abstinencia.' });
    // (El marcapasos/DAI ya no genera una alerta genérica: §5.1 bis lo trata con
    //  notas técnicas específicas y puntos de validación según tipo/zona/dependencia.)
    if (stopBang?.alto) alertas.push({ gravedad: 'amarilla', mensaje: `STOP-Bang ${stopBang.puntuacion} (riesgo alto): posible SAOS no diagnosticado.` });
    if (stbur && stbur.puntuacion >= 5) alertas.push({ gravedad: 'roja', mensaje: 'STBUR 5: riesgo alto de eventos respiratorios perioperatorios.' });
    else if (stbur && stbur.puntuacion >= 3) alertas.push({ gravedad: 'amarilla', mensaje: `STBUR ${stbur.puntuacion}: riesgo aumentado de eventos respiratorios perioperatorios.` });
    if (morfina && morfina.mgDia >= 90) alertas.push({ gravedad: 'roja', mensaje: `Dosis alta de opioides (${morfina.mgDia} mg/día de morfina equivalente): planificar analgesia y vigilancia.` });
    else if (morfina && morfina.mgDia >= 50) alertas.push({ gravedad: 'amarilla', mensaje: `Opioides ≥ 50 mg/día de morfina equivalente (${morfina.mgDia}): planificar analgesia.` });
    if (morfina && morfina.sinConversion.length > 0) alertas.push({ gravedad: 'amarilla', mensaje: `${morfina.sinConversion.join(' y ')}: no suspender; planificar la analgesia con el anestesiólogo.` });
    const riesgoIntAlto = intervencion.riesgoCardiovascular === 'intermedio' || intervencion.riesgoCardiovascular === 'alto';
    if ((morfina && morfina.mgDia >= 50) || (enfermedades.has('dolor_cronico') && riesgoIntAlto)) {
      alertas.push({ gravedad: 'informativa', mensaje: 'Valorar inclusión en el circuito de dolor transicional de la Unidad Integral del Dolor.' });
    }
    // Stent reciente (§8.3, R12.7): alerta roja de valorar diferir y, con técnica
    // neuroaxial/bloqueo profundo, la amarilla adicional. Se evalúa desde los hechos
    // clínicos (fecha y motivo del stent) con el contexto de la técnica efectiva.
    if (clin.stent && clin.stent.mesesDesdeImplante !== null) {
      const refFecha = intervencion.fechaHora ?? new Date(hoy.getTime() + 90 * 86_400_000);
      const ctxStent = construirContexto({ ...intervencion, fechaHora: refFecha, fechaDesconocida: false }, basicos.pesoKg, clin.aclaramiento, undefined, hoy);
      // Si no se conoce el motivo del stent, se usa la ventana más conservadora (SCA, 12 meses).
      const stentEval = evaluarStent({ mesesDesdeImplante: clin.stent.mesesDesdeImplante, traSca: clin.stent.traSca ?? true }, ctxStent);
      for (const a of stentEval.alertas) alertas.push({ gravedad: a.gravedad, mensaje: a.mensaje });
      // El stent reciente es también un punto de validación «posponer» (§13 bis),
      // que se calcula en construirHechosValidacion (abajo).
    }

    // Alertas y notas codificadas en los módulos (§5.16): se EJECUTAN aquí, no
    // están escritas a mano. Incluye ictus/AIT < 3 meses (roja), TVP/TEP < 3 meses
    // (amarilla), asma no controlada, trasplante reciente, etc.
    const efectosMod = emitirEfectosModulos({
      modulos: MODULOS, respuestas, activos,
      fechaIntervencion: intervencion.fechaHora ?? null,
      fechaReferencia: hoy,
    });
    for (const a of efectosMod.alertas) alertas.push({ gravedad: a.gravedad, mensaje: a.mensaje });

    // Alertas que elevan las reglas de medicación (§8): antiangiogénico reciente,
    // fondaparinux con aclaramiento < 20 (roja), plazo no alcanzable, etc. El
    // despachador las conserva en resultado.alertas; aquí se recogen de todo el plan.
    for (const f of plan) for (const a of f.resultado.alertas ?? []) alertas.push({ gravedad: a.gravedad, mensaje: a.mensaje });

    // Aclaramiento de una analítica de hace más de 3 meses (§6.7): aviso informativo.
    if (aclaramientoAntiguo) {
      alertas.push({ gravedad: 'informativa', mensaje: 'Aclaramiento de una analítica de hace más de 3 meses.' });
    }

    // Otras enfermedades escritas a mano (§6): el programa no les aplica reglas ni
    // alertas, así que cada una genera una alerta INFORMATIVA visible en el bloque de
    // alertas del resumen (sin desplegar nada) para que el anestesiólogo las revise.
    const otrasEnfermedades = cribado.otrasEnfermedades ?? [];
    for (const o of otrasEnfermedades) {
      alertas.push({ gravedad: 'informativa', mensaje: `Enfermedad no incluida en los módulos: ${textoOtraEnfermedad(o)} — revisar, porque el programa no aplica reglas ni alertas sobre ella.` });
    }

    alertas.sort((a, b) => ORDEN_GRAVEDAD[a.gravedad] - ORDEN_GRAVEDAD[b.gravedad]);

    // Dispositivos cardiacos implantables (§5.1 bis): notas técnicas y puntos de
    // validación propios (amarillos), según tipo, dependencia, zona y fabricante.
    const mp = respuestas['marcapasos'] ?? {};
    const dispositivo = enfermedades.has('marcapasos')
      ? evaluarDispositivoCardiaco({
          ...(typeof mp['tipo'] === 'string' ? { tipo: mp['tipo'] as never } : {}),
          ...(typeof mp['dependiente'] === 'string' ? { dependiente: mp['dependiente'] as never } : {}),
          ...(intervencion.zonaDispositivo ? { zona: intervencion.zonaDispositivo } : {}),
          ...(typeof mp['fabricante'] === 'string' ? { fabricante: mp['fabricante'] as never } : {}),
          ultimaRevision: (mp['ultima_revision'] as string | undefined) ?? null,
          ...(typeof mp['bateria_agotandose'] === 'string' ? { bateriaAgotandose: mp['bateria_agotandose'] as never } : {}),
          ensayoClinico: mp['ensayo_clinico'] === true,
        }, hoy)
      : { notas: [], puntos: [] };

    // Notas técnicas.
    const notas: string[] = [...ayuno.notasAnestesiologo];
    for (const n of efectosMod.notas) notas.push(n.texto);
    for (const n of dispositivo.notas) notas.push(`Dispositivo cardiaco: ${n}`);
    // Plaquetopenia obstétrica (§5.13): nota sobre la técnica neuroaxial.
    if (plaquetasObst !== undefined && plaquetasObst < 80) {
      notas.push('Plaquetopenia: condiciona la técnica neuroaxial.');
    }
    // Troponina indicada (ESC 2022): seguimiento postoperatorio.
    if (rp.pruebas.some((p) => p.prueba === 'troponina')) {
      notas.push('Troponina ultrasensible a las 24 y 48 h del postoperatorio (ESC 2022).');
    }
    for (const f of plan) if (f.resultado.textoAnestesiologo) notas.push(`${f.resultado.nombreComercial}: ${f.resultado.textoAnestesiologo}`);
    if (mt?.alerta?.gravedad === 'roja') notas.push('mtND4: seguir las medidas del consenso SEDAR (evitar halogenados/TIVA, regional preferente, monitorización de profundidad, etc.).');

    // Resumen de módulos (§5.16) para el SAP. Incluye los activados por tipo de
    // paciente (pediatría, obstetricia), no solo las casillas de enfermedades.
    const resumenModulos = [...activos].map((id) => resumenModulo(id, respuestas)).filter((s): s is string => s !== null);

    // Otras enfermedades escritas a mano (§6) para el SAP: «nombre (detalle)» o
    // solo «nombre». (El aviso al anestesiólogo va como alerta informativa, arriba.)
    const otrasEnfermedadesSap = otrasEnfermedades.map(textoOtraEnfermedad);

    // SAP (§10.1): SOLO antecedentes patológicos y quirúrgicos (decisión del servicio).
    const antecedentesQuirurgicos = (antecedentes?.intervencionesPrevias ?? []).map((iq) => {
      const partes = [iq.procedimiento];
      if (iq.anio) partes.push(String(iq.anio));
      partes.push(`anestesia ${iq.tipoAnestesia.replace(/_/g, ' ')}`);
      if (iq.incidencias.length > 0) partes.push(`incidencias: ${iq.incidencias.join(', ')}`);
      return partes.join(', ');
    });
    // Analítica (§7): hemoglobina y filtrado glomerular del paso de pruebas, con fecha.
    const analiticaUi = pruebasComplementarias?.analitica;
    const fechaAnaliticaTxt = analiticaUi?.fecha ? fechaCorta(new Date(`${analiticaUi.fecha}T12:00:00`)) : undefined;
    const entradaSap: EntradaSap = {
      antecedentesPatologicos: [...resumenModulos, ...otrasEnfermedadesSap],
      antecedentesQuirurgicos,
      ...(pruebasComplementarias?.hemoglobina !== undefined ? { hemoglobina: pruebasComplementarias.hemoglobina } : {}),
      ...(pruebasComplementarias?.filtradoGlomerular !== undefined ? { filtradoGlomerular: pruebasComplementarias.filtradoGlomerular } : {}),
      ...(fechaAnaliticaTxt ? { fechaAnalitica: fechaAnaliticaTxt } : {}),
      ...(audit ? { auditC: { puntuacion: audit.puntuacion, positivo: audit.positivo } } : {}),
      ...(cribado.hemstopPreguntado ? { hemstop: { puntuacion: hemstop.puntuacion, positivo: hemstop.positivo } } : {}),
      ...(consentimiento
        ? { consentimiento: consentimiento.estado === 'entregado'
            ? { estado: 'entregado' as const, ...(consentimiento.fecha ? { fecha: consentimiento.fecha } : {}) }
            : { estado: consentimiento.estado } }
        : {}),
    };
    const sap = construirSap(entradaSap, { soloAscii, usarAbreviaturas: true, abreviaturas: plantillasSap.abreviaturas });

    // Puntos de validación clínica (§13 bis): mecanismo distinto de las alertas.
    // Los "hechos" (escalas, hechos clínicos, paso 1, alergias, antecedentes y vía
    // aérea) los calcula un ayudante puro compartido con la hoja del paciente.
    const puntosValidacion = derivarPuntosValidacion({
      catalogo: VALIDACIONES, modulos: MODULOS, respuestas, activos,
      fechaIntervencion: intervencion.fechaHora ?? null, fechaReferencia: hoy,
      hechos: construirHechosValidacion(entrevista, hoy),
    });
    // Puntos de validación propios del dispositivo cardiaco (§5.1 bis, amarillos).
    for (const p of dispositivo.puntos) {
      puntosValidacion.push({ id: p.id, tipo: 'validar', motivo: p.motivo, origen: 'dispositivo_cardiaco', ...(p.fuente ? { fuente: p.fuente } : {}) });
    }
    // Punto 8: puntos de validación que deja cada regla de medicación (en vez de
    // «requiere confirmación»). Rojos (posponer) o amarillos (validar).
    plan.forEach((f, i) => {
      const pv = f.resultado.puntoValidacion;
      if (!pv) return;
      puntosValidacion.push({
        id: `farmaco:${f.resultado.idFarmaco}:${i}`,
        tipo: pv.tipo,
        motivo: pv.motivo,
        origen: 'medicacion §8',
        fuente: f.resultado.fuente,
      });
    });
    // Orden: primero los rojos (posponer), luego los amarillos (validar).
    puntosValidacion.sort((a, b) => (a.tipo === 'posponer' ? 0 : 1) - (b.tipo === 'posponer' ? 0 : 1));

    const tecnicaPrevista = textoTecnicaPrevista({
      tecnicas: intervencion.tecnicas,
      ...(intervencion.subtipoNeuroaxial ? { subtipoNeuroaxial: intervencion.subtipoNeuroaxial } : {}),
    });

    return { asa, escalas, alertas, notas, plan, pruebas: rp.pruebas, claseRiesgo: rp.clase, ayuno, sap, puntosValidacion, tecnicaPrevista };
  }, [intervencion, basicos, cribado, medicacion, habitos, viaAerea, consentimiento, antecedentes, mtnd4, alergias, modalidad, soloAscii, asaManual, fechaReferencia]);

  if (!salida) return null;

  async function copiarSap() {
    try { await navigator.clipboard.writeText(salida!.sap.texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { setCopiado(false); }
  }

  return (
    <>
      <h3>Resumen del anestesiólogo</h3>

      <p className="tecnica-prevista"><strong>Técnica prevista:</strong> {salida.tecnicaPrevista}</p>

      {/* Puntos de validación clínica (§13 bis): al principio del resumen. No bloquean
          nada; cada uno se resuelve con «Validado por [nombre]» o «Posponer o derivar». */}
      {salida.puntosValidacion.length > 0 && (
        <section className="validaciones" aria-labelledby="val-tit">
          <h4 id="val-tit">Puntos de validación clínica</h4>
          <p className="aviso aviso-info no-print">
            Revise estos puntos antes de la intervención. No impiden continuar: puede validarlos
            con su nombre o marcar que hay que posponer o derivar. Mientras alguno siga sin validar,
            la hoja del paciente le indicará que su caso será revisado.
          </p>
          <ul className="lista-validaciones">
            {salida.puntosValidacion.map((pv) => {
              const estado = valEstado[pv.id];
              const rojo = pv.tipo === 'posponer';
              return (
                <li key={pv.id} className={`validacion ${rojo ? 'validacion-roja' : 'validacion-amarilla'}`}>
                  <p className="validacion-motivo">
                    <strong>{rojo ? '🔴 Valorar posponer la cirugía programada' : '🟡 Validar antes de la intervención'}:</strong>{' '}
                    {pv.motivo}{pv.fuente ? <em> ({pv.fuente})</em> : null}
                  </p>
                  {/* Estado permanente (sale también en el PDF). */}
                  {estado?.validadoPor ? (
                    <p className="validacion-resuelta">✓ Validado por {estado.validadoPor}
                      <button type="button" className="boton-enlace no-print" onClick={() => onValidarPunto?.(pv.id, null)}> · deshacer</button>
                    </p>
                  ) : estado?.posponer ? (
                    <p className="validacion-resuelta">⏸ Posponer o derivar
                      <button type="button" className="boton-enlace no-print" onClick={() => onValidarPunto?.(pv.id, null)}> · deshacer</button>
                    </p>
                  ) : (
                    <p className="validacion-pendiente">⚠ Pendiente de validar</p>
                  )}
                  {/* Controles (no se imprimen). */}
                  {!estado?.validadoPor && !estado?.posponer && (
                    <div className="validacion-controles no-print">
                      <input
                        type="text"
                        placeholder="Nombre del anestesiólogo"
                        value={valNombre[pv.id] ?? ''}
                        onChange={(e) => setValNombre((n) => ({ ...n, [pv.id]: e.target.value }))}
                        aria-label={`Nombre del anestesiólogo para validar: ${pv.motivo}`}
                      />
                      <button
                        type="button"
                        className="boton-secundario"
                        disabled={!(valNombre[pv.id] ?? '').trim()}
                        onClick={() => onValidarPunto?.(pv.id, { validadoPor: (valNombre[pv.id] ?? '').trim() })}
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() => onValidarPunto?.(pv.id, { posponer: true })}
                      >
                        Posponer o derivar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {salida.alertas.length > 0 && (
        <div className="resumen-alertas">
          {salida.alertas.map((a, i) => (
            <p key={i} className={`aviso ${a.gravedad === 'roja' ? 'aviso-atencion' : a.gravedad === 'amarilla' ? 'aviso-atencion' : 'aviso-info'}`}>
              <strong>{a.gravedad === 'roja' ? '🔴' : a.gravedad === 'amarilla' ? '🟡' : 'ℹ️'}</strong> {a.mensaje}
            </p>
          ))}
        </div>
      )}

      <div className="campo">
        <label htmlFor="asa-manual"><strong>ASA sugerido: {'I'.repeat(salida.asa.clase)}</strong> (puede modificarlo)</label>
        <select id="asa-manual" value={asaManual} onChange={(e) => setAsaManual(e.target.value === '' ? '' : Number(e.target.value) as ClaseAsa)}>
          <option value="">Sugerido ({salida.asa.determinantes.join(', ') || 'sano'})</option>
          {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>ASA {'I'.repeat(c)}</option>)}
        </select>
      </div>

      <h4>Escalas</h4>
      <ul className="resumen-lista">
        {salida.escalas.map((s, i) => (
          <li key={i}><strong>{s.nombre}:</strong> {s.valor}{s.componentes.length > 0 ? ` — ${s.componentes.join(', ')}` : ''}</li>
        ))}
      </ul>

      <h4>Plan de medicación</h4>
      {salida.plan.length === 0 ? <p>Sin medicación.</p> : (
        <ul className="resumen-lista">
          {salida.plan.map((f, i) => {
            const df = textoDosisFrecuencia((medicacion ?? [])[i] ?? {});
            return (
              <li key={i}>
                <strong>{f.resultado.nombreComercial}{df ? ` ${df}` : ''}:</strong> {f.resultado.accion} · {f.resultado.reglaAplicada} <em>({f.resultado.fuente})</em>
              </li>
            );
          })}
        </ul>
      )}

      {/* Punto 8: el bloque «Puntos pendientes de confirmación» se ha retirado. Ningún
          fármaco queda «pendiente de confirmar»: cada regla propone una pauta y deja,
          si procede, un punto de validación clínica (mostrado arriba). */}

      <h4>Pruebas complementarias</h4>
      <ul className="resumen-lista">
        {salida.pruebas.length === 0 ? <li>Ninguna.</li> : salida.pruebas.map((p: PruebaSolicitada, i: number) => (
          <li key={i}><strong>{ETIQUETA_PRUEBA[p.prueba] ?? p.prueba}:</strong> {p.motivo}</li>
        ))}
      </ul>

      <h4>Ayuno</h4>
      <ul className="resumen-lista">
        {salida.ayuno.lineas.map((l, i) => <li key={i}>{l.concepto}: {l.hora}</li>)}
      </ul>

      <button type="button" className="boton-enlace" onClick={() => setNotasAbiertas((v) => !v)} aria-expanded={notasAbiertas}>
        {notasAbiertas ? '▼' : '▶'} Notas técnicas ({salida.notas.length})
      </button>
      {notasAbiertas && (
        <ul className="resumen-lista">
          {salida.notas.length === 0 ? <li>Sin notas.</li> : salida.notas.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}

      <h3>Texto para SAP</h3>
      <div className="campo">
        <label className="radio-tarjeta">
          <input type="checkbox" checked={soloAscii} onChange={() => setSoloAscii((v) => !v)} /> Solo ASCII (si SAP da problemas con tildes)
        </label>
      </div>
      <textarea className="sap-texto" readOnly rows={10} value={salida.sap.texto} aria-label="Texto para SAP" />
      <p className="horas-elegidas">{salida.sap.caracteres} caracteres. Solo antecedentes patológicos y quirúrgicos; el resto se rellena con los desplegables del SAP.</p>
      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={copiarSap}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
      </div>
    </>
  );
}

/** Grupo antitrombótico de un id_regla (para los factores de pruebas). */
function grupoAntitrombotico(idRegla: string): string | null {
  if (/^(acod_|avk_)/.test(idRegla) || idRegla === 'hbpm' || idRegla === 'fondaparinux' || idRegla === 'heparina_sodica') return 'anticoagulante';
  if (/^p2y12_/.test(idRegla) || ['aas', 'triflusal', 'dipiridamol', 'cilostazol', 'gp_iibiiia', 'sulodexida'].includes(idRegla)) return 'antiagregante';
  return null;
}

/** Resumen legible de un módulo (§5.16) a partir de sus respuestas contestadas. */
function resumenModulo(id: string, respuestas: RespuestasModulos): string | null {
  const moduloId = id === 'stent_o_infarto' ? 'cardiopatia_isquemica' : id === 'protesis_mecanica' ? 'valvulopatia' : id;
  const modulo = MODULO_POR_ID[moduloId];
  if (!modulo) return null;
  return resumenModuloSap(modulo, respuestas[moduloId] ?? {});
}
