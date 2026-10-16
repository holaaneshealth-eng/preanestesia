/**
 * ACOD (dabigatrán, rivaroxabán, apixabán, edoxabán) —
 * docs/documento_fuente.md §8.2 (Decisión 1).
 * - Oftalmología de riesgo bajo: no suspender.
 * - Riesgo hemorrágico bajo sin neuroaxial ni bloqueo profundo: 48 h.
 * - Riesgo hemorrágico alto, neuroaxial o bloqueo profundo: 72 h.
 * - Dabigatrán con neuroaxial: 72 h (CrCl>80), 96 h (50-80), 120 h (<50).
 *   Fuera de neuroaxial: +24 h (CrCl 50-80), +48 h (CrCl<50) sobre el base.
 * - Anti-Xa con neuroaxial y CrCl<30: 96 h. Fuera de neuroaxial: +24 h (CrCl<30).
 * - Sin aclaramiento: requiere confirmación indicando qué dato falta (R12.5).
 */
import type { ContextoReglas, ResultadoFarmaco, PuntoValidacionFarmaco } from '../tipos.ts';
import { neuroaxialOProfundo, plazoDesdeHoras, aplicarHoraAsumida, TEXTO_MANTENER } from './motor.ts';

export type SubtipoAcod = 'dabigatran' | 'antixa';

const FUENTE = 'docs/documento_fuente.md §8.2 (EHRA 2021; protocolo del servicio)';

export interface EntradaAcod {
  idFarmaco: string;
  nombreComercial: string;
  principioActivo: string;
  subtipo: SubtipoAcod;
  /** true si cumple criterio de alto riesgo trombótico de §8.1 (p. ej. ictus < 3 meses). */
  altoRiesgoTromboticoConfirmar?: boolean;
}

