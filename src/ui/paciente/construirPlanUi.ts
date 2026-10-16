/**
 * Construye el plan de medicación del paciente (FarmacoPlan[]) reevaluando la
 * medicación del paso 8 con el motor, para alimentar el QR y la hoja del paciente.
 * Como el QR solo guarda el tipo de plazo, la duración, el adelanto y si es
 * anticoagulante (no fechas), para obtener «requiere confirmación» y el texto de
 * los fármacos «mantener/consultar» se evalúa con una fecha de referencia (la de la
 * intervención si se conoce, o una futura); las fechas concretas las recalcula
 * después la vista del paciente.
 */
import type { DatosIntervencion } from '../../dominio/tipos.ts';
import { construirContexto } from '../../dominio/reglas/motor.ts';
import { evaluarCombinacionUi, metadatosPlazo, type DatosFarmacoUi } from '../../dominio/reglas/despachador.ts';
import type { DatosClinicos } from '../../dominio/entrevista/hechosClinicos.ts';
import type { FarmacoPlan } from '../../dominio/salidas/qr/construirContenido.ts';
import type { InsulinaQr } from '../../dominio/salidas/qr/hojaPaciente.ts';
import { textoDosisFrecuencia, type FarmacoTomadoUi } from '../estadoEntrevista.ts';

const MS_DIA = 86_400_000;

function proximaDosisSemanal(diaSemana: number, intervencion: Date): Date {
  const d = new Date(intervencion);
  for (let i = 0; i < 8; i++) {
    if (d.getDay() === diaSemana) break;
    d.setDate(d.getDate() - 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Variante de «mantener» para localizar la instrucción del paciente: la vía concreta. */
function varianteMantener(f: FarmacoTomadoUi): FarmacoTomadoUi['via'] {
  return f.via;
}

const floorPct = (dosis: number, pct: number) => Math.floor((dosis * pct) / 100);
const momentoDeHora = (hora: string): 'noche_previa' | 'manana_intervencion' =>
  (parseInt(hora.split(':')[0] ?? '0', 10) >= 18 ? 'noche_previa' : 'manana_intervencion');

/** Ajuste de insulina estructurado (§8.5) para el QR, si el fármaco es una insulina. */
function insulinaDe(f: FarmacoTomadoUi): InsulinaQr | undefined {
  const horaManana = f.horas.find((h) => parseInt(h.split(':')[0] ?? '0', 10) < 18) ?? '08:00';
  const horaNoche = f.horas.find((h) => parseInt(h.split(':')[0] ?? '0', 10) >= 18) ?? '21:00';
  switch (f.idRegla) {
    case 'insulina_basal': {
      const o = f.insulinaBasalUi ?? 0;
      const h = f.horas[0] ?? '09:00';
      return { tipo: 'basal', tomas: [{ m: momentoDeHora(h), d: floorPct(o, 80), o, h }] };
    }
    case 'insulina_nph':
      return { tipo: 'nph', nocheUi: f.insulinaNocheUi ?? 0, mananaUi: floorPct(f.insulinaMananaUi ?? 0, 50), mananaOrig: f.insulinaMananaUi ?? 0, horaNoche, horaManana };
    case 'insulina_premezclada':
      return { tipo: 'premezclada', mananaUi: floorPct(f.insulinaMananaUi ?? 0, 50), mananaOrig: f.insulinaMananaUi ?? 0, horaManana };
    case 'insulina_rapida':
      return { tipo: 'rapida', horaDesayuno: horaManana };
    default:
      return undefined;
  }
}

export function construirPlanPaciente(
  medicacion: FarmacoTomadoUi[],
  intervencion: DatosIntervencion,
  clin: DatosClinicos,
  pesoKg: number,
  /** "Hoy" para el plazo no alcanzable; la UI pasa la real, el modo entrenamiento una fija. */
  fechaReferencia: Date = new Date(),
  /** Punto 8 (1.1): el aclaramiento es una aproximación por el filtrado glomerular. */
  aclaramientoAproximadoFiltrado = false,
): FarmacoPlan[] {
  // Fecha de referencia para extraer el plan y los textos fijos.
  const refFecha = intervencion.fechaHora ?? new Date(fechaReferencia.getTime() + 90 * MS_DIA);
  const ctx = construirContexto({ ...intervencion, fechaHora: refFecha, fechaDesconocida: false }, pesoKg, clin.aclaramiento, undefined, fechaReferencia, aclaramientoAproximadoFiltrado);

  return medicacion.map((f) => {
    const datos: DatosFarmacoUi = {
      idFarmaco: f.idFarmaco,
      nombreComercial: f.nombreComercial,
      principiosActivos: f.principiosActivos,
      idRegla: f.idRegla,
      via: f.via,
      horas: f.horas,
      ...(f.dosisMg !== undefined ? { dosisMg: f.dosisMg } : {}),
      ...(f.diaSemana !== undefined ? { proximaDosisSemanal: proximaDosisSemanal(f.diaSemana, refFecha) } : {}),
      ...(f.fechaUltimaDosis ? { fechaUltimaDosis: new Date(`${f.fechaUltimaDosis}T00:00`) } : {}),
      ...(f.periodicidadDias !== undefined ? { periodicidadDias: f.periodicidadDias } : {}),
      ...(f.insulinaBasalUi !== undefined ? { insulinaBasalUi: f.insulinaBasalUi } : {}),
      ...(f.insulinaNocheUi !== undefined ? { insulinaNocheUi: f.insulinaNocheUi } : {}),
      ...(f.insulinaMananaUi !== undefined ? { insulinaMananaUi: f.insulinaMananaUi } : {}),
      ...(f.tipoHbpm ? { tipoHbpm: f.tipoHbpm } : {}),
      ...(f.requiereConfirmacionCatalogo ? { requiereConfirmacionCatalogo: true } : {}),
      ...(f.textoPaciente ? { textoPacienteOverride: f.textoPaciente } : {}),
      ...(f.textoAnestesiologo ? { textoAnestesiologoOverride: f.textoAnestesiologo } : {}),
    };
    const evaluado = evaluarCombinacionUi(datos, f.idReglas, ctx, clin);
    // Confirmación del anestesiólogo (§12): si se ha confirmado con su nombre, la
    // hoja muestra la pauta; si se marcó «le llamaremos», sigue como no confirmado.
    const resultado = f.confirmadoPor ? { ...evaluado, confirmadoPor: f.confirmadoPor } : evaluado;
    const meta = metadatosPlazo(f.idRegla, f.dosisMg, f.tipoHbpm);
    const ins = insulinaDe(f);
    const dosisFrecuencia = textoDosisFrecuencia(f);
    return { resultado, horas: f.horas, meta, variante: varianteMantener(f), ...(ins ? { ins } : {}), ...(dosisFrecuencia ? { dosisFrecuencia } : {}) };
  });
}
