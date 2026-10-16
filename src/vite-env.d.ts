/// <reference types="vite/client" />

// Importación de ficheros CSV (y otros) como texto con el sufijo ?raw de Vite.
declare module '*?raw' {
  const contenido: string;
  export default contenido;
}

// Valores "horneados" en el bundle por Vite (define) según el despliegue
// (ver vite.config.ts / despliegue.config.ts). En contextos sin Vite (vitest), no
// existen; el código los usa siempre con una comprobación `typeof … !== 'undefined'`.
declare const __MOSTRAR_BANDA__: boolean;
declare const __URL_VISTA_PACIENTE__: string;
