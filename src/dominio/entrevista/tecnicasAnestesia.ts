/**
 * Ayudantes para la técnica anestésica cuando puede haber VARIAS marcadas a la vez
 * (paso 7, §6 de la fase ágil). Las reglas de medicación no cambian: siguen keyando
 * sobre «neuroaxial» y «bloqueo profundo», solo que ahora se derivan de la lista.
 *
 * Para las reglas:
 *  - es neuroaxial si alguna técnica marcada es neuroaxial, o si no se sabe la técnica
 *    y el procedimiento tiene neuroaxial probable (R3.2.3);
 *  - es bloqueo profundo si alguna marcada es bloqueo profundo.
 */
import type { TecnicaAnestesica } from '../tipos.ts';

/** ¿Hay técnica neuroaxial efectiva? (incluye «no se sabe» + neuroaxial probable). */
export function esNeuroaxialEfectiva(tecnicas: TecnicaAnestesica[], neuroaxialProbable: boolean): boolean {
  if (tecnicas.includes('neuroaxial')) return true;
  // «No se sabe» (sola o entre otras) con neuroaxial probable se trata como neuroaxial.
  if (tecnicas.includes('no_se_sabe') && neuroaxialProbable) return true;
  return false;
}

/** ¿Hay bloqueo profundo entre las técnicas marcadas? */
export function hayBloqueoProfundo(tecnicas: TecnicaAnestesica[]): boolean {
  return tecnicas.includes('bloqueo_profundo');
}

/** ¿Hay algún bloqueo (periférico o profundo) entre las técnicas marcadas? */
export function hayBloqueo(tecnicas: TecnicaAnestesica[]): boolean {
  return tecnicas.includes('bloqueo_periferico') || tecnicas.includes('bloqueo_profundo');
}

/** ¿Hay anestesia general entre las técnicas marcadas? */
export function hayGeneral(tecnicas: TecnicaAnestesica[]): boolean {
  return tecnicas.includes('general');
}

/**
 * ¿Es posible una anestesia general? (para avisos como el del sugammadex). Lo es si
 * se ha marcado general o si no se sabe la técnica (ninguna marcada o «no se sabe»).
 */
export function posibleAnestesiaGeneral(tecnicas: TecnicaAnestesica[]): boolean {
  return tecnicas.length === 0 || tecnicas.includes('general') || tecnicas.includes('no_se_sabe');
}
