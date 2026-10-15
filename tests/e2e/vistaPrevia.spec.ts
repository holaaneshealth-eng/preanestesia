import { test, expect, type Page } from '@playwright/test';

/**
 * Fechas en formato AAAA-MM-DD calculadas EN TIEMPO DE EJECUCIÓN a partir de hoy, para
 * que ninguna prueba de navegador dependa de una fecha concreta del calendario. La
 * fecha de intervención por defecto es hoy + 30 días; para fechas de módulos (stent,
 * ictus, analíticas) se calculan desplazamientos relativos a esa intervención.
 */
function fechaISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
/** Hoy + `dias` días (por defecto 30), en AAAA-MM-DD. */
function fechaRelativaHoy(dias = 30): string {
  return fechaISO(new Date(Date.now() + dias * 86_400_000));
}
/** La fecha de intervención por defecto de las pruebas: hoy + 30 días. */
const FECHA_INTERVENCION = fechaRelativaHoy(30);
/** Una fecha `dias` días ANTES de la intervención por defecto (p. ej. para módulos). */
function fechaAntesIntervencion(dias: number): string {
  return fechaISO(new Date(Date.now() + (30 - dias) * 86_400_000));
}

/**
 * Orden de la entrevista tras la Fase 2 (decisión del servicio, 2026-10-04):
 * 1 intervención · 2 ALERGIAS · 3 datos básicos · 4 antecedentes · 5 hábitos ·
 * 6 enfermedades · 7 técnica · 8 medicación · 9 vía aérea (no en telefónica) ·
 * 10 consentimiento · 11 mtND4 · 12 resultados.
 */

/** Abre un caso de entrenamiento por su título (robusto al orden de la lista). */
async function abrirCasoEntrenamiento(page: Page, tituloRegex: RegExp) {
  await page.getByRole('button', { name: 'Modo entrenamiento' }).click();
  const tarjeta = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: tituloRegex }) });
  await tarjeta.getByRole('button', { name: 'Abrir este caso' }).click();
}

