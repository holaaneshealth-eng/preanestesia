/**
 * Verificación del build de despliegue (migración a Cloudflare Pages).
 *
 * Compila las tres variantes a carpetas separadas y comprueba, sobre el dist REAL:
 *   1. que existen `index.html` y `paciente/index.html`;
 *   2. que las rutas de los recursos del index.html son las que tocan
 *      (en Cloudflare empiezan por «/» y NO por «/preanestesia/»; en GitHub Pages, al revés);
 *   3. que la banda de prueba solo falta en Cloudflare con la rama main;
 *   4. que la dirección del QR del paciente es la que corresponde a cada variante,
 *      tanto en los metadatos del build como horneada en el bundle.
 *
 * No modifica ninguna regla clínica: solo compila y lee ficheros. Sale con código 1 si
 * alguna comprobación falla. Ejecutar: node --experimental-strip-types scripts/comprobar-despliegue.ts
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(raiz, 'datos', 'config.json'), 'utf8')) as {
  cloudflare_proyecto: string;
  url_vista_paciente: string;
};
const PROYECTO = config.cloudflare_proyecto;

interface Variante {
  nombre: string;
  outDir: string;
  env: Record<string, string>;
  baseEsperada: string;
  bandaEsperada: boolean;
  qrEsperado: string;
  /** Prefijo que deben tener los recursos del index.html. */
  prefijoRecursos: string;
  /** Prefijo que NO deben tener. */
  prefijoProhibido: string | null;
}

// Oráculo INDEPENDIENTE (no usa despliegue.config.ts) de lo que debe producir cada build.
const variantes: Variante[] = [
  {
    nombre: 'GitHub Pages',
    outDir: 'dist-verif/gh',
    env: {},
    baseEsperada: '/preanestesia/',
    bandaEsperada: true,
    qrEsperado: config.url_vista_paciente,
    prefijoRecursos: '/preanestesia/',
    prefijoProhibido: null,
  },
  {
    nombre: 'Cloudflare main (producción)',
    outDir: 'dist-verif/cf-main',
    env: { CF_PAGES: '1', CF_PAGES_BRANCH: 'main' },
    baseEsperada: '/',
    bandaEsperada: false,
    qrEsperado: `https://${PROYECTO}.pages.dev/paciente/`,
    prefijoRecursos: '/',
    prefijoProhibido: '/preanestesia/',
  },
  {
    nombre: 'Cloudflare desarrollo (vista previa)',
    outDir: 'dist-verif/cf-dev',
    env: { CF_PAGES: '1', CF_PAGES_BRANCH: 'desarrollo' },
    baseEsperada: '/',
    bandaEsperada: true,
    qrEsperado: `https://desarrollo.${PROYECTO}.pages.dev/paciente/`,
    prefijoRecursos: '/',
    prefijoProhibido: '/preanestesia/',
  },
];

const fallos: string[] = [];
function comprobar(cond: boolean, mensaje: string): void {
  if (cond) {
    console.log(`  ✓ ${mensaje}`);
  } else {
    console.log(`  ✗ ${mensaje}`);
    fallos.push(mensaje);
  }
}

/** Rutas de recursos (src/href) del index.html. */
function recursosDe(html: string): string[] {
  const out: string[] = [];
  const re = /(?:src|href)="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const v = m[1] ?? '';
    if (v.startsWith('/') || v.startsWith('/preanestesia/')) out.push(v);
  }
  return out;
}

rmSync(join(raiz, 'dist-verif'), { recursive: true, force: true });

for (const v of variantes) {
  console.log(`\n=== ${v.nombre} ===`);
  const env = { ...process.env, ...v.env, EMITIR_META_DESPLIEGUE: '1' };
  // Build directo con vite (el typecheck va aparte en el CI); outDir propio por variante.
  execSync(`node_modules/.bin/vite build --outDir ${v.outDir}`, { cwd: raiz, env, stdio: 'pipe' });

  const dir = join(raiz, v.outDir);
  const indexHtml = join(dir, 'index.html');
  const pacienteHtml = join(dir, 'paciente', 'index.html');

  // 1. Existen los dos index.html.
  comprobar(existsSync(indexHtml), 'existe index.html');
  comprobar(existsSync(pacienteHtml), 'existe paciente/index.html');
  if (!existsSync(indexHtml)) continue;

  // 2. Rutas de los recursos del index.html.
  const recursos = recursosDe(readFileSync(indexHtml, 'utf8'));
  const soloLocales = recursos.filter((r) => r.startsWith('/'));
  comprobar(
    soloLocales.length > 0 && soloLocales.every((r) => r.startsWith(v.prefijoRecursos)),
    `las rutas de recursos empiezan por «${v.prefijoRecursos}» (${soloLocales.length} recursos)`,
  );
  if (v.prefijoProhibido) {
    comprobar(
      soloLocales.every((r) => !r.startsWith(v.prefijoProhibido!)),
      `ninguna ruta empieza por «${v.prefijoProhibido}»`,
    );
  }

  // 3 y 4. Metadatos del build (base, banda, URL del QR).
  const meta = JSON.parse(readFileSync(join(dir, 'despliegue.json'), 'utf8')) as {
    base: string; mostrarBanda: boolean; urlVistaPaciente: string;
  };
  comprobar(meta.base === v.baseEsperada, `base = «${v.baseEsperada}»`);
  comprobar(meta.mostrarBanda === v.bandaEsperada, `banda de prueba ${v.bandaEsperada ? 'VISIBLE' : 'OCULTA'}`);
  comprobar(meta.urlVistaPaciente === v.qrEsperado, `URL del QR = «${v.qrEsperado}»`);

  // 4 bis. La URL del QR está horneada en el bundle de enfermería.
  const assets = join(dir, 'assets');
  const bundleConQr = existsSync(assets)
    && readdirSync(assets).some((f) => f.endsWith('.js') && readFileSync(join(assets, f), 'utf8').includes(v.qrEsperado));
  comprobar(bundleConQr, 'la URL del QR está horneada en el bundle');
}

// Comprobación cruzada: la banda solo falta en Cloudflare main.
const sinBanda = variantes.filter((v) => !v.bandaEsperada).map((v) => v.nombre);
console.log(`\nBanda oculta únicamente en: ${sinBanda.join(', ')}`);

rmSync(join(raiz, 'dist-verif'), { recursive: true, force: true });

if (fallos.length > 0) {
  console.error(`\n❌ ${fallos.length} comprobación(es) fallida(s).`);
  process.exit(1);
}
console.log('\n✅ Verificación de despliegue correcta (GitHub Pages + Cloudflare main/desarrollo).');
