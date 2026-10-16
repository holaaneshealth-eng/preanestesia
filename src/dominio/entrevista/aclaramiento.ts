/**
 * Resolución del aclaramiento de creatinina de la entrevista (§8.2/§8.4).
 *
 * El aclaramiento es un valor ÚNICO para toda la entrevista. Puede venir de dos
 * fuentes, con esta prioridad:
 *   1. Un módulo (renal o trasplante) que aporta la creatinina → ya resuelto en
 *      `derivarHechosClinicos` (DatosClinicos.aclaramiento).
 *   2. El dato introducido a mano en el paso 8 cuando no hay módulo: aclaramiento
 *      directo, creatinina (se calcula Cockcroft-Gault con edad/peso/sexo) o
 *      «no disponible» (las reglas renales requieren confirmación, caso A7).
 *
 * Función pura, usada por el paso 8 y por el resumen para que el valor y las reglas
 * sean coherentes.
 */
import type { Sexo } from '../tipos.ts';
import type { AclaramientoManual } from '../../ui/estadoEntrevista.ts';
import { calcularAclaramiento } from '../escalas/cockcroftGault.ts';

export interface DatosParaAclaramiento {
  edadAnios: number;
  pesoKg: number;
  sexo: Sexo;
}

/** Resultado de resolver el aclaramiento efectivo de la entrevista. */
export interface AclaramientoResuelto {
  /** mL/min efectivo, o null si no se conoce. */
  valor: number | null;
  /**
   * De dónde sale: módulo renal/trasplante, dato manual del paso 8, aproximación
   * por el filtrado glomerular del paso de pruebas (punto 8, 1.1), o nada.
   */
  fuente: 'modulo' | 'manual' | 'filtrado_glomerular' | 'ninguno';
  /** Fecha (ISO yyyy-mm-dd) de la analítica usada, o null si no se conoce. */
  fecha: string | null;
}

/**
 * Resuelve el aclaramiento efectivo. `aclaramientoModulo` es el que ya calculó
 * `derivarHechosClinicos` (null si ningún módulo lo aporta). Si el módulo lo tiene,
 * manda; si no, se usa el dato manual del paso 8. `fechaModulo` es la fecha de la
 * analítica del módulo (DatosClinicos.aclaramientoFecha), para avisar de analíticas
 * de hace más de 3 meses.
 */
export function resolverAclaramiento(
  aclaramientoModulo: number | null,
  manual: AclaramientoManual | null,
  datos: DatosParaAclaramiento,
  fechaModulo: string | null = null,
  filtradoGlomerular: number | null = null,
): AclaramientoResuelto {
  if (aclaramientoModulo !== null) return { valor: aclaramientoModulo, fuente: 'modulo', fecha: fechaModulo };
  // Dato manual del paso 8 (tiene prioridad sobre el filtrado del paso de pruebas).
  if (manual !== null && manual.tipo !== 'no_disponible') {
    if (manual.tipo === 'aclaramiento') {
      if (manual.valor > 0) return { valor: manual.valor, fuente: 'manual', fecha: manual.fecha ?? null };
    } else {
      // Creatinina → Cockcroft-Gault.
      const cl = calcularAclaramiento({
        edadAnios: datos.edadAnios,
        pesoKg: datos.pesoKg,
        sexo: datos.sexo,
        creatinina: manual.valor,
        unidad: 'mg_dl',
      });
      if (cl !== null) return { valor: cl, fuente: 'manual', fecha: manual.fecha ?? null };
    }
  }
  // Punto 8 (1.1): sin creatinina ni aclaramiento propios, usar el filtrado glomerular
  // del paso de pruebas como APROXIMACIÓN del aclaramiento para elegir el tramo.
  if (filtradoGlomerular !== null && filtradoGlomerular > 0) {
    return { valor: filtradoGlomerular, fuente: 'filtrado_glomerular', fecha: null };
  }
  if (manual === null) return { valor: null, fuente: 'ninguno', fecha: null };
  return { valor: null, fuente: 'manual', fecha: null };
}

/**
 * ¿La analítica del aclaramiento es de hace más de 3 meses respecto a la fecha de
 * referencia (la intervención, o hoy si no hay fecha)? (§6.7). Solo es true cuando
 * hay un valor de aclaramiento conocido Y su analítica tiene fecha Y han pasado más
 * de 3 meses. Si no hay fecha o no hay valor, devuelve false (no se afirma nada).
 */
export function aclaramientoDeMasDe3Meses(
  resuelto: AclaramientoResuelto,
  referencia: Date,
): boolean {
  if (resuelto.valor === null || resuelto.fecha === null) return false;
  const f = parseFechaIso(resuelto.fecha);
  if (f === null) return false;
  const meses = (referencia.getTime() - f.getTime()) / 86_400_000 / 30.4375;
  return meses > 3;
}

/** Parsea una fecha ISO yyyy-mm-dd a Date local; null si no es válida. */
function parseFechaIso(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const [y, m, d] = v.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
