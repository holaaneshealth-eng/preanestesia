/**
 * Antiagregantes — docs/documento_fuente.md §8.3.
 * Cubre: AAS por dosis; inhibidores P2Y12 (clopidogrel, ticagrelor, prasugrel)
 * con plazos por técnica; stent reciente (alerta de diferir + confirmación);
 * P2Y12 en monoterapia y oftalmología. Los plazos numéricos vienen de
 * reglas_farmacos.json.
 */
import type { ContextoReglas, ResultadoFarmaco, Alerta } from '../tipos.ts';
import { neuroaxialOProfundo, plazoDesdeDias, plazoDesdeHoras, aplicarHoraAsumida, TEXTO_MANTENER } from './motor.ts';
import { fechaHoraLimite } from '../fechas/plazos.ts';

const FUENTE = 'docs/documento_fuente.md §8.3 (ESC 2022; protocolo del servicio)';

// ————————————— AAS —————————————

export interface EntradaAas {
  idFarmaco: string;
  nombreComercial: string;
  dosisDiariaMg: number;
  /** Indicación cardiovascular (para la sugerencia de bajar a 100 mg). */
  indicacionCardiovascular?: boolean;
}

/**
 * AAS (§8.3, decisión del servicio):
 *  - Muy alto riesgo de sangrado = espacio cerrado (neurocirugía/canal medular) o retina.
 *  - Dosis ≤ 200 mg: se mantiene; en espacio cerrado requiere confirmación (en retina se
 *    mantiene según el protocolo oftalmológico).
 *  - Dosis > 200 mg: se mantiene por defecto; solo se suspende 5 días antes si hay muy
 *    alto riesgo de sangrado o técnica neuroaxial. Si hay que suspenderlo y la indicación
 *    es cardiovascular, requiere confirmación con la sugerencia de pasar a 100 mg/día.
 */
export function reglaAas(e: EntradaAas, ctx: ContextoReglas): ResultadoFarmaco {
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: ['acido_acetilsalicilico'],
    fuente: FUENTE,
  };
  const muyAltoSangrado = ctx.espacioCerrado || ctx.retina;
  const debeSuspender = muyAltoSangrado || ctx.neuroaxial;

  if (e.dosisDiariaMg <= 200) {
    if (ctx.espacioCerrado) {
      // Punto 8 (3.1): se propone suspender 5 días (criterio más prudente en espacio
      // cerrado) y queda un punto amarillo para confirmar la suspensión.
      const plazo = plazoDesdeDias(ctx, 5);
      const r: ResultadoFarmaco = {
        ...base,
        accion: 'suspender',
        fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
        textoPaciente: plazo.textoPaciente,
        reglaAplicada: 'AAS ≤ 200 mg en cirugía de espacio cerrado: suspender 5 días (criterio prudente)',
        requiereConfirmacion: false,
        textoAnestesiologo: 'Confirmar si el riesgo de sangrado del SNC justifica mantener el AAS en lugar de suspenderlo.',
        puntoValidacion: { tipo: 'validar', motivo: 'AAS en cirugía de espacio cerrado: se propone suspender 5 días; confirmar la suspensión.' },
      };
      return aplicarHoraAsumida(r, plazo);
    }
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'AAS ≤ 200 mg/día: mantener',
      requiereConfirmacion: false,
    };
  }

  // Dosis > 200 mg.
  if (!debeSuspender) {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'AAS > 200 mg/día: mantener (sin muy alto riesgo de sangrado ni técnica neuroaxial)',
      requiereConfirmacion: false,
    };
  }
  // Punto 8 (corrección C4b): en cirugía de espacio cerrado, CUALQUIER dosis de AAS se
  // suspende 5 días (igual que el C2), con punto amarillo. La bajada a 100 mg/día solo se
  // aplica fuera del espacio cerrado.
  if (ctx.espacioCerrado) {
    const plazoEc = plazoDesdeDias(ctx, 5);
    const rEc: ResultadoFarmaco = {
      ...base,
      accion: 'suspender',
      fechaHoraUltimaToma: plazoEc.fechaHoraUltimaToma,
      textoPaciente: plazoEc.textoPaciente,
      reglaAplicada: 'AAS en cirugía de espacio cerrado: suspender 5 días (criterio prudente)',
      requiereConfirmacion: false,
      textoAnestesiologo: 'Confirmar si el riesgo de sangrado del SNC justifica mantener el AAS en lugar de suspenderlo.',
      puntoValidacion: { tipo: 'validar', motivo: 'AAS en cirugía de espacio cerrado: se propone suspender 5 días; confirmar la suspensión.' },
    };
    return aplicarHoraAsumida(rEc, plazoEc);
  }
  if (e.indicacionCardiovascular) {
    // Punto 8 (3.2): fuera del espacio cerrado, se propone MANTENER a dosis
    // cardioprotectora (100 mg/día), con punto amarillo para confirmar la bajada.
    return {
      ...base,
      accion: 'ajustar',
      textoPaciente: 'Tome solo 100 mg al día (en lugar de su dosis habitual), también el día de la intervención, con un sorbo de agua. No deje de tomarlo.',
      reglaAplicada: 'AAS > 200 mg/día con indicación cardiovascular: mantener a dosis cardioprotectora (100 mg/día)',
      requiereConfirmacion: false,
      textoAnestesiologo: 'Pasar a 100 mg/día (dosis cardioprotectora); confirmar la bajada de dosis.',
      puntoValidacion: { tipo: 'validar', motivo: 'AAS > 200 mg con indicación cardiovascular: se propone bajar a 100 mg/día; confirmar.' },
    };
  }
  const plazo = plazoDesdeDias(ctx, 5);
  const r: ResultadoFarmaco = {
    ...base,
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: 'AAS > 200 mg/día con muy alto riesgo de sangrado o neuroaxial: suspender 5 días',
    requiereConfirmacion: false,
  };
  return aplicarHoraAsumida(r, plazo);
}

