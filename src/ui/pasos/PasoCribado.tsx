/**
 * Paso 7 — Cribado por aparatos y HEMSTOP (R3.2.21–R3.2.23).
 * Casillas agrupadas por aparato (cada una activaría su módulo de patología);
 * opción explícita «Ninguna enfermedad conocida»; y el cuestionario HEMSTOP, que
 * se hace SIEMPRE, con su resultado en vivo (positivo → pedir coagulación + alerta).
 */
import { useState } from 'react';
import { calcularHemstop, type EntradaHemstop } from '../../dominio/escalas/hemstop.ts';
import {
  APARATOS,
  PREGUNTAS_HEMSTOP,
  HEMSTOP_VACIO,
  moduloDeEnfermedad,
  PREGUNTAS_CONDICIONES_ESPECIALES,
  CONDICIONES_ESPECIALES_VACIO,
  type CribadoUi,
  type CondicionesEspeciales,
  type OtraEnfermedad,
} from '../estadoEntrevista.ts';
import { MODULO_POR_ID } from '../../datos/modulosDatos.ts';
import { RenderizadorModulo } from '../modulos/RenderizadorModulo.tsx';
import type { RespuestasModulos, ValorRespuesta } from '../../datos/modulos.ts';

interface Props {
  inicial: CribadoUi | null;
  /** El paciente es pediátrico (edad ≤ edad pediátrica máxima): activa el módulo de pediatría. */
  pediatrico?: boolean;
  /** La paciente es obstétrica (procedimiento obstétrico o embarazo): activa el módulo de obstetricia. */
  obstetrico?: boolean;
  onContinuar: (datos: CribadoUi) => void;
  onVolver: () => void;
}

