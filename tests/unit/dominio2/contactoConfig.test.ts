/**
 * Teléfono y correo de contacto configurables (punto 4). Las frases de la hoja del
 * paciente que mencionan un teléfono se adaptan a si el teléfono está relleno o vacío;
 * nunca debe verse un hueco ni un corchete. (El teléfono se lee de config al render,
 * no viaja en el QR.)
 */
import { describe, it, expect } from '../../_harness.ts';
import { renderMed } from '../../../src/ui/paciente/render.ts';
import { recalcularHojaEstructurada, type ContenidoQrPaciente } from '../../../src/dominio/salidas/qr/hojaPaciente.ts';
import type { TextosPaciente } from '../../../src/ui/paciente/textosPaciente.ts';
// Importamos el JSON con el atributo de tipo (lo exige node:test con strip-types).
import pacienteEs from '../../../datos/textos/es/paciente.json' with { type: 'json' };

const IV = new Date(2026, 9, 15, 8, 0);
// «Ahora» DESPUÉS del plazo (apixabán 48 h antes del 15/10 = 13/10): plazo no cumplible.
const AHORA_TARDE = new Date(2026, 9, 14, 8, 0);
const t = pacienteEs as TextosPaciente;

// Un anticoagulante con plazo en horas que ya no es alcanzable con AHORA_TARDE.
function contenido(): ContenidoQrPaciente {
  return {
    tel: '', // el teléfono NO viaja en el QR
    fi: IV.getTime(),
    far: [{ n: 'Eliquis', pt: 'horas', pd: 48, hh: ['09:00', '21:00'], ad: true, ac: true, rc: false }],
  };
}

describe('punto 4 · teléfono de contacto en la frase de plazo no cumplible', () => {
  it('con teléfono: la frase remite a ese número', () => {
    const inst = recalcularHojaEstructurada(contenido(), IV, AHORA_TARDE);
    expect(inst[0]?.plazoNoCumplible).toBeTrue();
    const texto = renderMed(inst[0]!, t, '900 123 456', IV.getTime());
    expect(texto).toContain('900 123 456');
    expect(texto).not.toContain('{tel}');
  });

  it('sin teléfono: la frase no menciona ningún número ni deja hueco/corchete', () => {
    const inst = recalcularHojaEstructurada(contenido(), IV, AHORA_TARDE);
    const texto = renderMed(inst[0]!, t, '', IV.getTime());
    expect(texto).toContain('Contacte con el servicio');
    expect(texto).not.toContain('{tel}');
    expect(texto).not.toContain('Llame al');
    expect(texto).not.toContain('[');
  });
});