// ————————————— P2Y12 —————————————

export type P2y12 = 'clopidogrel' | 'ticagrelor' | 'prasugrel';

const DIAS_P2Y12: Record<P2y12, { estandar: number; neuroaxial: number }> = {
  clopidogrel: { estandar: 5, neuroaxial: 7 },
  ticagrelor: { estandar: 5, neuroaxial: 7 },
  prasugrel: { estandar: 7, neuroaxial: 10 },
};

export interface EntradaP2y12 {
  idFarmaco: string;
  nombreComercial: string;
  principio: P2y12;
  /** true si el paciente NO toma AAS (monoterapia P2Y12). */
  monoterapia: boolean;
  /** true si es portador de stent (aunque no sea reciente): ninguna suspensión sin confirmación (§8.3). */
  portadorStent?: boolean;
}

export function reglaP2y12(e: EntradaP2y12, ctx: ContextoReglas): ResultadoFarmaco {
  const dias = neuroaxialOProfundo(ctx)
    ? DIAS_P2Y12[e.principio].neuroaxial
    : DIAS_P2Y12[e.principio].estandar;
  const plazo = plazoDesdeDias(ctx, dias);
  const baseP2y12 = { idFarmaco: e.idFarmaco, nombreComercial: e.nombreComercial, principiosActivos: [e.principio], fuente: FUENTE };

  const res: ResultadoFarmaco = {
    ...baseP2y12,
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: plazo.textoPaciente,
    reglaAplicada: `${e.principio}: suspender ${dias} días${neuroaxialOProfundo(ctx) ? ' (neuroaxial/bloqueo profundo)' : ''}`,
    requiereConfirmacion: false,
  };
  // Punto 8 (corrección C6): portador de stent NO reciente (el stent reciente se trata
  // en evaluarStent, §8.3). Se SUSPENDE el P2Y12 con su plazo (igual que sin stent) y se
  // deja un punto amarillo para confirmar con cardiología si hay dudas. Si además está en
  // monoterapia, se aplica también la sugerencia de AAS 100 mg (C7).
  if (e.portadorStent) {
    res.textoAnestesiologo = e.monoterapia
      ? 'Stent no reciente: confirmar la suspensión del P2Y12 con cardiología si hay dudas. En monoterapia, valorar sustituir por AAS 100 mg/día durante la retirada.'
      : 'Stent no reciente: confirmar la suspensión del P2Y12 con cardiología si hay dudas. Mantener el AAS si lo toma.';
    res.puntoValidacion = {
      tipo: 'validar',
      motivo: `${e.principio}: stent no reciente; se propone suspender ${dias} días (mantener el AAS si lo toma). Confirmar la suspensión del P2Y12 con cardiología si hay dudas.`,
    };
    return aplicarHoraAsumida(res, plazo);
  }
  // Punto 8: monoterapia P2Y12 (sin stent) → se propone la suspensión y se sugiere
  // sustituir por AAS 100 mg durante la retirada; punto amarillo (C7).
  if (e.monoterapia) {
    res.textoAnestesiologo = 'Valorar sustituir por AAS 100 mg/día durante la retirada.';
    res.puntoValidacion = { tipo: 'validar', motivo: `${e.principio} en monoterapia: se propone suspender ${dias} días; valorar sustituir por AAS 100 mg/día.` };
  }
  return aplicarHoraAsumida(res, plazo);
}

