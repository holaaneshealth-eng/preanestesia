/**
 * Antidiabéticos e insulina — docs/documento_fuente.md §8.5 (Decisiones 5, 6, 8).
 * Cubre: metformina, sulfonilureas, glinidas, DPP-4, pioglitazona, SGLT2, GLP-1
 * semanal y diario, bomba de insulina y la combinación fija insulina basal+GLP-1.
 */
import type { ContextoReglas, ResultadoFarmaco } from '../tipos.ts';
import { startOfDay, endOfDay } from '../fechas/plazos.ts';
import { fechaLarga, horaReloj } from '../fechas/ultimaToma.ts';
import { plazoDesdeDias, aplicarHoraAsumida } from './motor.ts';

const FUENTE = 'docs/documento_fuente.md §8.5 (protocolo de preanestesia en diabéticos; CPOC)';

// ————————————— Metformina —————————————

export interface EntradaMetformina {
  idFarmaco: string;
  nombreComercial: string;
  contrasteYodadoPrevisto?: boolean;
}

export function reglaMetformina(e: EntradaMetformina, ctx: ContextoReglas): ResultadoFarmaco {
  const intervencion = ctx.fechaHoraIntervencion;
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['metformina'],
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
  if (e.contrasteYodadoPrevisto) {
    return {
      ...base,
      accion: 'suspender',
      textoPaciente: 'Deje de tomarla 24-48 h antes por el contraste yodado previsto.',
      reglaAplicada: 'Metformina con contraste yodado: suspender 24-48 h antes',
    };
  }
  // "No tomar el día de la intervención": última toma el día previo a su hora habitual más tardía.
  const ultima = new Date(intervencion);
  ultima.setDate(ultima.getDate() - 1);
  const horas = [...(ctx.pautaFarmaco?.horas ?? ['09:00'])].sort();
  const [hh, mm] = (horas[horas.length - 1] ?? '09:00').split(':').map((x) => parseInt(x, 10));
  ultima.setHours(hh ?? 9, mm ?? 0, 0, 0);
  return {
    ...base,
    accion: 'suspender',
    fechaHoraUltimaToma: ultima,
    textoPaciente: `No la tome el día de la intervención. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
    reglaAplicada: 'Metformina: no tomar el día de la intervención',
  };
}

// ————————————— Sulfonilureas, glinidas y pioglitazona (§8.5) —————————————
// "No tomar el día de la intervención": última toma el día previo a su hora
// habitual más tardía. Comparte la mecánica de la metformina (sin la excepción
// del contraste yodado).

/** Fecha/hora de la última toma el día previo a la intervención (hora habitual más tardía). */
function ultimaTomaDiaPrevio(intervencion: Date, horas: string[] | undefined): Date {
  const ultima = new Date(intervencion);
  ultima.setDate(ultima.getDate() - 1);
  const orden = [...(horas ?? ['09:00'])].sort();
  const [hh, mm] = (orden[orden.length - 1] ?? '09:00').split(':').map((x) => parseInt(x, 10));
  ultima.setHours(hh ?? 9, mm ?? 0, 0, 0);
  return ultima;
}

export interface EntradaAntidiabeticoSimple {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Grupo para el texto de la regla (sulfonilurea, glinida, pioglitazona). */
  grupo: 'sulfonilurea' | 'glinida' | 'pioglitazona';
}

const NOMBRE_GRUPO_ADO: Record<EntradaAntidiabeticoSimple['grupo'], string> = {
  sulfonilurea: 'Sulfonilurea',
  glinida: 'Glinida',
  pioglitazona: 'Pioglitazona',
};

/** Sulfonilureas, glinidas y pioglitazona: no tomar el día de la intervención (§8.5). */
export function reglaAntidiabeticoNoDiaIq(e: EntradaAntidiabeticoSimple, ctx: ContextoReglas): ResultadoFarmaco {
  const ultima = ultimaTomaDiaPrevio(ctx.fechaHoraIntervencion, ctx.pautaFarmaco?.horas);
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: ultima,
    textoPaciente: `No lo tome el día de la intervención. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
    reglaAplicada: `${NOMBRE_GRUPO_ADO[e.grupo]} (${e.principio}): no tomar el día de la intervención`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}

// ————————————— Inhibidores DPP-4 (§8.5) —————————————
// "Tomar hasta el día previo; no tomar la mañana de la intervención": la última
// toma permitida es la del día anterior (a su hora habitual más tardía).

export interface EntradaDpp4 {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

export function reglaDpp4(e: EntradaDpp4, ctx: ContextoReglas): ResultadoFarmaco {
  const ultima = ultimaTomaDiaPrevio(ctx.fechaHoraIntervencion, ctx.pautaFarmaco?.horas);
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: ultima,
    textoPaciente: `Puede tomarlo hasta el día anterior. No lo tome la mañana de la intervención. Su última toma será el ${fechaLarga(ultima)} a las ${horaReloj(ultima)}.`,
    reglaAplicada: `DPP-4 (${e.principio}): tomar hasta el día previo; no la mañana de la intervención`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  };
}

// ————————————— Combinación fija insulina basal + GLP-1 (§8.5) —————————————
// (degludec+liraglutida, glargina+lixisenatida): requiere confirmación, porque
// omitir el GLP-1 dejaría sin insulina basal.

export interface EntradaInsulinaGlp1Fija {
  idFarmaco: string;
  nombreComercial: string;
  principiosActivos: string[];
}

export function reglaInsulinaGlp1Fija(e: EntradaInsulinaGlp1Fija): ResultadoFarmaco {
  // Punto 8 (4.1): se propone tratar el componente basal como insulina basal (reducción
  // del 20 % la noche previa y la mañana, CPOC) sin omitir el conjunto; punto amarillo.
  return {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: e.principiosActivos,
    accion: 'ajustar',
    textoPaciente: `Póngase ${e.nombreComercial} al 80 % de su dosis habitual la noche anterior y la mañana de la intervención. No deje de ponerse la insulina.`,
    reglaAplicada: 'Combinación fija insulina basal + GLP-1: tratar el componente basal como insulina basal (reducción 20 % noche previa y mañana, CPOC)',
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Combinación fija insulina basal + GLP-1: se trata el componente basal como insulina basal (reducción 20 %); confirmar el manejo de la insulina.',
    puntoValidacion: { tipo: 'validar', motivo: 'Combinación fija insulina basal + GLP-1: se propone reducir la basal al 80 %; confirmar el manejo de la insulina.' },
  };
}

// ————————————— SGLT2 —————————————

export interface EntradaSglt2 {
  idFarmaco: string;
  nombreComercial: string;
  principio: string; // p.ej. empagliflozina, ertugliflozina
}

export function reglaSglt2(e: EntradaSglt2, ctx: ContextoReglas): ResultadoFarmaco {
  const dias = e.principio === 'ertugliflozina' ? 4 : 3;
  const plazo = plazoDesdeDias(ctx, dias); // no tomar N días previos ni el día de la IQ
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: `SGLT2 (${e.principio}): suspender ${dias} días`,
    fuente: FUENTE,
    requiereConfirmacion: false,
  }, plazo);
}

