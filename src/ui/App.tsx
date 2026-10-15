import { useCallback, useRef, useState } from 'react';
import config from '../../datos/config.json';
import { BandaPrueba } from './BandaPrueba.tsx';
import { useInactividad, useAvisoSalida } from './privacidad.ts';
import { registrarUso, type TipoPaciente } from './herramientas/registroUso.ts';
import { GuiaImprimible } from './herramientas/GuiaImprimible.tsx';
import { CuadroMando } from './herramientas/CuadroMando.tsx';
import { ModoEntrenamiento } from './entrenamiento/ModoEntrenamiento.tsx';
import type { CasoEntrenamiento } from './entrenamiento/casos.ts';
import { PasoIntervencion } from './pasos/PasoIntervencion.tsx';
import { PasoBasicos } from './pasos/PasoBasicos.tsx';
import { PasoAntecedentes } from './pasos/PasoAntecedentes.tsx';
import { PasoAlergias } from './pasos/PasoAlergias.tsx';
import { PasoHabitos } from './pasos/PasoHabitos.tsx';
import { PasoCribado } from './pasos/PasoCribado.tsx';
import { PasoMedicacion } from './pasos/PasoMedicacion.tsx';
import { PasoViaAerea } from './pasos/PasoViaAerea.tsx';
import { PasoConsentimiento } from './pasos/PasoConsentimiento.tsx';
import { PasoTecnica } from './pasos/PasoTecnica.tsx';
import { ESTADO_INICIAL, INCIDENCIAS_ANESTESICAS, type EstadoEntrevista, type IntervencionPrevia } from './estadoEntrevista.ts';
import type { Modalidad } from '../dominio/tipos.ts';
import { VistaPaciente } from './paciente/VistaPaciente.tsx';
import { BloqueHojaPaciente } from './paciente/BloqueHojaPaciente.tsx';
import { Salidas } from './pasos/Salidas.tsx';
import { PanelAdmin } from './admin/PanelAdmin.tsx';

const TIPO_ANESTESIA_ETIQUETA: Record<IntervencionPrevia['tipoAnestesia'], string> = {
  general: 'general',
  neuroaxial: 'neuroaxial',
  sedacion: 'sedación',
  local: 'local',
  no_lo_sabe: 'no lo sabe',
};
function tipoAnestesiaLegible(t: IntervencionPrevia['tipoAnestesia']): string {
  return TIPO_ANESTESIA_ETIQUETA[t];
}
function incidenciaLegible(id: string): string {
  return INCIDENCIAS_ANESTESICAS.find((x) => x.id === id)?.etiqueta ?? id;
}

type Pantalla =
  | 'inicio'
  | 'intervencion'
  | 'basicos'
  | 'alergias'
  | 'antecedentes'
  | 'habitos'
  | 'enfermedades'
  | 'tecnica'
  | 'medicacion'
  | 'viaAerea'
  | 'consentimiento'
  | 'resumen';

/** "Hoy" fijo para el modo entrenamiento (§14.2): los casos tienen fecha de
 *  intervención fija, así que el "plazo no alcanzable" no debe depender del día real. */
