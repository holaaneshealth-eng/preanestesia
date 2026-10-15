/**
 * Modo entrenamiento (§14.2): carga los casos de casos_entrenamiento/*.json (entrevista
 * rellenada + resultados esperados) y los "hidrata" al estado de la entrevista para
 * mostrarlos en la aplicación con la banda ENTRENAMIENTO y comparar con lo esperado.
 * Los casos NO cuentan en el cuadro de mando de uso (§14.3).
 */
import { cargarProcedimientos } from '../../datos/procedimientos.ts';
import { HEMSTOP_VACIO, CONDICIONES_ESPECIALES_VACIO } from '../estadoEntrevista.ts';
import type { EstadoEntrevista, FarmacoTomadoUi } from '../estadoEntrevista.ts';
import type { DatosIntervencion, Modalidad, TecnicaAnestesica } from '../../dominio/tipos.ts';
import type { RespuestasModulos } from '../../datos/modulos.ts';

interface CasoJson {
  id: string;
  titulo: string;
  descripcion: string;
  modalidad: Modalidad;
  esperado: string[];
  intervencion: {
    procedimientoId: string;
    fecha?: string;
    hora?: string;
    /** Técnica del caso (un solo valor en el JSON; se convierte a lista al hidratar). */
    tecnica: TecnicaAnestesica;
    contrasteYodado: DatosIntervencion['contrasteYodado'];
  };
  basicos: EstadoEntrevista['basicos'];
  cribado?: { ningunaConocida?: boolean; enfermedades?: string[]; respuestasModulos?: RespuestasModulos; otrasEnfermedades?: Array<{ nombre: string; detalle?: string }> };
  medicacion?: FarmacoTomadoUi[];
  consentimiento?: EstadoEntrevista['consentimiento'];
  habitos?: EstadoEntrevista['habitos'];
  viaAerea?: EstadoEntrevista['viaAerea'];
}

export interface CasoEntrenamiento {
  id: string;
  titulo: string;
  descripcion: string;
  esperado: string[];
  modalidad: Modalidad;
  entrevista: EstadoEntrevista;
}

const CASOS_JSON = import.meta.glob('../../../casos_entrenamiento/*.json', { eager: true, import: 'default' }) as Record<string, CasoJson>;

/** Construye el estado de la entrevista a partir de un caso serializado. */
function hidratar(c: CasoJson): CasoEntrenamiento {
  const procedimiento = cargarProcedimientos().find((p) => p.id === c.intervencion.procedimientoId) ?? null;
  const fechaHora = c.intervencion.fecha
    ? new Date(`${c.intervencion.fecha}T${c.intervencion.hora ?? '08:00'}`)
    : null;
  const intervencion: DatosIntervencion | null = procedimiento
    ? {
        fechaHora,
        fechaDesconocida: fechaHora === null,
        horaAsumida: false,
        procedimientoId: procedimiento.id,
        riesgoCardiovascular: procedimiento.riesgoCardiovascular,
        riesgoHemorragico: procedimiento.riesgoHemorragico,
        grupoOftalmologico: procedimiento.grupoOftalmologico,
        neuroaxialProbable: procedimiento.neuroaxialProbable,
        duracionMayor30min: procedimiento.duracionMayor30min,
        riesgoTromboticoAlto: procedimiento.riesgoTromboticoAlto,
        espacioCerrado: procedimiento.espacioCerrado,
        retina: procedimiento.retina,
        contrasteYodado: c.intervencion.contrasteYodado,
        tecnicas: [c.intervencion.tecnica],
        ...(procedimiento.zonaDispositivo ? { zonaDispositivo: procedimiento.zonaDispositivo } : {}),
      }
    : null;

  const entrevista: EstadoEntrevista = {
    intervencion,
    procedimiento,
    basicos: c.basicos,
    antecedentes: null,
    mtnd4: null,
    alergias: null,
    cribado: {
      ningunaConocida: c.cribado?.ningunaConocida ?? true,
      enfermedades: c.cribado?.enfermedades ?? [],
      respuestasModulos: c.cribado?.respuestasModulos ?? {},
      hemstop: { ...HEMSTOP_VACIO },
      condicionesEspeciales: { ...CONDICIONES_ESPECIALES_VACIO },
      otrasEnfermedades: c.cribado?.otrasEnfermedades ?? [],
    },
    pruebasComplementarias: null,
    medicacion: c.medicacion ?? [],
    viaAerea: c.viaAerea ?? null,
    consentimiento: c.consentimiento ?? null,
    habitos: c.habitos ?? null,
    validaciones: {},
    aclaramientoManual: null,
  };

  return { id: c.id, titulo: c.titulo, descripcion: c.descripcion, esperado: c.esperado, modalidad: c.modalidad, entrevista };
}

export const CASOS_ENTRENAMIENTO: CasoEntrenamiento[] = Object.values(CASOS_JSON)
  .map(hidratar)
  .sort((a, b) => a.titulo.localeCompare(b.titulo));
