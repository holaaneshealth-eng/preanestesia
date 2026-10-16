/**
 * Paso 8 — Medicación habitual (R3.2.24–R3.2.27).
 * Buscador sobre farmacos.csv (tolerante a tildes/mayúsculas/erratas). Por cada
 * fármaco se recogen, de forma cómoda en tablet: las horas de toma (botones + hora
 * libre), el día de la semana (semanales), la fecha de la última dosis y la
 * periodicidad (biológicos/antiangiogénicos), las unidades y la hora (insulinas) y
 * la dosis cuando la regla depende de ella. Se muestra en vivo el resultado del
 * motor (qué hacer y última toma) y las tarjetas del asistente de coherencia (§5b).
 */
import { useMemo, useState } from 'react';
import type { DatosIntervencion, Sexo } from '../../dominio/tipos.ts';
import { construirContexto } from '../../dominio/reglas/motor.ts';
import { evaluarCombinacionUi, metadatosPlazo, type DatosFarmacoUi } from '../../dominio/reglas/despachador.ts';
import { derivarHechosClinicos, type DatosClinicos } from '../../dominio/entrevista/hechosClinicos.ts';
import type { RespuestasModulos } from '../../datos/modulos.ts';
import { recalcularHoja, type FarmacoQr } from '../../dominio/salidas/qr/hojaPaciente.ts';
import { textoHojaPaciente } from '../../dominio/salidas/hojaFarmaco.ts';
import {
  tarjetaFarmacoAEnfermedad,
  tarjetasEnfermedadAFarmaco,
  type Tarjeta,
} from '../../dominio/coherencia/coherencia.ts';
import { cargarFarmacos, buscarFarmacos, type FarmacoCatalogoUi } from '../../datos/farmacos.ts';
import { HORAS_FRECUENTES, reglaNecesitaHoras, reglaDependeAclaramiento, UNIDADES_DOSIS, FRECUENCIAS, horasEsperadasDeFrecuencia, type FarmacoTomadoUi, type AclaramientoManual } from '../estadoEntrevista.ts';
import { resolverAclaramiento } from '../../dominio/entrevista/aclaramiento.ts';
import reglasFarmacos from '../../../datos/reglas_farmacos.json';
import { clasificarHbpm, type TablaSeth } from '../../dominio/reglas/heparinas.ts';

const TABLAS_SETH = reglasFarmacos.tablas_seth as Record<string, TablaSeth>;

/**
 * Cambios parciales a un fármaco. A diferencia de `Partial<FarmacoTomadoUi>`, admite
 * `undefined` como valor explícito (con `exactOptionalPropertyTypes`), de modo que un
 * campo opcional (dosis, frecuencia…) pueda vaciarse al desmarcarlo.
 */
type CambioFarmaco = { [K in keyof FarmacoTomadoUi]?: FarmacoTomadoUi[K] | undefined };

