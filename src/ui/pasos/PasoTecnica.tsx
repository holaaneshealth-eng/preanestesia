/**
 * Paso 7 — Técnica anestésica prevista. Se pueden marcar VARIAS técnicas a la vez
 * (p. ej. general + bloqueo, o raquídea + sedación). Si se cambia más tarde, todas
 * las reglas y salidas se recalculan.
 * En procedimientos oftalmológicos ofrece "tópica", "retrobulbar o peribulbar",
 * "general" y "sedación". En la catarata, la técnica decide el grupo oftalmológico
 * (tópica = riesgo bajo; retrobulbar o peribulbar = moderado-alto); sin técnica
 * elegida, la catarata se trata como moderado-alto y se indica (§8.1-8.3).
 */
import { useState } from 'react';
import type { TecnicaAnestesica, GrupoOftalmologico } from '../../dominio/tipos.ts';
import type { Procedimiento } from '../../datos/procedimientos.ts';

/** Subcampos de la técnica para la información de riesgos del paciente (§8.17). */
export interface SubtecnicaRiesgos {
  subtipoNeuroaxial?: 'raquidea' | 'epidural' | 'combinada';
}

interface Props {
  /** Técnicas iniciales (al volver al paso para cambiarlas). */
  inicial: TecnicaAnestesica[];
  /** Subcampos iniciales (al volver al paso para cambiarlos). */
  inicialSub?: SubtecnicaRiesgos | undefined;
  procedimiento: Procedimiento | null;
  /** Devuelve las técnicas, (en catarata) el grupo oftalmológico y los subcampos de §8.17. */
  onContinuar: (tecnicas: TecnicaAnestesica[], grupoOftalmologico: GrupoOftalmologico | undefined, sub: SubtecnicaRiesgos) => void;
  onVolver: () => void;
}

const TECNICAS_GENERAL: Array<{ valor: TecnicaAnestesica; etiqueta: string }> = [
  { valor: 'general', etiqueta: 'General' },
  { valor: 'sedacion', etiqueta: 'Sedación' },
  { valor: 'neuroaxial', etiqueta: 'Neuroaxial (raquídea/epidural)' },
  { valor: 'bloqueo_periferico', etiqueta: 'Bloqueo periférico' },
  { valor: 'bloqueo_profundo', etiqueta: 'Bloqueo profundo' },
  { valor: 'local', etiqueta: 'Anestesia local' },
  { valor: 'no_se_sabe', etiqueta: 'No se sabe todavía' },
];

const TECNICAS_OFTALMO: Array<{ valor: TecnicaAnestesica; etiqueta: string }> = [
  { valor: 'topica', etiqueta: 'Tópica' },
  { valor: 'retrobulbar_peribulbar', etiqueta: 'Retrobulbar o peribulbar' },
  { valor: 'general', etiqueta: 'General' },
  { valor: 'sedacion', etiqueta: 'Sedación' },
];

/** Grupo oftalmológico de la catarata según las técnicas marcadas (undefined = sin elegir). */
export function grupoCatarataPorTecnicas(tecnicas: TecnicaAnestesica[]): GrupoOftalmologico {
  // Si solo se marca tópica → riesgo bajo. Cualquier otra (retrobulbar, general…) o
  // nada → moderado-alto (el supuesto más prudente).
  if (tecnicas.length === 1 && tecnicas[0] === 'topica') return 'riesgo_bajo';
  return 'riesgo_moderado_alto';
}