// ————————————— Stent reciente (§8.3 + Decisión 3) —————————————

export interface EntradaStent {
  /** Meses desde el implante. */
  mesesDesdeImplante: number;
  /** true si fue por SCA; false si programado. */
  traSca: boolean;
}

export interface ResultadoStent {
  /** true si el stent es reciente y dispara alerta de diferir + confirmación. */
  recienteRequiereConfirmacion: boolean;
  alertas: Alerta[];
  /** true si debe suprimirse toda pauta de antiagregantes en la hoja del paciente. */
  suprimirPautaAntiagregantesEnHoja: boolean;
}

/**
 * Evalúa el stent reciente. Si además hay neuroaxial, se emiten ambas alertas
 * (la del stent primero y en rojo) y no se muestra pauta de antiagregantes en la
 * hoja del paciente hasta la confirmación (R12.7, Decisión 3).
 */
export function evaluarStent(e: EntradaStent, ctx: ContextoReglas): ResultadoStent {
  const reciente =
    (!e.traSca && e.mesesDesdeImplante < 6) || (e.traSca && e.mesesDesdeImplante < 12);

  if (!reciente) {
    return {
      recienteRequiereConfirmacion: false,
      alertas: [],
      suprimirPautaAntiagregantesEnHoja: false,
    };
  }

  const alertas: Alerta[] = [
    {
      gravedad: 'roja',
      mensaje:
        'Stent reciente: valorar diferir la cirugía programada; no suspender la doble antiagregación sin consultar con cardiología.',
      origen: 'antiagregantes §8.3',
      soloAnestesiologo: false,
    },
  ];

  if (neuroaxialOProfundo(ctx)) {
    alertas.push({
      gravedad: 'amarilla',
      mensaje:
        'Técnica neuroaxial/bloqueo profundo prevista con stent reciente: coordinar plazos de antiagregantes con la técnica.',
      origen: 'antiagregantes §8.3 + técnica neuroaxial',
      soloAnestesiologo: false,
    });
  }

  return {
    recienteRequiereConfirmacion: true,
    alertas,
    suprimirPautaAntiagregantesEnHoja: true,
  };
}

// ————————————— Otros antiagregantes (§8.3) —————————————

