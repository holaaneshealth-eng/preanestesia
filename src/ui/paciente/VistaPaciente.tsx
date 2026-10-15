/**
 * Vista interactiva del paciente (§8.16 a/d/e/g, §10.2, tarea 12.10). Se abre al
 * escanear el QR (la app detecta «#p=» en la URL). Solo lectura, con conmutador
 * castellano/catalán (el catalán no muestra ningún texto en castellano), botón
 * «Me han dado la fecha o me la han cambiado» que recalcula medicación y ayuno, y
 * botón para guardar como PDF.
 */
import { useEffect, useMemo, useState } from 'react';
import config from '../../../datos/config.json';
import { deserializar } from '../../dominio/salidas/qr/serializar.ts';
import {
  recalcularHojaEstructurada,
  caducidadQrPaciente,
  type ContenidoQrPaciente,
} from '../../dominio/salidas/qr/hojaPaciente.ts';
import { textosPaciente, type Idioma } from './textosPaciente.ts';
import { CuerpoHoja } from './CuerpoHoja.tsx';

interface Props {
  cadena: string;
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'invalido' }
  | { tipo: 'caducado' }
  | { tipo: 'ok'; contenido: ContenidoQrPaciente };

export function VistaPaciente({ cadena }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [idioma, setIdioma] = useState<Idioma>('es');
  const [mostrarCambioFecha, setMostrarCambioFecha] = useState(false);
  const [fechaNueva, setFechaNueva] = useState('');
  const [horaNueva, setHoraNueva] = useState('');
  const [fechaOverride, setFechaOverride] = useState<Date | null>(null);

  useEffect(() => {
    let vivo = true;
    void deserializar(cadena, new Date(), config.version_contenido).then((r) => {
      if (!vivo) return;
      if (r.estado === 'caducado') setEstado({ tipo: 'caducado' });
      else if (r.estado === 'invalido' || r.payload.t !== 'paciente') setEstado({ tipo: 'invalido' });
      else setEstado({ tipo: 'ok', contenido: r.payload.d as ContenidoQrPaciente });
    });
    return () => { vivo = false; };
  }, [cadena]);

  // Al imprimir o guardar como PDF, la sección plegable de riesgos (§8.17) debe salir
  // desplegada; se abre en «beforeprint» y se devuelve a su estado anterior en «afterprint».
  useEffect(() => {
    const previos: Array<[HTMLDetailsElement, boolean]> = [];
    const abrir = () => {
      previos.length = 0;
      document.querySelectorAll<HTMLDetailsElement>('details.riesgos-anestesia-plegable').forEach((d) => {
        previos.push([d, d.open]);
        d.open = true;
      });
    };
    const restaurar = () => {
      for (const [d, estaba] of previos) d.open = estaba;
      previos.length = 0;
    };
    window.addEventListener('beforeprint', abrir);
    window.addEventListener('afterprint', restaurar);
    return () => {
      window.removeEventListener('beforeprint', abrir);
      window.removeEventListener('afterprint', restaurar);
    };
  }, []);

  const t = textosPaciente(idioma);

  const fechaEfectiva = useMemo(() => {
    if (fechaOverride) return fechaOverride;
    if (estado.tipo === 'ok' && estado.contenido.fi !== null) return new Date(estado.contenido.fi);
    return null;
  }, [fechaOverride, estado]);

  const instrucciones = useMemo(() => {
    if (estado.tipo !== 'ok') return [];
    return recalcularHojaEstructurada(estado.contenido, fechaEfectiva);
  }, [estado, fechaEfectiva]);

  function recalcular() {
    if (fechaNueva === '') return;
    setFechaOverride(new Date(`${fechaNueva}T${horaNueva === '' ? '08:00' : horaNueva}`));
    setMostrarCambioFecha(false);
  }

  if (estado.tipo === 'cargando') return <main className="contenido"><p>Cargando…</p></main>;
  if (estado.tipo === 'caducado') {
    return <main className="contenido"><section className="tarjeta"><p>Este enlace ha caducado.{config.telefono_contacto ? ` Llame al ${config.telefono_contacto}.` : ''}</p></section></main>;
  }
  if (estado.tipo === 'invalido') {
    return <main className="contenido"><section className="tarjeta"><p>Este enlace no es válido.</p></section></main>;
  }

  const caducidad = new Date(caducidadQrPaciente(new Date(estado.contenido.fi ?? Date.now()), fechaEfectiva, config.dias_validez_qr_paciente, config.dias_validez_qr_paciente_sin_fecha));

  return (
    <main className="contenido vista-paciente">
      <section className="tarjeta">
        <div className="idioma-selector no-print">
          <button type="button" className={`chip-hora ${idioma === 'es' ? 'seleccionado' : ''}`} onClick={() => setIdioma('es')}>{t.idioma_es}</button>
          <button type="button" className={`chip-hora ${idioma === 'ca' ? 'seleccionado' : ''}`} onClick={() => setIdioma('ca')}>{t.idioma_ca}</button>
        </div>

        <h1>{t.titulo}</h1>

        <CuerpoHoja instrucciones={instrucciones} ay={estado.contenido.ay} ex={estado.contenido.ex} fecha={fechaEfectiva ? fechaEfectiva.getTime() : null} t={t} idioma={idioma} interactivo />

        <p className="aviso aviso-info">{t.aviso_cambio_fecha}</p>

        <div className="no-print">
          {!mostrarCambioFecha ? (
            <button type="button" className="boton-primario" onClick={() => setMostrarCambioFecha(true)}>{t.boton_cambiar_fecha}</button>
          ) : (
            <div className="cambio-fecha">
              <div className="campo">
                <label htmlFor="vp-fecha">{t.nueva_fecha_label}</label>
                <input id="vp-fecha" type="date" value={fechaNueva} onChange={(e) => setFechaNueva(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="vp-hora">{t.nueva_hora_label}</label>
                <input id="vp-hora" type="time" value={horaNueva} onChange={(e) => setHoraNueva(e.target.value)} />
              </div>
              <button type="button" className="boton-primario" onClick={recalcular}>{t.recalcular}</button>
            </div>
          )}
          <button type="button" className="boton-secundario" onClick={() => window.print()}>Guardar como PDF</button>
        </div>

        <footer className="pie">
          <p>{t.pie}</p>
          <p>{config.nombre_centro} · v{config.version_contenido} ({config.fecha_revision_clinica})</p>
          <p>Válido hasta {caducidad.toLocaleDateString('es-ES')}.</p>
          <p className="pie-copyright">
            © 2026 AnesHealth. Todos los derechos reservados. Uso restringido al Servicio de Anestesiología del Hospital Vithas Barcelona.
          </p>
        </footer>
      </section>
    </main>
  );
}
