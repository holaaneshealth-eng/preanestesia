/**
 * Configuración de despliegue según DÓNDE se compila (GitHub Pages o Cloudflare Pages).
 *
 * Funciones puras (sin efectos) que `vite.config.ts` usa para decidir, en tiempo de
 * compilación, la ruta base, si se muestra la banda de prueba y la dirección del QR del
 * paciente. Se detecta Cloudflare con las variables que esa plataforma pone en el build:
 *   - `CF_PAGES`        = "1" en cualquier build de Cloudflare Pages.
 *   - `CF_PAGES_BRANCH` = la rama que se compila ("main", "desarrollo", …).
 *
 * Resumen:
 *   - Ruta base: «/» en Cloudflare; «/preanestesia/» en GitHub Pages.
 *   - Banda de prueba: visible SIEMPRE salvo en Cloudflare con la rama main (producción).
 *   - URL del QR del paciente:
 *       · Cloudflare main   → https://<proyecto>.pages.dev/paciente/
 *       · Cloudflare otra   → https://<rama>.<proyecto>.pages.dev/paciente/
 *       · GitHub Pages      → la de config.json (url_vista_paciente)
 *
 * Se prueba en tests/despliegue/configDespliegue.test.ts (lógica) y se verifica sobre el
 * dist real en scripts/comprobar-despliegue.ts.
 */

/** Variables de entorno relevantes del build (las pone Cloudflare Pages). */
export interface EntornoDespliegue {
  CF_PAGES?: string | undefined;
  CF_PAGES_BRANCH?: string | undefined;
}

/** ¿El build se está ejecutando en Cloudflare Pages? */
export function esCloudflare(env: EntornoDespliegue): boolean {
  return env.CF_PAGES === '1' || env.CF_PAGES === 'true';
}

/** Ruta base del sitio: «/» en Cloudflare, «/preanestesia/» en GitHub Pages. */
export function rutaBase(env: EntornoDespliegue): string {
  return esCloudflare(env) ? '/' : '/preanestesia/';
}

/**
 * ¿Se muestra la banda «VERSIÓN DE PRUEBA · NO USAR CON PACIENTES»?
 * Visible en GitHub Pages y en cualquier rama de Cloudflare que NO sea main. Oculta
 * solo en Cloudflare con la rama main (la versión de producción).
 */
export function mostrarBandaPrueba(env: EntornoDespliegue): boolean {
  return !(esCloudflare(env) && env.CF_PAGES_BRANCH === 'main');
}

/**
 * Dirección de la vista del paciente a la que apunta el QR, según dónde se compile.
 * @param proyecto nombre del proyecto de Cloudflare Pages (config.cloudflare_proyecto).
 * @param urlGithubPages dirección actual de GitHub Pages (config.url_vista_paciente).
 */
export function urlVistaPaciente(
  env: EntornoDespliegue,
  proyecto: string,
  urlGithubPages: string,
): string {
  if (esCloudflare(env)) {
    const rama = env.CF_PAGES_BRANCH ?? '';
    // Rama de producción (o rama desconocida, por prudencia): dominio raíz del proyecto.
    if (rama === '' || rama === 'main') return `https://${proyecto}.pages.dev/paciente/`;
    // Cualquier otra rama: alias estable de vista previa de esa rama.
    return `https://${rama}.${proyecto}.pages.dev/paciente/`;
  }
  // GitHub Pages: la dirección actual de config.json.
  return urlGithubPages;
}
