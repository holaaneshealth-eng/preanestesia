/**
 * Inmunosupresores y reumatología — docs/documento_fuente.md §8.8 (ACR 2022).
 * - Azatioprina/ciclosporina/tacrolimus/micofenolato: mantener por trasplante o
 *   enfermedad sistémica grave; por autoinmune con riesgo alto → requiere
 *   confirmación (la enfermera no valora ese riesgo).
 * - Metotrexato <= 20 mg/semana: mantener; > 20 mg/semana (cirugía mayor, alto
 *   riesgo de infección o función renal alterada) → requiere confirmación.
 * - Leflunomida/hidroxicloroquina/sulfasalazina: mantener.
 * - Inhibidores JAK (tofacitinib, baricitinib, upadacitinib): suspender 3 días.
 * - Biológicos: planificación por ciclo; requiere confirmación.
 */
import type { ContextoReglas, ResultadoFarmaco } from '../tipos.ts';
import { plazoDesdeDias, aplicarHoraAsumida, TEXTO_MANTENER } from './motor.ts';

const FUENTE = 'docs/documento_fuente.md §8.8 (ACR 2022)';

export type IndicacionInmuno = 'trasplante' | 'enfermedad_sistemica_grave' | 'autoinmune';

export interface EntradaInmunosupresorClasico {
  idFarmaco: string;
  nombreComercial: string;
  principio: string; // azatioprina, ciclosporina, tacrolimus, micofenolato
  indicacion?: IndicacionInmuno;
}

export function reglaInmunosupresorClasico(e: EntradaInmunosupresorClasico): ResultadoFarmaco {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
  };
  if (e.indicacion === 'trasplante' || e.indicacion === 'enfermedad_sistemica_grave') {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: `${e.principio}: mantener (${e.indicacion})`,
      requiereConfirmacion: false,
    };
  }
  // Punto 8 (7.1): autoinmune o indicación desconocida → se propone MANTENER (criterio
  // ACR 2022 para la mayoría de clásicos salvo indicación en contra); punto amarillo.
  return {
    ...base,
    accion: 'mantener',
    textoPaciente: TEXTO_MANTENER,
    reglaAplicada: `${e.principio}: por enfermedad autoinmune, mantener por defecto (ACR 2022)`,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Inmunosupresor por enfermedad autoinmune: mantener por defecto (ACR 2022); valorar suspender 1-2 días según la cirugía o el riesgo de infección.',
    puntoValidacion: { tipo: 'validar', motivo: `${e.principio} (autoinmune): se propone mantener; confirmar mantener o suspender 1-2 días.` },
  };
}

export interface EntradaMetotrexato {
  idFarmaco: string;
  nombreComercial: string;
  dosisSemanalMg: number;
}

export function reglaMetotrexato(e: EntradaMetotrexato): ResultadoFarmaco {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['metotrexato'],
    fuente: FUENTE,
  };
  if (e.dosisSemanalMg <= 20) {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'Metotrexato ≤ 20 mg/semana: mantener',
      requiereConfirmacion: false,
    };
  }
  // Punto 8 (7.2): se propone MANTENER (ACR 2022 recomienda mantener MTX en cirugía
  // electiva incluso a dosis altas, salvo función renal alterada); punto amarillo.
  return {
    ...base,
    accion: 'mantener',
    textoPaciente: TEXTO_MANTENER,
    reglaAplicada: 'Metotrexato > 20 mg/semana: mantener (ACR 2022, cirugía electiva)',
    requiereConfirmacion: false,
    textoAnestesiologo: 'Metotrexato a dosis alta: mantener por defecto (ACR 2022); valorar omitir 1-2 dosis si cirugía de alto riesgo de infección o función renal alterada.',
    puntoValidacion: { tipo: 'validar', motivo: 'Metotrexato > 20 mg/semana: se propone mantener (ACR); confirmar mantener u omitir 1-2 dosis.' },
  };
}

export interface EntradaSimpleReuma {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

/** Leflunomida, hidroxicloroquina, sulfasalazina: mantener (ACR 2022). */
export function reglaFameMantener(e: EntradaSimpleReuma): ResultadoFarmaco {
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente: TEXTO_MANTENER,
    reglaAplicada: `${e.principio}: mantener (ACR 2022)`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}

/** Inhibidores JAK (tofacitinib, baricitinib, upadacitinib): suspender 3 días. */
export function reglaJak(e: EntradaSimpleReuma, ctx: ContextoReglas): ResultadoFarmaco {
  const plazo = plazoDesdeDias(ctx, 3);
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: `Inhibidor JAK (${e.principio}): suspender 3 días`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  }, plazo);
}

export interface EntradaBiologico {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Días del ciclo (p.ej. adalimumab 14). */
  periodicidadDias?: number;
  /** Fecha de la última dosis, si se conoce. */
  fechaUltimaDosis?: Date;
}

/** Biológicos (anti-TNF, rituximab, tocilizumab, abatacept...): planificación por ciclo; confirmación. */
export function reglaBiologico(e: EntradaBiologico, intervencion?: Date): ResultadoFarmaco {
  // Punto 8 (7.3): se propone programar la cirugía al final del intervalo de dosis
  // (omitir idealmente una) y se da la fecha de la última dosis como referencia; el
  // paciente mantiene su pauta hasta que se le indique. Punto amarillo.
  const res: ResultadoFarmaco = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente:
      'Siga con su tratamiento biológico como siempre, salvo que el anestesiólogo le indique otra cosa al ajustar la fecha de la operación.',
    reglaAplicada: 'Biológico: programar la cirugía al final del ciclo (idealmente omitiendo una dosis)',
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo:
      'Programar al final del ciclo (p. ej. adalimumab/2 semanas: operar justo antes de la siguiente dosis; ' +
      'rituximab: esperar 6 meses desde la infusión si es posible).',
    puntoValidacion: { tipo: 'validar', motivo: 'Biológico: se propone programar la cirugía al final del ciclo; confirmar el encaje con el intervalo de dosis.' },
  };
  if (e.fechaUltimaDosis === undefined) {
    res.textoAnestesiologo += ' No consta la fecha de la última dosis: confirmarla para encajar la cirugía en el ciclo.';
    return res;
  }
  // Con fecha y periodicidad, se calcula en qué punto del ciclo cae la cirugía.
  if (e.periodicidadDias !== undefined && intervencion !== undefined) {
    const diasDesde = Math.round((intervencion.getTime() - e.fechaUltimaDosis.getTime()) / 86_400_000);
    const puntoCiclo = diasDesde % e.periodicidadDias;
    const proxima = e.periodicidadDias - puntoCiclo;
    const mitad = puntoCiclo > 0 && proxima > 0;
    res.textoAnestesiologo +=
      ` La cirugía cae a ${diasDesde} días de la última dosis (ciclo de ${e.periodicidadDias} días): ` +
      `${mitad ? 'a mitad de ciclo; próxima dosis en ' + proxima + ' días — valorar reprogramar cerca de la siguiente dosis' : 'al final del ciclo'}.`;
  }
  return res;
}
