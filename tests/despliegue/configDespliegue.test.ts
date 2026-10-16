/**
 * Lógica de despliegue (despliegue.config.ts): ruta base, banda de prueba y URL del QR
 * del paciente según dónde se compile (GitHub Pages o Cloudflare Pages, con la rama).
 * Comprobación del dist real: scripts/comprobar-despliegue.ts.
 */
import { describe, it, expect } from '../_harness.ts';
import {
  esCloudflare,
  rutaBase,
  mostrarBandaPrueba,
  urlVistaPaciente,
} from '../../despliegue.config.ts';

const PROYECTO = 'aneshealth-preanestesia';
const URL_GH = 'https://holaaneshealth-eng.github.io/preanestesia/paciente/';

const GH = {}; // GitHub Pages: sin variables de Cloudflare.
const CF_MAIN = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main' };
const CF_DEV = { CF_PAGES: '1', CF_PAGES_BRANCH: 'desarrollo' };
const CF_OTRA = { CF_PAGES: '1', CF_PAGES_BRANCH: 'una-rama-cualquiera' };

describe('Despliegue · esCloudflare', () => {
  it('detecta Cloudflare con CF_PAGES=1', () => {
    expect(esCloudflare(CF_MAIN)).toBeTrue();
    expect(esCloudflare({ CF_PAGES: 'true' })).toBeTrue();
  });
  it('GitHub Pages (sin CF_PAGES) no es Cloudflare', () => {
    expect(esCloudflare(GH)).toBeFalse();
  });
});

describe('Despliegue · rutaBase', () => {
  it('GitHub Pages usa /preanestesia/', () => {
    expect(rutaBase(GH)).toBe('/preanestesia/');
  });
  it('Cloudflare (cualquier rama) usa /', () => {
    expect(rutaBase(CF_MAIN)).toBe('/');
    expect(rutaBase(CF_DEV)).toBe('/');
  });
});

describe('Despliegue · mostrarBandaPrueba', () => {
  it('se muestra en GitHub Pages', () => {
    expect(mostrarBandaPrueba(GH)).toBeTrue();
  });
  it('se muestra en Cloudflare en ramas que no son main', () => {
    expect(mostrarBandaPrueba(CF_DEV)).toBeTrue();
    expect(mostrarBandaPrueba(CF_OTRA)).toBeTrue();
  });
  it('se OCULTA solo en Cloudflare con la rama main', () => {
    expect(mostrarBandaPrueba(CF_MAIN)).toBeFalse();
  });
});

describe('Despliegue · urlVistaPaciente (QR)', () => {
  it('GitHub Pages: la dirección de config.json', () => {
    expect(urlVistaPaciente(GH, PROYECTO, URL_GH)).toBe(URL_GH);
  });
  it('Cloudflare main: dominio raíz del proyecto', () => {
    expect(urlVistaPaciente(CF_MAIN, PROYECTO, URL_GH)).toBe('https://aneshealth-preanestesia.pages.dev/paciente/');
  });
  it('Cloudflare otra rama: alias de vista previa de esa rama', () => {
    expect(urlVistaPaciente(CF_DEV, PROYECTO, URL_GH)).toBe('https://desarrollo.aneshealth-preanestesia.pages.dev/paciente/');
    expect(urlVistaPaciente(CF_OTRA, PROYECTO, URL_GH)).toBe('https://una-rama-cualquiera.aneshealth-preanestesia.pages.dev/paciente/');
  });
  it('termina siempre en «/paciente/»', () => {
    for (const env of [GH, CF_MAIN, CF_DEV, CF_OTRA]) {
      expect(urlVistaPaciente(env, PROYECTO, URL_GH).endsWith('/paciente/')).toBeTrue();
    }
  });
});
