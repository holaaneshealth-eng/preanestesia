/**
 * Paso 2 — Alergias (R3.2.14–R3.2.15). Decisión del servicio (2026-10-04): se
 * muestra solo una casilla «Alergias conocidas»; si NO se marca, se registra como
 * «sin alergias conocidas». Al marcarla se despliegan los formularios: medicamentos
 * (con tipo de reacción, campos grandes), látex, contrastes, clorhexidina,
 * adhesivos y alimentos relevantes.
 */
import { useState } from 'react';
import { ALIMENTOS_ALERGIA, type AlergiasUi, type AlergiaMedicamento } from '../estadoEntrevista.ts';
import { evaluarMtnd4, type EntradaMtnd4, type ResultadoTest } from '../../dominio/mtnd4/mtnd4.ts';

interface Props {
  inicial: AlergiasUi | null;
  /** Cribado mtND4 inicial (ahora vive en este paso, tras una casilla; §9). */
  inicialMtnd4?: EntradaMtnd4 | null;
  onContinuar: (datos: AlergiasUi, mtnd4: EntradaMtnd4) => void;
  onVolver: () => void;
}

const TESTS_MTND4: Array<{ valor: ResultadoTest; etiqueta: string }> = [
  { valor: 'no_hecho', etiqueta: 'No se ha hecho' },
  { valor: 'positivo', etiqueta: 'Positivo (variante presente)' },
  { valor: 'negativo', etiqueta: 'Negativo (variante ausente)' },
];

/** mtND4 «sin factores»: no genera alerta ni línea en la hoja del paciente. */
const MTND4_VACIO: EntradaMtnd4 = {
  ascendenciaVenezolanaMaterna: false,
  origenMaternoDesconocidoUOvodonacion: false,
  antecedentesFamiliaresCompatibles: false,
  testGenetico: 'no_hecho',
};

