/**
 * Generador de texto para SAP — docs/documento_fuente.md §10.1 (sin IA).
 * Texto plano por bloques, con utilidades gramaticales, abreviaturas, política de
 * negativos, opción "solo ASCII" y aviso de límite de caracteres.
 * Las plantillas y el orden de bloques viven en plantillas_sap.json; aquí está el
 * motor que las aplica.
 */

// —————————————————— Utilidades gramaticales ——————————————————

/** Enumeración con comas y «y» final. */
export function enumerar(items: string[]): string {
  const xs = items.filter((s) => s.trim() !== '');
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0] as string;
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/** Singular/plural simple. */
export function plural(n: number, singular: string, plural_: string): string {
  return n === 1 ? singular : plural_;
}

/** Fecha corta dd/mm/aaaa. */
export function fechaCorta(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Transliteración a ASCII (opción "solo ASCII" de §10.1). */
export function soloAscii(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .replace(/[«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/º/g, 'o')
    .replace(/ª/g, 'a')
    .replace(/ m²/g, 'm2') // «mL/min/1,73 m²» → «mL/min/1,73m2» (filtrado glomerular)
    .replace(/²/g, '2')
    .replace(/[^\x00-\x7F]/g, '');
}

// —————————————————— Bloques y plantillas ——————————————————

export interface BloqueSap {
  /** Clave del bloque (p. ej. "cabecera", "alergias", "plan"). */
  clave: string;
  /** Líneas del bloque; las vacías se omiten. */
  lineas: string[];
}

export interface OpcionesSap {
  /** Abreviaturas permitidas: {desarrollado: abreviatura}. */
  abreviaturas?: Record<string, string>;
  /** Aplicar abreviaturas (true) o escribirlas desarrolladas (false). */
  usarAbreviaturas?: boolean;
  /** Modo solo ASCII. */
  soloAscii?: boolean;
}

export interface ResultadoSap {
  texto: string;
  caracteres: number;
}

/**
 * Compone el texto de SAP a partir de bloques ya redactados. Omite bloques y
 * líneas vacíos, aplica abreviaturas/ASCII y comprueba el límite.
 */
export function generarSap(bloques: BloqueSap[], opciones: OpcionesSap = {}): ResultadoSap {
  const partes: string[] = [];
  for (const b of bloques) {
    const lineas = b.lineas.map((l) => l.trim()).filter((l) => l !== '');
    if (lineas.length === 0) continue; // omite bloques vacíos
    partes.push(lineas.join('\n'));
  }
  let texto = partes.join('\n');

  if (opciones.usarAbreviaturas && opciones.abreviaturas) {
    for (const [desarrollado, abrev] of Object.entries(opciones.abreviaturas)) {
      texto = texto.replaceAll(desarrollado, abrev);
    }
  }

  if (opciones.soloAscii) {
    texto = soloAscii(texto);
  }

  return { texto, caracteres: texto.length };
}

// —————————————————— Política de negativos (§10.1) ——————————————————

export interface NegativosEntrada {
  alergiasConocidas: boolean;
  hipertermiaMalignaFamiliar: boolean;
  antecedentesFamiliaresAnestesicos: boolean;
  mtnd4Positivo: boolean;
  hemstopPositivo: boolean;
}

/**
 * Devuelve las líneas de negativos que SÍ se escriben (§10.1):
 * NAMC, niega HM, niega antecedentes familiares anestésicos, cribado mtND4 negativo, HEMSTOP negativo.
 */
export function lineasNegativos(e: NegativosEntrada): string[] {
  const out: string[] = [];
  if (!e.alergiasConocidas) out.push('NAMC');
  if (!e.hipertermiaMalignaFamiliar) out.push('niega HM');
  if (!e.antecedentesFamiliaresAnestesicos) out.push('niega antecedentes familiares anestesicos');
  if (!e.mtnd4Positivo) out.push('cribado mtND4 negativo');
  if (!e.hemstopPositivo) out.push('HEMSTOP negativo');
  return out;
}
