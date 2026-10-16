/**
 * Antivitamina K (warfarina, acenocumarol) — docs/documento_fuente.md §8.1.
 * - Oftalmología de riesgo bajo o riesgo hemorrágico mínimo: no suspender (verificar INR).
 * - Resto: suspender warfarina 5 días, acenocumarol 3 días.
 * - Terapia puente (alto riesgo tromboembólico): enoxaparina 1 mg/kg/12 h
 *   (1 mg/kg/24 h si CrCl < 30), última dosis la mañana del día previo.
 *   Siempre requiere confirmación.
 */
import type { ContextoReglas, ResultadoFarmaco } from '../tipos.ts';
import { plazoDesdeDias, aplicarHoraAsumida } from './motor.ts';
import { fechaLarga } from '../fechas/ultimaToma.ts';

const FUENTE = 'docs/documento_fuente.md §8.1 (protocolo del servicio; ESC 2022)';

export type Avk = 'warfarina' | 'acenocumarol';
const DIAS_AVK: Record<Avk, number> = { warfarina: 5, acenocumarol: 3 };

export interface EntradaAvk {
  idFarmaco: string;
  nombreComercial: string;
  principio: Avk;
  /** true si el paciente cumple algún criterio de alto riesgo tromboembólico (§8.1). */
  altoRiesgoTromboembolico: boolean;
  /** true si es portador de válvula mecánica o stent: ninguna suspensión sin confirmación (§8.3). */
  portadorValvulaMecanicaOStent?: boolean;
}

export interface ResultadoAvk {
  farmaco: ResultadoFarmaco;
  /** Pauta de puente calculada (solo si aplica), para las notas del anestesiólogo. */
  puente?: {
    dosisMgPorToma: number;
    intervaloHoras: number;
    textoAnestesiologo: string;
  };
}

export function reglaAvk(e: EntradaAvk, ctx: ContextoReglas): ResultadoAvk {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
  };

  // No suspender en oftalmología de riesgo bajo o riesgo hemorrágico mínimo.
  if (ctx.grupoOftalmologico === 'riesgo_bajo' || ctx.riesgoHemorragico === 'minimo') {
    return {
      farmaco: {
        ...base,
        accion: 'mantener',
        textoPaciente:
          'No suspenda este anticoagulante. Se comprobará que su último control de INR está en rango.',
        reglaAplicada: 'AVK, oftalmología riesgo bajo / hemorrágico mínimo: no suspender (verificar INR)',
        requiereConfirmacion: false,
      },
    };
  }

  const dias = DIAS_AVK[e.principio];
  const plazo = plazoDesdeDias(ctx, dias);

  // Punto 8 (2.1): terapia puente con alto riesgo tromboembólico → se propone la
  // pauta ya calculada (suspensión + enoxaparina por peso) y queda un punto ROJO
  // para confirmar la dosis y el riesgo trombótico.
  if (e.altoRiesgoTromboembolico) {
    const dosisPorToma = Math.round(ctx.pesoKg * 1); // 1 mg/kg
    const intervalo = ctx.aclaramiento !== null && ctx.aclaramiento < 30 ? 24 : 12;
    // Última dosis del puente: la mañana del día previo a la intervención.
    const ultimaPuente = new Date(ctx.fechaHoraIntervencion);
    ultimaPuente.setDate(ultimaPuente.getDate() - 1);
    return {
      farmaco: aplicarHoraAsumida({
        ...base,
        accion: 'suspender',
        fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
        textoPaciente: plazo.textoPaciente,
        reglaAplicada: `AVK con alto riesgo tromboembólico: suspender ${dias} días + terapia puente con enoxaparina`,
        requiereConfirmacion: false,
        textoAnestesiologo: `Terapia puente: enoxaparina ${dosisPorToma} mg SC cada ${intervalo} h (1 mg/kg, peso ${ctx.pesoKg} kg${intervalo === 24 ? '; CrCl < 30 → cada 24 h' : ''}); última dosis la mañana del ${fechaLarga(ultimaPuente)} (24 h antes). Confirmar dosis y riesgo trombótico.`,
        puntoValidacion: { tipo: 'posponer', motivo: `AVK con terapia puente: confirmar la dosis de enoxaparina (${dosisPorToma} mg/${intervalo} h) y el riesgo trombótico.` },
      }, plazo),
      puente: {
        dosisMgPorToma: dosisPorToma,
        intervaloHoras: intervalo,
        textoAnestesiologo: `enoxaparina ${dosisPorToma} mg cada ${intervalo} h`,
      },
    };
  }

  // Punto 8 (2.2): portador de válvula mecánica o stent → se propone la suspensión
  // estándar (INR < 1,5; < 1,4 si neuroaxial) y, si es válvula mecánica, se añade la
  // recomendación de puente; queda un punto ROJO para confirmar el manejo.
  if (e.portadorValvulaMecanicaOStent) {
    return {
      farmaco: aplicarHoraAsumida({
        ...base,
        accion: 'suspender',
        fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
        textoPaciente: plazo.textoPaciente,
        reglaAplicada: `AVK ${e.principio}: portador de válvula mecánica/stent → suspensión estándar ${dias} días (§8.3)`,
        requiereConfirmacion: false,
        textoAnestesiologo: 'Portador de válvula mecánica o stent: suspensión estándar (INR < 1,5; < 1,4 si neuroaxial); si válvula mecánica, valorar terapia puente. Confirmar el manejo del anticoagulante.',
        puntoValidacion: { tipo: 'posponer', motivo: `AVK ${e.principio}: portador de válvula mecánica/stent; confirmar el manejo del anticoagulante.` },
      }, plazo),
    };
  }

  // Suspensión estándar.
  return {
    farmaco: aplicarHoraAsumida({
      ...base,
      accion: 'suspender',
      fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
      textoPaciente: plazo.textoPaciente,
      reglaAplicada: `AVK ${e.principio}: suspender ${dias} días (INR < 1,5 el día de la intervención)`,
      requiereConfirmacion: false,
      textoAnestesiologo: 'INR menor de 1,5 el día de la intervención; 1,4 o menos si hay técnica neuroaxial.',
    }, plazo),
  };
}
