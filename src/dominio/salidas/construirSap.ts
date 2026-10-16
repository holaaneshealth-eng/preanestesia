/**
 * Construye el texto de SAP (§10.1). El texto contiene los antecedentes patológicos
 * y quirúrgicos y el resultado del consentimiento del paso 10 (2026-10-04); el resto
 * de la valoración (alergias, hábitos, medicación, vía aérea, escalas, ASA, plan,
 * pruebas) se rellena con los desplegables del propio SAP. Sin límite de caracteres.
 * Mantiene «Copiar» y «solo ASCII» a través de generarSap.
 */
import { generarSap, type BloqueSap, type OpcionesSap, type ResultadoSap } from './sap.ts';

/** Estado del consentimiento del paso 10 (§10, R3.2.29) para el texto de SAP. */
export type ConsentimientoSap =
  | { estado: 'entregado'; fecha?: string }
  | { estado: 'pendiente_entregar' }
  | { estado: 'no_procede' };

export interface EntradaSap {
  /** Antecedentes patológicos: cada enfermedad marcada con sus respuestas relevantes (§5.16). */
  antecedentesPatologicos: string[];
  /** Antecedentes quirúrgicos: intervención previa con año, tipo de anestesia e incidencias. */
  antecedentesQuirurgicos: string[];
  /** Hemoglobina (g/dL) de la analítica del paso de pruebas, si se ha apuntado. */
  hemoglobina?: number;
  /** Filtrado glomerular (mL/min/1,73 m²) de la analítica, si se ha apuntado. */
  filtradoGlomerular?: number;
  /** Fecha (dd/mm/aaaa) de la analítica, para acompañar a Hb/FG si se conoce. */
  fechaAnalitica?: string;
  /** AUDIT-C: solo si se ha completado (puntuación + resultado). */
  auditC?: { puntuacion: number; positivo: boolean };
  /** HEMSTOP: solo si se ha rellenado (puntuación + resultado). */
  hemstop?: { puntuacion: number; positivo: boolean };
  /** Consentimiento del paso 10 (§10, 2026-10-04). Si falta, no se escribe la línea. */
  consentimiento?: ConsentimientoSap;
}

/** Línea de consentimiento para el SAP (§10.1), según su estado. */
function lineaConsentimiento(c: ConsentimientoSap): string {
  if (c.estado === 'entregado') return `Consentimiento: entregado y explicado${c.fecha ? ` (${c.fecha})` : ''}`;
  if (c.estado === 'pendiente_entregar') return 'Consentimiento: pendiente de entregar';
  return 'Consentimiento: no procede';
}

export function construirSap(e: EntradaSap, opciones: OpcionesSap = {}): ResultadoSap {
  // Analítica: hemoglobina y filtrado glomerular, solo si se han apuntado (con fecha si la hay).
  const analitica: string[] = [];
  if (e.hemoglobina !== undefined) analitica.push(`Hb ${String(e.hemoglobina).replace('.', ',')} g/dL`);
  if (e.filtradoGlomerular !== undefined) analitica.push(`FG ${e.filtradoGlomerular} mL/min/1,73 m²`);
  const lineaAnalitica = analitica.length > 0
    ? [`Analitica: ${analitica.join(', ')}${e.fechaAnalitica ? ` (${e.fechaAnalitica})` : ''}.`]
    : [];

  // Sin cabecera (decisión del servicio, fase ágil): el texto empieza por los AP.
  const bloques: BloqueSap[] = [
    { clave: 'antecedentes_patologicos', lineas: e.antecedentesPatologicos.length > 0 ? [`AP: ${e.antecedentesPatologicos.join('. ')}.`] : ['AP: sin antecedentes patologicos relevantes.'] },
    { clave: 'antecedentes_quirurgicos', lineas: e.antecedentesQuirurgicos.length > 0 ? [`AQ: ${e.antecedentesQuirurgicos.join('; ')}.`] : ['AQ: sin intervenciones previas.'] },
    { clave: 'analitica', lineas: lineaAnalitica },
    // AUDIT-C y HEMSTOP: solo si se han rellenado (puntuación + resultado); si no, nada.
    { clave: 'audit_c', lineas: e.auditC ? [`AUDIT-C: ${e.auditC.puntuacion} (${e.auditC.positivo ? 'positivo' : 'negativo'}).`] : [] },
    { clave: 'hemstop', lineas: e.hemstop ? [`HEMSTOP: ${e.hemstop.puntuacion} (${e.hemstop.positivo ? 'positivo' : 'negativo'}).`] : [] },
    { clave: 'consentimiento', lineas: e.consentimiento ? [lineaConsentimiento(e.consentimiento)] : [] },
  ];
  return generarSap(bloques, opciones);
}