// ————————————— GLP-1 semanal (Decisión 8) —————————————

export interface EntradaGlp1Semanal {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
  /** Fecha de la próxima dosis semanal programada. */
  proximaDosis: Date;
}

/**
 * Si la dosis semanal cae entre 7 días antes y el día de la intervención (ambos
 * incluidos), no se administra; se indica la fecha exacta de la dosis omitida.
 */
export function reglaGlp1Semanal(e: EntradaGlp1Semanal, ctx: ContextoReglas): ResultadoFarmaco {
  // §8.5 v4: la última dosis debe ser al menos 7 días antes; se omite solo la
  // dosis que cae en los 6 días previos o el mismo día de la intervención. La que
  // cae exactamente 7 días antes SÍ se administra.
  const iv = ctx.fechaHoraIntervencion;
  const inicioVentana = new Date(iv);
  inicioVentana.setDate(inicioVentana.getDate() - 6);

  const dosisDia = startOfDay(e.proximaDosis).getTime();
  const desde = startOfDay(inicioVentana).getTime();
  const hasta = endOfDay(iv).getTime();
  const caeEnVentana = dosisDia >= desde && dosisDia <= hasta;

  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
    requiereConfirmacion: false,
  };

  if (caeEnVentana) {
    // Última dosis administrada = la semana anterior a la que se omite (7 días antes).
    const ultimaDosis = new Date(e.proximaDosis);
    ultimaDosis.setDate(ultimaDosis.getDate() - 7);
    // La dieta de líquidos claros empieza 24 h antes de la intervención.
    const inicioDieta = new Date(iv);
    inicioDieta.setDate(inicioDieta.getDate() - 1);
    return {
      ...base,
      accion: 'suspender',
      fechaHoraUltimaToma: ultimaDosis,
      textoPaciente:
        `Su última dosis será la del ${fechaLarga(ultimaDosis)}. ` +
        `No se ponga la dosis del ${fechaLarga(e.proximaDosis)}. ` +
        `Además, tome solo líquidos claros desde el ${fechaLarga(inicioDieta)} a las ${horaReloj(inicioDieta)} (siga la hoja adjunta).`,
      reglaAplicada: 'GLP-1 semanal: dosis en los 6 días previos o el día de la IQ → omitir; última dosis 7 días antes; dieta líquida desde 24 h antes',
    };
  }

  return {
    ...base,
    accion: 'mantener',
    textoPaciente: 'Puede ponerse su dosis semanal como siempre; deja al menos 7 días hasta la intervención.',
    reglaAplicada: 'GLP-1 semanal: la dosis queda al menos 7 días antes de la intervención',
  };
}

