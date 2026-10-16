/**
 * Psicofármacos y neurología — docs/documento_fuente.md §8.7.
 * Aquí: litio (suspender según riesgo quirúrgico: bajo 24 h, intermedio 48 h,
 * alto 72 h). IMAO y demás se añadirán con sus notas de anestesia segura.
 */
import type { ContextoReglas, ResultadoFarmaco, RiesgoCardiovascular } from '../tipos.ts';
import { plazoDesdeHoras, aplicarHoraAsumida } from './motor.ts';

const FUENTE = 'docs/documento_fuente.md §8.7 (protocolo del servicio)';

const HORAS_LITIO: Record<RiesgoCardiovascular, number> = {
  bajo: 24,
  intermedio: 48,
  alto: 72,
};

/** Nota "anestesia segura con IMAO" (§8.7), común a IMAO irreversibles, moclobemida e IMAO-B. */
const NOTA_ANESTESIA_SEGURA_IMAO =
  'Anestesia segura con IMAO: evitar meperidina, tramadol, metadona, efedrina, anfetaminas, ' +
  'linezolid y azul de metileno; preferir morfina (fentanilo y remifentanilo con precaución a ' +
  'dosis bajas), droperidol, dexametasona (ondansetrón con precaución) y vasopresores directos ' +
  '(fenilefrina, adrenalina, noradrenalina).';

export interface EntradaImao {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

/**
 * IMAO irreversibles (tranilcipromina, fenelzina, isocarboxazida). Punto 8 (10.1):
 * se propone MANTENER por defecto con la nota de «anestesia segura con IMAO» como
 * pauta operativa, y se recomienda coordinar con psiquiatría la posible retirada
 * 10-14 días; punto amarillo.
 */
export function reglaImaoIrreversible(e: EntradaImao): ResultadoFarmaco {
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente:
      'Siga tomándolo como siempre, salvo que su psiquiatra o el anestesiólogo le indiquen retirarlo antes de la intervención.',
    reglaAplicada: 'IMAO irreversible: mantener por defecto con anestesia segura con IMAO; valorar retirada 10-14 días con psiquiatría',
    fuente: 'docs/documento_fuente.md §8.7',
    requiereConfirmacion: false,
    textoAnestesiologo: `Mantener con anestesia segura con IMAO, o coordinar la retirada (10-14 días) con su psiquiatra. ${NOTA_ANESTESIA_SEGURA_IMAO}`,
    puntoValidacion: { tipo: 'validar', motivo: 'IMAO irreversible: confirmar retirada 10-14 días con psiquiatría o anestesia segura con IMAO.' },
  };
}

/** Moclobemida (IMAO-A reversible): suspender 24 h + misma nota. */
export function reglaMoclobemida(e: EntradaImao, ctx: ContextoReglas): ResultadoFarmaco {
  const plazo = plazoDesdeHoras(ctx, 24);
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['moclobemida'],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: 'Moclobemida (IMAO-A reversible): suspender 24 h',
    fuente: 'docs/documento_fuente.md §8.7',
    requiereConfirmacion: false,
    textoAnestesiologo: NOTA_ANESTESIA_SEGURA_IMAO,
  }, plazo);
}

/** IMAO-B antiparkinsonianos (rasagilina, selegilina, safinamida): mantener + nota. */
export function reglaImaoB(e: EntradaImao): ResultadoFarmaco {
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'mantener',
    textoPaciente: 'Siga tomándolo como siempre, también el día de la intervención, con un sorbo de agua.',
    reglaAplicada: 'IMAO-B antiparkinsoniano: mantener',
    fuente: 'docs/documento_fuente.md §8.7',
    requiereConfirmacion: false,
    textoAnestesiologo: NOTA_ANESTESIA_SEGURA_IMAO,
  };
}

export interface EntradaLitio {
  idFarmaco: string;
  nombreComercial: string;
}

export function reglaLitio(e: EntradaLitio, ctx: ContextoReglas): ResultadoFarmaco {
  const horas = HORAS_LITIO[ctx.riesgoCardiovascular];
  const plazo = plazoDesdeHoras(ctx, horas);
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['litio'],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: `Litio: suspender ${horas} h (cirugía de riesgo ${ctx.riesgoCardiovascular})`,
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Controlar litemia y función renal; reanudar con precaución.',
  }, plazo);
}