const FECHA_REFERENCIA_ENTRENAMIENTO = new Date(2026, 8, 29, 9, 0); // 29/09/2026

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function fechaLegible(d: Date): string {
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} a las ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  // Si venimos a «enfermedades» desde un aviso de coherencia del paso de medicación
  // (§7 fase ágil), al pulsar «Continuar» allí se vuelve a medicación en vez de a técnica.
  const [volverAMedicacion, setVolverAMedicacion] = useState(false);
  const [modalidad, setModalidad] = useState<Modalidad | null>(null);
  const [entrevista, setEntrevista] = useState<EstadoEntrevista>(ESTADO_INICIAL);
  // Si la URL trae «#p=…», es un QR/enlace de paciente: se abre la vista interactiva.
  const [pacientePayload] = useState<string | null>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash : '';
    return h.startsWith('#p=') ? h.slice(3) : null;
  });
  type Herramienta = 'admin' | 'guia' | 'uso' | 'entrenamiento' | null;
  const [herramienta, setHerramienta] = useState<Herramienta>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash : '';
    if (h === '#admin') return 'admin';
    if (h === '#guia') return 'guia';
    if (h === '#uso') return 'uso';
    if (h === '#entrenamiento') return 'entrenamiento';
    return null;
  });
  // Modo entrenamiento (§14.2): banda ENTRENAMIENTO y resultados esperados.
  const [entrenamiento, setEntrenamiento] = useState(false);
  const [esperado, setEsperado] = useState<string[]>([]);
  // Confirmación de «Nueva valoración» (borra todos los datos de la entrevista).
  const [confirmarNueva, setConfirmarNueva] = useState(false);
  // Contador de uso (§14.3): inicio de la entrevista y marca de "ya registrada".
  const inicioRef = useRef<number | null>(null);
  const registradoRef = useRef(false);

  // Carga un caso de entrenamiento: rellena la entrevista y salta al resumen.
  const cargarEntrenamiento = useCallback((caso: CasoEntrenamiento) => {
    setModalidad(caso.modalidad);
    setEntrevista(caso.entrevista);
    setEsperado(caso.esperado);
    setEntrenamiento(true);
    setHerramienta(null);
    setPantalla('resumen');
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Reinicia la entrevista (borra todo de la memoria y vuelve al inicio).
  const nuevoPaciente = useCallback(() => {
    setModalidad(null);
    setEntrevista(ESTADO_INICIAL);
    setPantalla('inicio');
    inicioRef.current = null;
    registradoRef.current = false;
    setEntrenamiento(false);
    setEsperado([]);
  }, []);

  // Privacidad (§2): temporizador de inactividad y aviso al salir. Solo cuando hay
  // una entrevista en curso (no en la pantalla de inicio ni en la vista del paciente).
  const entrevistaEnCurso = !pacientePayload && pantalla !== 'inicio';
  const inactividad = useInactividad(entrevistaEnCurso, nuevoPaciente, config.minutos_inactividad * 60_000);
  useAvisoSalida(entrevistaEnCurso);

  if (pacientePayload) {
    return (
      <div className="app">
        <BandaPrueba />
        <VistaPaciente cadena={pacientePayload} />
      </div>
    );
  }

  if (herramienta) {
    const salir = () => {
      setHerramienta(null);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    return (
      <div className="app">
        <BandaPrueba />
        {herramienta === 'admin' && <PanelAdmin onSalir={salir} />}
        {herramienta === 'guia' && <GuiaImprimible onSalir={salir} />}
        {herramienta === 'uso' && <CuadroMando onSalir={salir} />}
        {herramienta === 'entrenamiento' && <ModoEntrenamiento onCargar={cargarEntrenamiento} onSalir={salir} />}
      </div>
    );
  }

  const { intervencion, procedimiento, basicos, antecedentes, mtnd4, alergias, habitos, cribado, medicacion, viaAerea, consentimiento } = entrevista;

  /** Registra la entrevista en el contador de uso (§14.3), una sola vez y sin datos clínicos. */
  function registrarUsoSiProcede() {
    if (entrenamiento) return; // las entrevistas de entrenamiento no cuentan (§14.3)
    if (registradoRef.current || inicioRef.current === null || !basicos || !intervencion) return;
    const tipoPaciente: TipoPaciente =
      basicos.moduloObstetrico || basicos.embarazada ? 'obstetrica'
        : basicos.edadAnios <= config.edad_pediatrica_maxima ? 'pediatrico'
          : 'adulto';
    const inicio = new Date(inicioRef.current);
    registrarUso({
      fecha: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`,
      horaInicio: `${String(inicio.getHours()).padStart(2, '0')}:${String(inicio.getMinutes()).padStart(2, '0')}`,
      duracionSeg: Math.round((Date.now() - inicioRef.current) / 1000),
      modalidad: modalidad ?? 'presencial',
      tipoPaciente,
      riesgoQuirurgico: intervencion.riesgoCardiovascular,
    });
    registradoRef.current = true;
  }

  /** Confirma «Nueva valoración»: registra el uso (si procede) y borra todo. */
  function confirmarNuevaValoracion() {
    registrarUsoSiProcede(); // marca la valoración como terminada en el cuadro de mando
    setConfirmarNueva(false);
    nuevoPaciente(); // mismo mecanismo que el borrado por inactividad
  }

  /** Modo entrenamiento: vuelve a la lista de casos (sin confirmación, no hay datos reales). */
  function volverACasosEntrenamiento() {
    setEntrevista(ESTADO_INICIAL);
    setEsperado([]);
    setEntrenamiento(false);
    setPantalla('inicio');
    setHerramienta('entrenamiento');
  }

  return (
    <div className="app">
      <BandaPrueba />
      {entrenamiento && <div className="banda-entrenamiento" role="status">MODO ENTRENAMIENTO · datos de práctica, no usar con pacientes</div>}
      <header className="cabecera">
        <h1>AnesHealth · Entrevista preanestésica</h1>
        <p className="subtitulo">Servicio de Anestesiología · Hospital Vithas Barcelona</p>
        {/* Acceso discreto para abandonar una entrevista a medias (todos los pasos,
            no en la pantalla de inicio ni en modo entrenamiento). No se imprime. */}
        {pantalla !== 'inicio' && !entrenamiento && (
          <button
            type="button"
            className="boton-enlace cabecera-nueva no-print"
            onClick={() => setConfirmarNueva(true)}
          >
            Nueva valoración
          </button>
        )}
      </header>

      {confirmarNueva && (
        <div className="aviso-inactividad no-print" role="alertdialog" aria-labelledby="nueva-tit">
          <p id="nueva-tit">
            <strong>Se borrarán todos los datos de esta valoración.</strong> ¿Ha copiado el
            texto para SAP y entregado la hoja o el QR al paciente?
          </p>
          <div className="acciones">
            <button type="button" className="boton-primario" onClick={confirmarNuevaValoracion}>
              Sí, empezar una nueva
            </button>
            <button type="button" className="boton-secundario" onClick={() => setConfirmarNueva(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {inactividad.avisoVisible && (
        <div className="aviso-inactividad" role="alertdialog" aria-labelledby="inactividad-tit">
          <p id="inactividad-tit">
            <strong>¿Sigue con el paciente?</strong> Por privacidad, los datos se borrarán
            en {inactividad.segundosRestantes} s por inactividad.
          </p>
          <div className="acciones">
            <button type="button" className="boton-primario" onClick={inactividad.continuar}>
              Seguir con el paciente
            </button>
            <button type="button" className="boton-secundario" onClick={nuevoPaciente}>
              Borrar ahora
            </button>
          </div>
        </div>
      )}

      <main className="contenido">
        {pantalla === 'inicio' && (
          <section className="tarjeta" aria-labelledby="inicio-tit">
            <h2 id="inicio-tit">Nueva entrevista</h2>
            <p>Elija la modalidad de la entrevista para comenzar.</p>
            <div className="grupo-botones">
              <button
                type="button"
                className={`boton-grande ${modalidad === 'presencial' ? 'seleccionado' : ''}`}
                onClick={() => setModalidad('presencial')}
                aria-pressed={modalidad === 'presencial'}
              >
                Presencial
              </button>
              <button
                type="button"
                className={`boton-grande ${modalidad === 'telefonica' ? 'seleccionado' : ''}`}
                onClick={() => setModalidad('telefonica')}
                aria-pressed={modalidad === 'telefonica'}
              >
                Telefónica
              </button>
            </div>
            <button
              type="button"
              className="boton-primario"
              disabled={modalidad === null}
              onClick={() => { inicioRef.current = Date.now(); registradoRef.current = false; setPantalla('intervencion'); }}
            >
              Comenzar
            </button>
          </section>
        )}

        {/* 1 · Intervención */}
        {pantalla === 'intervencion' && (
          <PasoIntervencion
            onVolver={() => setPantalla('inicio')}
            onContinuar={(datos, proc) => {
              setEntrevista((e) => ({ ...e, intervencion: datos, procedimiento: proc }));
              setPantalla('alergias');
            }}
          />
        )}

        {/* 2 · Alergias (decisión del servicio, 2026-10-04: antes del paso de datos básicos) */}
        {pantalla === 'alergias' && (
          <PasoAlergias
            inicial={alergias}
            inicialMtnd4={mtnd4}
            onVolver={() => setPantalla('intervencion')}
            onContinuar={(datos, datosMtnd4) => {
              setEntrevista((e) => ({ ...e, alergias: datos, mtnd4: datosMtnd4 }));
              setPantalla('basicos');
            }}
          />
        )}

        {/* 3 · Datos básicos */}
        {pantalla === 'basicos' && (
          <PasoBasicos
            inicial={basicos}
            obstetrico={procedimiento?.obstetrico ?? false}
            onVolver={() => setPantalla('alergias')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, basicos: datos }));
              setPantalla('antecedentes');
            }}
          />
        )}

        {/* 4 · Antecedentes anestésicos y quirúrgicos */}
        {pantalla === 'antecedentes' && (
          <PasoAntecedentes
            inicial={antecedentes}
            onVolver={() => setPantalla('alergias')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, antecedentes: datos }));
              setPantalla('habitos');
            }}
          />
        )}

        {/* 5 · Hábitos, capacidad funcional y fragilidad */}
        {pantalla === 'habitos' && basicos && (
          <PasoHabitos
            inicial={habitos}
            edadAnios={basicos.edadAnios}
            sexo={basicos.sexo}
            onVolver={() => setPantalla('antecedentes')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, habitos: datos }));
              setPantalla('enfermedades');
            }}
          />
        )}

        {/* 6 · Enfermedades y hemostasia */}
        {pantalla === 'enfermedades' && (
          <PasoCribado
            inicial={cribado}
            pediatrico={basicos ? basicos.edadAnios <= config.edad_pediatrica_maxima : false}
            obstetrico={basicos ? basicos.moduloObstetrico === true || basicos.embarazada === true : false}
            onVolver={() => setPantalla('habitos')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, cribado: datos }));
              // Si veníamos de un aviso de coherencia del paso de medicación, se vuelve
              // allí (conservando la medicación); si no, se sigue al paso de técnica.
              if (volverAMedicacion) {
                setVolverAMedicacion(false);
                setPantalla('medicacion');
              } else {
                setPantalla('tecnica');
              }
            }}
          />
        )}

        {/* 7 · Técnica anestésica prevista */}
        {pantalla === 'tecnica' && (
          <PasoTecnica
            inicial={intervencion?.tecnicas ?? []}
            inicialSub={intervencion?.subtipoNeuroaxial ? { subtipoNeuroaxial: intervencion.subtipoNeuroaxial } : undefined}
            procedimiento={procedimiento}
            onVolver={() => setPantalla('enfermedades')}
            onContinuar={(tecnicas, grupoOft, sub) => {
              setEntrevista((e) => (e.intervencion
                ? { ...e, intervencion: (() => {
                    // Se parte de la intervención SIN el subcampo de §8.17 (así se borra
                    // si ya no aplica) y se añade solo si está presente.
                    const { subtipoNeuroaxial: _s, ...resto } = e.intervencion;
                    return {
                      ...resto,
                      tecnicas,
                      ...(grupoOft ? { grupoOftalmologico: grupoOft } : {}),
                      ...(sub.subtipoNeuroaxial ? { subtipoNeuroaxial: sub.subtipoNeuroaxial } : {}),
                    };
                  })() }
                : e));
              setPantalla('medicacion');
            }}
          />
        )}

        {/* 8 · Medicación */}
        {pantalla === 'medicacion' && intervencion && basicos && (
          <PasoMedicacion
            inicial={medicacion}
            intervencion={intervencion}
            enfermedades={cribado?.enfermedades ?? []}
            respuestasModulos={cribado?.respuestasModulos ?? {}}
            basicos={{ edadAnios: basicos.edadAnios, pesoKg: basicos.pesoKg, sexo: basicos.sexo }}
            aclaramientoManual={entrevista.aclaramientoManual}
            onAclaramientoManual={(a) => setEntrevista((e) => ({ ...e, aclaramientoManual: a }))}
            onVolver={(datos) => {
              setEntrevista((e) => ({ ...e, medicacion: datos }));
              setPantalla('tecnica');
            }}
            onIrAEnfermedades={(datos) => {
              setEntrevista((e) => ({ ...e, medicacion: datos }));
              setVolverAMedicacion(true);
              setPantalla('enfermedades');
            }}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, medicacion: datos }));
              // En telefónica no se explora la vía aérea (§6.2.5, decisión del servicio
              // 2026-10-04): se salta directamente al consentimiento.
              setPantalla(modalidad === 'telefonica' ? 'consentimiento' : 'viaAerea');
            }}
          />
        )}

        {/* 9 · Vía aérea (no se muestra en telefónica) */}
        {pantalla === 'viaAerea' && basicos && modalidad !== 'telefonica' && (
          <PasoViaAerea
            inicial={viaAerea}
            telefonica={false}
            basicos={{ edadAnios: basicos.edadAnios, pesoKg: basicos.pesoKg, tallaCm: basicos.tallaCm, sexo: basicos.sexo }}
            onVolver={() => setPantalla('medicacion')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, viaAerea: datos }));
              setPantalla('consentimiento');
            }}
          />
        )}

        {/* 10 · Consentimiento */}
        {pantalla === 'consentimiento' && (
          <PasoConsentimiento
            inicial={consentimiento}
            telefonica={modalidad === 'telefonica'}
            onVolver={() => setPantalla(modalidad === 'telefonica' ? 'medicacion' : 'viaAerea')}
            onContinuar={(datos) => {
              setEntrevista((e) => ({ ...e, consentimiento: datos }));
              registrarUsoSiProcede(); // marca la valoración como terminada en el cuadro de mando
              setPantalla('resumen');
            }}
          />
        )}

        {pantalla === 'resumen' && intervencion && procedimiento && basicos && (
          <section className="tarjeta" aria-labelledby="resumen-tit">
            <h2 id="resumen-tit">Resumen de la entrevista · Resultados</h2>
            <p>Entrevista <strong>{modalidad}</strong>. Resultados de la valoración y hoja del paciente.</p>

            <h3>Intervención</h3>
            <ul className="resumen-lista">
              <li><strong>Procedimiento:</strong> {procedimiento.nombre} ({procedimiento.especialidad.replace(/_/g, ' ')})</li>
              <li><strong>Fecha y hora:</strong> {intervencion.fechaHora ? `${fechaLegible(intervencion.fechaHora)}${intervencion.horaAsumida ? ' (hora asumida)' : ''}` : 'aún no conocida (las instrucciones se darán como margen)'}</li>
              <li><strong>Técnica:</strong> {intervencion.tecnicas.map((t) => t.replace(/_/g, ' ')).join(' + ') || 'sin decidir'}</li>
              <li><strong>Riesgos:</strong> cardiovascular {intervencion.riesgoCardiovascular}, hemorrágico {intervencion.riesgoHemorragico}</li>
            </ul>

            <h3>Datos básicos</h3>
            <ul className="resumen-lista">
              <li><strong>Edad:</strong> {basicos.edadAnios} años · <strong>Sexo:</strong> {basicos.sexo}</li>
              <li><strong>Peso:</strong> {basicos.pesoKg} kg · <strong>Talla:</strong> {basicos.tallaCm} cm</li>
              {basicos.posibleEmbarazo !== undefined && (
                <li><strong>Posibilidad de embarazo:</strong> {basicos.posibleEmbarazo ? 'sí' : 'no'}</li>
              )}
            </ul>

            <h3>Antecedentes</h3>
            <p><strong>Intervenciones previas:</strong></p>
            {antecedentes && antecedentes.intervencionesPrevias.length > 0 ? (
              <ul className="resumen-lista">
                {antecedentes.intervencionesPrevias.map((p, i) => (
                  <li key={`${p.procedimiento}-${i}`}>
                    {p.procedimiento}{p.anio ? ` (${p.anio})` : ''} · {tipoAnestesiaLegible(p.tipoAnestesia)}
                    {p.incidencias.length > 0 && (
                      <> · incidencias: {p.incidencias.map(incidenciaLegible).join(', ')}</>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Ninguna.</p>
            )}
            <ul className="resumen-lista">
              <li>
                <strong>Condiciones especiales:</strong>{' '}
                {cribado && (cribado.condicionesEspeciales.hipertermiaMalignaPersonal || cribado.condicionesEspeciales.hipertermiaMalignaFamiliar || cribado.condicionesEspeciales.pseudocolinesterasaPersonal || cribado.condicionesEspeciales.pseudocolinesterasaFamiliar)
                  ? [
                      cribado.condicionesEspeciales.hipertermiaMalignaPersonal ? 'hipertermia maligna (personal)' : null,
                      cribado.condicionesEspeciales.hipertermiaMalignaFamiliar ? 'hipertermia maligna (familiar)' : null,
                      cribado.condicionesEspeciales.pseudocolinesterasaPersonal ? 'déficit de pseudocolinesterasa (personal)' : null,
                      cribado.condicionesEspeciales.pseudocolinesterasaFamiliar ? 'déficit de pseudocolinesterasa (familiar)' : null,
                    ].filter(Boolean).join(', ')
                  : 'sin antecedentes reseñables'}
              </li>
            </ul>

            <h3>Cribado mtND4</h3>
            <ul className="resumen-lista">
              <li>
                {mtnd4 ? describirMtnd4(mtnd4) : 'no recogido'}
              </li>
            </ul>

            {alergias && (
              <>
                <h3>Alergias</h3>
                <ul className="resumen-lista">
                  {alergias.ningunaConocida ? (
                    <li>No alergias conocidas</li>
                  ) : (
                    <>
                      {alergias.medicamentos.length > 0 && (
                        <li><strong>Medicamentos:</strong> {alergias.medicamentos.map((m) => m.reaccion ? `${m.farmaco} (${m.reaccion})` : m.farmaco).join(', ')}</li>
                      )}
                      {(alergias.latex || alergias.contrastesYodados || alergias.clorhexidina || alergias.adhesivos) && (
                        <li><strong>Otras:</strong> {[
                          alergias.latex ? 'látex' : null,
                          alergias.contrastesYodados ? 'contrastes yodados' : null,
                          alergias.clorhexidina ? 'clorhexidina' : null,
                          alergias.adhesivos ? 'adhesivos' : null,
                        ].filter(Boolean).join(', ')}</li>
                      )}
                      {alergias.alimentos.length > 0 && (
                        <li><strong>Alimentos:</strong> {alergias.alimentos.join(', ')}</li>
                      )}
                    </>
                  )}
                </ul>
              </>
            )}

            {habitos && (
              <>
                <h3>Hábitos y capacidad funcional</h3>
                <ul className="resumen-lista">
                  <li><strong>Tabaco:</strong> {habitos.tabaco === 'nunca' ? 'nunca ha fumado' : habitos.tabaco === 'activo' ? 'fumador activo' : `exfumador${habitos.paquetesAnio !== undefined ? ` (${habitos.paquetesAnio} paquetes-año)` : ''}`}</li>
                  <li><strong>AUDIT-C:</strong> {habitos.auditFrecuencia !== undefined && habitos.auditCantidad !== undefined && habitos.auditAtracon !== undefined
                    ? `${habitos.auditFrecuencia + habitos.auditCantidad + habitos.auditAtracon} puntos`
                    : 'no completado'}</li>
                  <li><strong>Capacidad funcional:</strong> {habitos.subeDosPisos === 'si' ? 'sube dos pisos sin parar' : 'DASI evaluado'}</li>
                  {habitos.cfs !== undefined && <li><strong>CFS:</strong> {habitos.cfs}</li>}
                </ul>
              </>
            )}

            {cribado && (
              <>
                <h3>Enfermedades y hemostasia</h3>
                <ul className="resumen-lista">
                  <li><strong>Enfermedades:</strong> {cribado.ningunaConocida ? 'ninguna conocida' : (cribado.enfermedades.length > 0 ? cribado.enfermedades.join(', ') : '—')}</li>
                  <li><strong>HEMSTOP:</strong> {Object.values(cribado.hemstop).filter(Boolean).length} respuestas positivas</li>
                </ul>
              </>
            )}

            {medicacion && (
              <>
                <h3>Medicación</h3>
                {medicacion.length === 0 ? (
                  <p>Sin medicación habitual.</p>
                ) : (
                  <ul className="resumen-lista">
                    {medicacion.map((f, i) => (
                      <li key={`${f.idFarmaco}-${i}`}>{f.nombreComercial}{f.horas.length > 0 ? ` (${f.horas.join(', ')})` : ''}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <h3>Vía aérea</h3>
            <ul className="resumen-lista">
              <li>{modalidad === 'telefonica'
                ? 'pendiente de explorar el día de la intervención'
                : viaAerea ? describirViaAerea(viaAerea, false) : 'no recogida'}</li>
            </ul>

            <h3>Consentimiento</h3>
            <ul className="resumen-lista">
              <li>{describirConsentimiento(consentimiento)}</li>
            </ul>

            <h3>Hoja del paciente</h3>
            {cribado && (
              <BloqueHojaPaciente
                medicacion={medicacion ?? []}
                intervencion={intervencion}
                basicos={basicos}
                cribado={cribado}
                habitos={habitos}
                consentimiento={consentimiento}
                entrevista={entrevista}
                validaciones={entrevista.validaciones}
                {...(entrenamiento ? { fechaReferencia: FECHA_REFERENCIA_ENTRENAMIENTO } : {})}
              />
            )}

            {entrenamiento && esperado.length > 0 && (
              <div className="entrenamiento-esperado">
                <h3>Resultado esperado (modo entrenamiento)</h3>
                <p>Compare lo que ha calculado la aplicación (abajo) con lo esperado para este caso:</p>
                <ul className="resumen-lista">
                  {esperado.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <Salidas
              entrevista={entrevista}
              modalidad={modalidad ?? 'presencial'}
              {...(entrenamiento ? { fechaReferencia: FECHA_REFERENCIA_ENTRENAMIENTO } : {})}
              validaciones={entrevista.validaciones}
              onValidarPunto={(id, estado) =>
                setEntrevista((e) => {
                  const v = { ...e.validaciones };
                  if (estado === null) delete v[id];
                  else v[id] = estado;
                  return { ...e, validaciones: v };
                })
              }
              onConfirmarFarmaco={(i, cambios) =>
                setEntrevista((e) => ({
                  ...e,
                  medicacion: (e.medicacion ?? []).map((f, j) => (j === i ? { ...f, ...cambios } : f)),
                }))
              }
            />

            {entrenamiento ? (
              <div className="acciones no-print">
                <button type="button" className="boton-primario" onClick={volverACasosEntrenamiento}>
                  Volver a los casos de entrenamiento
                </button>
                <button type="button" className="boton-secundario" onClick={nuevoPaciente}>
                  Salir del modo entrenamiento
                </button>
              </div>
            ) : (
              <div className="acciones no-print">
                <button type="button" className="boton-secundario" onClick={() => setPantalla('intervencion')}>Editar desde el paso 1</button>
                <button type="button" className="boton-primario boton-nueva-valoracion" onClick={() => setConfirmarNueva(true)}>
                  Nueva valoración
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="pie">
        <p>
          Recomendaciones generadas según los protocolos del Servicio de Anestesiología. Validación
          final por el anestesiólogo.
        </p>
        <p className="pie-admin">
          <button type="button" className="boton-enlace" onClick={() => setHerramienta('admin')}>Administración de contenido</button>
          {' · '}
          <button type="button" className="boton-enlace" onClick={() => setHerramienta('guia')}>Guía imprimible</button>
          {' · '}
          <button type="button" className="boton-enlace" onClick={() => setHerramienta('uso')}>Cuadro de mando de uso</button>
          {' · '}
          <button type="button" className="boton-enlace" onClick={() => setHerramienta('entrenamiento')}>Modo entrenamiento</button>
        </p>
        <p className="pie-copyright">
          © 2026 AnesHealth. Todos los derechos reservados. Uso restringido al Servicio de Anestesiología del Hospital Vithas Barcelona.
        </p>
      </footer>
    </div>
  );
}

function describirViaAerea(v: import('./estadoEntrevista.ts').DatosViaAereaUi, telefonica: boolean): string {
  const partes: string[] = [];
  if (v.mallampati) partes.push(`Mallampati ${'I'.repeat(v.mallampati)}`);
  if (v.intubacionDificilPrevia && v.intubacionDificilPrevia !== 'no') partes.push(`intubación difícil previa ${v.intubacionDificilPrevia}`);
  if (v.radioterapiaCervical) partes.push('radioterapia cervical');
  if (v.tumorCabezaCuello) partes.push('tumor de cabeza y cuello');
  if (v.limitacionCervicalReumatologica) partes.push('limitación cervical');
  const base = partes.length > 0 ? partes.join(', ') : 'sin hallazgos reseñables';
  return telefonica ? `${base} · exploración pendiente (telefónica)` : base;
}

function describirConsentimiento(c: import('./estadoEntrevista.ts').ConsentimientoUi | null): string {
  if (!c) return 'no recogido';
  if (c.estado === 'entregado') return `entregado y explicado${c.fecha ? ` (${c.fecha})` : ''}`;
  if (c.estado === 'pendiente_entregar') return 'pendiente de entregar (se entregará el día de la intervención)';
  return 'no procede';
}

function describirMtnd4(m: import('../dominio/mtnd4/mtnd4.ts').EntradaMtnd4): string {
  const factores: string[] = [];
  if (m.ascendenciaVenezolanaMaterna) factores.push('ascendencia venezolana materna');
  if (m.origenMaternoDesconocidoUOvodonacion) factores.push('origen materno desconocido/ovodonación');
  if (m.antecedentesFamiliaresCompatibles) factores.push('antecedentes familiares');
  const test = m.testGenetico === 'no_hecho' ? 'sin test' : `test ${m.testGenetico}`;
  return factores.length > 0 ? `${factores.join(', ')}; ${test}` : `sin factores de línea materna; ${test}`;
}
