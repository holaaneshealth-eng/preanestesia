/**
 * Configuración de Vite para GitHub Pages (vista previa de la rama desarrollo).
 * La vista previa muestra una banda fija "VERSIÓN DE PRUEBA · NO USAR CON PACIENTES".
 *
 * Service worker (§2): se precachea únicamente el "esqueleto" de la aplicación
 * (JS, CSS, HTML y recursos estáticos) para que funcione sin conexión. Los datos del
 * paciente viajan en el fragmento «#p=…» de la URL (que nunca llega al servidor ni al
 * service worker) y solo existen en memoria, por lo que jamás se guardan en caché.
 */
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscator from 'vite-plugin-javascript-obfuscator';
import config from './datos/config.json';
import { rutaBase, mostrarBandaPrueba, urlVistaPaciente, esCloudflare } from './despliegue.config.ts';

const raiz = import.meta.dirname;

// ———————————————— Despliegue (GitHub Pages o Cloudflare Pages) ————————————————
// Decidido en tiempo de compilación según las variables que pone Cloudflare Pages.
const entornoDespliegue = {
  CF_PAGES: process.env.CF_PAGES,
  CF_PAGES_BRANCH: process.env.CF_PAGES_BRANCH,
};
const BASE = rutaBase(entornoDespliegue);
const MOSTRAR_BANDA = mostrarBandaPrueba(entornoDespliegue);
const URL_VISTA_PACIENTE = urlVistaPaciente(
  entornoDespliegue,
  config.cloudflare_proyecto,
  config.url_vista_paciente,
);

/**
 * Plugin de verificación: solo con EMITIR_META_DESPLIEGUE=1 escribe un
 * `despliegue.json` en el dist con lo que se ha decidido (base, banda, URL del QR).
 * Lo usa scripts/comprobar-despliegue.ts; en los builds reales no se emite.
 */
function pluginMetaDespliegue(): Plugin {
  let outDir = 'dist';
  return {
    name: 'aneshealth-meta-despliegue',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      if (process.env.EMITIR_META_DESPLIEGUE !== '1') return;
      const meta = {
        base: BASE,
        mostrarBanda: MOSTRAR_BANDA,
        urlVistaPaciente: URL_VISTA_PACIENTE,
        cloudflare: esCloudflare(entornoDespliegue),
        rama: entornoDespliegue.CF_PAGES_BRANCH ?? null,
      };
      writeFileSync(resolve(outDir, 'despliegue.json'), JSON.stringify(meta, null, 2));
    },
  };
}

// Ofuscación activable por variable de entorno (Bloque III-B, protección del código).
// Se desactiva por defecto para que la vista previa (rama desarrollo) y el E2E sean
// rápidos y legibles; en el build de PRODUCCIÓN se activa con OFUSCAR=1.
const ofuscar = process.env.OFUSCAR === '1';

/**
 * Ofuscación LIGERA (Bloque III-B, 2026-10-04). Se evitan a propósito las opciones
 * que más penalizan el rendimiento en una tablet —`controlFlowFlattening`,
 * `deadCodeInjection`, `selfDefending`, `debugProtection`—, de modo que la app siga
 * siendo fluida. El objetivo es dificultar la lectura/copia del código, no blindarlo.
 */
const opcionesOfuscacion = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal' as const,
  renameGlobals: false,
  // `stringArray` sin codificación: agrupa las cadenas (dificulta leerlas) pero NO
  // las codifica en base64, que es lo que más ralentizaba el ARRANQUE en tablet
  // (había que decodificar todas las cadenas al cargar). Umbral moderado.
  stringArray: true,
  stringArrayEncoding: ['none' as const],
  stringArrayThreshold: 0.5,
  splitStrings: false,
  numbersToExpressions: false,
  simplify: true,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

// La ruta base depende de dónde se compile: «/preanestesia/» en GitHub Pages, «/» en
// Cloudflare Pages (ver despliegue.config.ts). El manifest de la PWA, el service worker
// y los enlaces internos se derivan de BASE para que funcionen en ambos sitios.
export default defineConfig({
  base: BASE,
  // Valores decididos en el build y "horneados" en el bundle (según el despliegue):
  //  - __MOSTRAR_BANDA__: si se pinta la banda «VERSIÓN DE PRUEBA · NO USAR CON PACIENTES».
  //  - __URL_VISTA_PACIENTE__: dirección a la que apunta el QR del paciente.
  define: {
    __MOSTRAR_BANDA__: JSON.stringify(MOSTRAR_BANDA),
    __URL_VISTA_PACIENTE__: JSON.stringify(URL_VISTA_PACIENTE),
  },
  plugins: [
    react(),
    pluginMetaDespliegue(),
    // La ofuscación se aplica al bundle final (solo en producción con OFUSCAR=1).
    ...(ofuscar
      ? [obfuscator({ apply: 'build', options: opcionesOfuscacion })]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'AnesHealth · Entrevista preanestésica',
        short_name: 'AnesHealth',
        description: 'Entrevista preanestésica de enfermería.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b6b5a',
      },
      workbox: {
        // Solo el esqueleto de la app de ENFERMERÍA: nunca datos de paciente ni la
        // vista del paciente (que es una aplicación independiente, ver abajo).
        globPatterns: ['**/*.{js,css,html,svg,woff2,webmanifest}'],
        // Excluir la vista del paciente del precache de la app de enfermería: ni su
        // HTML (carpeta «paciente/») ni su bundle propio (assets/paciente-*.js).
        globIgnores: ['paciente/**', 'assets/paciente-*.js'],
        navigateFallback: 'index.html',
        // El service worker no debe gobernar la vista del paciente («/paciente/»):
        // así cada app se actualiza y cachea por separado.
        navigateFallbackDenylist: [/\/paciente\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Aviso de copyright en el código compilado (se conserva en producción).
      output: {
        banner: '/*! © 2026 AnesHealth. Todos los derechos reservados. Uso restringido al Servicio de Anestesiología del Hospital Vithas Barcelona. */',
      },
      // Dos "builds" independientes (§8.16, Bloque III-A):
      //  - la app de enfermería (index.html → src/main.tsx),
      //  - la vista del paciente (paciente.html → src/mainPaciente.tsx), que se
      //    emite como «paciente/index.html» para servirse en la ruta «/paciente/».
      input: {
        enfermeria: resolve(raiz, 'index.html'),
        paciente: resolve(raiz, 'paciente/index.html'),
      },
    },
  },
});
