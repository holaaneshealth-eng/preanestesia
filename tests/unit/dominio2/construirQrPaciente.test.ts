/**
 * Construcción del contenido del QR del paciente (§8.16d, §11.1) y su ida y vuelta
 * por el recálculo: lo que se guarda en el QR reproduce la instrucción del motor.
 */
import { describe, it, expect } from '../../_harness.ts';
import { construirContenidoQrPaciente, payloadPaciente, type FarmacoPlan } from '../../../src/dominio/salidas/qr/construirContenido.ts';
import { recalcularHoja, caducidadQrPaciente } from '../../../src/dominio/salidas/qr/hojaPaciente.ts';

const IV = new Date(2026, 9, 15, 8, 0);
// «Hoy» fijo (1/10/2026, antes de la intervención): el recálculo no depende del
// reloj real (si no, al pasar la fecha de la intervención el plazo deja de ser
// alcanzable y «plazoNoCumplible» cambia).
const AHORA = new Date(2026, 9, 1, 8, 0);

describe('§11 · construcción del QR del paciente', () => {
  it('un anticoagulante en horas viaja con su tipo de plazo y recalcula igual', () => {
    const plan: FarmacoPlan[] = [{
      resultado: { idFarmaco: 'apixaban', nombreComercial: 'Eliquis', principiosActivos: ['apixaban'], accion: 'suspender', textoPaciente: 'x', reglaAplicada: 'r', fuente: 'f', requiereConfirmacion: false },
      horas: ['09:00', '21:00'],
      meta: { pt: 'horas', pd: 48, ad: true, ac: true },
    }];
    const contenido = construirContenidoQrPaciente(plan, '900123456', IV);
    expect(contenido.far[0]?.pt).toBe('horas');
    expect(contenido.far[0]?.pd).toBe(48);
    expect(contenido.far[0]?.ac).toBeTrue();
    const inst = recalcularHoja(contenido, IV, AHORA);
    expect(inst[0]?.plazoNoCumplible).toBeFalse();
    expect(inst[0]?.texto).toContain('octubre');
  });

  it('un fármaco que requiere confirmación no muestra pauta hasta confirmar', () => {
    const plan: FarmacoPlan[] = [{
      resultado: { idFarmaco: 'plavix', nombreComercial: 'Plavix', principiosActivos: ['clopidogrel'], accion: 'consultar', textoPaciente: 'x', reglaAplicada: 'r', fuente: 'f', requiereConfirmacion: true },
      horas: ['09:00'],
      meta: { pt: 'dias', pd: 5, ad: false, ac: false },
    }];
    const contenido = construirContenidoQrPaciente(plan, '900123456', IV);
    const inst = recalcularHoja(contenido, IV, AHORA);
    expect(inst[0]?.texto).toContain('el anestesiólogo le llamará');
  });

  it('un fármaco "mantener" viaja con su texto fijo', () => {
    const plan: FarmacoPlan[] = [{
      resultado: { idFarmaco: 'bisoprolol', nombreComercial: 'Emconcor', principiosActivos: ['bisoprolol'], accion: 'mantener', textoPaciente: 'Siga tomándolo como siempre, también el día de la intervención, con un sorbo de agua.', reglaAplicada: 'r', fuente: 'f', requiereConfirmacion: false },
      horas: ['09:00'],
      meta: { pt: 'sin_plazo', ad: false, ac: false },
    }];
    const contenido = construirContenidoQrPaciente(plan, '900123456', IV);
    expect(contenido.far[0]?.tx).toContain('Siga tomándolo');
    const inst = recalcularHoja(contenido, IV, AHORA);
    expect(inst[0]?.texto).toContain('Siga tomándolo');
  });

  it('el payload del paciente lleva tipo, versión y caducidad', () => {
    const contenido = construirContenidoQrPaciente([], '900123456', IV);
    const cad = caducidadQrPaciente(new Date(2026, 9, 1), IV);
    const p = payloadPaciente(contenido, '0.1.0', new Date(2026, 9, 1), cad);
    expect(p.t).toBe('paciente');
    expect(p.v).toBe('0.1.0');
    expect(p.x).toBe(cad);
  });
});
