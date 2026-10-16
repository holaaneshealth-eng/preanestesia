/**
 * Cardiovasculares — docs/documento_fuente.md §8.10 (v4).
 * - IECA/ARA-II: no tomar el día de la intervención (la toma de la noche anterior
 *   sí se hace), salvo IC con disfunción sistólica, infarto reciente o
 *   proteinuria/nefropatía (mantener). Si falta info, preguntar.
 * - Diuréticos: no tomar la dosis de la mañana de la intervención.
 * - Betabloqueantes, calcioantagonistas, nitratos, amiodarona, digoxina,
 *   estatinas: mantener.
 */
import type { ContextoReglas, ResultadoFarmaco } from '../tipos.ts';
import { TEXTO_MANTENER, plazoDesdeHoras, aplicarHoraAsumida } from './motor.ts';
import { fechaLarga, horaReloj } from '../fechas/ultimaToma.ts';

/** Última toma el día previo a la intervención, a la hora habitual más tardía de la pauta. */
function ultimaTomaDiaPrevio(ctx: ContextoReglas): Date {
  const d = new Date(ctx.fechaHoraIntervencion);
  d.setDate(d.getDate() - 1);
  const horas = [...(ctx.pautaFarmaco?.horas ?? ['09:00'])].sort();
  const [hh, mm] = (horas[horas.length - 1] ?? '09:00').split(':').map((x) => parseInt(x, 10));
  d.setHours(hh ?? 9, mm ?? 0, 0, 0);
  return d;
}

const FUENTE = 'docs/documento_fuente.md §8.10 (ESC 2022)';

export interface EntradaIecaAra2 {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Excepciones que obligan a mantener. undefined si no se conoce. */
  icDisfuncionSistolica?: boolean;
  infartoReciente?: boolean;
  proteinuriaONefropatia?: boolean;
}

export function reglaIecaAra2(e: EntradaIecaAra2, ctx: ContextoReglas): ResultadoFarmaco {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
  };

  const mantiene =
    e.icDisfuncionSistolica === true ||
    e.infartoReciente === true ||
    e.proteinuriaONefropatia === true;

  // Si todas las excepciones se conocen y son false → suspender 24 h.
  const conocidas =
    e.icDisfuncionSistolica !== undefined &&
    e.infartoReciente !== undefined &&
    e.proteinuriaONefropatia !== undefined;

  if (mantiene) {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'IECA/ARA-II: mantener (IC con disfunción sistólica, infarto reciente o proteinuria/nefropatía)',
      requiereConfirmacion: false,
    };
  }

  if (!conocidas) {
    // Punto 8 (5.1): sin saber si hay IC/infarto/nefropatía, la pauta por defecto es
    // no tomar la dosis de la mañana (pauta estándar de IECA/ARA-II cuando no hay
    // indicación de mantener); punto amarillo para confirmar la indicación.
    const ultima = ultimaTomaDiaPrevio(ctx);
    const tieneTomaNoct = (ctx.pautaFarmaco?.horas ?? []).some((h) => parseInt((h.split(':')[0] ?? '0'), 10) >= 18);
    const col = tieneTomaNoct ? ' (la toma de la noche anterior sí)' : '';
    return {
      ...base,
      accion: 'suspender',
      fechaHoraUltimaToma: ultima,
      textoPaciente: `No lo tome el día de la intervención${col}. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
      reglaAplicada: 'IECA/ARA-II: sin datos de IC/infarto/nefropatía → no tomar el día de la intervención (pauta por defecto)',
      requiereConfirmacion: false,
      textoAnestesiologo: 'No consta IC con disfunción sistólica, infarto reciente ni proteinuria/nefropatía: pauta por defecto (no tomar el día de la IQ); confirmar si procede mantener.',
      puntoValidacion: { tipo: 'validar', motivo: 'IECA/ARA-II: confirmar si hay IC/infarto/nefropatía (mantener) o no (no tomar el día de la IQ).' },
    };
  }

  const ultima = ultimaTomaDiaPrevio(ctx);
  // El paréntesis de la toma nocturna solo tiene sentido si el paciente tiene una
  // toma por la noche (hora ≥ 18:00) el día previo.
  const tieneTomaNocturna = (ctx.pautaFarmaco?.horas ?? []).some((h) => {
    const hh = parseInt((h.split(':')[0] ?? '0'), 10);
    return hh >= 18;
  });
  const coletilla = tieneTomaNocturna ? ' (la toma de la noche anterior sí)' : '';
  return {
    ...base,
    accion: 'suspender',
    fechaHoraUltimaToma: ultima,
    textoPaciente: `No lo tome el día de la intervención${coletilla}. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
    reglaAplicada: 'IECA/ARA-II: no tomar el día de la intervención',
    requiereConfirmacion: false,
  };
}

export interface EntradaSacubitriloValsartan {
  idFarmaco: string;
  nombreComercial: string;
}

/**
 * Sacubitrilo/valsartán (§8.10). Punto 8 (5.2): se propone suspender 24 h antes
 * (vida media larga; se trata como IECA/ARA-II de alto efecto) y queda un punto
 * amarillo para confirmar la suspensión.
 */
export function reglaSacubitriloValsartan(e: EntradaSacubitriloValsartan, ctx: ContextoReglas): ResultadoFarmaco {
  const plazo = plazoDesdeHoras(ctx, 24);
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['sacubitrilo', 'valsartan'],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: 'Sacubitrilo/valsartán: suspender 24 h antes (vida media larga; se trata como IECA/ARA-II de alto efecto)',
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Sacubitrilo/valsartán: se propone suspender 24 h antes; confirmar la suspensión.',
    puntoValidacion: { tipo: 'validar', motivo: 'Sacubitrilo/valsartán: se propone suspender 24 h antes; confirmar.' },
  }, plazo);
}

export interface EntradaDiuretico {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

export function reglaDiuretico(e: EntradaDiuretico, ctx: ContextoReglas): ResultadoFarmaco {
  const ultima = ultimaTomaDiaPrevio(ctx);
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: ultima,
    textoPaciente: `No tome la dosis de la mañana del día de la intervención. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
    reglaAplicada: 'Diuréticos: no tomar la dosis de la mañana de la intervención',
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}