/** Triflusal: 7 días; 10 días con neuroaxial o bloqueo profundo. */
export function reglaTriflusal(idFarmaco: string, nombreComercial: string, ctx: ContextoReglas): ResultadoFarmaco {
  const dias = neuroaxialOProfundo(ctx) ? 10 : 7;
  const plazo = plazoDesdeDias(ctx, dias);
  return aplicarHoraAsumida({
    idFarmaco, nombreComercial, principiosActivos: ['triflusal'],
    accion: 'suspender', fechaHoraUltimaToma: plazo.fechaHoraUltimaToma, textoPaciente: plazo.textoPaciente,
    reglaAplicada: `Triflusal: suspender ${dias} días${neuroaxialOProfundo(ctx) ? ' (neuroaxial/bloqueo profundo)' : ''}`,
    fuente: FUENTE, requiereConfirmacion: false,
  }, plazo);
}

/** Dipiridamol: 24 h; 48 h con neuroaxial o bloqueo profundo. */
export function reglaDipiridamol(idFarmaco: string, nombreComercial: string, ctx: ContextoReglas): ResultadoFarmaco {
  const horas = neuroaxialOProfundo(ctx) ? 48 : 24;
  const plazo = plazoDesdeHoras(ctx, horas);
  return aplicarHoraAsumida({
    idFarmaco, nombreComercial, principiosActivos: ['dipiridamol'],
    accion: 'suspender', fechaHoraUltimaToma: plazo.fechaHoraUltimaToma, textoPaciente: plazo.textoPaciente,
    reglaAplicada: `Dipiridamol: suspender ${horas} h${neuroaxialOProfundo(ctx) ? ' (neuroaxial/bloqueo profundo)' : ''}`,
    fuente: FUENTE, requiereConfirmacion: false,
  }, plazo);
}

/** Cilostazol: 3 días si riesgo hemorrágico alto o neuroaxial/bloqueo profundo; si no, mantener. */
export function reglaCilostazol(idFarmaco: string, nombreComercial: string, ctx: ContextoReglas): ResultadoFarmaco {
  const suspende = ctx.riesgoHemorragico === 'alto' || neuroaxialOProfundo(ctx);
  if (!suspende) {
    return {
      idFarmaco, nombreComercial, principiosActivos: ['cilostazol'],
      accion: 'mantener', textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'Cilostazol: mantener (riesgo hemorrágico no alto, sin neuroaxial/bloqueo profundo)',
      fuente: FUENTE, requiereConfirmacion: false,
    };
  }
  const plazo = plazoDesdeDias(ctx, 3);
  return aplicarHoraAsumida({
    idFarmaco, nombreComercial, principiosActivos: ['cilostazol'],
    accion: 'suspender', fechaHoraUltimaToma: plazo.fechaHoraUltimaToma, textoPaciente: plazo.textoPaciente,
    reglaAplicada: 'Cilostazol: suspender 3 días (riesgo hemorrágico alto o neuroaxial/bloqueo profundo)',
    fuente: FUENTE, requiereConfirmacion: false,
  }, plazo);
}

/** Sulodexida: 48 h si riesgo hemorrágico alto o neuroaxial/bloqueo profundo; si no, mantener. (No interviene en pruebas, §7.3). */
export function reglaSulodexida(idFarmaco: string, nombreComercial: string, ctx: ContextoReglas): ResultadoFarmaco {
  const suspende = ctx.riesgoHemorragico === 'alto' || neuroaxialOProfundo(ctx);
  if (!suspende) {
    return {
      idFarmaco, nombreComercial, principiosActivos: ['sulodexida'],
      accion: 'mantener', textoPaciente: TEXTO_MANTENER,
      reglaAplicada: 'Sulodexida: mantener (riesgo hemorrágico no alto, sin neuroaxial/bloqueo profundo)',
      fuente: 'docs/documento_fuente.md §8.3', requiereConfirmacion: false,
    };
  }
  const plazo = plazoDesdeHoras(ctx, 48);
  return aplicarHoraAsumida({
    idFarmaco, nombreComercial, principiosActivos: ['sulodexida'],
    accion: 'suspender', fechaHoraUltimaToma: plazo.fechaHoraUltimaToma, textoPaciente: plazo.textoPaciente,
    reglaAplicada: 'Sulodexida: suspender 48 h (riesgo hemorrágico alto o neuroaxial/bloqueo profundo)',
    fuente: 'docs/documento_fuente.md §8.3', requiereConfirmacion: false,
  }, plazo);
}