export function PasoAlergias({ inicial, inicialMtnd4, onContinuar, onVolver }: Props) {
  // Marca única «Alergias conocidas». Si el estado inicial trae alguna alergia o no
  // estaba marcado «ninguna», se considera que hay alergias conocidas.
  const [conocidas, setConocidas] = useState(
    inicial ? !inicial.ningunaConocida : false,
  );
  const [medicamentos, setMedicamentos] = useState<AlergiaMedicamento[]>(inicial?.medicamentos ?? []);
  const [latex, setLatex] = useState(inicial?.latex ?? false);
  const [contrastes, setContrastes] = useState(inicial?.contrastesYodados ?? false);
  const [clorhexidina, setClorhexidina] = useState(inicial?.clorhexidina ?? false);
  const [adhesivos, setAdhesivos] = useState(inicial?.adhesivos ?? false);
  const [alimentos, setAlimentos] = useState<Set<string>>(new Set(inicial?.alimentos ?? []));

  // Formulario para añadir una alergia a medicamento.
  const [farmaco, setFarmaco] = useState('');
  const [reaccion, setReaccion] = useState('');

  // Cribado mtND4 (§9), ahora tras una casilla en este paso. Marcada si el estado
  // inicial traía algún factor o un test distinto de «no hecho».
  const mtnd4Inicial = inicialMtnd4
    ? inicialMtnd4.ascendenciaVenezolanaMaterna || inicialMtnd4.origenMaternoDesconocidoUOvodonacion || inicialMtnd4.antecedentesFamiliaresCompatibles || inicialMtnd4.testGenetico !== 'no_hecho'
    : false;
  const [posibleVenezolana, setPosibleVenezolana] = useState(mtnd4Inicial);
  const [venezolanaMaterna, setVenezolanaMaterna] = useState(inicialMtnd4?.ascendenciaVenezolanaMaterna ?? false);
  const [origenDesconocido, setOrigenDesconocido] = useState(inicialMtnd4?.origenMaternoDesconocidoUOvodonacion ?? false);
  const [antecedentesMtnd4, setAntecedentesMtnd4] = useState(inicialMtnd4?.antecedentesFamiliaresCompatibles ?? false);
  const [testMtnd4, setTestMtnd4] = useState<ResultadoTest>(inicialMtnd4?.testGenetico ?? 'no_hecho');

  const entradaMtnd4: EntradaMtnd4 = {
    ascendenciaVenezolanaMaterna: venezolanaMaterna,
    origenMaternoDesconocidoUOvodonacion: origenDesconocido,
    antecedentesFamiliaresCompatibles: antecedentesMtnd4,
    testGenetico: testMtnd4,
  };
  const resultadoMtnd4 = evaluarMtnd4(entradaMtnd4);

  function anadirMedicamento() {
    if (farmaco.trim() === '') return;
    setMedicamentos((m) => [...m, { farmaco: farmaco.trim(), reaccion: reaccion.trim() }]);
    setFarmaco('');
    setReaccion('');
  }
  function quitarMedicamento(i: number) {
    setMedicamentos((m) => m.filter((_, j) => j !== i));
  }
  function alternarAlimento(id: string) {
    setAlimentos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function continuar() {
    // El cribado mtND4 solo aporta factores si se marca la casilla; si no, va vacío.
    const mtnd4 = posibleVenezolana ? entradaMtnd4 : MTND4_VACIO;
    // Si no se marca «Alergias conocidas», se registra como sin alergias conocidas,
    // ignorando cualquier dato que hubiera quedado de un despliegue previo.
    if (!conocidas) {
      onContinuar({
        ningunaConocida: true,
        medicamentos: [],
        latex: false,
        contrastesYodados: false,
        clorhexidina: false,
        adhesivos: false,
        alimentos: [],
      }, mtnd4);
      return;
    }
    onContinuar({
      ningunaConocida: false,
      medicamentos,
      latex,
      contrastesYodados: contrastes,
      clorhexidina,
      adhesivos,
      alimentos: [...alimentos],
    }, mtnd4);
  }

  const casilla = (v: boolean, set: (b: boolean) => void, etiqueta: string) => (
    <label className={`radio-tarjeta ${v ? 'seleccionado' : ''}`}>
      <input type="checkbox" checked={v} onChange={() => set(!v)} />
      {etiqueta}
    </label>
  );

  return (
    <section className="tarjeta" aria-labelledby="paso-alergias-tit">
      <h2 id="paso-alergias-tit">Paso 2 · Alergias</h2>

      <label className={`radio-tarjeta ${conocidas ? 'seleccionado' : ''}`}>
        <input type="checkbox" checked={conocidas} onChange={() => setConocidas(!conocidas)} />
        Alergias conocidas
      </label>
      {!conocidas && (
        <p className="aviso aviso-info" role="note">
          Si no marca esta casilla, se registrará como <strong>sin alergias conocidas</strong>.
        </p>
      )}

      {conocidas && (
        <>
          <h3>Medicamentos</h3>
          {medicamentos.length === 0 ? (
            <p>No se ha añadido ninguna alergia a medicamentos.</p>
          ) : (
            <ul className="lista-previas">
              {medicamentos.map((m, i) => (
                <li key={`${m.farmaco}-${i}`} className="previa">
                  <div><strong>{m.farmaco}</strong>{m.reaccion ? ` · ${m.reaccion}` : ''}</div>
                  <button type="button" className="boton-enlace" onClick={() => quitarMedicamento(i)}>Quitar</button>
                </li>
              ))}
            </ul>
          )}
          <fieldset className="campo bloque-anadir">
            <legend>Añadir alergia a medicamento</legend>
            <div className="campo">
              <label htmlFor="al-farmaco">Medicamento</label>
              <input id="al-farmaco" className="campo-grande" type="text" value={farmaco} onChange={(e) => setFarmaco(e.target.value)} placeholder="p. ej. Penicilina" />
            </div>
            <div className="campo">
              <label htmlFor="al-reaccion">Tipo de reacción (opcional)</label>
              <input id="al-reaccion" className="campo-grande" type="text" value={reaccion} onChange={(e) => setReaccion(e.target.value)} placeholder="p. ej. exantema, anafilaxia" />
            </div>
            <button type="button" className="boton-secundario" disabled={farmaco.trim() === ''} onClick={anadirMedicamento}>
              Añadir a la lista
            </button>
          </fieldset>

          <h3>Otras alergias</h3>
          <div className="grupo-checks">
            {casilla(latex, setLatex, 'Látex')}
            {casilla(contrastes, setContrastes, 'Contrastes yodados')}
            {casilla(clorhexidina, setClorhexidina, 'Clorhexidina')}
            {casilla(adhesivos, setAdhesivos, 'Adhesivos')}
          </div>

          <h3>Alimentos relevantes</h3>
          <div className="grupo-checks">
            {ALIMENTOS_ALERGIA.map((a) => (
              <label key={a.id} className={`radio-tarjeta ${alimentos.has(a.id) ? 'seleccionado' : ''}`}>
                <input type="checkbox" checked={alimentos.has(a.id)} onChange={() => alternarAlimento(a.id)} />
                {a.etiqueta}
              </label>
            ))}
          </div>
        </>
      )}

      {/* Cribado mtND4 (§9), tras una casilla desmarcada por defecto. La lógica, las
          alertas y los puntos de validación del mtND4 no cambian. */}
      <h3>Origen materno (cribado mtND4)</h3>
      <label className={`radio-tarjeta ${posibleVenezolana ? 'seleccionado' : ''}`}>
        <input type="checkbox" checked={posibleVenezolana} onChange={() => setPosibleVenezolana(!posibleVenezolana)} />
        Es posible que haya antecedentes familiares por línea materna de origen venezolano
      </label>

      {posibleVenezolana && (
        <>
          <div className="guion" role="note">
            <p className="guion-titulo">Guion para explicar la pregunta al paciente:</p>
            <p className="guion-texto">
              «Hacemos esta pregunta a todos los pacientes porque se ha descrito una variante genética
              heredada por vía materna, más frecuente en familias de origen venezolano, que puede influir
              en cómo se elige la anestesia».
            </p>
          </div>

          <div className="grupo-checks">
            <label className={`radio-tarjeta ${venezolanaMaterna ? 'seleccionado' : ''}`}>
              <input type="checkbox" checked={venezolanaMaterna} onChange={() => setVenezolanaMaterna(!venezolanaMaterna)} />
              Ascendencia venezolana por línea materna directa
            </label>
            <label className={`radio-tarjeta ${origenDesconocido ? 'seleccionado' : ''}`}>
              <input type="checkbox" checked={origenDesconocido} onChange={() => setOrigenDesconocido(!origenDesconocido)} />
              Origen materno desconocido u ovodonación
            </label>
            <label className={`radio-tarjeta ${antecedentesMtnd4 ? 'seleccionado' : ''}`}>
              <input type="checkbox" checked={antecedentesMtnd4} onChange={() => setAntecedentesMtnd4(!antecedentesMtnd4)} />
              Antecedentes familiares compatibles (línea materna)
            </label>
          </div>

          <fieldset className="campo">
            <legend>Test genético de la variante mtND4</legend>
            <div className="grupo-radios">
              {TESTS_MTND4.map((t) => (
                <label key={t.valor} className={`radio-tarjeta ${testMtnd4 === t.valor ? 'seleccionado' : ''}`}>
                  <input type="radio" name="test-mtnd4" checked={testMtnd4 === t.valor} onChange={() => setTestMtnd4(t.valor)} />
                  {t.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="riesgos" aria-live="polite">
            <p className="riesgos-titulo">Resultado del cribado (motor):</p>
            {resultadoMtnd4.alerta === null ? (
              <p>Sin alerta: no hay factores de línea materna ni test que la generen.</p>
            ) : (
              <p><strong>{resultadoMtnd4.alerta.gravedad === 'roja' ? 'Alerta roja' : resultadoMtnd4.alerta.gravedad === 'amarilla' ? 'Alerta' : 'Informativa'}:</strong> {resultadoMtnd4.alerta.mensaje}</p>
            )}
          </div>
        </>
      )}

      <div className="acciones">
        <button type="button" className="boton-secundario" onClick={onVolver}>Volver</button>
        <button type="button" className="boton-primario" onClick={continuar}>Continuar</button>
      </div>
    </section>
  );
}
