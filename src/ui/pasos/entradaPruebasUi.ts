/**
 * Puente entre el paso «Pruebas complementarias» (UI) y el motor de pruebas (§7).
 * Convierte el estado del paso en lo que el motor necesita: las fechas de pruebas
 * recientes para la vigencia, y mapea las claves indicadas por el motor a las claves
 * de la UI (para marcar «Indicada» en el paso).
 */
import { calcularImc, type PruebasComplementariasUi, type ClavePruebaComplementaria, type EstadoEntrevista } from '../estadoEntrevista.ts';
import { derivarRiesgoYPruebas, type FechasPruebasRecientes } from '../../dominio/entrevista/riesgoYPruebas.ts';
import type { Prueba } from '../../dominio/pruebas/tablaPruebas.ts';
import { calcularHemstop } from '../../dominio/escalas/hemstop.ts';

/** Grupo antitrombótico de una regla (para la nota * de las pruebas). */
function grupoAntitrombotico(idRegla: string): string | null {
  if (/^(acod_|avk_)/.test(idRegla) || idRegla === 'hbpm' || idRegla === 'fondaparinux' || idRegla === 'heparina_sodica') return 'anticoagulante';
  if (/^p2y12_/.test(idRegla) || ['aas', 'triflusal', 'dipiridamol', 'cilostazol', 'gp_iibiiia', 'sulodexida'].includes(idRegla)) return 'antiagregante';
  return null;
}

/** ISO yyyy-mm-dd → Date (mediodía local, evita desfases de zona). */
function fecha(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Fechas de pruebas recientes para el motor (§7.4). La «analítica general» cubre
 * hemograma, bioquímica y coagulación (comparten informe), así que su fecha se aplica
 * a las tres. Solo cuentan las pruebas que el paciente tiene (traídas o no).
 */
export function fechasPruebasRecientes(p: PruebasComplementariasUi | null): FechasPruebasRecientes {
  if (!p) return {};
  const tiene = (c: ClavePruebaComplementaria) => p[c].estado === 'tiene_y_trajo' || p[c].estado === 'tiene_no_trajo';
  const out: FechasPruebasRecientes = {};
  if (tiene('analitica')) {
    const f = fecha(p.analitica.fecha);
    if (f) { out.hemograma = f; out.bioquimica = f; out.coagulacion = f; }
  }
  if (tiene('ecg')) { const f = fecha(p.ecg.fecha); if (f) out.ecg = f; }
  if (tiene('rx_torax')) { const f = fecha(p.rx_torax.fecha); if (f) out.rx_torax = f; }
  if (tiene('ecocardiograma')) { const f = fecha(p.ecocardiograma.fecha); if (f) out.ecocardiograma = f; }
  return out;
}

/** Mapea una clave de prueba del motor a la clave de la UI del paso de pruebas. */
export function claveUiDePrueba(prueba: Prueba): ClavePruebaComplementaria {
  switch (prueba) {
    case 'hemograma':
    case 'coagulacion':
    case 'bioquimica':
      return 'analitica';
    case 'bnp':
      return 'nt_probnp';
    case 'troponina':
      return 'troponina';
    case 'ecg':
      return 'ecg';
    case 'rx_torax':
      return 'rx_torax';
    case 'ecocardiograma':
      return 'ecocardiograma';
  }
}

/** Conjunto de claves de UI indicadas, a partir de la lista de pruebas del motor. */
export function clavesIndicadas(pruebas: Array<{ prueba: Prueba }>): Set<ClavePruebaComplementaria> {
  return new Set(pruebas.map((p) => claveUiDePrueba(p.prueba)));
}

/**
 * Calcula las pruebas indicadas (claves de UI) a partir de la entrevista, para marcar
 * «Indicada» en el paso de pruebas. Reúne lo que el motor necesita (clase de riesgo,
 * factores y vigencia) desde el cribado, los básicos, la intervención, los hábitos y
 * la medicación ya introducidos. Devuelve un conjunto vacío si faltan datos clave.
 */
export function derivarPruebasIndicadasUi(
  entrevista: EstadoEntrevista,
  fechaReferencia?: Date,
): Set<ClavePruebaComplementaria> {
  const { intervencion, basicos, cribado, habitos, medicacion, pruebasComplementarias } = entrevista;
  if (!intervencion || !basicos || !cribado) return new Set();

  const enfermedades = new Set(cribado.enfermedades);
  const respuestas = cribado.respuestasModulos;
  const imc = calcularImc(basicos.pesoKg, basicos.tallaCm);
  const hemstop = calcularHemstop(cribado.hemstop);
  const capacidadFuncionalReducida = habitos?.subeDosPisos === 'no';

  const rp = derivarRiesgoYPruebas({
    respuestas,
    enfermedades,
    edadAnios: basicos.edadAnios,
    imc,
    hemstopPositivo: hemstop.positivo,
    medicacionGrupos: new Set((medicacion ?? []).map((f) => grupoAntitrombotico(f.idRegla)).filter((g): g is string => g !== null)),
    riesgoCardiovascular: intervencion.riesgoCardiovascular,
    riesgoHemorragico: intervencion.riesgoHemorragico,
    neuroaxialProbable: intervencion.neuroaxialProbable,
    tecnicas: intervencion.tecnicas,
    fragilidad: habitos?.cfs !== undefined && habitos.cfs >= 5,
    capacidadFuncionalReducida,
    fechaIntervencion: intervencion.fechaHora ?? null,
    ...(fechaReferencia ? { fechaReferencia } : {}),
    pruebasRecientes: fechasPruebasRecientes(pruebasComplementarias ?? null),
  });
  return clavesIndicadas(rp.pruebas);
}