export function reglaAcod(e: EntradaAcod, ctx: ContextoReglas): ResultadoFarmaco {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principioActivo],
    fuente: FUENTE,
  };

  // Oftalmología de riesgo bajo: no suspender.
  if (ctx.grupoOftalmologico === 'riesgo_bajo') {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'ACOD, oftalmología de riesgo bajo: no suspender',
      requiereConfirmacion: false,
    };
  }

  const conNeuroaxial = ctx.neuroaxial; // los tramos especiales aplican a neuroaxial
  const altoOProfundo = ctx.riesgoHemorragico === 'alto' || neuroaxialOProfundo(ctx);

  // Plazo base.
  let horas = altoOProfundo ? 72 : 48;
  let regla = `ACOD, ${altoOProfundo ? 'riesgo alto/neuroaxial/bloqueo profundo' : 'riesgo bajo'}: ${horas} h base`;

  // Ajustes por aclaramiento (punto 8, 1.1): si falta el aclaramiento, se aplica el
  // tramo MÁS LARGO (peor caso) y se deja una nota amarilla; si el aclaramiento es una
  // aproximación por el filtrado glomerular, también se avisa.
  const crcl = ctx.aclaramiento;
  const faltaAclaramiento = crcl === null;
  // Nota amarilla de función renal (1.1): se acumula para el punto de validación.
  let notaRenal: string | null = null;

  if (e.subtipo === 'dabigatran') {
    if (conNeuroaxial) {
      // Tramos fijos con neuroaxial (Decisión 1).
      if (faltaAclaramiento) {
        horas = 120; // peor caso (CrCl < 50)
        regla = 'Dabigatrán + neuroaxial, función renal no disponible: 120 h (supuesto más prudente)';
        notaRenal = 'función renal no disponible: tramo estimado con el supuesto más prudente (120 h); confirmar.';
      } else if (crcl > 80) {
        horas = 72;
        regla = 'Dabigatrán + neuroaxial, CrCl > 80: 72 h';
      } else if (crcl >= 50) {
        horas = 96;
        regla = 'Dabigatrán + neuroaxial, CrCl 50-80: 96 h';
      } else {
        horas = 120;
        regla = 'Dabigatrán + neuroaxial, CrCl < 50: 120 h';
      }
    } else {
      // Fuera de neuroaxial: base + ajuste.
      if (faltaAclaramiento) {
        horas += 48; // peor caso (CrCl < 50)
        regla += ' + 48 h (función renal no disponible: supuesto más prudente)';
        notaRenal = 'función renal no disponible: tramo estimado con el supuesto más prudente; confirmar.';
      } else if (crcl >= 50 && crcl <= 80) {
        horas += 24;
        regla += ' + 24 h (CrCl 50-80)';
      } else if (crcl < 50) {
        horas += 48;
        regla += ' + 48 h (CrCl < 50)';
      }
    }
  } else {
    // Anti-Xa (rivaroxabán, apixabán, edoxabán).
    if (conNeuroaxial) {
      if (faltaAclaramiento) {
        horas = 96; // peor caso (CrCl < 30)
        regla = 'Anti-Xa + neuroaxial, función renal no disponible: 96 h (supuesto más prudente)';
        notaRenal = 'función renal no disponible: tramo estimado con el supuesto más prudente (96 h); confirmar.';
      } else if (crcl < 30) {
        horas = 96;
        regla = 'Anti-Xa + neuroaxial, CrCl < 30: 96 h';
      }
      // CrCl >= 30 con neuroaxial: se mantiene el base 72 h.
    } else {
      if (faltaAclaramiento) {
        horas += 24; // peor caso (CrCl < 30)
        regla += ' + 24 h (función renal no disponible: supuesto más prudente)';
        notaRenal = 'función renal no disponible: tramo estimado con el supuesto más prudente; confirmar.';
      } else if (crcl < 30) {
        horas += 24;
        regla += ' + 24 h (CrCl < 30)';
      }
    }
  }

  // Nota si el aclaramiento es una aproximación por el filtrado glomerular (1.1).
  if (ctx.aclaramientoAproximadoFiltrado && !faltaAclaramiento) {
    notaRenal = 'tramo estimado con el filtrado glomerular apuntado (aproximación del aclaramiento); confirmar.';
  }

  const plazo = plazoDesdeHoras(ctx, horas, { permitirAdelanto: true });

  let resultado: ResultadoFarmaco = {
    ...base,
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: regla,
    requiereConfirmacion: false,
  };

  // Punto 8 (1.2): alto riesgo trombótico → se propone la pauta estándar del tramo
  // (sin cambiar a acenocumarol ni terapia puente, EHRA 2021/PAUSE) y queda un
  // punto ROJO para que el anestesiólogo valore el manejo.
  if (e.altoRiesgoTromboticoConfirmar) {
    resultado.reglaAplicada = `${regla} — alto riesgo trombótico (§8.1): no se cambia a acenocumarol ni terapia puente`;
    resultado.textoAnestesiologo =
      'Alto riesgo trombótico (§8.1): con ACOD no se recomienda cambiar a acenocumarol ni terapia puente (EHRA 2021/PAUSE). Valorar el manejo con hematología o cardiología.';
    resultado.puntoValidacion = {
      tipo: 'posponer',
      motivo: 'ACOD con alto riesgo trombótico (§8.1): se propone suspensión estándar del tramo; valorar el manejo con hematología o cardiología.',
    };
  } else if (notaRenal !== null) {
    // Punto 8 (1.1): nota amarilla por función renal estimada/aproximada.
    const punto: PuntoValidacionFarmaco = { tipo: 'validar', motivo: `ACOD: ${notaRenal}` };
    resultado.textoAnestesiologo = resultado.textoAnestesiologo ? `${resultado.textoAnestesiologo} ${notaRenal}` : notaRenal;
    resultado.puntoValidacion = punto;
  }

  // Nota informativa (§8.2): riesgo bajo, sin neuroaxial/profundo y CrCl > 50.
  if (
    ctx.riesgoHemorragico === 'bajo' &&
    !neuroaxialOProfundo(ctx) &&
    crcl !== null &&
    crcl > 50
  ) {
    const nota = 'Podría considerarse suspender solo 24 h.';
    resultado.textoAnestesiologo = resultado.textoAnestesiologo ? `${resultado.textoAnestesiologo} ${nota}` : nota;
  }

  // Punto 8 (11.1): hora de toma asumida → punto amarillo (si no hay uno más restrictivo).
  resultado = aplicarHoraAsumida(resultado, plazo);
  return resultado;
}