// ————————————— GLP-1 diario (Decisión 8) —————————————

export interface EntradaGlp1Diario {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

export function reglaGlp1Diario(e: EntradaGlp1Diario, ctx: ContextoReglas): ResultadoFarmaco {
  // Omitir los 3 días previos y el día de la intervención → última dosis el día 4 previo.
  const plazo = plazoDesdeDias(ctx, 3);
  return aplicarHoraAsumida({
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: `Deje de tomarlo los 3 días previos y el día de la intervención. ${plazo.textoPaciente}`,
    reglaAplicada: 'GLP-1 diario: omitir 3 días previos + día de la IQ (última dosis el día 4 previo)',
    fuente: FUENTE,
    requiereConfirmacion: false,
  }, plazo);
}

// ————————————— Bomba de insulina (Decisión 6) —————————————

export interface EntradaBombaInsulina {
  idFarmaco: string;
  nombreComercial: string;
}

export function reglaBombaInsulina(e: EntradaBombaInsulina, ctx: ContextoReglas): ResultadoFarmaco {
  // La decisión depende SOLO del riesgo quirúrgico (decisión del servicio, 2026-10-04;
  // se retira el régimen): riesgo bajo → sin confirmación; intermedio o alto → confirmación.
  const bajoRiesgo = ctx.riesgoCardiovascular === 'bajo';
  const requiereConfirmacion = !bajoRiesgo;

  const res: ResultadoFarmaco = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['insulina_bomba'],
    accion: requiereConfirmacion ? 'consultar' : 'ajustar',
    textoPaciente: requiereConfirmacion
      ? 'Sobre su bomba de insulina, el anestesiólogo le indicará qué hacer. No cambie la pauta por su cuenta.'
      : 'Ponga la basal al 80 % de lo habitual y no se administre bolos el día de la intervención.',
    reglaAplicada: bajoRiesgo
      ? 'Bomba de insulina, cirugía de riesgo bajo: basal 80 %, suspender bolos (sin confirmación)'
      : 'Bomba de insulina, cirugía de riesgo intermedio/alto: requiere confirmación',
    fuente: FUENTE,
    requiereConfirmacion,
  };
  return res;
}
