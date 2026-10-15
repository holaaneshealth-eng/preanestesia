/**
 * Bloque del resumen que gestiona los puntos pendientes de confirmación (§12) y,
 * solo cuando no queda ninguno sin resolver, permite generar la hoja y el QR.
 * Deriva los hechos clínicos, el ayuno (§8.14) y los condicionales de la hoja
 * (§10.2) a partir de la entrevista.
 */
import { useMemo, useState } from 'react';
import type { DatosIntervencion, Sexo } from '../../dominio/tipos.ts';
import { derivarHechosClinicos } from '../../dominio/entrevista/hechosClinicos.ts';
import { resolverAclaramiento } from '../../dominio/entrevista/aclaramiento.ts';
import { derivarHojaExtras } from '../../dominio/entrevista/hojaExtras.ts';
import { seccionesRiesgoAnestesia } from '../../dominio/entrevista/riesgosAnestesia.ts';
import { posibleAnestesiaGeneral, hayBloqueo } from '../../dominio/entrevista/tecnicasAnestesia.ts';
import type { ClavePruebaComplementaria } from '../estadoEntrevista.ts';

/** Claves de prueba cuya «la tiene pero no la ha traído» añade frase a la hoja (§7). */
const CLAVES_PRUEBAS: ClavePruebaComplementaria[] = ['analitica', 'nt_probnp', 'troponina', 'ecg', 'rx_torax', 'ecocardiograma'];
import { derivarPuntosValidacion } from '../../dominio/entrevista/puntosValidacion.ts';
import { VALIDACIONES } from '../../datos/validacionesDatos.ts';
import { MODULOS } from '../../datos/modulosDatos.ts';
import { construirHechosValidacion } from '../pasos/hechosValidacionUi.ts';
import { sugammadexParaHoja } from '../../dominio/reglas/sugammadex.ts';
import type { EstadoEntrevista, EstadoPuntoValidacion } from '../estadoEntrevista.ts';
import { calcularAyuno } from '../../dominio/ayuno/ayuno.ts';
import { ayunoQrDesde } from '../../dominio/salidas/qr/construirContenido.ts';
import { calcularAuditC } from '../../dominio/escalas/auditC.ts';
import { calcular4AT } from '../../dominio/escalas/cuatroAT.ts';
import type { ConsentimientoUi, CribadoUi, DatosBasicosUi, FarmacoTomadoUi, HabitosUi } from '../estadoEntrevista.ts';
import { construirPlanPaciente } from './construirPlanUi.ts';
import { HojaPaciente } from './HojaPaciente.tsx';

const MS_DIA = 86_400_000;
const EDAD_PEDIATRICA_MAXIMA = 17;

interface Props {
  medicacion: FarmacoTomadoUi[];
  intervencion: DatosIntervencion;
  basicos: DatosBasicosUi;
  cribado: CribadoUi;
  habitos: HabitosUi | null;
  consentimiento: ConsentimientoUi | null;
  /** Entrevista completa (para calcular los puntos de validación activos, §13 bis). */
  entrevista: EstadoEntrevista;
  /** Estado de los puntos de validación (§13 bis): resueltos no cuentan como pendientes. */
  validaciones: Record<string, EstadoPuntoValidacion>;
  /** "Hoy" para el plazo no alcanzable; la UI pasa la real, el modo entrenamiento una fija. */
  fechaReferencia?: Date;
}

const CONS_MAP: Record<ConsentimientoUi['estado'], 'entregado' | 'pendiente' | 'no_procede'> = {
  entregado: 'entregado',
  pendiente_entregar: 'pendiente',
  no_procede: 'no_procede',
};