export function PasoTecnica({ inicial, inicialSub, procedimiento, onContinuar, onVolver }: Props) {
  const esOftalmo = procedimiento?.especialidad === 'oftalmologia';
  const esCatarata = /catarata/i.test(procedimiento?.id ?? '') || /catarata/i.test(procedimiento?.nombre ?? '');
  const opciones = esOftalmo ? TECNICAS_OFTALMO : TECNICAS_GENERAL;
  const valores = new Set(opciones.map((o) => o.valor));
  // Técnicas iniciales válidas para el tipo de procedimiento.
  const [tecnicas, setTecnicas] = useState<Set<TecnicaAnestesica>>(
    new Set((inicial ?? []).filter((t) => valores.has(t))),
  );
  // Subcampo neuroaxial de §8.17 (solo decide qué información de riesgos ve el paciente).
  const [subtipoNeuroaxial, setSubtipoNeuroaxial] = useState<'raquidea' | 'epidural' | 'combinada' | ''>(inicialSub?.subtipoNeuroaxial ?? '');

  const esNeuroaxial = tecnicas.has('neuroaxial');

  function alternar(t: TecnicaAnestesica) {
    setTecnicas((prev) => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t);
      else {
        // «No se sabe» es excluyente: al marcarlo se quita el resto y viceversa.
        if (t === 'no_se_sabe') s.clear();
        else s.delete('no_se_sabe');
        s.add(t);
      }
      return s;
    });
  }

  function continuar() {
    const lista = [...tecnicas];
    const t = lista.length === 0 ? (['no_se_sabe'] as TecnicaAnestesica[]) : lista;
    const sub: SubtecnicaRiesgos = {
      ...(tecnicas.has('neuroaxial') && subtipoNeuroaxial ? { subtipoNeuroaxial } : {}),
    };
    onContinuar(t, esCatarata ? grupoCatarataPorTecnicas(t) : undefined, sub);
  }

  return (
    <section className="tarjeta" aria-labelledby="paso7-tec-tit">
      <h2 id="paso7-tec-tit">Paso 7 · Técnica anestésica prevista</h2>
      <p>Puede marcar varias (p. ej. raquídea y sedación, o general y bloqueo). Si se cambia más tarde, las reglas y las salidas se recalculan.</p>

      <fieldset className="campo">
        <legend>Técnica (puede marcar varias)</legend>
        <div className="grupo-checks">
          {opciones.map((t) => (
            <label key={t.valor} className={`radio-tarjeta ${tecnicas.has(t.valor) ? 'seleccionado' : ''}`}>
              <input type="checkbox" checked={tecnicas.has(t.valor)} onChange={() => alternar(t.valor)} />
              {t.etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Subcampo de §8.17: solo decide qué información de riesgos ve el paciente;
          NO cambia ninguna regla ni plazo (para las reglas sigue siendo neuroaxial). */}
      {esNeuroaxial && (
        <fieldset className="campo">
          <legend>Tipo de técnica neuroaxial (para la información al paciente)</legend>
          <div className="grupo-radios">
            {([
              { valor: 'raquidea', etiqueta: 'Raquídea (intradural)' },
              { valor: 'epidural', etiqueta: 'Epidural' },
              { valor: 'combinada', etiqueta: 'Combinada raquídea-epidural' },
            ] as const).map((o) => (
              <label key={o.valor} className={`radio-tarjeta ${subtipoNeuroaxial === o.valor ? 'seleccionado' : ''}`}>
                <input type="radio" name="subneuroaxial" checked={subtipoNeuroaxial === o.valor} onChange={() => setSubtipoNeuroaxial(o.valor)} />
                {o.etiqueta}
              </label>
            ))}
          </div>
          <p className="horas-elegidas">Si no se especifica, el paciente verá la información de la raquídea y una nota sobre la epidural.</p>
        </fieldset>
      )}

      {esCatarata && tecnicas.size === 0 && (
        <p className="aviso aviso-atencion" role="note">
          Sin técnica elegida, la catarata se trata como oftalmología de riesgo moderado-alto (anticoagulantes como riesgo hemorrágico alto).
        </p>
      )}
      {esCatarata && tecnicas.size === 1 && tecnicas.has('topica') && (
        <p className="aviso aviso-info" role="note">Catarata tópica: oftalmología de riesgo bajo; no se suspenden antiagregantes ni anticoagulantes.</p>
      )}
      {esCatarata && tecnicas.has('retrobulbar_peribulbar') && (
        <p className="aviso aviso-info" role="note">Catarata con bloqueo retrobulbar o peribulbar: riesgo moderado-alto (anticoagulantes como riesgo hemorrágico alto).</p>
      )}

      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={onVolver}>Volver</button>
        <button type="button" className="boton-primario" onClick={continuar}>Continuar</button>
      </div>
    </section>
  );
}
