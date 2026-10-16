/**
 * AINE — docs/documento_fuente.md §8.6.
 * Ibuprofeno 24 h; naproxeno 72 h; diclofenaco/dexketoprofeno/ketorolaco 24 h;
 * celecoxib/etoricoxib: mantener. Texto al paciente sobre alternativas.
 */
import type { ContextoReglas, ResultadoFarmaco } from '../tipos.ts';
import { plazoDesdeHoras, aplicarHoraAsumida, TEXTO_MANTENER } from './motor.ts';

const FUENTE = 'docs/documento_fuente.md §8.6';

const HORAS_AINE: Record<string, number | 'mantener'> = {
  ibuprofeno: 24,
  naproxeno: 72,
  diclofenaco: 24,
  dexketoprofeno: 24,
  ketorolaco: 24,
  celecoxib: 'mantener',
  etoricoxib: 'mantener',
};

const TEXTO_ALTERNATIVA = ' Si necesita analgesia esos días puede tomar paracetamol o metamizol.';

export interface EntradaAine {
  idFarmaco: string;
  nombreComercial: string;
  principio: string;
}

export function reglaAine(e: EntradaAine, ctx: ContextoReglas): ResultadoFarmaco {
  const plazo = HORAS_AINE[e.principio];
  const base = {
    idFarmaco: e.idFarmaco,
    nombreComercial: e.nombreComercial,
    principiosActivos: [e.principio],
    fuente: FUENTE,
    requiereConfirmacion: false,
  };

  if (plazo === 'mantener' || plazo === undefined) {
    return {
      ...base,
      accion: 'mantener',
      textoPaciente: TEXTO_MANTENER,
      reglaAplicada: `${e.principio}: mantener`,
    };
  }

  const p = plazoDesdeHoras(ctx, plazo);
  return aplicarHoraAsumida({
    ...base,
    accion: 'suspender',
    fechaHoraUltimaToma: p.fechaHoraUltimaToma,
    textoPaciente: p.textoPaciente + TEXTO_ALTERNATIVA,
    reglaAplicada: `${e.principio}: suspender ${plazo} h`,
  }, p);
}