/** Inhibidores GP IIb/IIIa y cangrelor: uso hospitalario, con sus plazos; siempre requieren confirmación. */
export type GpIibIiia = 'eptifibatida' | 'tirofiban' | 'cangrelor' | 'abciximab';

const HORAS_GP: Record<GpIibIiia, { estandar: number; neuroaxial: number }> = {
  eptifibatida: { estandar: 4, neuroaxial: 6 },
  tirofiban: { estandar: 8, neuroaxial: 8 }, // 4-8 h → extremo conservador 8
  cangrelor: { estandar: 1, neuroaxial: 3 },
  abciximab: { estandar: 48, neuroaxial: 48 }, // 24-48 h → extremo conservador 48
};

export function reglaGpIibIiia(idFarmaco: string, nombreComercial: string, principio: GpIibIiia, ctx: ContextoReglas): ResultadoFarmaco {
  const horas = neuroaxialOProfundo(ctx) ? HORAS_GP[principio].neuroaxial : HORAS_GP[principio].estandar;
  // Perfusión IV hospitalaria: la última administración permitida es el propio límite.
  const limite = fechaHoraLimite(ctx.fechaHoraIntervencion, horas);
  // Punto 8 (3.3): se propone el plazo ya calculado (manejo hospitalario) y queda un
  // punto amarillo para confirmarlo con el equipo.
  return {
    idFarmaco, nombreComercial, principiosActivos: [principio],
    accion: 'suspender', fechaHoraUltimaToma: limite,
    textoPaciente: 'Este medicamento se administra en el hospital; el equipo lo gestiona. Usted no tiene que hacer nada.',
    reglaAplicada: `${principio} (GP IIb/IIIa o cangrelor): plazo ${horas} h (uso hospitalario)`,
    fuente: FUENTE, requiereConfirmacion: false,
    textoAnestesiologo: `Antiagregante de uso hospitalario (plazo ${horas} h): confirmar el manejo con el equipo.`,
    puntoValidacion: { tipo: 'validar', motivo: `${principio}: antiagregante de uso hospitalario (plazo ${horas} h); confirmar con el equipo.` },
  };
}

// ————————————— Oftalmología moderada/alta (§8.3) —————————————

/**
 * En oftalmología de riesgo moderado o alto: sustituir antiagregantes por AAS
 * 100 mg/día y suspender el P2Y12 con los plazos del protocolo.
 */
export function reglaP2y12Oftalmo(e: EntradaP2y12, ctx: ContextoReglas): ResultadoFarmaco {
  const dias = DIAS_P2Y12[e.principio].estandar; // plazos del protocolo (no neuroaxial en oftalmo)
  const plazo = plazoDesdeDias(ctx, dias);
  const baseOft = { idFarmaco: e.idFarmaco, nombreComercial: e.nombreComercial, principiosActivos: [e.principio], fuente: FUENTE };
  return aplicarHoraAsumida({
    ...baseOft,
    accion: 'suspender',
    fechaHoraUltimaToma: plazo.fechaHoraUltimaToma,
    textoPaciente: `${plazo.textoPaciente} Su médico puede sustituirlo por AAS 100 mg/día durante ese tiempo.`,
    reglaAplicada: `Oftalmología moderada/alta: sustituir por AAS 100 mg/día y suspender ${e.principio} ${dias} días`,
    fuente: FUENTE,
    requiereConfirmacion: false,
    textoAnestesiologo: 'Sustituir antiagregante por AAS 100 mg/día; suspender P2Y12 con plazos del protocolo.',
  }, plazo);
}