/** Paso 2 · Alergias: sin marcar «Alergias conocidas» = sin alergias conocidas. */
async function pasoAlergiasSinAlergias(page: Page) {
  await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

/** Recorre una entrevista presencial mínima (hernioplastia, varón 60) hasta el resumen. */
async function entrevistaMinimaHastaResumen(page: Page) {
  await page.goto('/preanestesia/');
  await page.getByRole('button', { name: 'Presencial' }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();
  await page.locator('#fecha').fill(FECHA_INTERVENCION);
  await page.locator('#proc').fill('hernioplastia');
  await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
  await page.getByRole('button', { name: 'Continuar' }).click(); // 1 -> 2
  await pasoAlergiasSinAlergias(page);
  await page.locator('#edad').fill('60');
  await page.getByRole('radio', { name: 'Hombre' }).check();
  await page.locator('#peso').fill('80');
  await page.locator('#talla').fill('175');
  await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
  await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
  await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
  await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
  await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
  await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
  await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
  await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
  await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
  await pasoMtnd4NoVenezolana(page); // 11 -> resumen
  await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
}

/**
 * mtND4 (§9) ya no es un paso propio: vive tras una casilla en el paso de alergias
 * (desmarcada = sin ascendencia venezolana). Tras el consentimiento se llega directo
 * al resumen, así que este ayudante solo confirma que estamos en el resumen.
 */
async function pasoMtnd4NoVenezolana(page: Page) {
  await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
}

test.describe('Vista previa', () => {
  test('muestra la banda de versión de prueba y arranca en la pantalla de inicio', async ({ page }) => {
    await page.goto('/preanestesia/');
    await expect(page.getByText('VERSIÓN DE PRUEBA · NO USAR CON PACIENTES')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nueva entrevista/ })).toBeVisible();
  });

  test('Bloque III-B: el pie muestra el aviso de copyright de AnesHealth', async ({ page }) => {
    await page.goto('/preanestesia/');
    await expect(
      page.getByText('© 2026 AnesHealth. Todos los derechos reservados. Uso restringido al Servicio de Anestesiología del Hospital Vithas Barcelona.'),
    ).toBeVisible();
  });

  test('permite elegir modalidad y comenzar (lleva al paso 1)', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 1 · Datos de la intervención/ })).toBeVisible();
  });

  test('paso 1: rellenar fecha, buscar procedimiento y continuar al resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Fecha a más de 60 días para comprobar el aviso (hoy + 90 días).
    await page.locator('#fecha').fill(fechaRelativaHoy(90));
    await expect(page.getByText(/más de 60 días/)).toBeVisible();
    // Sin hora: aviso de las 08:00.
    await expect(page.getByText(/se asumirán las/)).toBeVisible();

    // Buscar y elegir un procedimiento.
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await expect(page.getByText(/Riesgos del procedimiento/)).toBeVisible();

    // Continuar al paso 2 (ahora alergias).
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
  });

  test('paso 1: fecha desconocida permite continuar y avisa de márgenes (§8.16)', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.getByRole('checkbox', { name: /La fecha de la intervención aún no se conoce/ }).check();
    await expect(page.getByText(/las instrucciones se darán como/)).toBeVisible();

    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
  });

  test('entrevista completa SIN fecha: márgenes en horas, días y "no tomar el día" sin fallar (§8.16)', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(String(e)));

    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1 sin fecha.
    await page.getByRole('checkbox', { name: /La fecha de la intervención aún no se conoce/ }).check();
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias (sin alergias) y paso 3 datos básicos.
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Pasos 4-7 sin datos extra (antecedentes, hábitos, enfermedades, técnica).
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: añadir fármacos con distintos tipos de plazo.
    await expect(page.getByRole('heading', { name: /Paso 8 · Medicación/ })).toBeVisible();

    // Eliquis (plazo en horas) → margen "como mínimo N horas antes".
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await expect(page.getByText(/como mínimo 48 horas antes/)).toBeVisible();

    // Plavix (plazo en días) → margen "los N días anteriores". Necesita hora de toma.
    await page.locator('#med').fill('Plavix');
    await page.getByRole('button', { name: /Plavix/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).nth(1).click();
    await expect(page.getByText(/días anteriores a la intervención/)).toBeVisible();

    // Renitec (IECA) → "No lo tome el día de la intervención". Necesita hora de toma.
    await page.locator('#med').fill('Renitec');
    await page.getByRole('button', { name: /Renitec/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).nth(2).click();
    await expect(page.getByText(/No lo tome el día de la intervención/)).toBeVisible();

    // No debe haberse producido ningún error de página (construirContexto no se llama sin fecha).
    expect(errores).toHaveLength(0);
  });

  test('recorre pasos 2-11 hasta el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1.
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 — alergias (sin alergias conocidas).
    await pasoAlergiasSinAlergias(page);

    // Paso 3 — datos básicos. Edad de mujer 12-55 → aparece la pregunta de embarazo.
    await expect(page.getByRole('heading', { name: /Paso 3 · Datos básicos/ })).toBeVisible();
    await page.locator('#edad').fill('40');
    await page.getByRole('radio', { name: 'Mujer' }).check();
    await page.locator('#peso').fill('65');
    await page.locator('#talla').fill('165');
    await expect(page.getByText(/IMC:/)).toBeVisible();
    await expect(page.getByText(/Posibilidad de embarazo/)).toBeVisible();
    await page.getByRole('radio', { name: /No hay posibilidad/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 4 — antecedentes.
    await expect(page.getByRole('heading', { name: /Paso 4 · Antecedentes/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 5 — hábitos. AUDIT-C alto para ver la alerta de abstinencia.
    await expect(page.getByRole('heading', { name: /Paso 5 · Hábitos/ })).toBeVisible();
    await page.locator('#a1').selectOption('4');
    await page.locator('#a2').selectOption('4');
    await page.locator('#a3').selectOption('4');
    await expect(page.getByText(/síndrome de abstinencia/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 6 — cribado. Ninguna enfermedad conocida.
    await expect(page.getByRole('heading', { name: /Paso 6 · Enfermedades/ })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 7 — pruebas complementarias (nada obligatorio).
    await expect(page.getByRole('heading', { name: /Pruebas complementarias/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 7 — técnica anestésica prevista.
    await expect(page.getByRole('heading', { name: /Paso 7 · Técnica anestésica prevista/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 8 — medicación. Sin fármacos, continuar.
    await expect(page.getByRole('heading', { name: /Paso 8 · Medicación/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 9 (vía aérea) y 10 (consentimiento).
    await expect(page.getByRole('heading', { name: /Paso 9 · Vía aérea/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 10 · Consentimiento/ })).toBeVisible();
    await page.getByRole('radio', { name: /Pendiente de entregar/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento -> resumen

    // Resumen (el cribado mtND4 ya se recoge en el paso de alergias).
    await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
    await expect(page.getByText(/Hernioplastia inguinal abierta/)).toBeVisible();
    await expect(page.getByText(/No alergias conocidas/)).toBeVisible();

    // Salidas del resumen: resumen del anestesiólogo, ASA sugerido y texto para SAP.
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    await expect(page.locator('label[for="asa-manual"]')).toContainText('ASA sugerido');
    await expect(page.getByRole('heading', { name: /Escalas/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Texto para SAP/ })).toBeVisible();
    const sap = page.getByRole('textbox', { name: 'Texto para SAP' });
    await expect(sap).toBeVisible();
    // El SAP incluye el resultado del consentimiento (§10, 2026-10-04).
    await expect(sap).toHaveValue(/Consentimiento: pendiente de entregar/);
    await expect(page.getByRole('button', { name: 'Copiar', exact: true })).toBeVisible();
  });

  test('§3/§12: la hoja/QR se generan igualmente; Plavix pendiente sale con la frase única y se confirma en el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: marcar cardiopatía isquémica (stent).
    await page.getByRole('checkbox', { name: 'Cardiopatía isquémica / infarto' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: Plavix sin Adiro (monoterapia → requiere confirmación).
    await page.locator('#med').fill('Plavix');
    await page.getByRole('button', { name: /Plavix/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Pasos 9, 10 y 11.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // Resumen: el fármaco pendiente se lista en «Puntos pendientes de confirmación»,
    // pero la hoja/QR se pueden generar IGUALMENTE (ya no hay bloqueo).
    await expect(page.getByRole('heading', { name: /Puntos pendientes de confirmación/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generar hoja y QR del paciente/ })).toBeVisible();

    // Al generar la hoja, Plavix aparece con la frase única de §12.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByText(/Sobre Plavix, el anestesiólogo le llamará/)).toBeVisible();

    // Confirmar con el nombre del anestesiólogo en el resumen.
    await page.getByLabel(/Nombre del anestesiólogo para Plavix/).fill('Dra. García');
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

    // Tras confirmar: ya no queda la sección de pendientes y la hoja (que seguía
    // mostrada) se recalcula, mostrando la pauta en lugar de la frase única de §12.
    await expect(page.getByRole('heading', { name: /Puntos pendientes de confirmación/ })).toHaveCount(0);
    await expect(page.getByText(/Sobre Plavix, el anestesiólogo le llamará/)).toHaveCount(0);
  });

  test('§8.3/§12.7 stent reciente + neuroaxial → alerta roja de diferir y amarilla de técnica en el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1: artroplastia de rodilla (técnica neuroaxial probable). Fecha fija.
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('Artroplastia total de rodilla');
    await page.getByRole('button', { name: /Artroplastia total de rodilla/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('64'); // < 65 para no exigir CFS/4AT en el paso 5
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: cardiopatía isquémica con stent programado reciente (hace ~2 meses).
    await page.getByRole('checkbox', { name: 'Cardiopatía isquémica / infarto' }).check();
    await page.getByRole('group', { name: /stent \(muelle\)/i }).getByRole('button', { name: 'Sí' }).click();
    await page.locator('#cardiopatia_isquemica-stent_fecha').fill(fechaAntesIntervencion(60)); // ~2 meses antes
    await page.locator('#cardiopatia_isquemica-stent_motivo').selectOption('programado');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7 técnica
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    // Paso 7: técnica neuroaxial (dispara también la alerta amarilla del stent + técnica).
    await page.getByRole('checkbox', { name: /Neuroaxial/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 -> resumen

    // Las dos alertas del stent aparecen en el resumen del anestesiólogo.
    await expect(page.getByText(/Stent reciente: valorar diferir la cirugía programada/)).toBeVisible();
    await expect(page.getByText(/neuroaxial\/bloqueo profundo prevista con stent reciente/)).toBeVisible();
  });

  test('genera la hoja del paciente con su QR desde el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1.
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos.
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Pasos 4-7.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: añadir Adiro y continuar.
    await page.locator('#med').fill('Adiro');
    await page.getByRole('button', { name: /Adiro/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Pasos 9, 10 y 11.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // Resumen: generar la hoja del paciente y ver el QR.
    await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar enlace para el paciente/ })).toBeVisible();
  });

  test('§8.15: anticonceptivo oral + anestesia general → la hoja del paciente muestra la advertencia del sugammadex', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Mujer 30 años, sin posibilidad de embarazo.
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('30');
    await page.getByRole('radio', { name: 'Mujer' }).check();
    await page.locator('#peso').fill('62');
    await page.locator('#talla').fill('165');
    await page.getByRole('radio', { name: /No hay posibilidad/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    // Paso 7: técnica general (para que aplique la advertencia del sugammadex).
    await page.getByRole('checkbox', { name: 'General', exact: true }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8

    // Paso 8: anticonceptivo oral combinado.
    await page.locator('#med').fill('anticonceptivo oral combinado');
    await page.getByRole('button', { name: /anticonceptivo oral combinado/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9

    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento
    await pasoMtnd4NoVenezolana(page); // 11 -> resumen

    // Generar la hoja: aparece la advertencia del sugammadex (versión oral).
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    const hoja = page.locator('section.hoja-paciente');
    await expect(hoja.getByRole('heading', { name: /Su anticonceptivo y la anestesia/ })).toBeVisible();
    await expect(hoja.getByText(/como si hubiera olvidado una toma/)).toBeVisible();
    await expect(hoja.getByText(/El equipo de anestesia se lo confirmará después de la intervención/)).toBeVisible();
  });

  test('privacidad (caso 23): sin datos clínicos en localStorage/sessionStorage/cookies', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    const ls = await page.evaluate(() => JSON.stringify(localStorage));
    const ss = await page.evaluate(() => JSON.stringify(sessionStorage));
    const cookies = await page.context().cookies();
    // En esta versión inicial no debe persistirse ningún dato clínico.
    expect(ls).not.toContain('paciente');
    expect(ss).not.toContain('paciente');
    expect(cookies.filter((c) => /paciente|clinic/i.test(c.name))).toHaveLength(0);
  });

  test('privacidad (§2): el service worker solo cachea el esqueleto, nunca datos del paciente', async ({ page }) => {
    // Generar una hoja de paciente para tener un enlace con datos en «#p=…».
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();

    // Esperar a que el service worker esté listo y revisar el contenido de la caché.
    const claveCache = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const nombres = await caches.keys();
      let volcado = '';
      for (const n of nombres) {
        const c = await caches.open(n);
        const reqs = await c.keys();
        volcado += reqs.map((r) => r.url).join('\n') + '\n';
      }
      return volcado;
    });

    // La caché solo guarda el esqueleto (js/css/html/manifest), nunca la URL con «#p=»
    // (el fragmento no llega al service worker) ni ningún dato del paciente.
    expect(claveCache).not.toContain('#p=');
    // Bloque III-A (§8.16): el service worker de enfermería tampoco precachea la
    // vista del paciente (ni su HTML en «/paciente/» ni su bundle propio), que es
    // una aplicación independiente que se cachea por su cuenta.
    expect(claveCache).not.toContain('/paciente/');
    expect(claveCache).not.toContain('assets/paciente-');
  });

  test('F1: STOP-Bang alto (varón 56, ronca, HTA, IMC 36, cuello 42) → 6, riesgo alto y alerta', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos: varón 56, IMC ≈ 36 (113 kg, 177 cm).
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('56');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('113');
    await page.locator('#talla').fill('177');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: HTA + apnea del sueño (sin diagnóstico), con las preguntas del STOP-Bang.
    await page.getByRole('checkbox', { name: 'Hipertensión', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Apnea del sueño (SAOS)' }).check();
    await page.getByRole('group', { name: /diagnóstico confirmado de apnea/ }).getByRole('button', { name: 'No' }).click();
    await page.getByRole('group', { name: /Ronca fuerte/ }).getByRole('button', { name: 'Sí' }).click();
    await page.locator('#saos-perimetro_cuello').fill('42');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades -> 7 técnica
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    const stopBang = page.getByRole('listitem').filter({ hasText: /^STOP-Bang:/ });
    await expect(stopBang).toContainText('6');
    await expect(stopBang).toContainText('riesgo alto');
    await expect(page.getByText(/STOP-Bang 6 \(riesgo alto\)/)).toBeVisible();
  });

  test('F2: STOP-Bang bajo (mujer 45, ronca y cansancio, IMC 30, cuello 36, sin HTA) → 2, riesgo bajo', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos: mujer 45, IMC ≈ 30 (82 kg, 165 cm).
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('45');
    await page.getByRole('radio', { name: 'Mujer' }).check();
    await page.locator('#peso').fill('82');
    await page.locator('#talla').fill('165');
    await page.getByRole('radio', { name: /No hay posibilidad/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: apnea del sueño (sin diagnóstico); ronca y cansancio, sin apneas; cuello 36.
    await page.getByRole('checkbox', { name: 'Apnea del sueño (SAOS)' }).check();
    await page.getByRole('group', { name: /diagnóstico confirmado de apnea/ }).getByRole('button', { name: 'No' }).click();
    await page.getByRole('group', { name: /Ronca fuerte/ }).getByRole('button', { name: 'Sí' }).click();
    await page.getByRole('group', { name: /cansado o somnoliento durante el día/ }).getByRole('button', { name: 'Sí' }).click();
    await page.locator('#saos-perimetro_cuello').fill('36');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades -> 7 técnica
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    const stopBang = page.getByRole('listitem').filter({ hasText: /^STOP-Bang:/ });
    await expect(stopBang).toContainText('2');
    await expect(stopBang).toContainText('riesgo bajo');
  });

  test('F11: morfina equivalente (fentanilo 25 µg/h + tapentadol 100 mg/12 h) → 140 mg/día, alerta alta y dolor transicional', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: fentanilo transdérmico (parche, µg/h) y tapentadol (mg × tomas/día).
    await page.locator('#med').fill('Durogesic');
    await page.getByRole('button', { name: /Durogesic/ }).first().click();
    await page.locator('#opdosis-fentanilo_transdermico').fill('25');

    await page.locator('#med').fill('Palexia');
    await page.getByRole('button', { name: /Palexia/ }).first().click();
    await page.locator('#opdosis-tapentadol').fill('100');
    await page.locator('#optomas-tapentadol').fill('2');

    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    const morfina = page.getByRole('listitem').filter({ hasText: 'Morfina equivalente' });
    await expect(morfina).toContainText('140');
    await expect(page.getByText(/Dosis alta de opioides/)).toBeVisible();
    await expect(page.getByText(/dolor transicional/)).toBeVisible();
  });

  test('§5.16: alerta de módulo ejecutada — ictus/AIT reciente → alerta roja en el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('62');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: marcar "Ictus o AIT" y poner una fecha reciente (menos de 3 meses antes de la intervención).
    await page.getByRole('checkbox', { name: 'Ictus o AIT' }).check();
    await page.getByRole('group', { name: /ictus o un AIT/ }).getByRole('button', { name: 'Sí' }).click();
    await page.locator('#ictus_o_tvp-ictus_fecha').fill(fechaAntesIntervencion(35)); // < 3 meses antes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 -> resumen

    await expect(page.getByText(/ictus o AIT de menos de 3 meses/)).toBeVisible();
  });

  test('E17: implante anticonceptivo → nota de sugammadex (barrera 7 días) en el resumen', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos: mujer 40, sin posibilidad de embarazo.
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('40');
    await page.getByRole('radio', { name: 'Mujer' }).check();
    await page.locator('#peso').fill('65');
    await page.locator('#talla').fill('165');
    await page.getByRole('radio', { name: /No hay posibilidad/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: buscar y añadir el implante anticonceptivo (no pide hora de toma).
    await page.locator('#med').fill('implante');
    await page.getByRole('button', { name: /implante anticonceptivo/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // La nota del sugammadex (§8.15) para vía no oral: método de barrera 7 días.
    await page.getByRole('button', { name: /Notas técnicas/ }).click();
    await expect(page.getByText(/método de barrera/)).toBeVisible();
    await expect(page.getByText(/7 días/)).toBeVisible();
  });

  test('C-oft: catarata + apixabán — tópica no suspende; al pasar a peribulbar el paso 8 se recalcula', async ({ page }) => {
    const MANTENER = 'Siga tomándolo como siempre';
    const RECALCULADO = 'el anestesiólogo le llamará';

    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1: catarata (fecha concreta → el motor usa el grupo oftalmológico de la técnica).
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('catarata');
    await page.getByRole('button', { name: /Cirugia de catarata con anestesia topica/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos (edad < 65 para no exigir fragilidad en el paso 5).
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos

    // Pasos 4-6 sin datos extra.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades -> 7 técnica
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    // Paso 7: técnica tópica → catarata de riesgo bajo (no se suspenden anticoagulantes).
    await expect(page.getByRole('heading', { name: /Paso 7 · Técnica anestésica prevista/ })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Tópica' }).check();
    await expect(page.getByText(/no se suspenden/i)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8

    // Paso 8: apixabán con técnica tópica → mantener.
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await expect(page.getByText(MANTENER, { exact: false })).toBeVisible();

    // Volver al paso 7 y cambiar a retrobulbar/peribulbar → riesgo moderado-alto.
    await page.getByRole('button', { name: 'Volver', exact: true }).click(); // 8 -> 7 técnica
    await expect(page.getByRole('heading', { name: /Paso 7 · Técnica anestésica prevista/ })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Tópica' }).uncheck();
    await page.getByRole('checkbox', { name: 'Retrobulbar o peribulbar' }).check();
    await expect(page.getByText(/moderado-alto/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8

    // Paso 8 recalculado: el apixabán ya NO se mantiene (oftalmología moderada-alta
    // = riesgo hemorrágico alto), sino que pasa a requerir suspensión/confirmación.
    await expect(page.getByRole('heading', { name: /Paso 8 · Medicación/ })).toBeVisible();
    await expect(page.getByText(MANTENER, { exact: false })).toHaveCount(0);
    await expect(page.getByText(RECALCULADO, { exact: false })).toBeVisible();
  });

  test('paso 1: "otro procedimiento" exige marcar los riesgos a mano (§7.1)', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.getByRole('button', { name: /no está en la lista/ }).click();
    await expect(page.getByText(/no hay valores por defecto/)).toBeVisible();
    // Sin riesgos marcados, no se puede continuar.
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await page.locator('#otro-cv').selectOption('intermedio');
    await page.locator('#otro-hemo').selectOption('bajo');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
  });

  test('§6.2.5 telefónica: no se muestra el paso de vía aérea y el resumen lo marca pendiente', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Telefónica' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
    await expect(page.getByRole('heading', { name: /Paso 8 · Medicación/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> (salta vía aérea) 10 consentimiento

    // En telefónica NO aparece el paso de vía aérea: se va directo al consentimiento.
    await expect(page.getByRole('heading', { name: /Paso 10 · Consentimiento/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Paso 9 · Vía aérea/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11 mtND4
    await pasoMtnd4NoVenezolana(page); // 11 -> resumen

    // El resumen marca la vía aérea como pendiente y no calcula EGRI/Langeron.
    await expect(page.getByText(/pendiente de explorar el día de la intervención/)).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'EGRI' })).toHaveCount(0);
  });

  test('§2b alergias: al marcar «Alergias conocidas» se despliega el formulario de medicamentos', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias: sin marcar, no hay formulario de medicamentos.
    await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
    await expect(page.locator('#al-farmaco')).toHaveCount(0);
    // Al marcar «Alergias conocidas» aparecen los formularios y se añade una alergia.
    await page.getByRole('checkbox', { name: 'Alergias conocidas' }).check();
    await expect(page.locator('#al-farmaco')).toBeVisible();
    await page.locator('#al-farmaco').fill('Penicilina');
    await page.locator('#al-reaccion').fill('exantema');
    await page.getByRole('button', { name: 'Añadir a la lista' }).click();
    await expect(page.getByText('Penicilina')).toBeVisible();
  });

  test('Nueva valoración: pide confirmación; «Cancelar» conserva los datos', async ({ page }) => {
    await entrevistaMinimaHastaResumen(page);
    // Botón al final del resumen (en el contenido, no el de la cabecera).
    await page.locator('main').getByRole('button', { name: 'Nueva valoración' }).click();
    // Diálogo de confirmación.
    await expect(page.getByText(/Se borrarán todos los datos de esta valoración/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    // Al cancelar seguimos en el resumen con los datos (p. ej. el procedimiento).
    await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
    await expect(page.getByText(/Hernioplastia inguinal abierta/)).toBeVisible();
  });

  test('Nueva valoración: «Sí, empezar una nueva» borra todo y vuelve al inicio', async ({ page }) => {
    await entrevistaMinimaHastaResumen(page);
    await page.locator('main').getByRole('button', { name: 'Nueva valoración' }).click();
    await page.getByRole('button', { name: 'Sí, empezar una nueva' }).click();

    // Vuelve a la pantalla de inicio (elección de modalidad).
    await expect(page.getByRole('heading', { name: /Nueva entrevista/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Presencial' })).toBeVisible();

    // Al recorrer de nuevo los pasos, no queda ningún dato de la valoración anterior.
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 1 · Datos de la intervención/ })).toBeVisible();
    await expect(page.locator('#fecha')).toHaveValue('');
    await expect(page.locator('#proc')).toHaveValue('');
    // Y el procedimiento anterior ya no aparece.
    await expect(page.getByText(/Hernioplastia inguinal abierta/)).toHaveCount(0);
  });

  test('Nueva valoración: acceso discreto en la cabecera durante la entrevista', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    // En el paso 1 ya está el acceso de la cabecera; al pulsarlo pide confirmación.
    await expect(page.getByRole('heading', { name: /Paso 1 · Datos de la intervención/ })).toBeVisible();
    await page.locator('header.cabecera').getByRole('button', { name: 'Nueva valoración' }).click();
    await expect(page.getByText(/Se borrarán todos los datos de esta valoración/)).toBeVisible();
    await page.getByRole('button', { name: 'Sí, empezar una nueva' }).click();
    await expect(page.getByRole('heading', { name: /Nueva entrevista/ })).toBeVisible();
  });

  test('modo entrenamiento: el resumen ofrece volver a los casos y salir, sin confirmación', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /Mujer sana/);
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    // No aparece el botón de «Nueva valoración» en entrenamiento.
    await expect(page.getByRole('button', { name: 'Nueva valoración' })).toHaveCount(0);
    // Sí los dos botones propios del entrenamiento.
    await expect(page.getByRole('button', { name: 'Volver a los casos de entrenamiento' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salir del modo entrenamiento' })).toBeVisible();
    // «Salir» vuelve al inicio sin pedir confirmación.
    await page.getByRole('button', { name: 'Salir del modo entrenamiento' }).click();
    await expect(page.getByRole('heading', { name: /Nueva entrevista/ })).toBeVisible();
  });

  test('§8.2 aclaramiento en el paso 8: ACOD sin módulo renal pide el aclaramiento; «No disponible» → requiere confirmación', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('64'); // < 65 para no exigir CFS en el paso 5
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('70');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: añadir Eliquis (apixabán, anti-Xa) con una hora de toma.
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();

    // Aparece la ficha de función renal (no hay módulo renal).
    await expect(page.getByText('Función renal (para los anticoagulantes)')).toBeVisible();

    // Introducir la creatinina → se calcula el aclaramiento (Cockcroft-Gault).
    await page.locator('#acl-tipo').selectOption('creatinina');
    await page.locator('#acl-valor').fill('1');
    await expect(page.getByText(/Aclaramiento calculado \(Cockcroft-Gault\): 73/)).toBeVisible();

    // Marcar «No disponible» → el ACOD queda pendiente de confirmar (caso A7).
    await page.locator('#acl-tipo').selectOption('no_disponible');
    await expect(page.getByText(/quedan «pendientes de confirmar»/)).toBeVisible();
    await expect(page.getByText(/Consultar con el anestesiólogo/).first()).toBeVisible();
  });

  test('§6.7 aclaramiento antiguo: una analítica de hace más de 3 meses avisa en el resumen del anestesiólogo', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('64'); // < 65 para no exigir CFS en el paso 5
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('70');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: añadir Eliquis y dar el aclaramiento con una analítica antigua.
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await page.locator('#acl-tipo').selectOption('aclaramiento');
    await page.locator('#acl-valor').fill('80');
    await page.locator('#acl-fecha').fill(fechaAntesIntervencion(150)); // > 3 meses antes de la intervención
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento -> 11
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // El aviso aparece como alerta informativa en el bloque de alertas del resumen.
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    const alertas = page.locator('.resumen-alertas');
    await expect(alertas.getByText(/Aclaramiento de una analítica de hace más de 3 meses/)).toBeVisible();
  });

  test('§8.17 riesgos de la anestesia: raquídea con sedación muestra el anexo del paciente con esas secciones y la línea de la primera página', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('Artroplastia total de rodilla');
    await page.getByRole('button', { name: /Artroplastia total de rodilla/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    // Paso 7: marcar neuroaxial + sedación → subtipo raquídea.
    await page.getByRole('checkbox', { name: /Neuroaxial/ }).check();
    await page.getByRole('checkbox', { name: 'Sedación' }).check();
    await page.getByRole('radio', { name: 'Raquídea (intradural)' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 medicación -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento -> 11
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // El resumen del anestesiólogo muestra las técnicas previstas con su subtipo.
    await expect(page.getByText(/Técnica prevista:\s*Neuroaxial \(raquídea\) \+ sedación/)).toBeVisible();

    // Generar la hoja del paciente: anexo de riesgos con raquídea y sedación.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    const anexo = page.locator('section.anexo.riesgos-anestesia');
    await expect(anexo.getByRole('heading', { name: 'Información sobre su anestesia' })).toBeVisible();
    await expect(anexo.getByRole('heading', { name: 'Anestesia raquídea (intradural)' })).toBeVisible();
    await expect(anexo.getByRole('heading', { name: 'Sedación' })).toBeVisible();
    // No debe aparecer la sección de anestesia general (no se eligió).
    await expect(anexo.getByRole('heading', { name: 'Anestesia general' })).toHaveCount(0);
    // Línea en la primera página que remite al anexo.
    await expect(page.getByText(/Al final de esta hoja encontrará información sobre su anestesia/)).toBeVisible();
  });

  test('§8 dosis y frecuencia en el paso 8: el plan del resumen muestra «Adiro 100 mg cada 24 h» y avisa del descuadre con las horas', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('70');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: añadir Adiro con una hora de toma, dosis 100 mg y frecuencia cada 24 h.
    // (AAS ya pide su dosis propia en «mg/día»; no se duplica el campo genérico.)
    await page.locator('#med').fill('Adiro');
    await page.getByRole('button', { name: /Adiro/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await page.getByLabel('Dosis (mg/día)').fill('100');
    await page.getByLabel('Frecuencia (opcional)').selectOption('c24h');

    // Añadir Eutirox (levotiroxina): NO pide dosis propia, así que aparece el campo de
    // dosis genérico (cantidad + unidad). Lo rellenamos como «75 µg».
    await page.locator('#med').fill('Eutirox');
    await page.getByRole('button', { name: /Eutirox/ }).first().click();
    const fichaEutirox = page.locator('.ficha-farmaco').filter({ hasText: 'Eutirox' });
    await fichaEutirox.getByLabel('Dosis (opcional)').fill('75');
    await fichaEutirox.getByLabel('Unidad').selectOption('mcg');

    // Con 1 hora de toma y «cada 24 h» (1 toma): no hay descuadre en el Adiro.
    const fichaAdiro = page.locator('.ficha-farmaco').filter({ hasText: 'Adiro' });
    await expect(fichaAdiro.getByText(/La frecuencia elegida no cuadra/)).toHaveCount(0);

    // Cambiar a «cada 12 h» (2 tomas) con 1 sola hora marcada → aviso de descuadre.
    await fichaAdiro.getByLabel('Frecuencia (opcional)').selectOption('c12h');
    await expect(fichaAdiro.getByText(/La frecuencia elegida no cuadra con las 1 horas de toma/)).toBeVisible();

    // Volver a «cada 24 h» para un plan coherente y continuar al resumen.
    await fichaAdiro.getByLabel('Frecuencia (opcional)').selectOption('c24h');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // El plan del resumen del anestesiólogo lleva la dosis y la frecuencia junto al nombre.
    await expect(page.getByRole('heading', { name: /Resumen de la entrevista/ })).toBeVisible();
    await expect(page.getByText(/Adiro 100 mg cada 24 h:/)).toBeVisible();
    await expect(page.getByText(/Eutirox 75 µg:/)).toBeVisible();

    // La hoja del paciente también muestra la dosis y la frecuencia junto al nombre.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByText(/Adiro 100 mg cada 24 h/).first()).toBeVisible();
  });

  test('§6 otras enfermedades: se añade una a mano en el paso 6, sale en el SAP como «nombre (detalle)» y avisa al anestesiólogo', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('70');
    await page.locator('#talla').fill('170');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos

    // Paso 6: añadir una enfermedad no incluida en la lista (nombre + detalle).
    await expect(page.getByRole('heading', { name: /Paso 6 · Enfermedades/ })).toBeVisible();
    await page.locator('#oe-nombre').fill('Enfermedad de Behçet');
    await page.locator('#oe-detalle').fill('brotes frecuentes');
    await page.getByRole('button', { name: 'Añadir otra enfermedad no incluida en la lista' }).click();

    // La entrada aparece en la lista y se puede quitar.
    await expect(page.getByText('Enfermedad de Behçet')).toBeVisible();
    await expect(page.getByText('brotes frecuentes')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades -> 7
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 medicación -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento -> 11
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // El SAP incluye la enfermedad como «nombre (detalle)» en los AP.
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    const sap = page.getByRole('textbox', { name: 'Texto para SAP' });
    await expect(sap).toContainText('Enfermedad de Behçet (brotes frecuentes)');

    // El aviso al anestesiólogo aparece como alerta informativa en el bloque de
    // alertas del resumen, SIN desplegar las notas técnicas.
    const alertas = page.locator('.resumen-alertas');
    await expect(alertas.getByText(/Enfermedad no incluida en los módulos: Enfermedad de Behçet \(brotes frecuentes\)/)).toBeVisible();
    await expect(alertas.getByText(/no aplica reglas ni alertas sobre ella/)).toBeVisible();
  });

  test('§14.2 modo entrenamiento: carga un caso y muestra la comparación con lo esperado', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Modo entrenamiento' }).click();
    await expect(page.getByRole('heading', { name: 'Modo entrenamiento' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir este caso' }).first().click();
    await expect(page.getByText(/MODO ENTRENAMIENTO/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Resultado esperado/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
  });

  test('§13 bis: el caso de entrenamiento con varias condiciones muestra los puntos de validación y permite validar/posponer', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /Varios puntos de validación/);
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();

    // Sección de puntos de validación clínica al principio del resumen.
    const seccion = page.locator('section.validaciones');
    await expect(seccion.getByRole('heading', { name: /Puntos de validación clínica/ })).toBeVisible();
    // Posponer (rojo): stent reciente, infarto reciente, 4AT ≥ 4 (origen de escala).
    await expect(seccion.getByText(/Stent coronario reciente/)).toBeVisible();
    await expect(seccion.getByText(/Infarto de miocardio hace menos de 60 días/)).toBeVisible();
    await expect(seccion.getByText(/4AT ≥ 4/)).toBeVisible();
    // Validar (amarillo): hipoglucemias inadvertidas y EGRI ≥ 4 (origen de escala).
    await expect(seccion.getByText(/Hipoglucemias inadvertidas/)).toBeVisible();
    await expect(seccion.getByText(/EGRI ≥ 4/)).toBeVisible();

    // Validar el primer punto con un nombre.
    const primerNombre = page.getByRole('textbox', { name: /Nombre del anestesiólogo para validar/ }).first();
    await primerNombre.fill('Dra. López');
    await page.getByRole('button', { name: 'Validar', exact: true }).first().click();
    await expect(page.getByText(/✓ Validado por Dra\. López/)).toBeVisible();

    // Marcar otro como posponer o derivar.
    await page.getByRole('button', { name: 'Posponer o derivar' }).first().click();
    await expect(page.getByText(/⏸ Posponer o derivar/)).toBeVisible();

    // No bloquea: la hoja del paciente se puede generar igualmente, y como quedan puntos
    // sin validar, la hoja incluye el aviso de que el anestesiólogo revisará el caso.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByText('Antes de la intervención, el anestesiólogo revisará su caso y, si es necesario, se pondrá en contacto con usted.')).toBeVisible();
  });

  test('§13 bis: al validar TODOS los puntos, la hoja del paciente deja de mostrar el aviso de revisión', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /Varios puntos de validación/);
    await expect(page.getByRole('heading', { name: /Puntos de validación clínica/ })).toBeVisible();

    // Validar todos los puntos: rellenar cada nombre y pulsar Validar hasta que no queden.
    let guardia = 0;
    while (await page.getByRole('button', { name: 'Validar', exact: true }).count() > 0 && guardia < 30) {
      const input = page.getByRole('textbox', { name: /Nombre del anestesiólogo para validar/ }).first();
      await input.fill('Dr. Pérez');
      await page.getByRole('button', { name: 'Validar', exact: true }).first().click();
      guardia++;
    }
    await expect(page.getByRole('button', { name: 'Validar', exact: true })).toHaveCount(0);

    // Con todo validado, la hoja del paciente NO muestra el aviso de revisión.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();
    await expect(page.getByText('Antes de la intervención, el anestesiólogo revisará su caso y, si es necesario, se pondrá en contacto con usted.')).toHaveCount(0);
  });

  test('§5.1 bis: caso de DAI en colecistectomía muestra notas del dispositivo y su punto de validación', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /DAI en colecistectomía/);
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();

    // Punto de validación del dispositivo (amarillo) en la sección de validación.
    const seccion = page.locator('section.validaciones');
    await expect(seccion.getByText(/DAI o TRC-D en cirugía con interferencia electromagnética probable/)).toBeVisible();

    // Notas técnicas del dispositivo (desplegar «Notas técnicas»). Se buscan las
    // notas con el prefijo «Dispositivo cardiaco:» para no confundir con el texto
    // de «Resultado esperado» del modo entrenamiento.
    await page.getByRole('button', { name: /Notas técnicas/ }).click();
    await expect(page.getByText(/Dispositivo cardiaco: DAI\/TRC-D .*desactivar las terapias del DAI/)).toBeVisible();
    await expect(page.getByText(/Dispositivo cardiaco:.*centrado sobre el generador/)).toBeVisible();

    // La hoja del paciente añade la tarjeta del dispositivo a «qué traer».
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(
      page.locator('section.hoja-paciente').getByText('La tarjeta de su marcapasos o desfibrilador'),
    ).toBeVisible();
  });

  test('§5.12: lactante prematuro con cardiopatía congénita muestra ambos puntos de validación', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /Lactante prematuro/);
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    const seccion = page.locator('section.validaciones');
    await expect(seccion.getByText(/prematuro con edad posconcepcional < 60 semanas/i)).toBeVisible();
    await expect(seccion.getByText(/Cardiopatía congénita/)).toBeVisible();
  });

  test('§5.13: caso de cesárea con placenta previa y cesárea previa muestra los puntos obstétricos', async ({ page }) => {
    await page.goto('/preanestesia/');
    await abrirCasoEntrenamiento(page, /Cesárea programada/);
    await expect(page.getByRole('heading', { name: /Resumen del anestesiólogo/ })).toBeVisible();
    const seccion = page.locator('section.validaciones');
    await expect(seccion.getByText(/placenta previa o sospecha de acretismo/i)).toBeVisible();
    await expect(seccion.getByText(/riesgo alto de acretismo/i)).toBeVisible();
    await expect(seccion.getByText(/Plaquetopenia .*80\.000/)).toBeVisible();
    // Nota técnica de la plaquetopenia.
    await page.getByRole('button', { name: /Notas técnicas/ }).click();
    await expect(page.getByText('Plaquetopenia: condiciona la técnica neuroaxial.')).toBeVisible();
  });

  test('§14.4 guía imprimible: se genera desde los módulos con casillas en blanco', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Guía imprimible' }).click();
    await expect(page.getByRole('heading', { name: 'Guía imprimible en blanco' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Diabetes', exact: true })).toBeVisible();
    await expect(page.getByText(/Cuestionario de sangrado \(HEMSTOP\)/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Guardar como PDF/ })).toBeVisible();
  });

  test('§14.3 cuadro de mando: sin entrevistas registradas en un dispositivo nuevo', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Cuadro de mando de uso' }).click();
    await expect(page.getByRole('heading', { name: 'Cuadro de mando de uso' })).toBeVisible();
    await expect(page.getByText(/Todavía no hay entrevistas registradas/)).toBeVisible();
  });

  test('panel de administración (§14.1): editar tabla, validar en vivo y descargar', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Administración de contenido' }).click();
    await expect(page.getByRole('heading', { name: 'Administración de contenido' })).toBeVisible();

    // Seleccionar farmacos.csv y comprobar la tabla editable.
    await page.getByRole('button', { name: 'datos/farmacos.csv', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();

    // Poner un id_regla inexistente en la primera fila → aviso de validación (caso 21).
    await page.getByRole('textbox', { name: 'id_regla fila 1', exact: true }).fill('regla_inventada');
    await expect(page.getByText(/no existe en reglas_farmacos\.json/)).toBeVisible();

    // Descargar el fichero editado.
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Descargar farmacos\.csv/ }).click(),
    ]);
    expect(descarga.suggestedFilename()).toBe('farmacos.csv');

    // Un fichero JSON se edita como texto y se valida.
    await page.getByRole('button', { name: 'datos/opioides.json', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /Contenido de datos\/opioides\.json/ })).toBeVisible();
    await expect(page.getByText(/JSON válido/)).toBeVisible();
  });

  /**
   * Bloque III-A (§8.16): la vista del paciente es un build independiente, publicado
   * en «/paciente/». El QR del resumen apunta a esa dirección (config.url_vista_paciente)
   * con el fragmento «#p=…». Esta prueba genera el QR, extrae el enlace y abre la vista
   * del paciente en la nueva ruta, comprobando que la hoja se muestra correctamente.
   */
  test('§8.16 vista del paciente aparte: el QR apunta a /paciente/ y la hoja se abre en esa ruta', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    // Paso 1 con fecha e intervención.
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 alergias + paso 3 básicos.
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Pasos 4-7.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 técnica -> 8

    // Paso 8: Adiro (plazo en días) para tener una instrucción concreta en la hoja.
    await page.locator('#med').fill('Adiro');
    await page.getByRole('button', { name: /Adiro/ }).first().click();
    await page.getByRole('button', { name: '09:00', exact: true }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9

    // Pasos 9, 10 y 11.
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 vía aérea
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 consentimiento
    await pasoMtnd4NoVenezolana(page); // 11 mtND4 -> resumen

    // Generar la hoja y el QR del paciente.
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();

    // Capturar el enlace que copia el botón (lo que lleva el QR).
    await page.evaluate(() => {
      const w = window as unknown as { __enlace: string };
      w.__enlace = '';
      navigator.clipboard.writeText = async (texto: string) => {
        w.__enlace = texto;
      };
    });
    await page.getByRole('button', { name: /Copiar enlace para el paciente/ }).click();
    const enlace = await page.evaluate(() => (window as unknown as { __enlace: string }).__enlace);

    // El enlace apunta a la dirección de la vista del paciente (config.url_vista_paciente),
    // en la ruta «/paciente/», y lleva el payload en «#p=…».
    expect(enlace).toBeTruthy();
    expect(enlace).toContain('/paciente/');
    expect(enlace).toContain('#p=');

    // Abrir SOLO el fragmento en la ruta de la vista del paciente del propio despliegue
    // (en producción el dominio sale de config; aquí probamos la ruta local «/paciente/»).
    const fragmento = enlace.slice(enlace.indexOf('#p='));
    await page.goto(`/preanestesia/paciente/${fragmento}`);

    // La vista independiente del paciente muestra la hoja (título y medicación).
    await expect(page.getByRole('heading', { name: 'Recomendaciones para su intervención' })).toBeVisible();
    await expect(page.getByText('Adiro')).toBeVisible();
    // Y ofrece el cambio de idioma (castellano/catalán), propio de la vista del paciente.
    await expect(page.getByRole('button', { name: 'Català' })).toBeVisible();
  });

  test('§8.17 vista del QR: la sección de riesgos está plegada, pero se despliega al imprimir y vuelve a plegarse después', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('Artroplastia total de rodilla');
    await page.getByRole('button', { name: /Artroplastia total de rodilla/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 básicos
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 antecedentes
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 hábitos
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 enfermedades
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('checkbox', { name: /Neuroaxial/ }).check();
    await page.getByRole('radio', { name: 'Raquídea (intradural)' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11
    await pasoMtnd4NoVenezolana(page);

    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { __enlace: string };
      navigator.clipboard.writeText = async (texto: string) => { w.__enlace = texto; };
    });
    await page.getByRole('button', { name: /Copiar enlace para el paciente/ }).click();
    const enlace = await page.evaluate(() => (window as unknown as { __enlace: string }).__enlace);
    const fragmento = enlace.slice(enlace.indexOf('#p='));
    await page.goto(`/preanestesia/paciente/${fragmento}`);

    // La sección de riesgos es un <details> plegable y está CERRADO por defecto.
    const detalles = page.locator('details.riesgos-anestesia-plegable');
    await expect(detalles).toHaveCount(1);
    await expect(detalles).not.toHaveAttribute('open', /.*/);

    // Al imprimir (evento beforeprint), se despliega; en afterprint vuelve a plegarse.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(detalles).toHaveAttribute('open', /.*/);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(detalles).not.toHaveAttribute('open', /.*/);
  });
});

test.describe('Fase ágil · comprobación previa (punto 1)', () => {
  test('tamaños de campo: edad/peso/talla y año/procedimiento normales; medicamento/reacción grandes', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 · Alergias: medicamento y tipo de reacción deben ser campos grandes.
    await page.getByRole('checkbox', { name: 'Alergias conocidas' }).check();
    await expect(page.locator('#al-farmaco')).toHaveClass(/campo-grande/);
    await expect(page.locator('#al-reaccion')).toHaveClass(/campo-grande/);
    await page.getByRole('checkbox', { name: 'Alergias conocidas' }).uncheck();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3 · Datos básicos: edad, peso y talla NO deben ser campos grandes.
    await expect(page.locator('#edad')).not.toHaveClass(/campo-grande/);
    await expect(page.locator('#peso')).not.toHaveClass(/campo-grande/);
    await expect(page.locator('#talla')).not.toHaveClass(/campo-grande/);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 4 · Antecedentes: procedimiento y año NO deben ser campos grandes.
    await expect(page.locator('#ap-proc')).not.toHaveClass(/campo-grande/);
    await expect(page.locator('#ap-anio')).not.toHaveClass(/campo-grande/);
  });

  test('«añadir intervención previa»: año, tipo de anestesia e incidencias son opcionales', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4 antecedentes

    // Solo con el procedimiento (sin año, sin tipo, sin incidencias) se puede añadir.
    await page.locator('#ap-proc').fill('Apendicectomía');
    await page.getByRole('button', { name: 'Añadir a la lista' }).click();
    await expect(page.getByText('Apendicectomía')).toBeVisible();
    // Y se puede continuar.
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 5 · Hábitos|Paso 5/ })).toBeVisible();
  });

  test('AUDIT-C y módulos no son obligatorios: se avanza sin contestarlos', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 -> 5 hábitos

    // Paso 5 · Hábitos: sin tocar el AUDIT-C se puede continuar.
    await expect(page.getByText(/Ninguna pregunta es obligatoria/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 -> 6 enfermedades

    // Paso 6 · Enfermedades: marcar una enfermedad con módulo y NO contestar nada.
    await page.getByRole('checkbox', { name: 'Diabetes' }).first().check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // avanza sin contestar el módulo
    // Si avanzamos, el siguiente paso (pruebas complementarias) es visible.
    await expect(page.getByRole('heading', { name: /Pruebas complementarias/ })).toBeVisible();
  });

  test('Eliquis y Acovil muestran dosis, frecuencia y hora, y ninguno bloquea el avance', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 -> 5
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 -> 6
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8 medicación

    // Eliquis (apixabán): aparece la frecuencia y la hora; la dosis genérica NO (su
    // dosis es propia de la regla), pero sí la de la regla.
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    const fichaEliquis = page.locator('.ficha-farmaco').filter({ hasText: 'Eliquis' });
    await expect(fichaEliquis.getByText('Frecuencia (opcional)')).toBeVisible();
    await expect(fichaEliquis.getByText(/Horas de toma|hora de la toma|09:00/i).first()).toBeVisible();

    // Acovil (ramipril): dosis genérica + frecuencia.
    await page.locator('#med').fill('Acovil');
    await page.getByRole('button', { name: /Acovil/ }).first().click();
    const fichaAcovil = page.locator('.ficha-farmaco').filter({ hasText: 'Acovil' });
    await expect(fichaAcovil.getByText('Dosis (opcional)')).toBeVisible();
    await expect(fichaAcovil.getByText('Frecuencia (opcional)')).toBeVisible();

    // Ninguno bloquea: se puede continuar sin rellenar dosis/frecuencia/hora.
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: /Paso 9 · Vía aérea|Paso 10 · Consentimiento/ })).toBeVisible();
  });

  test('punto 6 · técnica múltiple: marcar general y bloqueo a la vez', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('Artroplastia total de rodilla');
    await page.getByRole('button', { name: /Artroplastia total de rodilla/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('50');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 -> 5
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 -> 6
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica

    // Paso 7: marcar DOS técnicas a la vez (general + bloqueo periférico).
    await page.getByRole('checkbox', { name: 'General', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Bloqueo periférico' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8
    await page.getByRole('button', { name: 'Continuar' }).click(); // 8 -> 9
    await page.getByRole('button', { name: 'Continuar' }).click(); // 9 -> 10
    await page.getByRole('button', { name: 'Continuar' }).click(); // 10 -> 11
    await pasoMtnd4NoVenezolana(page);

    // El resumen lista las dos técnicas.
    await expect(page.getByText(/Técnica prevista:\s*Anestesia general \+ bloqueo periférico/)).toBeVisible();

    // La hoja del paciente muestra las secciones de riesgos de ambas (general y bloqueo).
    await page.getByRole('button', { name: /Generar hoja y QR del paciente/ }).click();
    const anexo = page.locator('section.anexo.riesgos-anestesia');
    await expect(anexo.getByRole('heading', { name: 'Anestesia general' })).toBeVisible();
    await expect(anexo.getByRole('heading', { name: 'Bloqueo de nervios (anestesia locorregional)' })).toBeVisible();
  });

  test('punto 2 · mtND4 en el paso de alergias: casilla desmarcada por defecto; al marcarla aparece el cribado', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 · Alergias: la casilla del origen materno está DESMARCADA por defecto y
    // sus campos no se ven hasta marcarla.
    await expect(page.getByRole('heading', { name: /Paso 2 · Alergias/ })).toBeVisible();
    const casillaMtnd4 = page.getByRole('checkbox', { name: /antecedentes familiares por línea materna de origen venezolano/ });
    await expect(casillaMtnd4).not.toBeChecked();
    await expect(page.getByText(/Guion para explicar la pregunta/)).toHaveCount(0);
    // Al marcarla aparecen el guion y los factores; marcar la ascendencia → alerta roja.
    await casillaMtnd4.check();
    await expect(page.getByText(/Guion para explicar la pregunta/)).toBeVisible();
    await page.getByRole('checkbox', { name: /Ascendencia venezolana por línea materna/ }).check();
    await expect(page.getByText(/Alerta roja/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 2 -> 3

    // Ya NO existe un paso propio de mtND4: el flujo sigue por datos básicos.
    await expect(page.getByRole('heading', { name: /Paso 3 · Datos básicos/ })).toBeVisible();
  });

  test('punto 7 · aviso de coherencia: «Volver a enfermedades» lleva al paso 6, conserva la medicación y vuelve', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('hernioplastia');
    await page.getByRole('button', { name: /Hernioplastia inguinal abierta/ }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('60');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 -> 5
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 -> 6
    await page.getByRole('checkbox', { name: 'Ninguna enfermedad conocida' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7
    await page.getByRole("button", { name: "Continuar" }).click(); // 7 pruebas complementarias -> técnica
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 -> 8 medicación

    // Añadir Eliquis sin haber marcado fibrilación auricular → aviso de coherencia.
    await page.locator('#med').fill('Eliquis');
    await page.getByRole('button', { name: /Eliquis/ }).first().click();
    const coherencia = page.locator('.coherencia');
    await expect(coherencia).toBeVisible();

    // Pulsar «Volver a enfermedades» → paso 6, con la medicación conservada.
    await coherencia.getByRole('button', { name: 'Volver a enfermedades' }).first().click();
    await expect(page.getByRole('heading', { name: /Paso 6 · Enfermedades/ })).toBeVisible();
    // Marcar la fibrilación auricular (para que el aviso desaparezca) y continuar.
    await page.getByRole('checkbox', { name: /Fibrilación auricular|Arritmia/ }).first().check().catch(() => {});
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Volvemos al paso de medicación (no al de técnica), con Eliquis todavía presente.
    await expect(page.getByRole('heading', { name: /Paso 8 · Medicación/ })).toBeVisible();
    await expect(page.locator('.ficha-farmaco').filter({ hasText: 'Eliquis' })).toBeVisible();
  });

  test('punto 3 · paso de pruebas complementarias: marca la troponina indicada (ESC 2022) y recoge estado + analítica', async ({ page }) => {
    await page.goto('/preanestesia/');
    await page.getByRole('button', { name: 'Presencial' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();
    await page.locator('#fecha').fill(FECHA_INTERVENCION);
    await page.locator('#proc').fill('Artroplastia total de rodilla'); // riesgo intermedio
    await page.getByRole('button', { name: /Artroplastia total de rodilla/i }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await pasoAlergiasSinAlergias(page);
    await page.locator('#edad').fill('70');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.locator('#peso').fill('80');
    await page.locator('#talla').fill('175');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 3 -> 4
    await page.getByRole('button', { name: 'Continuar' }).click(); // 4 -> 5
    // Paso 5 (hábitos): el paciente ≥ 65 exige CFS; se rellena para poder avanzar.
    await page.locator('#cfs').fill('3');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 5 -> 6
    // Marcar cardiopatía isquémica → comorbilidad CV significativa (indica BNP y troponina).
    await page.getByRole('checkbox', { name: /Cardiopatía isquémica/ }).first().check();
    await page.getByRole('button', { name: 'Continuar' }).click(); // 6 -> 7 pruebas

    // Paso de pruebas complementarias.
    await expect(page.getByRole('heading', { name: /Pruebas complementarias/ })).toBeVisible();
    // La troponina aparece marcada como «Indicada» (ESC 2022: comorbilidad CV + cirugía intermedia).
    const troponina = page.locator('fieldset').filter({ hasText: 'Troponina ultrasensible' });
    await expect(troponina.getByText('Indicada')).toBeVisible();
    // Registrar la analítica: la tiene pero no la ha traído, con hemoglobina y filtrado.
    const analitica = page.locator('fieldset').filter({ hasText: 'Analítica general' });
    await analitica.getByRole('radio', { name: 'La tiene pero no la ha traído' }).check();
    await analitica.getByText('Hemoglobina (g/dL)').locator('input').fill('13.5');
    await analitica.getByText(/Filtrado glomerular/).locator('input').fill('80');
    await page.getByRole('button', { name: 'Continuar' }).click(); // 7 pruebas -> técnica

    // Avanzamos al paso de técnica.
    await expect(page.getByRole('heading', { name: /Paso 7 · Técnica anestésica prevista/ })).toBeVisible();
  });
});
