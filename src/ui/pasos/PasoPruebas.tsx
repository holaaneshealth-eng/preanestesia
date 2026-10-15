/**
 * Paso «Pruebas complementarias» (§7, fase ágil), entre enfermedades y técnica.
 * Para cada prueba la enfermera indica si el paciente la tiene y la ha traído, la
 * tiene pero no la ha traído, o no la tiene, con fecha opcional. De la analítica se
 * anotan, opcionales, la hemoglobina y el filtrado glomerular. El programa marca qué
 * pruebas están indicadas según la tabla y la vigencia. Nada es obligatorio.
 */
import { useState } from 'react';
import {
  PRUEBAS_COMPLEMENTARIAS,
  PRUEBAS_COMPLEMENTARIAS_VACIO,
  type PruebasComplementariasUi,
  type ClavePruebaComplementaria,
  type EstadoPruebaComplementaria,
} from '../estadoEntrevista.ts';

interface Props {
  inicial: PruebasComplementariasUi | null;
  /** Claves de las pruebas que el programa indica (según la tabla y la vigencia). */
  indicadas: Set<ClavePruebaComplementaria>;
  onContinuar: (datos: PruebasComplementariasUi) => void;
  onVolver: () => void;
}

const ESTADOS: Array<{ valor: EstadoPruebaComplementaria; etiqueta: string }> = [
  { valor: 'tiene_y_trajo', etiqueta: 'La tiene y la ha traído' },
  { valor: 'tiene_no_trajo', etiqueta: 'La tiene pero no la ha traído' },
  { valor: 'no_tiene', etiqueta: 'No la tiene' },
];

export function PasoPruebas({ inicial, indicadas, onContinuar, onVolver }: Props) {
  const [datos, setDatos] = useState<PruebasComplementariasUi>(inicial ?? { ...PRUEBAS_COMPLEMENTARIAS_VACIO });

  function cambiar(id: ClavePruebaComplementaria, cambios: { estado?: EstadoPruebaComplementaria; fecha?: string | undefined }) {
    setDatos((d) => ({ ...d, [id]: { ...d[id], ...cambios } }));
  }
  function cambiarEstado(id: ClavePruebaComplementaria, estado: EstadoPruebaComplementaria) {
    // Al elegir «no la tiene» se borra la fecha.
    cambiar(id, estado === 'no_tiene' ? { estado, fecha: undefined } : { estado });
  }
  function cambiarAnalitica(campo: 'hemoglobina' | 'filtradoGlomerular', valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor === '' ? undefined : Number(valor) }));
  }

  return (
    <section className="tarjeta" aria-labelledby="paso-pruebas-tit">
      <h2 id="paso-pruebas-tit">Pruebas complementarias</h2>
      <p>
        Para cada prueba, indique si el paciente la tiene y la ha traído, la tiene pero no la ha traído,
        o no la tiene. La fecha es opcional. Nada de este paso es obligatorio. El programa marca con
        <strong> «Indicada» </strong>las que corresponden según el protocolo (§7).
      </p>

      {PRUEBAS_COMPLEMENTARIAS.map((p) => {
        const estado = datos[p.id].estado;
        return (
          <fieldset className="campo" key={p.id}>
            <legend>
              {p.etiqueta}
              {indicadas.has(p.id) && <span className="chip-indicada"> · Indicada</span>}
            </legend>
            <div className="grupo-radios">
              {ESTADOS.map((e) => (
                <label key={e.valor} className={`radio-tarjeta ${estado === e.valor ? 'seleccionado' : ''}`}>
                  <input type="radio" name={`estado-${p.id}`} checked={estado === e.valor} onChange={() => cambiarEstado(p.id, e.valor)} />
                  {e.etiqueta}
                </label>
              ))}
            </div>
            {(estado === 'tiene_y_trajo' || estado === 'tiene_no_trajo') && (
              <div className="campo">
                <label htmlFor={`fecha-${p.id}`}>Fecha de la prueba (opcional)</label>
                <input id={`fecha-${p.id}`} type="date" value={datos[p.id].fecha ?? ''} onChange={(ev) => cambiar(p.id, { fecha: ev.target.value || undefined })} />
              </div>
            )}
            {/* De la analítica se anotan, opcionales, la hemoglobina y el filtrado glomerular. */}
            {p.id === 'analitica' && (estado === 'tiene_y_trajo' || estado === 'tiene_no_trajo') && (
              <div className="grupo-fechas">
                <label className="campo">
                  Hemoglobina (g/dL)
                  <input type="number" min={0} step="0.1" inputMode="decimal" value={datos.hemoglobina ?? ''} onChange={(ev) => cambiarAnalitica('hemoglobina', ev.target.value)} />
                </label>
                <label className="campo">
                  Filtrado glomerular (mL/min/1,73 m²)
                  <input type="number" min={0} step="1" inputMode="numeric" value={datos.filtradoGlomerular ?? ''} onChange={(ev) => cambiarAnalitica('filtradoGlomerular', ev.target.value)} />
                </label>
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={onVolver}>Volver</button>
        <button type="button" className="boton-primario" onClick={() => onContinuar(datos)}>Continuar</button>
      </div>
    </section>
  );
}
