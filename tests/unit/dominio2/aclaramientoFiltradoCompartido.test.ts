/**
 * Punto 8 (corrección 4): el aclaramiento se resuelve IGUAL en los tres sitios donde
 * se calcula el plan de medicación —el paso 8 (vista previa), el resumen del
 * anestesiólogo y la hoja del paciente—, usando el filtrado glomerular de la analítica
 * como sustituto cuando no hay creatinina ni aclaramiento propios. Esta prueba comprueba
 * que, para un ACOD con SOLO el filtrado apuntado, los tres caminos dan el mismo plazo.
 *
 * Los tres sitios comparten dos funciones puras:
 *   - resolverAclaramiento(..., filtradoGlomerular): resuelve el valor y la fuente.
 *   - construirContexto(..., aclaramientoAproximadoFiltrado): monta el contexto.
 * El resumen y la hoja, además, pasan por construirPlanPaciente.
 */
import { describe, it, expect } from '../../_harness.ts';
import type { DatosIntervencion } from '../../../src/dominio/tipos.ts';
import { resolverAclaramiento } from '../../../src/dominio/entrevista/aclaramiento.ts';
import { construirContexto } from '../../../src/dominio/reglas/motor.ts';
import { evaluarCombinacionUi } from '../../../src/dominio/reglas/despachador.ts';
import { HECHOS_VACIOS } from '../../../src/dominio/entrevista/hechosClinicos.ts';
import { construirPlanPaciente } from '../../../src/ui/paciente/construirPlanUi.ts';
import type { FarmacoTomadoUi } from '../../../src/ui/estadoEntrevista.ts';

const IV = new Date(2026, 9, 15, 8, 0); // jueves 15/10/2026 08:00
const HOY = new Date(2026, 8, 29);
const DATOS = { edadAnios: 70, pesoKg: 70, sexo: 'hombre' as const };
const FILTRADO = 40; // mL/min/1,73 m²

const intervencion: DatosIntervencion = {
  fechaHora: IV,
  fechaDesconocida: false,
  horaAsumida: false,
  procedimientoId: 'hernioplastia',
  riesgoHemorragico: 'alto',
  riesgoCardiovascular: 'intermedio',
  grupoOftalmologico: 'no_aplica',
  neuroaxialProbable: false,
  duracionMayor30min: true,
  riesgoTromboticoAlto: false,
  espacioCerrado: false,
  retina: false,
  contrasteYodado: 'no',
  tecnicas: ['general'],
};

const edoxaban: FarmacoTomadoUi = {
  idFarmaco: 'edoxaban',
  nombreComercial: 'Lixiana',
  principiosActivos: ['edoxaban'],
  idRegla: 'acod_antixa',
  idReglas: ['acod_antixa'],
  grupo: 'anticoagulantes',
  subgrupo: 'acod',
  pautaTipica: 'diaria',
  via: 'oral',
  requiereConfirmacionCatalogo: false,
  indicacionesPosibles: [],
  horas: ['09:00'],
};

describe('Punto 8 · el aclaramiento por filtrado da el mismo plazo en los tres sitios', () => {
  it('ACOD con solo el filtrado glomerular: paso 8, resumen y hoja coinciden', () => {
    // Resolución compartida (los tres sitios la llaman igual).
    const resuelto = resolverAclaramiento(null, { tipo: 'no_disponible' }, DATOS, null, FILTRADO);
    expect(resuelto.valor).toBe(FILTRADO);
    expect(resuelto.fuente).toBe('filtrado_glomerular');
    const aproximado = resuelto.fuente === 'filtrado_glomerular';

    // 1) Paso 8 (vista previa): construirContexto + evaluarCombinacionUi.
    const ctxPaso8 = construirContexto(intervencion, DATOS.pesoKg, resuelto.valor, undefined, HOY, aproximado);
    const datosFarmaco = {
      idFarmaco: edoxaban.idFarmaco,
      nombreComercial: edoxaban.nombreComercial,
      principiosActivos: edoxaban.principiosActivos,
      idRegla: edoxaban.idRegla,
      via: edoxaban.via,
      horas: edoxaban.horas,
    };
    const rPaso8 = evaluarCombinacionUi(datosFarmaco, edoxaban.idReglas, ctxPaso8, HECHOS_VACIOS);

    // 2) y 3) Resumen y hoja del paciente: ambos usan construirPlanPaciente con el
    // aclaramiento ya resuelto en clin y el flag de aproximación.
    const clin = { ...HECHOS_VACIOS, aclaramiento: resuelto.valor };
    const plan = construirPlanPaciente([edoxaban], intervencion, clin, DATOS.pesoKg, HOY, aproximado);
    const rPlan = plan[0]!.resultado;

    // Los tres proponen una suspensión con la MISMA fecha/hora de última toma.
    expect(rPaso8.accion).toBe('suspender');
    expect(rPlan.accion).toBe('suspender');
    expect(rPaso8.fechaHoraUltimaToma?.getTime()).toBe(rPlan.fechaHoraUltimaToma?.getTime());

    // Y dejan el mismo punto de validación amarillo (función renal estimada).
    expect(rPaso8.puntoValidacion?.tipo).toBe('validar');
    expect(rPlan.puntoValidacion?.tipo).toBe('validar');
  });
});
