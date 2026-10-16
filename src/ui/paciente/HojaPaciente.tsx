/**
 * Hoja del paciente con su QR (§10.2, §11.1), mostrada desde el resumen. Construye
 * el contenido estructurado (medicación, ayuno y condicionales), lo serializa en el
 * enlace (tras «#p=»), genera la imagen del QR y ofrece copiar el enlace y guardar
 * como PDF. Al escanear el QR se abre la vista interactiva (VistaPaciente).
 */
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import config from '../../../datos/config.json';
import type { DatosIntervencion } from '../../dominio/tipos.ts';
import {
  recalcularHojaEstructurada,
  caducidadQrPaciente,
  type AyunoQr,
  type ExtrasHojaQr,
} from '../../dominio/salidas/qr/hojaPaciente.ts';
import {
  construirContenidoQrPaciente,
  payloadPaciente,
  type FarmacoPlan,
} from '../../dominio/salidas/qr/construirContenido.ts';
import { serializar, cabeEnQr } from '../../dominio/salidas/qr/serializar.ts';
import { textosPaciente } from './textosPaciente.ts';
import { CuerpoHoja } from './CuerpoHoja.tsx';

interface Props {
  plan: FarmacoPlan[];
  intervencion: DatosIntervencion;
  ay?: AyunoQr | undefined;
  ex?: ExtrasHojaQr | undefined;
}

/**
 * Dirección base de la vista del paciente a la que apuntan los QR (§8.16, Bloque
 * III-A). Se decide en el build según dónde se compile (GitHub Pages o Cloudflare
 * Pages, con la rama): el valor `__URL_VISTA_PACIENTE__` lo hornea Vite
 * (ver despliegue.config.ts). Respaldos: `config.url_vista_paciente` y, si no, la
 * ruta «/paciente/» del propio despliegue actual.
 */
function urlVistaPaciente(): string {
  if (typeof __URL_VISTA_PACIENTE__ !== 'undefined' && __URL_VISTA_PACIENTE__.length > 0) {
    return __URL_VISTA_PACIENTE__;
  }
  const u = (config as { url_vista_paciente?: string }).url_vista_paciente;
  if (u && u.length > 0) return u;
  return `${location.origin}${location.pathname.replace(/\/[^/]*$/, '')}/paciente/`;
}

export function HojaPaciente({ plan, intervencion, ay, ex }: Props) {
  const [cadena, setCadena] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const t = textosPaciente('es');

  const contenido = useMemo(
    // El teléfono NO viaja en el QR (§config, punto 4): la vista lo lee de config al
    // renderizar, para que un QR ya entregado muestre el valor nuevo si cambia.
    () => construirContenidoQrPaciente(plan, '', intervencion.fechaHora, ay, ex),
    [plan, intervencion.fechaHora, ay, ex],
  );

  const instrucciones = useMemo(
    () => recalcularHojaEstructurada(contenido, intervencion.fechaHora),
    [contenido, intervencion.fechaHora],
  );

  useEffect(() => {
    let vivo = true;
    const creacion = new Date();
    const caducidad = caducidadQrPaciente(creacion, intervencion.fechaHora, config.dias_validez_qr_paciente, config.dias_validez_qr_paciente_sin_fecha);
    const payload = payloadPaciente(contenido, config.version_contenido, creacion, caducidad);
    void serializar(payload).then(async (c) => {
      if (!vivo) return;
      setCadena(c);
      const url = `${urlVistaPaciente()}#p=${c}`;
      try {
        const data = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
        if (vivo) setQrDataUrl(data);
      } catch {
        if (vivo) setQrDataUrl(null);
      }
    });
    return () => { vivo = false; };
  }, [contenido, intervencion.fechaHora]);

  const enlace = cadena ? `${urlVistaPaciente()}#p=${cadena}` : '';
  const cabe = cadena ? cabeEnQr(cadena) : true;

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="tarjeta hoja-paciente" aria-labelledby="hoja-tit">
      <h2 id="hoja-tit">Hoja del paciente</h2>

      <CuerpoHoja instrucciones={instrucciones} ay={ay} ex={ex} fecha={intervencion.fechaHora ? intervencion.fechaHora.getTime() : null} t={t} />

      <h3>Código QR para el paciente</h3>
      <p className="no-print">El paciente puede escanear este código con el móvil para ver sus recomendaciones y, si le cambian la fecha, recalcularlas.</p>
      {qrDataUrl ? (
        <img className="qr-img" src={qrDataUrl} alt="Código QR de la hoja del paciente" width={240} height={240} />
      ) : (
        <p>Generando el código…</p>
      )}
      {!cabe && (
        <p className="aviso aviso-atencion">La información es demasiado extensa para el QR; use el enlace.</p>
      )}
      <div className="acciones no-print">
        <button type="button" className="boton-secundario" onClick={copiar} disabled={!enlace}>
          {copiado ? 'Enlace copiado ✓' : 'Copiar enlace para el paciente'}
        </button>
        <button type="button" className="boton-secundario" onClick={() => window.print()}>Guardar como PDF</button>
      </div>

      <p className="aviso aviso-info">
        Si le cambian la fecha o la hora de la intervención, el paciente debe abrir de nuevo este código e introducir la nueva fecha.
      </p>
    </section>
  );
}
