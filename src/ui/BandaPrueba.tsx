/**
 * Banda fija y visible en todas las pantallas de la vista de PRUEBA.
 *
 * Visibilidad (punto de la migración a Cloudflare): se muestra en GitHub Pages y en
 * cualquier rama de Cloudflare que no sea main; se oculta solo en Cloudflare con la
 * rama main (producción). El valor `__MOSTRAR_BANDA__` lo hornea Vite en el build
 * (ver despliegue.config.ts). En contextos sin Vite (vitest), se asume visible.
 */
export function BandaPrueba() {
  const mostrar = typeof __MOSTRAR_BANDA__ === 'undefined' ? true : __MOSTRAR_BANDA__;
  if (!mostrar) return null;
  return (
    <div className="banda-prueba" role="alert" aria-live="polite">
      VERSIÓN DE PRUEBA · NO USAR CON PACIENTES
    </div>
  );
}
