/**
 * El JSON de preparación en castellano (datos/textos/es/preparacion.json) debe
 * coincidir PALABRA POR PALABRA con la fuente única docs/textos_preparacion_es.md
 * (punto 9). Si alguien cambia una palabra en el JSON sin tocar el .md (o al revés),
 * esta prueba falla. El .md es la fuente de verdad.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from '../../_harness.ts';
import preparacionEs from '../../../datos/textos/es/preparacion.json' with { type: 'json' };

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../..');
const MD = readFileSync(resolve(RAIZ, 'docs/textos_preparacion_es.md'), 'utf8');

function escaparRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Bloque de una sección «## Título» hasta la siguiente «## » (o fin). */
function bloqueSeccion(titulo: string): string {
  const re = new RegExp(`\\n## ${escaparRegExp(titulo)}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = MD.match(re);
  if (!m || m[1] === undefined) throw new Error(`No se encontró la sección «${titulo}» en el .md`);
  return m[1];
}
/** Bullets «- …» de un bloque, en orden. */
function bullets(bloque: string): string[] {
  return bloque.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
}
/** Items de lista numerada «N. …» de un bloque, en orden. */
function numerados(bloque: string): string[] {
  return bloque.split('\n').map((l) => l.trim()).filter((l) => /^\d+\.\s/.test(l)).map((l) => l.replace(/^\d+\.\s/, '').trim());
}

describe('punto 9 · el JSON de preparación coincide con el .md fuente', () => {
  it('higiene: título y bullets', () => {
    expect(preparacionEs.higiene.titulo).toBe('Higiene antes de la operación');
    expect(preparacionEs.higiene.items).toEqual(bullets(bloqueSeccion('Higiene antes de la operación')));
  });

  it('joyas y piercings: título y bullets', () => {
    expect(preparacionEs.joyas.titulo).toBe('Joyas y piercings');
    expect(preparacionEs.joyas.items).toEqual(bullets(bloqueSeccion('Joyas y piercings')));
  });

  it('el día de la intervención: título y pasos numerados (incluido el del bloqueo)', () => {
    expect(preparacionEs.dia.titulo).toBe('El día de la intervención');
    const pasosJson = preparacionEs.dia.pasos.map((p) => p.texto);
    expect(pasosJson).toEqual(numerados(bloqueSeccion('El día de la intervención')));
  });

  it('solo el paso 4 (bloqueo de nervios) está marcado como «soloBloqueo»', () => {
    const marcados = preparacionEs.dia.pasos
      .map((p, i) => ({ i, solo: p.soloBloqueo === true }))
      .filter((p) => p.solo)
      .map((p) => p.i);
    expect(marcados).toEqual([3]); // índice 3 = paso 4
    expect(preparacionEs.dia.pasos[3]?.texto).toContain('bloqueo de nervios');
  });
});