export function BloqueHojaPaciente({ medicacion, intervencion, basicos, cribado, habitos, consentimiento, entrevista, validaciones, fechaReferencia }: Props) {
  const [generar, setGenerar] = useState(false);
  const hoy = fechaReferencia ?? new Date();

  const sexo: Sexo = basicos.sexo;
  const clin = useMemo(
    () => {
      const base = derivarHechosClinicos({
        respuestas: cribado.respuestasModulos,
        enfermedades: new Set(cribado.enfermedades),
        medicacion: medicacion.map((f) => ({ principiosActivos: f.principiosActivos, idRegla: f.idRegla })),
        edadAnios: basicos.edadAnios,
        pesoKg: basicos.pesoKg,
        sexo,
        fechaIntervencion: intervencion.fechaHora,
        espacioCerrado: intervencion.espacioCerrado,
        contrasteYodado: intervencion.contrasteYodado,
      });
      // Aclaramiento efectivo (§8.2/§8.4): módulo o, si no, el manual del paso 8.
      const aclaramiento = resolverAclaramiento(base.aclaramiento, entrevista.aclaramientoManual, { edadAnios: basicos.edadAnios, pesoKg: basicos.pesoKg, sexo }).valor;
      return { ...base, aclaramiento };
    },
    [cribado, medicacion, basicos, sexo, intervencion, entrevista.aclaramientoManual],
  );

  const plan = useMemo(
    () => construirPlanPaciente(medicacion, intervencion, clin, basicos.pesoKg, hoy),
    [medicacion, intervencion, clin, basicos.pesoKg, hoy],
  );

  // Puntos de validación clínica (§13 bis): la hoja del paciente muestra el aviso de
  // revisión solo mientras quede algún punto SIN validar (ni validado ni pospuesto;
  // los marcados «posponer o derivar» mantienen el aviso, porque siguen abiertos).
  const revisionPendiente = useMemo(() => {
    const activos = new Set(cribado.enfermedades);
    if (basicos.edadAnios <= EDAD_PEDIATRICA_MAXIMA) activos.add('pediatria');
    if (basicos.moduloObstetrico === true || basicos.embarazada === true) activos.add('obstetricia');
    const puntos = derivarPuntosValidacion({
      catalogo: VALIDACIONES, modulos: MODULOS, respuestas: cribado.respuestasModulos, activos,
      fechaIntervencion: intervencion.fechaHora ?? null, fechaReferencia: hoy,
      hechos: construirHechosValidacion(entrevista, hoy),
    });
    return puntos.some((p) => {
      const est = validaciones[p.id];
      // Un punto validado por nombre ya no cuenta; uno pospuesto/derivar SÍ mantiene el aviso.
      return !(est && est.validadoPor);
    });
  }, [entrevista, cribado, intervencion, hoy, validaciones]);

  // Ayuno (§8.14) y condicionales de la hoja (§10.2).
  const { ayunoQr, extras } = useMemo(() => {
    // AUDIT-C solo si las tres preguntas están contestadas (§6.9); si no, no hay anexo de alcohol.
    const auditPositivo = habitos && habitos.auditFrecuencia !== undefined && habitos.auditCantidad !== undefined && habitos.auditAtracon !== undefined
      ? calcularAuditC({ frecuenciaConsumo: habitos.auditFrecuencia, cantidadTipica: habitos.auditCantidad, frecuenciaAtracon: habitos.auditAtracon, sexo }).positivo
      : false;
    const cuatroAtPuntuacion = habitos?.cuatroAt ? calcular4AT(habitos.cuatroAt).puntuacion : undefined;
    const semanasObst = cribado.respuestasModulos['obstetricia']?.['semanas_gestacion'];
    const sugammadexHoja = sugammadexParaHoja(medicacion.map((f) => ({ idFarmaco: f.idFarmaco, via: f.via })), posibleAnestesiaGeneral(intervencion.tecnicas));
    const extrasIn = derivarHojaExtras({
      edadAnios: basicos.edadAnios,
      ...(typeof semanasObst === 'number' ? { semanasGestacion: semanasObst } : {}),
      enfermedades: new Set(cribado.enfermedades),
      respuestas: cribado.respuestasModulos,
      tabacoActivo: habitos?.tabaco === 'activo',
      auditPositivo,
      ...(habitos?.cfs !== undefined ? { cfs: habitos.cfs } : {}),
      ...(cuatroAtPuntuacion !== undefined ? { cuatroAtPuntuacion } : {}),
      edadPediatricaMaxima: EDAD_PEDIATRICA_MAXIMA,
      glp1Semanal: medicacion.some((f) => f.idRegla === 'glp1_semanal'),
      diabetes: new Set(cribado.enfermedades).has('diabetes'),
      ...(revisionPendiente ? { revisionPendiente: true } : {}),
      ...(sugammadexHoja ? { sugammadex: sugammadexHoja } : {}),
    });
    const refFecha = intervencion.fechaHora ?? new Date(hoy.getTime() + 90 * MS_DIA);
    const planAyuno = calcularAyuno({
      induccion: refFecha,
      pediatrico: extrasIn.pediatrico,
      ...(basicos.edadMeses !== undefined ? { edadMeses: basicos.edadMeses } : {}),
      situacion: extrasIn.situacion,
    });
    const extrasConCons = consentimiento ? { ...extrasIn.extras, cons: CONS_MAP[consentimiento.estado] } : extrasIn.extras;
    // Información de riesgos de la anestesia (§8.17): claves de las secciones a mostrar.
    const riesgos = seccionesRiesgoAnestesia({
      tecnicas: intervencion.tecnicas,
      neuroaxialProbable: intervencion.neuroaxialProbable,
      ...(intervencion.subtipoNeuroaxial ? { subtipoNeuroaxial: intervencion.subtipoNeuroaxial } : {}),
      grupoOftalmologico: intervencion.grupoOftalmologico,
      oftalmologico: entrevista.procedimiento?.especialidad === 'oftalmologia',
      ...(entrevista.procedimiento?.bloqueoMiembroSuperior ? { bloqueoMiembroSuperior: true } : {}),
      edadAnios: basicos.edadAnios,
      edadPediatricaMaxima: EDAD_PEDIATRICA_MAXIMA,
    });
    // Pruebas que tiene pero no ha traído (punto 3): claves para la frase de la hoja.
    const pruebasNoTraidas = CLAVES_PRUEBAS.filter((c) => entrevista.pruebasComplementarias?.[c]?.estado === 'tiene_no_trajo');
    // Preparación (punto 9): se muestra siempre; el paso del bloqueo si hay un bloqueo.
    const extras = {
      ...extrasConCons,
      ...(riesgos.length > 0 ? { riesgos } : {}),
      prep: true,
      ...(hayBloqueo(intervencion.tecnicas) ? { prepBloqueo: true } : {}),
      ...(pruebasNoTraidas.length > 0 ? { pruebasNoTraidas } : {}),
    };
    return { ayunoQr: ayunoQrDesde(planAyuno, extrasIn.pediatrico, extrasIn.situacion), extras };
  }, [basicos, cribado, habitos, sexo, intervencion, medicacion, consentimiento, hoy, revisionPendiente, entrevista.procedimiento, entrevista.pruebasComplementarias]);

  // §3 (2026-10-04): la hoja y el QR se generan SIEMPRE, sin bloqueo por fármacos
  // pendientes. Los pendientes aparecen en la hoja con la frase única de §12
  // («Sobre [fármaco], el anestesiólogo le llamará…») y siguen listados y
  // confirmables en el resumen del anestesiólogo (sección «Puntos pendientes»).
  if (!generar) {
    return (
      <button type="button" className="boton-primario" onClick={() => setGenerar(true)}>
        Generar hoja y QR del paciente
      </button>
    );
  }

  return <HojaPaciente plan={plan} intervencion={intervencion} ay={ayunoQr} ex={extras} />;
}
