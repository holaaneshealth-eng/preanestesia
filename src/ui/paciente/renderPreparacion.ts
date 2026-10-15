/**
 * Render de la preparación para la operación (punto 9): «Higiene antes de la
 * operación», «Joyas y piercings» y «El día de la intervención». El texto literal
 * sale de `datos/textos/{es,ca}/preparacion.json` (fuente única del castellano:
 * `docs/textos_preparacion_es.md`). El paso del bloqueo de nervios solo se incluye si
 * hay un bloqueo entre las técnicas marcadas. En el QR solo viajan claves, no texto.
 */
import preparacionEs from '../../../datos/textos/es/preparacion.json';
import preparacionCa from '../../../datos/textos/ca/preparacion.json';
import type { Idioma } from './textosPaciente.ts';

export type TextosPreparacion = typeof preparacionEs;

const TEXTOS_PREPARACION: Record<Idioma, TextosPreparacion> = { es: preparacionEs, ca: preparacionCa as TextosPreparacion };

export function textosPreparacion(idioma: Idioma): TextosPreparacion {
  return TEXTOS_PREPARACION[idioma];
}

/** Una sección de la preparación: título + items (lista) o pasos (numerados). */
export interface SeccionPreparacion {
  titulo: string;
  /** Lista con viñetas (higiene, joyas). */
  items?: string[];
  /** Lista numerada (el día de la intervención). */
  pasos?: string[];
}

/**
 * Secciones de la preparación en orden. `incluirBloqueo` decide si el paso del
 * bloqueo de nervios aparece en «El día de la intervención».
 */
export function renderPreparacion(t: TextosPreparacion, incluirBloqueo: boolean): SeccionPreparacion[] {
  const pasosDia = t.dia.pasos
    .filter((p) => !(p as { soloBloqueo?: boolean }).soloBloqueo || incluirBloqueo)
    .map((p) => p.texto);
  return [
    { titulo: t.higiene.titulo, items: t.higiene.items },
    { titulo: t.joyas.titulo, items: t.joyas.items },
    { titulo: t.dia.titulo, pasos: pasosDia },
  ];
}
