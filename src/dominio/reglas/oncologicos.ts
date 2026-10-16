/**
 * Oncológicos — docs/documento_fuente.md §8.9.
 * - Inhibidores de tirosina cinasa y anticuerpos anti-receptores de crecimiento
 *   (imatinib, dasatinib, nilotinib, erlotinib, sorafenib, sunitinib, cetuximab):
 *   continuar hasta la cirugía.
 * - Antiangiogénicos sistémicos (bevacizumab, aflibercept oncológico,
 *   ramucirumab): última dosis hace < 6-8 semanas → alerta de diferir, requiere
 *   confirmación. El aflibercept intravítreo NO activa esta regla.
 */
import type { ResultadoFarmaco, Alerta } from '../tipos.ts';
import { TEXTO_MANTENER } from './motor.ts';

const FUENTE = 'docs/documento_fuente.md §8.9';

export interface EntradaOncologicoSimple {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

/** Inhibidores de tirosina cinasa / anti-receptores: continuar hasta la cirugía. */
export function reglaTirosinaCinasa(e: EntradaOncologicoSimple): ResultadoFarmaco {
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente: TEXTO_MANTENER,
    reglaAplicada: `${e.principio}: continuar hasta la cirugía`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}

export interface EntradaAntiangiogenico {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Semanas desde la última dosis, si se conoce. */
  semanasDesdeUltimaDosis?: number;
  /** true si es aflibercept intravítreo (no activa la regla). */
  intravitreo?: boolean;
}

export interface ResultadoAntiangiogenico {
  farmaco: ResultadoFarmaco;
  alerta?: Alerta;
}

export function reglaAntiangiogenico(e: EntradaAntiangiogenico): ResultadoAntiangiogenico {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
  };

  if (e.intravitreo) {
    return {
      farmaco: {
        ...base,
        accion: 'mantener',
        textoPaciente: TEXTO_MANTENER,
        reglaAplicada: 'Aflibercept intravítreo: mantener (no activa la regla de antiangiogénicos sistémicos)',
        requiereConfirmacion: false,
      },
    };
  }

  const reciente = e.semanasDesdeUltimaDosis === undefined || e.semanasDesdeUltimaDosis < 8;
  if (reciente) {
    // Punto 8 (8.1): se propone recomendar diferir hasta ≥ 6-8 semanas; si falta la
    // fecha, se asume reciente (supuesto más prudente). El paciente mantiene su
    // tratamiento hasta que se le indique. Punto ROJO.
    const sinFecha = e.semanasDesdeUltimaDosis === undefined;
    return {
      farmaco: {
        ...base,
        accion: 'mantener',
        textoPaciente:
          'Avise a su oncólogo de la fecha de la operación antes de recibir la siguiente dosis.',
        reglaAplicada: `Antiangiogénico sistémico: última dosis < 6-8 semanas${sinFecha ? ' (fecha desconocida: se asume reciente)' : ''} → valorar diferir la cirugía`,
        requiereConfirmacion: false,
        textoAnestesiologo: `Antiangiogénico sistémico reciente${sinFecha ? ' (no consta la fecha de la última dosis: se asume reciente)' : ''}: valorar diferir la cirugía programada ≥ 6-8 semanas desde la última dosis.`,
        puntoValidacion: { tipo: 'posponer', motivo: 'Antiangiogénico sistémico reciente: valorar diferir la cirugía al menos 6-8 semanas desde la última dosis.' },
      },
      alerta: {
        gravedad: 'roja',
        mensaje: 'Antiangiogénico sistémico reciente: retrasar la cirugía programada al menos 6-8 semanas desde la última dosis.',
        origen: 'oncológicos §8.9',
        soloAnestesiologo: false,
      },
    };
  }

  return {
    farmaco: {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'Antiangiogénico sistémico: ≥ 8 semanas desde la última dosis',
      requiereConfirmacion: false,
    },
  };
}