export function PasoCribado({ inicial, pediatrico = false, obstetrico = false, onContinuar, onVolver }: Props) {
  const [ninguna, setNinguna] = useState(inicial?.ningunaConocida ?? false);
  const [enfermedades, setEnfermedades] = useState<Set<string>>(new Set(inicial?.enfermedades ?? []));
  const [respuestasModulos, setRespuestasModulos] = useState<RespuestasModulos>(inicial?.respuestasModulos ?? {});
  const [hemstop, setHemstop] = useState<EntradaHemstop>(inicial?.hemstop ?? { ...HEMSTOP_VACIO });
  // HEMSTOP preguntado: marcada si el estado inicial lo traía o había alguna respuesta.
  const [hemstopPreguntado, setHemstopPreguntado] = useState<boolean>(
    inicial?.hemstopPreguntado ?? Object.values(inicial?.hemstop ?? {}).some((v) => v === true),
  );
  const [condiciones, setCondiciones] = useState<CondicionesEspeciales>(
    inicial?.condicionesEspeciales ?? { ...CONDICIONES_ESPECIALES_VACIO },
  );
  // Otras enfermedades escritas a mano (§6), no incluidas en el catálogo.
  const [otrasEnfermedades, setOtrasEnfermedades] = useState<OtraEnfermedad[]>(
    inicial?.otrasEnfermedades ?? [],
  );
  const [otraNombre, setOtraNombre] = useState('');
  const [otraDetalle, setOtraDetalle] = useState('');

  const resHemstop = calcularHemstop(hemstop);

  function anadirOtraEnfermedad() {
    if (otraNombre.trim() === '') return;
    const nueva: OtraEnfermedad = { nombre: otraNombre.trim() };
    if (otraDetalle.trim() !== '') nueva.detalle = otraDetalle.trim();
    setOtrasEnfermedades((lista) => [...lista, nueva]);
    setOtraNombre('');
    setOtraDetalle('');
    setNinguna(false);
  }
  function quitarOtraEnfermedad(indice: number) {
    setOtrasEnfermedades((lista) => lista.filter((_, i) => i !== indice));
  }

  // Módulos a desplegar: uno por cada casilla marcada que tenga módulo (sin repetir).
  // El módulo de pediatría (§5.12) se activa por edad, no por casilla, y va el primero.
  const modulosPorCasilla = [...new Set([...enfermedades].map(moduloDeEnfermedad))]
    .map((idModulo) => MODULO_POR_ID[idModulo])
    .filter((m): m is NonNullable<typeof m> => m !== undefined);
  // El módulo de pediatría (§5.12) y el de obstetricia (§5.13) se activan por el
  // tipo de paciente, no por casilla, y van los primeros.
  const modulosPorTipo = [
    ...(pediatrico ? [MODULO_POR_ID['pediatria']] : []),
    ...(obstetrico ? [MODULO_POR_ID['obstetricia']] : []),
  ].filter((m): m is NonNullable<typeof m> => m !== undefined);
  const idsPorTipo = new Set(modulosPorTipo.map((m) => m.id));
  const modulosActivos = [...modulosPorTipo, ...modulosPorCasilla.filter((m) => !idsPorTipo.has(m.id))];

  function cambiarRespuesta(idModulo: string, idPregunta: string, valor: ValorRespuesta) {
    setRespuestasModulos((prev) => ({
      ...prev,
      [idModulo]: { ...(prev[idModulo] ?? {}), [idPregunta]: valor },
    }));
  }

  function alternar(id: string) {
    setEnfermedades((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
    setNinguna(false);
  }
  function marcarNinguna() {
    setNinguna(true);
    setEnfermedades(new Set());
    setOtrasEnfermedades([]);
  }
  function alternarHemstop(id: keyof EntradaHemstop) {
    setHemstop((h) => ({ ...h, [id]: !h[id] }));
    // Al marcar cualquier respuesta, el HEMSTOP queda «preguntado» automáticamente.
    setHemstopPreguntado(true);
  }
  function alternarCondicion(id: keyof CondicionesEspeciales) {
    setCondiciones((c) => ({ ...c, [id]: !c[id] }));
  }

  // Se puede continuar siempre (el HEMSTOP se recoge aquí y el cribado admite «ninguna»).
  function continuar() {
    // Conserva solo las respuestas de módulos aún activos.
    const idsActivos = new Set(modulosActivos.map((m) => m.id));
    const respuestasFiltradas: RespuestasModulos = {};
    for (const [idModulo, resp] of Object.entries(respuestasModulos)) {
      if (idsActivos.has(idModulo)) respuestasFiltradas[idModulo] = resp;
    }
    onContinuar({
      ningunaConocida: ninguna && enfermedades.size === 0 && otrasEnfermedades.length === 0,
      enfermedades: [...enfermedades],
      respuestasModulos: respuestasFiltradas,
      hemstop,
      hemstopPreguntado,
      condicionesEspeciales: condiciones,
      otrasEnfermedades,
    });
  }

  return (
    <section className="tarjeta" aria-labelledby="paso7-tit">
      <h2 id="paso7-tit">Paso 6 · Enfermedades y hemostasia</h2>

      <p>Marque las enfermedades conocidas. Cada una activará su módulo de preguntas específicas.</p>
      <label className={`radio-tarjeta ${ninguna && enfermedades.size === 0 && otrasEnfermedades.length === 0 ? 'seleccionado' : ''}`}>
        <input type="checkbox" checked={ninguna && enfermedades.size === 0 && otrasEnfermedades.length === 0} onChange={() => (ninguna ? setNinguna(false) : marcarNinguna())} />
        Ninguna enfermedad conocida
      </label>

      {APARATOS.map((grupo) => (
        <fieldset className="campo" key={grupo.aparato}>
          <legend>{grupo.aparato}</legend>
          <div className="grupo-checks">
            {grupo.enfermedades.map((e) => (
              <label key={e.id} className={`radio-tarjeta ${enfermedades.has(e.id) ? 'seleccionado' : ''}`}>
                <input type="checkbox" checked={enfermedades.has(e.id)} onChange={() => alternar(e.id)} />
                {e.etiqueta}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <h3>Otras enfermedades no incluidas en la lista</h3>
      <p>
        Si el paciente tiene alguna enfermedad que no aparece arriba, puede añadirla a mano. El programa
        la recoge en el informe, pero <strong>no le aplica reglas ni alertas</strong>: revísela usted.
      </p>
      {otrasEnfermedades.length === 0 ? (
        <p>No se ha añadido ninguna enfermedad fuera de la lista.</p>
      ) : (
        <ul className="lista-previas">
          {otrasEnfermedades.map((o, i) => (
            <li key={`${o.nombre}-${i}`} className="previa">
              <div>
                <strong>{o.nombre}</strong>
                {o.detalle ? <div className="previa-incid">{o.detalle}</div> : null}
              </div>
              <button type="button" className="boton-enlace" onClick={() => quitarOtraEnfermedad(i)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <fieldset className="campo bloque-anadir">
        <legend>Añadir otra enfermedad no incluida en la lista</legend>
        <div className="campo">
          <label htmlFor="oe-nombre">Nombre de la enfermedad</label>
          <input id="oe-nombre" type="text" value={otraNombre} onChange={(e) => setOtraNombre(e.target.value)} placeholder="p. ej. Enfermedad de Behçet" />
        </div>
        <div className="campo">
          <label htmlFor="oe-detalle">Detalle (opcional)</label>
          <textarea id="oe-detalle" rows={2} value={otraDetalle} onChange={(e) => setOtraDetalle(e.target.value)} placeholder="Lo que quiera anotar sobre esta enfermedad" />
        </div>
        <button type="button" className="boton-secundario" disabled={otraNombre.trim() === ''} onClick={anadirOtraEnfermedad}>
          Añadir otra enfermedad no incluida en la lista
        </button>
      </fieldset>

      {modulosActivos.length > 0 && (
        <div className="modulos-desplegados">
          <h3>Preguntas de las enfermedades marcadas</h3>
          {modulosActivos.map((m) => (
            <RenderizadorModulo
              key={m.id}
              modulo={m}
              respuestas={respuestasModulos[m.id] ?? {}}
              onCambio={(idPregunta, valor) => cambiarRespuesta(m.id, idPregunta, valor)}
            />
          ))}
        </div>
      )}

      <h3>Condiciones especiales</h3>
      <p>Antecedentes personales o familiares relevantes para la anestesia (§5.15).</p>
      <div className="grupo-checks">
        {PREGUNTAS_CONDICIONES_ESPECIALES.map((p) => (
          <label key={p.id} className={`radio-tarjeta ${condiciones[p.id] ? 'seleccionado' : ''}`}>
            <input type="checkbox" checked={condiciones[p.id]} onChange={() => alternarCondicion(p.id)} />
            {p.etiqueta}
          </label>
        ))}
      </div>

      <h3>Cuestionario de sangrado (HEMSTOP)</h3>
      <p>Se hace a todos los pacientes, marque o no marque enfermedades de la sangre.</p>
      {/* «HEMSTOP preguntado»: se marca sola al marcar cualquier respuesta; márquela a
          mano si lo ha preguntado y todas son «no». Solo así el SAP escribe la línea. */}
      <label className={`radio-tarjeta ${hemstopPreguntado ? 'seleccionado' : ''}`}>
        <input type="checkbox" checked={hemstopPreguntado} onChange={() => setHemstopPreguntado((v) => !v)} />
        HEMSTOP preguntado
      </label>
      <div className="grupo-checks">
        {PREGUNTAS_HEMSTOP.map((p) => (
          <label key={p.id} className={`radio-tarjeta ${hemstop[p.id] ? 'seleccionado' : ''}`}>
            <input type="checkbox" checked={hemstop[p.id]} onChange={() => alternarHemstop(p.id)} />
            {p.etiqueta}
          </label>
        ))}
      </div>
      <p className={`aviso ${resHemstop.positivo ? 'aviso-atencion' : 'aviso-info'}`} role="note" aria-live="polite">
        HEMSTOP: <strong>{resHemstop.puntuacion}</strong> ·{' '}
        {resHemstop.positivo
          ? 'positivo (≥ 2): se solicitará estudio de coagulación aunque la tabla no lo pida'
          : 'negativo'}
      </p>

      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={onVolver}>Volver</button>
        <button type="button" className="boton-primario" onClick={continuar}>Continuar</button>
      </div>
    </section>
  );
}
