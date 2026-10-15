/**
 * Cuerpo de la hoja del paciente (§10.2), común a la vista interactiva y a la hoja
 * de la consulta. Renderiza en el idioma dado: medicación, ayuno con horas de reloj,
 * qué traer (condicional), prevención del delirium y consejos de tabaco/alcohol.
 */
import config from '../../../datos/config.json';
import type { AyunoQr, ExtrasHojaQr, InstruccionPacienteEstructurada } from '../../dominio/salidas/qr/hojaPaciente.ts';
import type { TextosPaciente, Idioma } from './textosPaciente.ts';
import { renderMed, renderAyuno, renderAnexos, fechaLarga, horaReloj } from './render.ts';
import { textosRiesgos, renderRiesgosAnestesia } from './renderRiesgos.ts';

interface Props {
  instrucciones: InstruccionPacienteEstructurada[];
  ay?: AyunoQr | undefined;
  ex?: ExtrasHojaQr | undefined;
  fecha: number | null;
  t: TextosPaciente;
  /** Idioma activo, para la información de riesgos de la anestesia (§8.17). */
  idioma?: Idioma;
  /**
   * Vista interactiva (QR): la información de riesgos se muestra en una sección
   * plegable (<details>) cerrada por defecto. En la hoja/PDF (false o ausente) se
   * muestra siempre desplegada, como anexo en página nueva.
   */
  interactivo?: boolean;
}

export function CuerpoHoja({ instrucciones, ay, ex, fecha, t, idioma = 'es', interactivo = false }: Props) {
  const sitTexto = ay && (t.sit as Record<string, string>)[ay.sit];
  const tr = textosRiesgos(idioma);
  // Teléfono y correo de contacto se leen de config EN EL MOMENTO DE RENDER (§config,
  // punto 4): el QR no transporta estos datos, así que un QR ya entregado muestra el
  // valor nuevo al cambiarlos. Vacío = no se muestra la frase que los menciona.
  const telefonoContacto = (config as { telefono_contacto: string }).telefono_contacto;
  const seccionesRiesgo = ex?.riesgos && ex.riesgos.length > 0 ? renderRiesgosAnestesia(ex.riesgos, tr) : [];

  return (
    <>
      {ex?.revisionPendiente && (
        <p className="aviso aviso-atencion revision-pendiente">{t.revision_pendiente_texto}</p>
      )}

      <h2>{t.intervencion_titulo}</h2>
      {fecha !== null ? (
        <p><strong>{fechaLarga(fecha, t)} a las {horaReloj(fecha)}</strong></p>
      ) : (
        <p className="aviso aviso-info">{t.sin_fecha_aviso}</p>
      )}

      {/* Línea en la primera página que remite al anexo de riesgos (§8.17), solo en
          la hoja/PDF; en la vista interactiva la sección plegable ya está a la vista. */}
      {!interactivo && seccionesRiesgo.length > 0 && (
        <p className="remite-riesgos">{tr.primera_pagina}</p>
      )}

      <h2>{t.medicamentos_titulo}</h2>
      {instrucciones.length === 0 ? (
        <p>{t.sin_medicamentos}</p>
      ) : (
        <table className="tabla-medicacion">
          <thead><tr><th>{t.col_medicamento}</th><th>{t.col_que_hacer}</th></tr></thead>
          <tbody>
            {instrucciones.map((i, k) => (
              <tr key={k} className={i.plazoNoCumplible ? 'fila-alerta' : ''}>
                <td>{i.nombre}</td>
                <td>{renderMed(i, t, telefonoContacto, fecha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {ay && (
        <>
          <h2>{t.ayuno_titulo}</h2>
          <ul className="lista-ayuno">
            {renderAyuno(ay, fecha, t).map((l, k) => (
              <li key={k}><strong>{l.etiqueta}:</strong> {l.cuando}</li>
            ))}
          </ul>
          {sitTexto && <p className="aviso aviso-info">{sitTexto}</p>}
        </>
      )}

      <h2>{t.que_traer_titulo}</h2>
      <ul>
        {t.que_traer_items.map((it, k) => <li key={k}>{it}</li>)}
        {ex?.cpap && <li>{t.que_traer_cpap}</li>}
        {ex?.inhaladores && <li>{t.que_traer_inhaladores}</li>}
        {ex?.tarjetaDispositivo && <li>{t.que_traer_tarjeta_dispositivo}</li>}
        {ex?.delirium && <li>{t.que_traer_delirium}</li>}
      </ul>

      {ex?.delirium && (
        <>
          <h2>{t.delirium_titulo}</h2>
          <p>{t.delirium_texto}</p>
        </>
      )}

      {(ex?.tabaco || ex?.alcohol) && (
        <>
          <h2>{t.consejos_titulo}</h2>
          {ex?.tabaco && <p>{t.tabaco_texto}</p>}
          {ex?.alcohol && <p>{t.alcohol_texto}</p>}
        </>
      )}

      {ex?.sugammadex && (
        <>
          <h2>{t.sugammadex_titulo}</h2>
          <p>{ex.sugammadex === 'oral' ? t.sugammadex_oral : t.sugammadex_no_oral}</p>
          <p className="aviso aviso-info">{t.sugammadex_confirmacion}</p>
        </>
      )}

      <h2>{t.cuando_llamar_titulo}</h2>
      <ul>{t.cuando_llamar_items.map((it, k) => <li key={k}>{it}</li>)}</ul>

      {ex?.cons && ex.cons !== 'no_procede' && (
        <>
          <h2>{t.consentimiento_titulo}</h2>
          <p>{t.consentimiento_textos[ex.cons]}</p>
        </>
      )}

      {telefonoContacto !== '' && (
        <>
          <h2>{t.telefono_titulo}</h2>
          <p><strong>{telefonoContacto}</strong></p>
        </>
      )}

      {ex && ex.anexos.length > 0 && renderAnexos(ex.anexos, fecha, t).map((anexo, k) => (
        <section key={k} className="anexo">
          <h2>{anexo.titulo}</h2>
          {anexo.parrafos.map((p, j) => <p key={j}>{p}</p>)}
        </section>
      ))}

      {/* Información de riesgos de la anestesia (§8.17). En el QR, plegada por
          defecto; en la hoja/PDF, anexo en página nueva, siempre desplegado. */}
      {seccionesRiesgo.length > 0 && (
        interactivo ? (
          <details className="riesgos-anestesia-plegable">
            <summary>{tr.anexo_titulo}</summary>
            {seccionesRiesgo.map((s, k) => <SeccionRiesgo key={k} seccion={s} />)}
          </details>
        ) : (
          <section className="anexo riesgos-anestesia">
            <h2>{tr.anexo_titulo}</h2>
            {seccionesRiesgo.map((s, k) => <SeccionRiesgo key={k} seccion={s} />)}
          </section>
        )
      )}
    </>
  );
}

/** Una sección del anexo de riesgos: título (opcional), párrafos y tabla (opcional). */
function SeccionRiesgo({ seccion }: { seccion: ReturnType<typeof renderRiesgosAnestesia>[number] }) {
  return (
    <div className="riesgo-seccion">
      {seccion.titulo && <h3>{seccion.titulo}</h3>}
      {seccion.parrafos.map((p, j) => <p key={j}>{p}</p>)}
      {seccion.tabla && (
        <table className="tabla-riesgos">
          <thead><tr>{seccion.tabla.cabeceras.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>
            {seccion.tabla.filas.map((fila, i) => (
              <tr key={i}>{fila.map((celda, j) => <td key={j}>{celda}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