interface Props {
  inicial: FarmacoTomadoUi[] | null;
  intervencion: DatosIntervencion;
  /** Enfermedades marcadas en el paso 7 (para la coherencia enfermedad→fármaco). */
  enfermedades: string[];
  /** Respuestas de los módulos del paso 7 (para derivar los hechos clínicos). */
  respuestasModulos: RespuestasModulos;
  /** Datos básicos del paso 2 (para el aclaramiento y el peso del contexto). */
  basicos: { edadAnios: number; pesoKg: number; sexo: Sexo };
  /** Aclaramiento introducido a mano (único para toda la entrevista, §8.2/§8.4). */
  aclaramientoManual: AclaramientoManual | null;
  /**
   * Filtrado glomerular apuntado en el paso de pruebas (punto 8, 1.1): sustituto del
   * aclaramiento cuando no hay creatinina ni aclaramiento propios. Debe resolverse igual
   * aquí, en el resumen y en la hoja del paciente (función compartida resolverAclaramiento).
   */
  filtradoGlomerular?: number;
  /** Cambia el aclaramiento manual (se recalculan las reglas renales). */
  onAclaramientoManual: (a: AclaramientoManual | null) => void;
  onContinuar: (medicacion: FarmacoTomadoUi[]) => void;
  /** Al volver se conserva la medicación introducida (para recalcular tras cambiar la técnica). */
  onVolver: (medicacion: FarmacoTomadoUi[]) => void;
  /**
   * Ir directamente al paso de enfermedades desde un aviso de coherencia (§7 fase ágil);
   * conserva la medicación y, al pulsar «Continuar» allí, se vuelve a este paso.
   */
  onIrAEnfermedades: (medicacion: FarmacoTomadoUi[]) => void;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function PasoMedicacion({ inicial, intervencion, enfermedades, respuestasModulos, basicos, aclaramientoManual, filtradoGlomerular, onAclaramientoManual, onContinuar, onVolver, onIrAEnfermedades }: Props) {
  const catalogo = useMemo(() => cargarFarmacos(), []);
  const [medicacion, setMedicacion] = useState<FarmacoTomadoUi[]>(inicial ?? []);
  const [consulta, setConsulta] = useState('');

  const resultados = useMemo(() => buscarFarmacos(catalogo, consulta), [catalogo, consulta]);

  // Hechos clínicos derivados de la entrevista (§5, §7): ningún dato fijo.
  const hechos = useMemo<DatosClinicos>(
    () => derivarHechosClinicos({
      respuestas: respuestasModulos,
      enfermedades: new Set(enfermedades),
      medicacion: medicacion.map((f) => ({ principiosActivos: f.principiosActivos, idRegla: f.idRegla })),
      edadAnios: basicos.edadAnios,
      pesoKg: basicos.pesoKg,
      sexo: basicos.sexo,
      fechaIntervencion: intervencion.fechaHora,
      espacioCerrado: intervencion.espacioCerrado,
      contrasteYodado: intervencion.contrasteYodado,
    }),
    [respuestasModulos, enfermedades, medicacion, basicos, intervencion.fechaHora],
  );

  // Aclaramiento efectivo (§8.2/§8.4): el del módulo renal/trasplante si existe; si
  // no, el introducido a mano en este paso. Valor único para toda la entrevista.
  const aclaramiento = useMemo(
    () => resolverAclaramiento(hechos.aclaramiento, aclaramientoManual, basicos, null, filtradoGlomerular ?? null),
    [hechos.aclaramiento, aclaramientoManual, basicos, filtradoGlomerular],
  );
  // ¿Hay algún fármaco cuya suspensión dependa del riñón y el aclaramiento no venga de un módulo?
  const pedirAclaramiento = aclaramiento.fuente !== 'modulo' && medicacion.some((f) => reglaDependeAclaramiento(f.idRegla));

  function anadir(f: FarmacoCatalogoUi) {
    const nuevo: FarmacoTomadoUi = {
      idFarmaco: f.id,
      nombreComercial: f.nombresComerciales[0] ?? f.id,
      principiosActivos: f.principiosActivos,
      idRegla: f.idRegla[0] ?? 'mantener_generico',
      idReglas: f.idRegla.length > 0 ? f.idRegla : ['mantener_generico'],
      grupo: f.grupo,
      subgrupo: f.subgrupo,
      pautaTipica: f.pautaTipica,
      via: f.via,
      requiereConfirmacionCatalogo: f.requiereConfirmacion,
      indicacionesPosibles: f.indicacionesPosibles,
      horas: [],
      ...(f.textoPaciente ? { textoPaciente: f.textoPaciente } : {}),
      ...(f.textoAnestesiologo ? { textoAnestesiologo: f.textoAnestesiologo } : {}),
    };
    setMedicacion((m) => [...m, nuevo]);
    setConsulta('');
  }
  function actualizar(i: number, cambios: CambioFarmaco) {
    setMedicacion((m) => m.map((f, j) => (j === i ? ({ ...f, ...cambios } as FarmacoTomadoUi) : f)));
  }
  function quitar(i: number) {
    setMedicacion((m) => m.filter((_, j) => j !== i));
  }

  // Coherencia (§5b):
  //  - enfermedad→fármaco (§5b.2): enfermedades marcadas sin su tratamiento habitual.
  //  - fármaco→enfermedad (§5b.1): fármaco añadido cuya indicación no está entre las
  //    enfermedades recogidas (pregunta por qué lo toma).
  const enfermedadesSet = new Set(enfermedades);
  const gruposPresentes = new Set(medicacion.map((f) => grupoCoherencia(f)).filter(Boolean) as string[]);
  const tarjetasEnfermedad = tarjetasEnfermedadAFarmaco(enfermedadesSet, gruposPresentes);
  const tarjetasFarmaco = medicacion
    .map((f) => tarjetaFarmacoAEnfermedad({ nombre: f.nombreComercial, indicacionesPosibles: f.indicacionesPosibles }, enfermedadesSet))
    .filter((t): t is Tarjeta => t !== null);
  const tarjetas = [...tarjetasEnfermedad, ...tarjetasFarmaco];

  return (
    <section className="tarjeta" aria-labelledby="paso8-tit">
      <h2 id="paso8-tit">Paso 8 · Medicación habitual</h2>

      <div className="campo">
        <label htmlFor="med">Añadir medicamento (nombre comercial o principio activo)</label>
        <input id="med" type="search" autoComplete="off" placeholder="p. ej. Eliquis, apixabán, Adiro…" value={consulta} onChange={(e) => setConsulta(e.target.value)} />
        {resultados.length > 0 && (
          <ul className="lista-resultados" role="listbox">
            {resultados.map((f) => (
              <li key={f.id}>
                <button type="button" className="opcion-resultado" onClick={() => anadir(f)}>
                  <span className="opcion-nombre">{f.nombresComerciales[0] ?? f.id}</span>
                  <span className="opcion-especialidad">{f.principiosActivos.join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {medicacion.length === 0 ? (
        <p>No se ha añadido ningún medicamento.</p>
      ) : (
        medicacion.map((f, i) => (
          <FichaFarmaco
            key={`${f.idFarmaco}-${i}`}
            f={f}
            intervencion={intervencion}
            hechos={hechos}
            aclaramientoEfectivo={aclaramiento.valor}
            aclaramientoAproximadoFiltrado={aclaramiento.fuente === 'filtrado_glomerular'}
            pesoKg={basicos.pesoKg}
            onCambio={(c) => actualizar(i, c)}
            onQuitar={() => quitar(i)}
          />
        ))
      )}

      {/* Aclaramiento de creatinina (§8.2/§8.4): se pide aquí cuando un fármaco renal
          lo necesita y no viene de un módulo. Valor único para toda la entrevista. */}
      {pedirAclaramiento && (
        <AclaramientoFicha
          manual={aclaramientoManual}
          resuelto={aclaramiento.valor}
          onCambio={onAclaramientoManual}
        />
      )}

      {tarjetas.length > 0 && (
        <div className="coherencia">
          <h3>Avisos de coherencia</h3>
          {tarjetas.map((t, i) => (
            <TarjetaCoherencia key={i} t={t} onIrAEnfermedades={() => onIrAEnfermedades(medicacion)} />
          ))}
        </div>
      )}

      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={() => onVolver(medicacion)}>Volver</button>
        <button type="button" className="boton-primario" onClick={() => onContinuar(medicacion)}>Continuar</button>
      </div>
    </section>
  );
}

function FichaFarmaco({
  f,
  intervencion,
  hechos,
  aclaramientoEfectivo,
  aclaramientoAproximadoFiltrado,
  pesoKg,
  onCambio,
  onQuitar,
}: {
  f: FarmacoTomadoUi;
  intervencion: DatosIntervencion;
  hechos: DatosClinicos;
  /** Aclaramiento efectivo (módulo, manual o filtrado glomerular); sustituye a hechos.aclaramiento. */
  aclaramientoEfectivo: number | null;
  /** Punto 8 (1.1): el aclaramiento es una aproximación por el filtrado glomerular. */
  aclaramientoAproximadoFiltrado: boolean;
  pesoKg: number;
  onCambio: (c: CambioFarmaco) => void;
  onQuitar: () => void;
}) {
  const [horaLibre, setHoraLibre] = useState('');
  const necesitaHoras = reglaNecesitaHoras(f.idRegla);
  const esSemanal = f.pautaTipica === 'semanal' || f.idRegla === 'glp1_semanal';
  const esBiologico = f.idRegla === 'biologico' || f.idRegla.startsWith('antiangiogenico');
  const esInsulinaBasal = f.idRegla === 'insulina_basal';
  const esInsulinaNph = f.idRegla === 'insulina_nph';
  const esInsulinaPremezclada = f.idRegla === 'insulina_premezclada';
  const esHbpmSeth = f.idRegla === 'hbpm';
  const esFondaparinux = f.idRegla === 'fondaparinux';
  const tablaSeth = TABLAS_SETH[f.principiosActivos[0] ?? ''];
  const unidadHbpm = tablaSeth?.unidad ?? 'mg';
  const necesitaDosis = f.idRegla === 'aas' || f.idRegla === 'metotrexato';

  /** Reclasifica la HBPM (§8.4) al cambiar dosis o pauta y fija tipoHbpm. */
  function actualizarHbpm(cambios: Partial<FarmacoTomadoUi>) {
    const dosis = cambios.hbpmDosis ?? f.hbpmDosis;
    const tomas = cambios.hbpmTomasDia ?? f.hbpmTomasDia;
    let tipo: FarmacoTomadoUi['tipoHbpm'] = f.tipoHbpm;
    if (dosis && tomas && tablaSeth) {
      tipo = clasificarHbpm({ dosisPorToma: dosis, tomasDia: tomas, pesoKg, aclaramiento: aclaramientoEfectivo }, tablaSeth);
    }
    onCambio({ ...cambios, ...(tipo ? { tipoHbpm: tipo } : {}) });
  }
  const esOpioide = f.grupo === 'opioides';
  const esParche = esOpioide && f.via === 'transdermica';
  // ¿La regla ya tiene su propio campo de dosis? Entonces no se duplica la dosis genérica.
  const dosisPropia = necesitaDosis || esInsulinaBasal || esInsulinaNph || esInsulinaPremezclada || esHbpmSeth || esOpioide;
  // Aviso si la frecuencia elegida no cuadra con el número de horas de toma.
  const horasEsperadas = horasEsperadasDeFrecuencia(f.frecuencia);
  const descuadreFrecuencia = necesitaHoras && horasEsperadas !== undefined && f.horas.length > 0 && f.horas.length !== horasEsperadas;

  function alternarHora(h: string) {
    const horas = f.horas.includes(h) ? f.horas.filter((x) => x !== h) : [...f.horas, h].sort();
    onCambio({ horas });
  }
  function anadirHoraLibre() {
    if (!/^\d{1,2}:\d{2}$/.test(horaLibre) || f.horas.includes(horaLibre)) return;
    onCambio({ horas: [...f.horas, horaLibre].sort() });
    setHoraLibre('');
  }

  const resultado = evaluarFicha(f, intervencion, hechos, pesoKg, aclaramientoEfectivo, aclaramientoAproximadoFiltrado);

  return (
    <div className="ficha-farmaco">
      <div className="ficha-cabecera">
        <strong>{f.nombreComercial}</strong> <span className="opcion-especialidad">{f.principiosActivos.join(', ')}</span>
        <button type="button" className="boton-enlace" onClick={onQuitar}>Quitar</button>
      </div>

      {necesitaHoras && (
        <div className="campo">
          <label>Horas de toma</label>
          <div className="grupo-botones-hora">
            {HORAS_FRECUENTES.map((h) => (
              <button key={h} type="button" className={`chip-hora ${f.horas.includes(h) ? 'seleccionado' : ''}`} onClick={() => alternarHora(h)}>
                {h}
              </button>
            ))}
          </div>
          <div className="hora-libre">
            <input type="time" value={horaLibre} onChange={(e) => setHoraLibre(e.target.value)} aria-label="Hora libre" />
            <button type="button" className="boton-secundario" onClick={anadirHoraLibre}>Añadir hora</button>
          </div>
          {f.horas.length > 0 && <p className="horas-elegidas">Horas: {f.horas.join(', ')}</p>}
        </div>
      )}

      {esSemanal && (
        <div className="campo">
          <label htmlFor={`dia-${f.idFarmaco}`}>Día de la semana</label>
          <select id={`dia-${f.idFarmaco}`} value={f.diaSemana ?? ''} onChange={(e) => onCambio({ diaSemana: Number(e.target.value) })}>
            <option value="" disabled>Elija un día</option>
            {DIAS_SEMANA.map((d, idx) => (
              <option key={idx} value={idx}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {esBiologico && (
        <>
          <div className="campo">
            <label htmlFor={`fud-${f.idFarmaco}`}>Fecha de la última dosis</label>
            <input id={`fud-${f.idFarmaco}`} type="date" value={f.fechaUltimaDosis ?? ''} onChange={(e) => onCambio({ fechaUltimaDosis: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor={`per-${f.idFarmaco}`}>Periodicidad (días entre dosis)</label>
            <input id={`per-${f.idFarmaco}`} type="number" min={1} inputMode="numeric" value={f.periodicidadDias ?? ''} onChange={(e) => onCambio({ periodicidadDias: Number(e.target.value) })} />
          </div>
        </>
      )}

      {esInsulinaBasal && (
        <div className="campo">
          <label htmlFor={`ub-${f.idFarmaco}`}>Unidades de la dosis basal</label>
          <input id={`ub-${f.idFarmaco}`} type="number" min={0} inputMode="numeric" value={f.insulinaBasalUi ?? ''} onChange={(e) => onCambio({ insulinaBasalUi: Number(e.target.value) })} />
        </div>
      )}
      {(esInsulinaNph || esInsulinaPremezclada) && (
        <>
          {esInsulinaNph && (
            <div className="campo">
              <label htmlFor={`un-${f.idFarmaco}`}>Unidades de la noche</label>
              <input id={`un-${f.idFarmaco}`} type="number" min={0} inputMode="numeric" value={f.insulinaNocheUi ?? ''} onChange={(e) => onCambio({ insulinaNocheUi: Number(e.target.value) })} />
            </div>
          )}
          <div className="campo">
            <label htmlFor={`um-${f.idFarmaco}`}>Unidades de la mañana</label>
            <input id={`um-${f.idFarmaco}`} type="number" min={0} inputMode="numeric" value={f.insulinaMananaUi ?? ''} onChange={(e) => onCambio({ insulinaMananaUi: Number(e.target.value) })} />
          </div>
        </>
      )}

      {esHbpmSeth && (
        <div className="campo">
          <label htmlFor={`hbpmd-${f.idFarmaco}`}>Dosis por toma ({unidadHbpm})</label>
          <input id={`hbpmd-${f.idFarmaco}`} type="number" min={0} inputMode="decimal" value={f.hbpmDosis ?? ''} onChange={(e) => actualizarHbpm({ hbpmDosis: Number(e.target.value) })} />
          <label htmlFor={`hbpmt-${f.idFarmaco}`}>Tomas al día</label>
          <select id={`hbpmt-${f.idFarmaco}`} value={f.hbpmTomasDia ?? ''} onChange={(e) => actualizarHbpm({ hbpmTomasDia: Number(e.target.value) })}>
            <option value="" disabled>Elija</option>
            <option value={1}>1 (cada 24 h)</option>
            <option value={2}>2 (cada 12 h)</option>
          </select>
          <p className="horas-elegidas">
            Clasificación (SETH): <strong>{f.tipoHbpm ?? 'pendiente de dosis y pauta'}</strong>
            {f.tipoHbpm === 'indeterminada' ? ' — no encaja; se preguntará al anestesiólogo' : ''}
          </p>
        </div>
      )}

      {esFondaparinux && (
        <div className="campo">
          <label>Dosis del fondaparinux</label>
          <div className="grupo-radios">
            {(['profilactica', 'terapeutica'] as const).map((t) => (
              <label key={t} className={`radio-tarjeta ${f.tipoHbpm === t ? 'seleccionado' : ''}`}>
                <input type="radio" name={`hbpm-${f.idFarmaco}`} checked={f.tipoHbpm === t} onChange={() => onCambio({ tipoHbpm: t })} />
                {t === 'profilactica' ? 'Profiláctica (preventiva)' : 'Terapéutica (tratamiento)'}
              </label>
            ))}
          </div>
        </div>
      )}

      {necesitaDosis && (
        <div className="campo">
          <label htmlFor={`dosis-${f.idFarmaco}`}>Dosis {f.idRegla === 'metotrexato' ? '(mg/semana)' : '(mg/día)'}</label>
          <input id={`dosis-${f.idFarmaco}`} type="number" min={0} inputMode="numeric" value={f.dosisMg ?? ''} onChange={(e) => onCambio({ dosisMg: Number(e.target.value) })} />
        </div>
      )}

      {esOpioide && (
        <div className="campo">
          <label htmlFor={`opdosis-${f.idFarmaco}`}>{esParche ? 'Dosis del parche (µg/h)' : 'Dosis por toma (mg)'}</label>
          <input id={`opdosis-${f.idFarmaco}`} type="number" min={0} inputMode="decimal" value={f.opioideDosis ?? ''} onChange={(e) => onCambio({ opioideDosis: Number(e.target.value) })} />
          {!esParche && (
            <>
              <label htmlFor={`optomas-${f.idFarmaco}`}>Tomas al día</label>
              <input id={`optomas-${f.idFarmaco}`} type="number" min={0} inputMode="numeric" value={f.opioideTomasDia ?? ''} onChange={(e) => onCambio({ opioideTomasDia: Number(e.target.value) })} />
            </>
          )}
        </div>
      )}

      {/* Dosis genérica (solo si la regla no pide ya una dosis propia) y frecuencia (§8). */}
      {!dosisPropia && (
        <div className="campo">
          <label htmlFor={`dc-${f.idFarmaco}`}>Dosis (opcional)</label>
          <div className="dosis-generica">
            <input id={`dc-${f.idFarmaco}`} type="number" min={0} inputMode="decimal" step="0.01" placeholder="cantidad" value={f.dosisCantidad ?? ''} onChange={(e) => onCambio({ dosisCantidad: e.target.value === '' ? undefined : Number(e.target.value) })} />
            <select aria-label="Unidad" value={f.dosisUnidad ?? ''} onChange={(e) => onCambio({ dosisUnidad: e.target.value || undefined })}>
              <option value="">unidad</option>
              {UNIDADES_DOSIS.map((u) => <option key={u.valor} value={u.valor}>{u.etiqueta}</option>)}
            </select>
            {f.dosisUnidad === 'otra' && (
              <input type="text" aria-label="Otra unidad" placeholder="otra unidad" value={f.dosisUnidadOtra ?? ''} onChange={(e) => onCambio({ dosisUnidadOtra: e.target.value || undefined })} />
            )}
          </div>
        </div>
      )}

      <div className="campo">
        <label htmlFor={`fr-${f.idFarmaco}`}>Frecuencia (opcional)</label>
        <select id={`fr-${f.idFarmaco}`} value={f.frecuencia ?? ''} onChange={(e) => onCambio({ frecuencia: e.target.value || undefined })}>
          <option value="">— elija —</option>
          {FRECUENCIAS.map((fr) => <option key={fr.valor} value={fr.valor}>{fr.etiqueta}</option>)}
        </select>
        {f.frecuencia === 'otra' && (
          <input type="text" aria-label="Otra frecuencia" placeholder="otra frecuencia" value={f.frecuenciaOtra ?? ''} onChange={(e) => onCambio({ frecuenciaOtra: e.target.value || undefined })} />
        )}
        {descuadreFrecuencia && (
          <p className="aviso aviso-atencion" role="note">
            La frecuencia elegida no cuadra con las {f.horas.length} horas de toma marcadas
            (se esperaban {horasEsperadas}). Revise las horas o la frecuencia.
          </p>
        )}
      </div>

      {/* Resultado del motor en vivo */}
      <div className={`resultado-motor ${resultado.claseAviso}`} aria-live="polite">
        {resultado.texto}
      </div>
    </div>
  );
}

interface ResultadoFicha {
  texto: string;
  claseAviso: string;
}

/** Calcula el resultado en vivo de un fármaco. Con fecha usa el despachador; sin
 *  fecha usa el modo margen del QR (garantía §8.16: nunca llama a construirContexto). */
function evaluarFicha(f: FarmacoTomadoUi, intervencion: DatosIntervencion, hechos: DatosClinicos, pesoKg: number, aclaramientoEfectivo: number | null, aclaramientoAproximadoFiltrado = false): ResultadoFicha {
  const necesitaHoras = reglaNecesitaHoras(f.idRegla);
  if (necesitaHoras && f.horas.length === 0) {
    return { texto: 'Requiere dato: hora de la toma.', claseAviso: 'aviso-atencion' };
  }

  const meta = metadatosPlazo(f.idRegla, f.dosisMg, f.tipoHbpm);

  // Sin fecha (§8.16): modo margen, sin construirContexto.
  if (intervencion.fechaDesconocida || intervencion.fechaHora === null) {
    const item: FarmacoQr = {
      n: f.nombreComercial,
      pt: meta.pt,
      hh: f.horas,
      ad: meta.ad,
      ac: meta.ac,
      rc: f.requiereConfirmacionCatalogo,
      ...(meta.pd !== undefined ? { pd: meta.pd } : {}),
    };
    const inst = recalcularHoja({ tel: '', fi: null, far: [item] }, null);
    return { texto: inst[0]?.texto ?? '', claseAviso: 'aviso-info' };
  }

  // Con fecha: despachador del motor, con peso y aclaramiento reales (módulo, manual o
  // filtrado glomerular del paso de pruebas como aproximación, punto 8).
  const ctx = construirContexto(intervencion, pesoKg, aclaramientoEfectivo, undefined, undefined, aclaramientoAproximadoFiltrado);
  const datos: DatosFarmacoUi = {
    idFarmaco: f.idFarmaco,
    nombreComercial: f.nombreComercial,
    principiosActivos: f.principiosActivos,
    idRegla: f.idRegla,
    via: f.via,
    horas: f.horas,
    ...(f.dosisMg !== undefined ? { dosisMg: f.dosisMg } : {}),
    ...(f.diaSemana !== undefined ? { proximaDosisSemanal: proximaDosisSemanal(f.diaSemana, intervencion.fechaHora) } : {}),
    ...(f.fechaUltimaDosis ? { fechaUltimaDosis: new Date(`${f.fechaUltimaDosis}T00:00`) } : {}),
    ...(f.periodicidadDias !== undefined ? { periodicidadDias: f.periodicidadDias } : {}),
    ...(f.insulinaBasalUi !== undefined ? { insulinaBasalUi: f.insulinaBasalUi } : {}),
    ...(f.insulinaNocheUi !== undefined ? { insulinaNocheUi: f.insulinaNocheUi } : {}),
    ...(f.insulinaMananaUi !== undefined ? { insulinaMananaUi: f.insulinaMananaUi } : {}),
    ...(f.tipoHbpm ? { tipoHbpm: f.tipoHbpm } : {}),
    ...(f.requiereConfirmacionCatalogo ? { requiereConfirmacionCatalogo: true } : {}),
    ...(f.textoPaciente ? { textoPacienteOverride: f.textoPaciente } : {}),
    ...(f.textoAnestesiologo ? { textoAnestesiologoOverride: f.textoAnestesiologo } : {}),
  };
  const r = evaluarCombinacionUi(datos, f.idReglas, ctx, hechos);
  const texto = textoHojaPaciente(r);
  const clase = r.requiereConfirmacion ? 'aviso-atencion' : 'aviso-info';
  return { texto: `${accionLegible(r.accion)}: ${texto}`, claseAviso: clase };
}

function accionLegible(a: string): string {
  switch (a) {
    case 'mantener': return 'Mantener';
    case 'suspender': return 'Suspender';
    case 'ajustar': return 'Ajustar';
    case 'consultar': return 'Consultar con el anestesiólogo';
    default: return a;
  }
}

/** Próxima dosis semanal: el próximo día de la semana indicado ≤ intervención. */
function proximaDosisSemanal(diaSemana: number, intervencion: Date): Date {
  const d = new Date(intervencion);
  // Retrocede hasta el día de la semana pedido dentro de la semana previa a la IQ.
  for (let i = 0; i < 8; i++) {
    if (d.getDay() === diaSemana) break;
    d.setDate(d.getDate() - 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Grupo de fármaco para la coherencia enfermedad→fármaco (§5b.2). */
function grupoCoherencia(f: FarmacoTomadoUi): string | null {
  const mapa: Record<string, string> = {
    anticoagulantes: 'anticoagulante',
    antiagregantes: 'antiagregante',
    antidiabeticos: 'antidiabetico',
    insulinas: 'insulina',
    cardiovascular: 'antihipertensivo',
    inmunosupresores: 'inmunosupresor',
    respiratorio: 'inhalador',
  };
  return mapa[f.grupo] ?? null;
}

function TarjetaCoherencia({ t, onIrAEnfermedades }: { t: Tarjeta; onIrAEnfermedades: () => void }) {
  return (
    <div className="aviso aviso-info" role="note">
      <div>{t.mensaje}</div>
      <button type="button" className="boton-enlace" onClick={onIrAEnfermedades}>Volver a enfermedades</button>
    </div>
  );
}

/** Ficha para introducir el aclaramiento (§8.2/§8.4) cuando un fármaco renal lo necesita. */
function AclaramientoFicha({
  manual,
  resuelto,
  onCambio,
}: {
  manual: AclaramientoManual | null;
  resuelto: number | null;
  onCambio: (a: AclaramientoManual | null) => void;
}) {
  const tipo = manual?.tipo ?? '';
  const valor = manual && (manual.tipo === 'aclaramiento' || manual.tipo === 'creatinina') ? String(manual.valor) : '';
  const fecha = manual && (manual.tipo === 'aclaramiento' || manual.tipo === 'creatinina') ? manual.fecha ?? '' : '';

  function cambiarTipo(nuevo: string) {
    if (nuevo === '') onCambio(null);
    else if (nuevo === 'no_disponible') onCambio({ tipo: 'no_disponible' });
    else onCambio({ tipo: nuevo as 'aclaramiento' | 'creatinina', valor: 0 });
  }
  function cambiarValor(v: string) {
    if (manual?.tipo !== 'aclaramiento' && manual?.tipo !== 'creatinina') return;
    onCambio({ ...manual, valor: Number(v) });
  }
  function cambiarFecha(d: string) {
    if (manual?.tipo !== 'aclaramiento' && manual?.tipo !== 'creatinina') return;
    onCambio({ ...manual, ...(d ? { fecha: d } : {}) });
  }

  return (
    <div className="ficha-farmaco" aria-labelledby="aclaramiento-tit">
      <div className="ficha-cabecera">
        <strong id="aclaramiento-tit">Función renal (para los anticoagulantes)</strong>
      </div>
      <p className="horas-elegidas">
        Un fármaco que ha añadido se suspende según la función renal. Introduzca el aclaramiento o la
        creatinina, o marque «No disponible».
      </p>
      <div className="campo">
        <label htmlFor="acl-tipo">Dato disponible</label>
        <select id="acl-tipo" value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
          <option value="">— elija —</option>
          <option value="aclaramiento">Aclaramiento de creatinina (mL/min)</option>
          <option value="creatinina">Creatinina sérica (mg/dL)</option>
          <option value="no_disponible">No disponible</option>
        </select>
      </div>
      {(tipo === 'aclaramiento' || tipo === 'creatinina') && (
        <>
          <div className="campo">
            <label htmlFor="acl-valor">{tipo === 'aclaramiento' ? 'Aclaramiento (mL/min)' : 'Creatinina (mg/dL)'}</label>
            <input id="acl-valor" type="number" min={0} inputMode="decimal" step="0.01" value={valor} onChange={(e) => cambiarValor(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="acl-fecha">Fecha de la analítica</label>
            <input id="acl-fecha" type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} />
          </div>
          {tipo === 'creatinina' && (
            <p className="horas-elegidas" aria-live="polite">
              {resuelto !== null
                ? `Aclaramiento calculado (Cockcroft-Gault): ${resuelto} mL/min.`
                : 'Introduzca la creatinina para calcular el aclaramiento.'}
            </p>
          )}
        </>
      )}
      {tipo === 'no_disponible' && (
        <p className="aviso aviso-atencion" role="note">
          Sin aclaramiento, los anticoagulantes dependientes del riñón se calculan con el supuesto más
          prudente (el plazo más largo) y quedan como punto de validación para el anestesiólogo.
        </p>
      )}
    </div>
  );
}

