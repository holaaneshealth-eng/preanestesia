# Programa de apoyo a la entrevista preanestésica de enfermería
Documento fuente, versión 4 (29/09/2026). Integra las 14 decisiones del servicio, las correcciones de la revisión de requirements.md v0.2 y las tres decisiones sobre cálculo de fechas surgidas de la batería de casos de referencia (`docs/casos_referencia.md`). Ruta en el repositorio: `docs/documento_fuente.md`.
AnesHealth · Servicio de Anestesiología, Reanimación y Terapéutica del Dolor · Hospital Vithas Barcelona

## 0. Cómo quiero que trabajes

Usa el flujo de specs. Genera primero `requirements.md`, `design.md` y `tasks.md` a partir de este documento y espera a que los revise antes de escribir código. Si algo es ambiguo o contradictorio, pregúntamelo en la fase de requisitos; no lo resuelvas por tu cuenta.

Todo el contenido clínico (preguntas, fármacos, reglas, procedimientos, plantillas de texto, textos para el paciente) vive en ficheros de datos editables, fuera del código. El código implementa el motor; los médicos mantenemos el contenido.

Repositorio: `fernigear-spec/preanestesia` (público). Stack: Vite + React + TypeScript estricto + Vitest + Playwright, motor de dominio aislado de la interfaz, despliegue en GitHub Pages con GitHub Actions. Color principal #0027c2.

Idioma de la interfaz: español de España. Los textos para el paciente, en castellano y catalán desde el principio. Genera tú la traducción al catalán y márcala como pendiente de revisión en los ficheros de textos.

## 1. Qué es y para quién

Una aplicación web que guía a las enfermeras de anestesia durante la entrevista preoperatoria, presencial o telefónica, en pacientes adultos, pediátricos y obstétricas. La aplicación:

1. Ordena la entrevista y despliega, para cada patología que declare el paciente, las preguntas clave y los datos que hay que recoger.
2. Calcula ASA sugerido, riesgo de vía aérea difícil, STOP-Bang (STBUR en niños), Apfel (POVOC en niños), CHA2DS2-VA si hay fibrilación auricular, capacidad funcional, fragilidad, aclaramiento de creatinina y dosis equivalente de morfina.
3. Decide qué pruebas complementarias hay que pedir según nuestro protocolo.
4. Genera las instrucciones de suspensión o mantenimiento de cada fármaco, con fecha y hora de la última toma permitida, y las normas de ayuno con horas de reloj.
5. Produce estas salidas: texto libre de antecedentes para pegar en SAP, hoja de recomendaciones individualizadas para el paciente (pantalla, PDF y QR, en castellano o catalán) y resumen para el anestesiólogo con alertas y notas técnicas.

La enfermera hace el cribado; el anestesiólogo valida. El programa emite recomendaciones directamente al paciente, salvo en los supuestos marcados como «requiere confirmación del anestesiólogo» (sección 12).

Hay una sola vista para todos los usuarios. Las notas técnicas dirigidas al anestesiólogo van en un apartado plegable del resumen y nunca aparecen en la hoja del paciente.

## 2. Arquitectura y privacidad

- Sitio estático en GitHub Pages. Sin servidor propio, sin base de datos, sin backend, sin cuentas de usuario. Todo el cálculo se hace en el navegador.
- No se guardan datos de pacientes en ningún sitio: ni en el navegador (nada de localStorage, sessionStorage, IndexedDB ni cookies con datos clínicos), ni en ficheros, ni en logs. El estado de la entrevista vive solo en memoria. Botón «Nuevo paciente» que lo borra todo. Aviso antes de cerrar o recargar con una entrevista en curso. Borrado automático tras 30 minutos de inactividad (configurable).
- Lo único que persiste fuera de la sesión: la información que viaja dentro de los QR y enlaces (sección 11) y, en el localStorage del dispositivo, la preferencia del modo guiado y el contador de uso sin datos clínicos (sección 14.3). Nada más.
- Ningún campo obligatorio de identificación del paciente. Un campo opcional «Identificación para la hoja impresa» que solo aparece en la hoja impresa y el PDF, nunca en los QR ni en los enlaces, y se borra con el resto.
- Sin peticiones a terceros: sin CDN, sin fuentes remotas, sin analítica, sin telemetría. Librerías empaquetadas en el propio sitio. Content-Security-Policy en la etiqueta meta que lo impida.
- Service worker que almacena en caché la aplicación y los ficheros de datos, para que siga funcionando si la conexión falla a mitad de una entrevista. La caché nunca incluye datos del paciente. Cuando se publica una versión nueva del contenido, la aplicación lo detecta y pide recargar entre pacientes, no en mitad de una entrevista.
- Funciona en PC (Windows) y tablet (iPad y Android), navegador moderno. Diseño táctil: botones grandes, selección por pulsación, poco texto libre.
- Exportación a PDF generada en el navegador con una librería empaquetada. Alternativa: hoja de estilos de impresión.
- No usa inteligencia artificial. El texto para SAP se genera con plantillas (sección 10.1).
- TypeScript con tipado estricto.

## 3. Ficheros de datos editables (carpeta `datos/` del repositorio)

Se cargan al abrir la aplicación. Al cargarlos, la aplicación los valida; si alguno tiene errores (columnas que faltan, valores fuera de lista, reglas inexistentes), muestra qué fichero, fila y columna fallan y no permite empezar entrevistas con datos corruptos.

- `config.json`: nombre del centro, teléfono de contacto para el paciente, minutos de inactividad, edad pediátrica máxima (17 años por defecto), días de validez de los QR, interruptor `prehabilitacion_activa` (por defecto `false`) y URL de PreHabilítame, versión del contenido y fecha de la última revisión clínica. La versión y la fecha aparecen en el pie de todas las salidas.
- `farmacos.csv`, separador punto y coma, UTF-8. Columnas: `id`, `principios_activos` (separados por `+` en combinaciones), `nombres_comerciales` (separados por `|`), `grupo`, `subgrupo`, `pauta_tipica` (diaria, dos veces al día, semanal, mensual, cíclica), `id_regla` (una por principio activo separadas por `+` en combinaciones; se aplica la más restrictiva), `texto_paciente` y `texto_anestesiologo` (opcionales, sobrescriben el texto por defecto de la regla), `requiere_confirmacion` (sí/no), `indicaciones_posibles` (ids de indicación separados por `|`, ver 5b.1), `fuente`, `fecha_revision`, `verificado_cima` (sí/no).
- `reglas_farmacos.json`: parámetros de cada regla (horas, condiciones por riesgo hemorrágico, técnica anestésica, aclaramiento, indicación, lista de bloqueos profundos, tablas de HBPM de la SETH). La lógica que no quepa en parámetros va en código, pero los números siempre salen del JSON.
- `procedimientos.csv`: procedimiento, especialidad, riesgo quirúrgico cardiovascular (bajo, intermedio, alto), riesgo hemorrágico (mínimo, bajo, alto), grupo oftalmológico (no aplica, riesgo bajo, riesgo moderado-alto), técnica neuroaxial o bloqueo profundo probable (sí/no), duración habitual ≥ 30 min (sí/no, para POVOC), riesgo trombótico alto (sí/no, para la regla de anticonceptivos). Buscador con autocompletado. Opción «Otro procedimiento» que obliga a elegir los riesgos a mano.
- `modulos/*.json`: un fichero por módulo de patología con sus preguntas, tipos de respuesta, condiciones de visibilidad, efecto sobre ASA y sobre la clase de riesgo del paciente, alertas y plantillas de frase para SAP. El motor de la entrevista se construye leyendo estos ficheros.
- `plantillas_sap.json`: orden de los bloques del texto de SAP, plantillas de frase con marcadores, abreviaturas permitidas y qué negativos se escriben (sección 10.1).
- `opioides.json`: factores de conversión a morfina oral (sección 6.8).
- `coherencia.json`: reglas del asistente de coherencia (sección 5b): indicaciones por fármaco con su texto y módulo, tratamientos esperados por enfermedad, datos obligatorios por módulo.
- `textos/es/*.json` y `textos/ca/*.json`: textos del paciente, hojas anexas y guion de las preguntas delicadas.
- `casos_entrenamiento/*.json`: casos clínicos de ejemplo (sección 14.2).

Genera los ficheros iniciales con el contenido de este documento y de los anexos A y B.

## 4. Orden de la entrevista

Navegación por pasos con barra de progreso y un panel lateral (inferior en tablet) que muestra en tiempo real el resumen, las alertas y los cálculos. Se puede volver a cualquier paso. Cada paso indica qué preguntas faltan. Al inicio se elige la modalidad: presencial o telefónica.

> **Orden actualizado (decisión del servicio, 30/09/2026; revisado 2026-10-04).** La entrevista tiene 12 pasos en este orden: 1) intervención, 2) **alergias**, 3) **datos básicos**, 4) antecedentes, 5) hábitos, 6) enfermedades y hemostasia, 7) técnica anestésica prevista, 8) medicación, 9) vía aérea, 10) consentimiento, 11) origen materno (mtND4) y 12) resultados. Las alergias pasan antes de los datos básicos (2026-10-04). Se elimina el **carácter** de la intervención (programada/urgencia), el **régimen** (CMA/ingreso) y el sufijo **E** del ASA. La técnica anestésica prevista pasa a un paso propio (paso 7); si se cambia, las reglas de medicación y las salidas se recalculan. La hipertermia maligna y el déficit de pseudocolinesterasa (personales o familiares) se recogen como **condiciones especiales** del paso de enfermedades (§5.15), no en antecedentes.

### Paso 1. Datos de la intervención
Fecha y hora prevista (si no se conoce la hora, se asume 08:00 y la hoja del paciente lo avisa), procedimiento (desde `procedimientos.csv`), lateralidad si aplica y contraste yodado. El **régimen** (CMA/ingreso) se retiró (2026-10-04): la bomba de insulina decide por el riesgo quirúrgico (§8.5). La técnica anestésica no se pregunta aquí, sino en el paso 7.

Avisos de fecha: si la intervención está a más de 60 días, aviso de que las suspensiones deben recalcularse si cambia la fecha. Si alguna fecha límite de suspensión calculada ya ha pasado o cae hoy, alerta por fármaco: «ya no se puede cumplir el plazo de suspensión; consultar con el anestesiólogo», y ese fármaco pasa a requerir confirmación.

### Paso 2. Alergias
Una sola casilla «Alergias conocidas» (2026-10-04): si no se marca, se registra como **sin alergias conocidas**. Al marcarla se despliegan los formularios: medicamentos (con tipo de reacción, campos grandes), látex, contrastes yodados, alimentos relevantes (huevo, soja, frutos secos, frutas tropicales si hay alergia al látex), clorhexidina y adhesivos.

### Paso 3. Datos básicos
Edad (fecha de nacimiento o años; en menores de 2 años, meses), sexo, peso, talla, IMC calculado (edad, peso y talla con campos grandes). En menores, peso obligatorio. Si la edad es ≤ la edad pediátrica máxima, se activa el módulo pediátrico y se sustituyen STOP-Bang por STBUR y Apfel por POVOC. En mujeres de 12 a 55 años, posibilidad de embarazo y fecha de la última regla; si está embarazada, se activa el módulo obstétrico.

### Paso 4. Antecedentes anestésicos y quirúrgicos
Intervenciones previas (lista añadible). Al añadir una intervención, el **año, el tipo de anestesia y las incidencias son opcionales**; solo el procedimiento es obligatorio (2026-10-04). Incidencias a preguntar de forma explícita: intubación o ventilación difícil conocida, náuseas y vómitos postoperatorios, despertar prolongado, reacción alérgica en quirófano, despertar intraoperatorio, dificultad con la epidural o la raquídea, transfusiones y reacción transfusional. La hipertermia maligna y el déficit de pseudocolinesterasa (personales y familiares) ya no se recogen aquí: pasan a las condiciones especiales del paso 6 (§5.15).

### Paso 5. Hábitos, capacidad funcional y fragilidad
- Tabaco (activo, exfumador, nunca; paquetes-año; fecha de abandono). Si es fumador activo o exfumador, un campo libre para describir el consumo (2026-10-04).
- Alcohol con AUDIT-C (sección 6.9). Ninguna de las tres preguntas es obligatoria.
- Otras drogas (cannabis, cocaína con fecha del último consumo, otras). Consumo de cocaína en la última semana: alerta.
- Capacidad funcional: pregunta directa «¿puede subir dos pisos de escaleras sin pararse?»; si la respuesta es no o dudosa, DASI completo (sección 6.6).
- En pacientes de 65 años o más: Clinical Frailty Scale y 4AT, en presencial y en telefónica (sección 6.10).

### Paso 6. Enfermedades y hemostasia
Lista de casillas agrupada por aparatos. Cada casilla marcada despliega su módulo (sección 5). Incluye la casilla «Ninguna enfermedad conocida». El cuestionario de hemostasia (sección 5.5) se hace siempre, tenga o no patología hematológica. Incluye las **condiciones especiales** (§5.15): hipertermia maligna y déficit de pseudocolinesterasa, personales o familiares.

**Otras enfermedades no incluidas en la lista (2026-10-04).** Un botón «Añadir otra enfermedad no incluida en la lista» permite anotar a mano enfermedades que no están en el catálogo por aparatos. Cada una tiene un nombre (obligatorio) y un detalle libre opcional (multilínea); se pueden añadir varias y borrarlas. El programa **no les aplica ninguna regla ni alerta**: solo las documenta. En el texto para SAP se escriben junto al resto de antecedentes patológicos como «nombre (detalle)», o solo «nombre» si no hay detalle. En el resumen del anestesiólogo, cada una genera una **alerta informativa** visible en el bloque de alertas (sin desplegar nada): «Enfermedad no incluida en los módulos: … — revisar, porque el programa no aplica reglas ni alertas sobre ella». Se borran, como el resto de la entrevista, al iniciar una «Nueva valoración» o por inactividad.

### Paso 7. Técnica anestésica prevista
Técnica prevista (general, sedación, neuroaxial, bloqueo periférico, bloqueo profundo, local) o «no se sabe». Si no se sabe y el procedimiento tiene marcada técnica neuroaxial probable, las reglas de fármacos usan los plazos de neuroaxial y lo indican. En procedimientos oftalmológicos las opciones son tópica, retrobulbar o peribulbar, general y sedación; en la catarata la técnica decide el grupo oftalmológico (tópica = riesgo bajo; retrobulbar o peribulbar = moderado-alto; sin técnica, moderado-alto y se indica), §8.1-8.3. Si la técnica se cambia más tarde, las reglas de medicación y las salidas se recalculan.

### Paso 8. Medicación habitual
Buscador por principio activo o nombre comercial con autocompletado sobre `farmacos.csv`, tolerante a tildes, mayúsculas y errores menores. Para cada fármaco: dosis, pauta y hora habitual. Si no está en el catálogo, se escribe a mano y queda marcado «no catalogado: mantener y consultar con el anestesiólogo». Al añadir cada fármaco actúa el asistente de coherencia (sección 5b). Al volver al paso 7 para cambiar la técnica, la medicación introducida se conserva y se recalcula.

**Dosis y frecuencia (informativas, 2026-10-04).** Para cada fármaco se pueden anotar, de forma opcional, su dosis (cantidad + unidad: mg, µg, UI, mL, comprimidos, inhalaciones, gotas u otra que se escribe) y su frecuencia (cada 24 h, cada 12 h, cada 8 h, cada 6 h, semanal, a demanda u otra que se escribe). No cambian ninguna regla de suspensión ni ningún plazo: solo documentan la pauta. Cuando una regla ya pide la dosis como dato clínico (AAS, metotrexato, HBPM, insulinas, opioides), esa dosis es la misma y sigue siendo obligatoria; no se duplica el campo. La frecuencia se contrasta con las horas de toma marcadas: si no cuadran (p. ej. «cada 12 h» con una sola hora), se avisa para que se revise. La dosis y la frecuencia conocidas acompañan al nombre del fármaco en el plan del resumen del anestesiólogo y en la hoja del paciente (p. ej. «Adiro 100 mg cada 24 h: siga tomándolo»).

### Paso 9. Vía aérea
Sección 6.2. En modalidad telefónica **no se muestra este paso** (2026-10-04): el resumen indica «Vía aérea: pendiente de explorar el día de la intervención» y las escalas de vía aérea (EGRI, Langeron) no se calculan.

### Paso 10. Consentimiento informado de anestesia
Tres estados: entregado y explicado (con fecha), pendiente de entregar (habitual en telefónica; la hoja del paciente dice «le entregaremos el consentimiento el día de la intervención») o no procede. Consta en el texto de SAP.

### Paso 11. Origen materno (cribado mtND4)
Sección 9. Es el último paso antes de los resultados; al continuar se registra el uso (§14.3).

### Paso 12. Resultados
Cálculos, pruebas complementarias, plan de medicación, ayuno, alertas y salidas (sección 10).

## 5. Módulos por patología

Cada módulo define preguntas clave, datos a registrar, efecto sobre ASA sugerido y clase de riesgo del paciente (sección 7), alertas y frase para SAP. Solo las preguntas que un anestesiólogo quiere ver contestadas.

### 5.1 Cardiovascular
- Hipertensión arterial: años de evolución, fármacos, cifras habituales, control. Si la tensión medida en consulta presencial es ≥ 180/110, alerta.
- Cardiopatía isquémica: infarto o síndrome coronario agudo (fecha), angina (estable, con qué esfuerzo, reciente o cambiante), revascularización. Si hay stent: fecha, tipo (farmacoactivo, convencional, desconocido), motivo (programado o por síndrome coronario agudo), cardiólogo de referencia. Alimenta la regla de antiagregantes (8.3).
- Insuficiencia cardiaca: clase NYHA (con descripción de cada clase para preguntarla), fracción de eyección si se conoce, último ingreso, ortopnea, edemas, ecocardiograma (fecha).
- Valvulopatía: válvula, tipo, gravedad, prótesis (biológica o mecánica; posición mitral, aórtica o tricúspide), último ecocardiograma (fecha), síntomas nuevos (disnea, síncope, angina).
- Fibrilación auricular y otras arritmias: tipo, anticoagulación, ictus o AIT previo (fecha). Activa CHA2DS2-VA.
- Marcapasos o DAI: dispositivo cardiaco implantable, desarrollado en §5.1 bis (tipo, motivo, fabricante, localización, dependencia, revisión, batería, ensayo). Ya no genera una alerta genérica: notas técnicas y puntos de validación según tipo/zona/dependencia.
- Miocardiopatía (casilla propia, 2026-10-04): tipo, último ecocardiograma, síntomas recientes (disnea, síncope, palpitaciones). Síntomas recientes: alerta. Cuenta como comorbilidad cardiovascular para el BNP (§7.3).
- Enfermedad arterial periférica, aneurisma de aorta (casillas propias, 2026-10-04): cuentan como enfermedad vascular en CHA2DS2-VA (§6.5) y como comorbilidad cardiovascular para el BNP (§7.3).
- Ictus o AIT: fecha, secuelas. Menos de 3 meses: alerta roja (valorar posponer la cirugía programada, ESC 2022).
- TVP o TEP: fecha, anticoagulación actual. Menos de 3 meses: alerta amarilla (valorar antes de la intervención).

### 5.1 bis. Dispositivos cardiacos implantables (British Heart Rhythm Society, Thomas et al., Anaesthesia 2022;77:808-17)

El módulo «Marcapasos o DAI» recoge: **tipo** (marcapasos convencional, marcapasos sin cables tipo Micra, DAI, DAI subcutáneo S-ICD, resincronizador sin desfibrilador TRC-P, resincronizador con desfibrilador TRC-D, Holter implantable, no lo sabe); **motivo** del implante; **fabricante** (Medtronic, Boston Scientific, Biotronik, Abbott/St. Jude, MicroPort/LivaNova/Sorin, otro, no lo sabe; suele figurar en la tarjeta del dispositivo); **localización** del generador; **hospital** de implante y de seguimiento; **fecha de la última revisión** y si fue a distancia (cuenta igual); si la **batería** se está agotando; si está en **ensayo clínico**; y la **dependencia del marcapasos** (sí/no/no lo sabe), con una explicación fija para la enfermera (ser dependiente significa que el corazón no late por sí solo sin el dispositivo; tener un marcapasos no implica ser dependiente; solo lo confirma la consulta de seguimiento; más probable tras bloqueo o ablación del nodo AV).

**Zona del procedimiento** (`zona_dispositivo` en `procedimientos.csv`): supraumbilical, infraumbilical, cardiaca, ocular, endoscopia, dental, litotricia, neurocirugía. En «otro procedimiento» la elige la enfermera.

**Recomendaciones para el anestesiólogo** (notas técnicas del resumen y PDF), según tipo, dependencia y zona (tabla 1 de la guía):
- **Holter/registrador:** sin precauciones especiales (opcional: revisar antes y borrar la memoria después).
- **Marcapasos, supraumbilical:** si no es dependiente, monitorizar sin reprogramar; si es dependiente, considerar modo asíncrono (frecuencia fija) con bisturí eléctrico prolongado.
- **Marcapasos, infraumbilical:** monitorizar sin reprogramar; si es dependiente, imán disponible.
- **DAI/TRC-D, supraumbilical:** desactivar las terapias (programador o imán); si es dependiente, desactivar y considerar frecuencia fija (el imán solo si no hay bisturí prolongado).
- **DAI/TRC-D, infraumbilical:** monitorizar; es razonable no desactivar; imán disponible.
- **Cardiaca:** reprogramación probable (marcapasos); desactivación del DAI con reprogramación.
- **Ocular:** como supraumbilical si hay bisturí monopolar. **Endoscopia:** como supraumbilical si se prevé bisturí/argón prolongado. **Odontología:** nada salvo bisturí eléctrico.
- **Litotricia:** marcapasos, revisar en el mes siguiente; DAI, desactivar o imán; no enfocar la onda cerca del generador.
- **Neurocirugía con DAI:** preferir la desactivación con programador al imán.
- **Marcapasos sin cables:** no responde al imán. **DAI subcutáneo:** no estimula; imán en la axila.
- **Imán por fabricante:** Medtronic/Boston/Biotronik centrado sobre el generador (Biotronik pierde efecto a las 8 h: retirar y recolocar); Abbott desplazado (borde del anillo sobre el extremo del generador); MicroPort descentrado.
- **Precauciones generales** (siempre que haya función de marcapasos o DAI): ECG desde el inicio (comprobar pulso/oximetría); desfibrilador externo y marcapasos transcutáneo disponibles; parches de desfibrilación lejos del generador, anteroposteriores, nunca encima; bisturí bipolar en ráfagas cortas; placa de retorno con el trayecto de corriente lejos del generador; evitar paños magnéticos sobre el tórax; si se usa imán, fijarlo. Si se desactiva el DAI: monitorización continua y desfibrilador con parches hasta reactivarlo; reactivar en recuperación cuanto antes; nunca dar el alta sin reactivarlo (responsabilidad del equipo quirúrgico).

**Puntos de validación** (§13 bis, amarillos, «coordinar con la unidad de arritmias o la consulta de dispositivos»): DAI/TRC-D en supraumbilical, cardiaca, ocular, endoscopia o litotricia; marcapasos con dependencia «sí» o «no lo sabe» en supraumbilical, cardiaca o endoscopia; última revisión > 12 meses (marcapasos) o > 6 meses (DAI/TRC) o desconocida; batería agotándose o «no lo sabe»; dispositivo en ensayo clínico. Sustituyen al punto genérico «portador de marcapasos o DAI»: un marcapasos no dependiente en cirugía infraumbilical con la revisión al día no genera punto, solo notas.

**Hoja del paciente:** si lleva dispositivo, se añade a «qué traer»: «La tarjeta de su marcapasos o desfibrilador» (castellano y catalán).

### 5.2 Respiratorio
- Asma: frecuencia de síntomas, inhaladores, ingresos o corticoides orales en el último año, crisis en el último mes. En la hoja del paciente: traer los inhaladores.
- EPOC: gravedad percibida, disnea (mMRC), exacerbaciones e ingresos en el último año, oxigenoterapia domiciliaria.
- SAOS diagnosticado: CPAP o BiPAP, cumplimiento, presión si la sabe. Con diagnóstico no se calcula STOP-Bang. En la hoja del paciente: traer la CPAP.
- Sin diagnóstico de SAOS: STOP-Bang (6.3).
- Infección respiratoria en las últimas 4 semanas: fiebre, tos productiva, tratamiento. Alerta.
- Hipertensión pulmonar (casilla propia, 2026-10-04): diagnóstico y tratamiento específico. Alerta. Cuenta como comorbilidad cardiovascular para el BNP (§7.3).
- Otras: fibrosis pulmonar, bronquiectasias, neumotórax previo.

### 5.3 Endocrino y metabolismo
- Diabetes (protocolo de preanestesia en diabéticos): tipo, años de evolución, complicaciones crónicas (cardiopatía isquémica, nefropatía, pie diabético, vasculopatía de extremidades inferiores, retinopatía), HbA1c con fecha, hipoglucemias frecuentes, síntomas de gastroparesia (náuseas y vómitos crónicos, sobre todo de comida sin digerir horas después de comer, saciedad precoz, distensión abdominal, glucemias que varían sin explicación), bomba de insulina o sensor. HbA1c > 8,5 %: alerta «control glucémico deficiente, valorar optimización antes de cirugía programada» (guía CPOC).
- Obesidad: a partir del IMC. IMC ≥ 40: alerta.
- Tiroides: hipo o hipertiroidismo, tratamiento, último control. Bocio grande o cirugía tiroidea previa: alerta de vía aérea.
- Corticoterapia crónica: fármaco, dosis y duración. Equivalente ≥ 5 mg/día de prednisona durante más de 3 semanas en los últimos 3 meses: alerta «valorar dosis de estrés perioperatoria».
- Otros: insuficiencia suprarrenal, feocromocitoma (alerta), hiperparatiroidismo.

### 5.4 Renal y hepático
- Enfermedad renal crónica: estadio o filtrado conocido, diálisis (tipo, días, fístula y brazo), trasplante renal. Campo de creatinina más reciente con fecha para el aclaramiento (6.7).
- Hepatopatía o cirrosis: causa, Child-Pugh si se conoce, ascitis, varices, encefalopatía, plaquetas bajas conocidas.

### 5.5 Hematológico
- Cuestionario de hemostasia HEMSTOP, siempre: hematomas o sangrados sin traumatismo que motivaran consulta o tratamiento; sangrado prolongado tras heridas; menstruaciones abundantes que motivaran consulta o tratamiento (mujeres); sangrado anómalo tras cirugía; sangrado anómalo tras extracción dental; sangrado anómalo en el parto; familiares con trastorno de la coagulación. Dos o más respuestas positivas: se pide estudio de coagulación aunque la tabla de pruebas no lo pida, y alerta.
- Anticoagulación o antiagregación: la indicación (los fármacos se recogen en el paso 8).
- Trombofilia: factor V Leiden heterocigoto u homocigoto, protrombina G20210A heterocigota u homocigota, déficit de antitrombina, déficit de proteína C o S con trombosis previas, síndrome antifosfolípido. Alimenta la regla de terapia puente.
- Tromboembolismo venoso previo (fecha).
- Anemia y gestión de sangre del paciente: última hemoglobina con fecha, anemia conocida, ferropenia, sangrado reciente, síntomas (astenia, disnea, palidez). Si Hb < 13 g/dL o sospecha de anemia y la cirugía es de riesgo intermedio o alto o con sangrado previsible: alerta «optimizar la anemia antes de la cirugía», se añade ferritina a la bioquímica y la salida del anestesiólogo recuerda que la valoración entre 2 y 4 semanas antes sirve para esto.
- Trastornos de la coagulación conocidos: hemofilia, von Willebrand, plaquetopenia.
- Testigo de Jehová o rechazo de hemoderivados: alerta. Registrar documento de voluntades anticipadas y qué acepta (albúmina, factores, recuperador de sangre).

### 5.6 Neurológico y psiquiátrico
- Epilepsia: tipo, última crisis, fármacos.
- Parkinson: fármacos y horario (la levodopa no se omite).
- Miastenia gravis y otras enfermedades neuromusculares: alerta.
- Esclerosis múltiple.
- Deterioro cognitivo o demencia: grado, cuidador, capacidad para consentir. Alerta de riesgo de delirium.
- Trastornos psiquiátricos: diagnóstico y fármacos (IMAO y litio disparan reglas específicas).

### 5.7 Dolor crónico y opioides
- Localización y tiempo de evolución del dolor, seguimiento en la Unidad del Dolor, tratamientos intervencionistas previos.
- Opioides: fármaco, dosis y pauta de cada uno; la aplicación calcula la dosis diaria equivalente de morfina oral (6.8). ≥ 50 mg/día: alerta; ≥ 90 mg/día: alerta alta.
- Buprenorfina (incluidos parches y tratamiento de deshabituación) y metadona: alerta específica, sin conversión automática, con la nota «no suspender; planificar analgesia con el anestesiólogo».
- Otros coadyuvantes: gabapentinoides, antidepresivos, benzodiacepinas.
- Si hay opioides de base, dosis equivalente ≥ 50 mg/día, o dolor crónico con cirugía de riesgo intermedio o alto: alerta «valorar inclusión en el circuito de dolor transicional de la Unidad Integral del Dolor».

### 5.8 Musculoesquelético y reumatológico
- Artritis reumatoide: afectación cervical conocida, limitación del cuello. Alerta de vía aérea.
- Espondilitis anquilosante: limitación cervical y lumbar. Alerta de vía aérea y de técnica neuroaxial.
- Lupus y otras conectivopatías. Biológicos o inmunosupresores (paso 8).
- Cirugía de columna previa (nivel, material de osteosíntesis).

### 5.9 Digestivo
- Reflujo: frecuencia, si está sintomático estos días, tratamiento.
- Hernia de hiato grande.
- Cirugía bariátrica previa: tipo, fecha, síntomas actuales (reflujo, estenosis, dilatación esofágica).
- Esofagectomía, acalasia, disfagia.
- Nutrición enteral por sonda: gástrica o pospilórica, vía aérea protegida o no.

### 5.10 Oncológico
- Cáncer activo y tratamiento en curso.
- Quimioterapia o inmunoterapia: fármaco y fecha de la última dosis (activa 8.9). Antraciclinas o trastuzumab previos: preguntar por ecocardiograma reciente.
- Radioterapia cervical o torácica (la cervical es alerta de vía aérea).
- Reservorio venoso subcutáneo o PICC.

### 5.11 Infeccioso
VIH, hepatitis B o C, tuberculosis, colonización o infección por multirresistentes (aislamiento: alerta).

### 5.12 Pediatría (se activa por edad)
- Prematuridad: semanas de gestación al nacer. En lactantes, edad posconcepcional; < 60 semanas: alerta de riesgo de apnea postoperatoria.
- Infección respiratoria de vías altas en las últimas 2 a 4 semanas: fiebre, mocos purulentos, tos productiva. Alerta con recomendación de revalorar el día de la intervención.
- STBUR (6.3).
- Cardiopatía congénita: diagnóstico, corregida o no, cardiólogo de referencia. Alerta.
- Síndromes (Down y otros): alerta de vía aérea y columna cervical en Down.
- Vacunación al día; vacuna en la última semana.
- Ansiedad del niño y de los padres, experiencias previas, necesidad de premedicación (se registra para el anestesiólogo).
- Antecedentes de NVPO del niño o de padres o hermanos (POVOC).
- Adolescentes con SAOS en tratamiento: traer la CPAP.

### 5.13 Obstetricia (si hay embarazo)
**Módulo obstétrico** (`datos/modulos/obstetricia.json`), que se activa automáticamente cuando el procedimiento es obstétrico o la paciente está embarazada (como el de pediatría por edad, no por casilla), y cuyos efectos llegan al resumen y a la hoja del paciente. Recoge: semana de gestación (≥ 20 semanas: nota de ayuno individualizado y profilaxis de aspiración); embarazo múltiple (nota: mayor riesgo de hemorragia e hipotensión); preeclampsia o HTA gestacional (punto de validación amarillo); plaquetas de la última analítica (< 80.000/µL: punto de validación + nota «plaquetopenia: condiciona la técnica neuroaxial»); diabetes gestacional y su tratamiento (dieta, metformina, insulina; con insulina, nota de pauta y control de glucemia del ayuno); problemas de columna (cirugía, escoliosis, otros; nota «valorar la técnica neuroaxial»); número de cesáreas previas; dificultad previa con la epidural o la raquídea (nota «valorar la técnica neuroaxial»); placenta previa o sospecha de acretismo (punto de validación «riesgo de hemorragia masiva: reservar hemoderivados y planificar la cirugía»; con una o más cesáreas previas, punto adicional «riesgo alto de acretismo»). La HBPM se recoge en el paso de medicación (§8). Pendiente de ampliar en el futuro si el servicio lo pide: embarazo múltiple con corionicidad, etc.

### 5.14 Mujer
Posibilidad de embarazo (si la hay, alerta). Anticonceptivos hormonales combinados o THS: regla 8.11.

### 5.15 Condiciones especiales
Se recogen en el paso 6 (enfermedades y hemostasia), no en antecedentes (decisión del servicio, 30/09/2026). La hipertermia maligna y el déficit de pseudocolinesterasa se preguntan por separado como **personal** y **familiar**.
- Hipertermia maligna personal o familiar: alerta roja.
- Déficit de pseudocolinesterasa personal o familiar: alerta.
- Porfiria: alerta con recordatorio de revisar la seguridad de los fármacos.
- Alergia al látex: alerta de quirófano libre de látex.

## 5.16 Preguntas ampliadas por patología

Decisión del servicio (30/09/2026). Amplía las preguntas de algunos módulos de §5. Reglas: solo preguntas y su motivo (las pautas de medicación salen siempre de §8); opciones cerradas cuando la respuesta genera alerta o alimenta una regla, texto libre corto cuando solo describe; cada pregunta lleva su «¿Por qué preguntamos esto?»; las respuestas relevantes se resumen en el texto de SAP y las alertas en el resumen del anestesiólogo; no se duplican preguntas ya existentes.

**Codificación del efecto por respuesta (decisión del servicio, 30/09/2026; ejecución añadida 2026-10-04).** Cada respuesta que genera un efecto clínico lo declara de forma explícita en el propio módulo (`datos/modulos/*.json`), en el campo `genera` de la pregunta: tipo de efecto (alerta, nota, prueba, clase de riesgo, ASA, regla o dato), gravedad de la alerta, condición que lo dispara (`cuando`, texto legible) y sección del documento fuente que lo respalda. Esta codificación se muestra por pregunta en `CONTENIDO_CLINICO.md` (§16) y la vigila un test de cobertura. **Las alertas y las notas se ejecutan**: cada una lleva además una condición estructurada `si` que el motor evalúa contra las respuestas y, cuando se cumple, emite la alerta o la nota en el resumen del anestesiólogo (función `emitirEfectosModulos`); un test recorre todos los módulos y comprueba que cada efecto declarado se emite. Los demás tipos (prueba, clase de riesgo, ASA, regla, dato) los sigue calculando su capa correspondiente; su `genera` es la traza legible que mantiene sincronizados documento, contenido y comportamiento.

- **5.16.1 Hipertensión:** cifras habituales en casa (texto); síntomas de mal control (cefalea frecuente, acúfenos, visión borrosa). Alguno marcado: alerta amarilla «posible HTA mal controlada».
- **5.16.2 Diabetes:** tratamiento (orales, insulina, ambos, dieta); frecuencia de hipoglucemias (nunca, mensual, semanal, diaria); si las detecta. «No las detecta» o frecuencia semanal/diaria: alerta amarilla «hipoglucemias frecuentes o inadvertidas».
- **5.16.3 Asma:** fecha de la última crisis; urgencias/ingresos en el último año (número); corticoides orales en el último año; uso del inhalador de rescate (veces/semana); desencadenantes (infecciones, frío, estrés, alergias, ejercicio, AINE/aspirina, otros). Crisis en el último mes, ingreso en el último año o rescate > 2 veces/semana: alerta amarilla «asma no controlada». AINE/aspirina: alerta roja «asma inducida por AINE: evitar AINE perioperatorios».
- **5.16.4 EPOC:** oxígeno domiciliario (no, nocturno, continuo); CPAP/BiPAP; disnea mMRC (0-4); tos con expectoración habitual; cambio reciente del esputo. Cambio reciente: alerta amarilla «posible infección respiratoria activa: valorar posponer la cirugía programada».
- **5.16.5 Demencia o deterioro cognitivo:** cuidador y representante legal (texto); capacidad para consentir (sí/no/dudosa); dependencia (independiente, parcial, total); episodios previos de agitación/delirio/desorientación nocturna. Capacidad «no»/«dudosa»: alerta «consentimiento por representante legal». Episodios previos: alerta de alto riesgo de delirium postoperatorio.
- **5.16.6 Anemia:** tipo (ferropénica, déficit de B12/fólico, de enfermedad crónica, hemolítica, talasemia, desconocida); tratamiento actual (hierro oral, hierro IV, B12, eritropoyetina, ninguno); síntomas (cansancio intenso, mareo al levantarse, palpitaciones). Las transfusiones previas se recogen en el paso 3 (no duplicar).
- **5.16.7 Dolor crónico (incluida lumbalgia):** localización (texto); posturas insoportables o zonas sin sensibilidad (texto, con nota de colocación en quirófano); déficit neurológico previo (sí/no y descripción, documentado). Los fármacos se recogen en el paso 8.
- **5.16.8 Infección respiratoria de vías altas reciente:** síntomas (fiebre, dolor de garganta, malestar, mucosidad abundante, tos productiva); días de evolución. Alerta según §5.2 y §5.12.
- **5.16.9 Epilepsia:** fecha aproximada de la última crisis; frecuencia; tipo; aura/pródromos; desencadenantes; estatus epiléptico previo. Crisis en el último mes o estatus previo: alerta amarilla «epilepsia no controlada».
- **5.16.10 Parkinson:** dificultad para tragar o mal manejo de la saliva (alerta amarilla de aspiración); mareo intenso al ponerse de pie (alerta amarilla de disfunción autonómica). El horario de la levodopa sale del paso 8.
- **5.16.11 Distrofias musculares** (Duchenne, Becker, miotónica, otras): dificultad para respirar tumbado o soporte ventilatorio nocturno (alerta roja de insuficiencia respiratoria postoperatoria); último ecocardiograma (sin eco en 12 meses: nota «valorar ecocardiograma»); antecedentes personales/familiares de fiebre muy alta o complicaciones graves en una anestesia (alerta roja). Duchenne/Becker: nota «evitar succinilcolina y valorar evitar halogenados».
- **5.16.12 Esclerosis múltiple** (pasa a entrar): fecha del último brote y síntomas; movilidad basal y debilidad basal (documentadas); intolerancia al calor/fenómeno de Uhthoff (nota «mantener normotermia estricta»). Brote en los últimos 3 meses: alerta amarilla.
- **5.16.13 Enfermedades autoinmunes:** Lupus (órganos afectados; riñón → nota de creatinina/sedimento; trombosis/SAF → enlaza con trombofilia §8.1; anemia/plaquetas bajas → alerta y hemograma+coagulación). Dermatomiositis/polimiositis (debilidad cervical o disfagia → alerta de aspiración; disnea/fatiga → alerta respiratoria; problemas cardiacos → alerta de miocarditis). Artritis reumatoide (limitación cervical → alerta roja de inestabilidad atloaxoidea; dificultad de apertura bucal → alerta de vía aérea; ronquera/afectación cricoaritenoidea → alerta).
- **5.16.14 Corticoides (pregunta transversal de todas las autoinmunes):** corticoides en los últimos 3 meses; si sí, fármaco, dosis diaria y semanas. Se calcula la equivalencia a prednisona (5 mg prednisona = 4 mg metilprednisolona = 0,75 mg dexametasona = 20 mg hidrocortisona) y se aplica §5.3: ≥ 5 mg/día de prednisona durante > 3 semanas genera «valorar dosis de estrés perioperatoria».
- **5.16.15 Trasplante:** órgano y fecha (< 6 meses: alerta «trasplante reciente»); última analítica del injerto (creatinina si riñón; transaminasas/bilirrubina si hígado); rechazo (nunca, pasado, últimos 6 meses); última revisión del equipo; niveles de inmunosupresores en rango (no → alerta); infección/fiebre/antibiótico actual (alerta «valorar posponer»); profilaxis antiinfecciosa. Los inmunosupresores se recogen en el paso 8 (con indicación de trasplante se mantienen, §8.8). Por órgano: corazón (nota «corazón denervado»); riñón (alerta «evitar AINE»); pulmón (nota «reflejo tusígeno abolido»).

## 5b. Asistente de coherencia y modo guiado

El programa debe servir también a una enfermera sin experiencia en valoración preoperatoria. Para ello incorpora un asistente de coherencia basado en reglas (sin IA), definido en `coherencia.json` y en la columna `indicaciones_posibles` de `farmacos.csv`, editable desde el panel de administración. Principio: el asistente sugiere y pregunta, nunca afirma ni marca nada por su cuenta. Las sugerencias aparecen como tarjetas no bloqueantes, se descartan con un toque y las descartadas quedan listadas en el resumen del anestesiólogo.

### 5b.1 De fármaco a enfermedad
Cada fármaco del catálogo lleva una lista de indicaciones posibles, cada una con el módulo o la pregunta que abre y un texto para la enfermera. Cuando se añade un fármaco y ninguna de sus indicaciones está recogida, aparece la tarjeta «[Fármaco] suele tomarse por [lista]. Pregúntele por qué lo toma», con un botón por indicación (abre el módulo correspondiente con la casilla propuesta, sin marcarla hasta que la enfermera confirme), «otra razón» con texto libre y «no lo sabe». Ejemplos que deben estar en los datos iniciales:
- IECA, ARA-II, betabloqueantes, antagonistas del calcio, diuréticos: hipertensión, insuficiencia cardiaca, cardiopatía isquémica, arritmia, nefropatía o proteinuria, migraña (betabloqueantes), síndrome nefrótico o edemas (diuréticos).
- Prednisona y otros corticoides: trasplante, polimialgia reumática, artritis reumatoide, lupus, enfermedad inflamatoria intestinal, asma o EPOC, insuficiencia suprarrenal, enfermedad oncohematológica, otra.
- Azatioprina, micofenolato, tacrolimus, ciclosporina, metotrexato: trasplante, enfermedad autoinmune (cuál), enfermedad inflamatoria intestinal, dermatológica. La respuesta alimenta la regla de suspensión, que depende de la indicación.
- Anticoagulantes: fibrilación auricular, prótesis valvular, tromboembolismo venoso (fecha), trombofilia, otra.
- Antiagregantes: stent coronario (fecha), infarto, ictus o AIT, arteriopatía periférica, prevención primaria.
- Insulina y antidiabéticos orales: diabetes (tipo). Agonistas GLP-1: diabetes u obesidad.
- Inhaladores: asma o EPOC. Antiepilépticos: epilepsia, dolor neuropático, trastorno bipolar, migraña. Levodopa o IMAO-B: Parkinson. Levotiroxina: hipotiroidismo, tiroidectomía. Opioides: dolor crónico (localización). Biológicos: artritis, espondilitis, psoriasis, enfermedad inflamatoria intestinal.

### 5b.2 De enfermedad a fármaco
Al revés: si hay una enfermedad marcada cuyo tratamiento habitual no aparece en la medicación, la tarjeta sugiere preguntar si lo ha dejado, se lo retiraron o se ha olvidado de mencionarlo. Reglas iniciales: fibrilación auricular sin anticoagulante ni antiagregante; stent o infarto sin antiagregante; prótesis mecánica sin anticoagulante; diabetes sin tratamiento; HTA sin antihipertensivo; asma o EPOC sin inhalador; SAOS sin CPAP; epilepsia sin antiepiléptico; hipotiroidismo sin levotiroxina; trasplante sin inmunosupresor; TVP o TEP reciente sin anticoagulante.

### 5b.3 Datos que faltan
Si un módulo está marcado y falta un dato que cambia el manejo, la tarjeta pide obtenerlo o marcar «no disponible»: diabetes sin HbA1c, stent sin fecha o motivo, valvulopatía sin ecocardiograma con fecha, anticoagulante o dabigatrán sin creatinina reciente, fumador sin paquetes-año, insuficiencia cardiaca sin clase NYHA, marcapasos sin fecha de última revisión, ictus o TVP sin fecha, biológico sin fecha de última dosis.

### 5b.4 Modo guiado
Cada pregunta tiene un enlace plegable «¿Por qué preguntamos esto?» con una o dos frases dirigidas a la enfermera nueva (por ejemplo, en la protrusión mandibular: «Si no puede adelantar la mandíbula, la laringoscopia suele ser más difícil»), y las preguntas delicadas (origen materno, alcohol, drogas, sangrado menstrual, testigo de Jehová) incluyen una formulación sugerida. Los textos van en `modulos/*.json` y en `textos/`. El modo guiado se puede desactivar desde un conmutador y la aplicación recuerda esa elección en el dispositivo (es la única preferencia que se guarda, sin datos clínicos).

## 6. Escalas y cálculos

Cada escala en un módulo independiente con pruebas unitarias. Se muestra siempre la puntuación, la categoría y los componentes que han sumado.

### 6.1 ASA sugerido
Cada respuesta de los módulos lleva una clase ASA mínima según los ejemplos de la ASA (actualización 2020, adultos y pediatría). El ASA sugerido es el máximo y la aplicación muestra qué respuestas lo determinan. Ejemplos a cablear:
- ASA I: sano, no fumador, consumo de alcohol mínimo o nulo.
- ASA II: fumador activo, bebedor social, embarazo, IMC 30 a < 40, diabetes o HTA bien controladas, enfermedad pulmonar leve.
- ASA III: diabetes o HTA mal controladas, EPOC, IMC ≥ 40, hepatitis activa, dependencia o abuso de alcohol, marcapasos, reducción moderada de la fracción de eyección, enfermedad renal terminal en diálisis periódica, infarto, ictus, AIT o stent coronario de más de 3 meses, lactante prematuro con edad posconcepcional < 60 semanas.
- ASA IV: infarto, ictus, AIT o stent de menos de 3 meses, isquemia activa o disfunción valvular grave, reducción grave de la fracción de eyección, enfermedad renal terminal sin diálisis periódica.
El ASA se puede modificar a mano; las salidas muestran el valor final y que ha sido modificado. El sufijo **E** de urgencia se ha retirado (decisión del servicio, 30/09/2026): ya no se recoge el carácter urgente de la intervención.

### 6.2 Vía aérea
Datos: Mallampati (I a IV, con ilustración esquemática propia, sin imágenes con derechos de autor), apertura bucal (≥ 4 cm o < 4 cm; referencia práctica de tres dedos), distancia tiromentoniana (> 6,5 cm, 6 a 6,5 cm, < 6 cm), movilidad cervical (> 90°, 80 a 90°, < 80°), protrusión mandibular (puede o no adelantar los incisivos inferiores por delante de los superiores), dentición (completa, piezas móviles, prótesis removible superior o inferior, prótesis fija, edéntulo), cuello corto o grueso, perímetro del cuello en cm, barba, antecedente de intubación difícil (no, dudoso, confirmado), radioterapia cervical, tumor de cabeza y cuello, limitación cervical reumatológica, ronquido.

- Índice de El-Ganzouri (EGRI): apertura bucal < 4 cm = 1; distancia tiromentoniana 6 a 6,5 cm = 1, < 6 cm = 2; Mallampati II = 1, III o IV = 2; movilidad cervical 80 a 90° = 1, < 80° = 2; no puede protruir la mandíbula = 1; peso 90 a 110 kg = 1, > 110 kg = 2; intubación difícil previa dudosa = 1, confirmada = 2. EGRI ≥ 4: riesgo elevado de laringoscopia difícil.
- Ventilación difícil con mascarilla (Langeron): barba, IMC > 26, edéntulo, edad > 55 años, ronquido. Dos o más: riesgo.
- Alerta independiente de las escalas si hay radioterapia cervical, tumor de cabeza y cuello, limitación cervical reumatológica, bocio grande o intubación difícil previa confirmada.
- En telefónica no se explora la vía aérea (2026-10-04): el paso no se muestra, el resumen indica «pendiente de explorar el día de la intervención» y las escalas de vía aérea (EGRI, Langeron) no se calculan.

### 6.3 SAOS: STOP-Bang (adultos sin SAOS diagnosticado) y STBUR (niños)
STOP-Bang: ronquido fuerte, cansancio o somnolencia diurna, apneas observadas, HTA en tratamiento, IMC > 35, edad > 50, cuello > 40 cm, varón. 0 a 2 bajo; 3 a 4 intermedio; 5 a 8 alto. También alto con ≥ 2 de los cuatro primeros más varón, IMC > 35 o cuello > 40 cm. Alto: alerta.
STBUR: ronca más de la mitad de las noches; ronca fuerte; se le oye esforzarse para respirar dormido; le han visto dejar de respirar dormido; se levanta cansado o está somnoliento de día. Tres o más positivos: riesgo aumentado de eventos respiratorios perioperatorios (alerta); cinco positivos: alerta alta.

### 6.4 NVPO: Apfel (adultos) y POVOC (niños)
Apfel: mujer, no fumador, NVPO o cinetosis previas, opioides postoperatorios previstos (si no se sabe, se consideran previstos en cirugía de riesgo intermedio o alto). 0 = 10 %, 1 = 20 %, 2 = 40 %, 3 = 60 %, 4 = 80 %.
POVOC (Eberhart): cirugía ≥ 30 min, edad ≥ 3 años, cirugía de estrabismo, NVPO previas del niño o de familiares de primer grado. 0 = 9 %, 1 = 10 %, 2 = 30 %, 3 = 55 %, 4 = 70 %.

### 6.5 CHA2DS2-VA (fibrilación auricular o flúter; guía ESC 2024)
Insuficiencia cardiaca 1, HTA 1, edad ≥ 75 años 2, diabetes 1, ictus, AIT o tromboembolismo 2, enfermedad vascular (infarto, arteriopatía periférica, placa aórtica) 1, edad 65 a 74 años 1. Máximo 8. Es informativo; la terapia puente sigue la regla 8.1. No calcular CHA2DS2-VASc.

### 6.6 Capacidad funcional
Pregunta de dos pisos y DASI: autocuidado 2,75; caminar dentro de casa 1,75; caminar 1 o 2 manzanas en llano 2,75; subir un piso de escaleras o una cuesta 5,50; correr una distancia corta 8,00; tareas ligeras de casa 2,70; tareas moderadas de casa 3,50; tareas pesadas de casa 8,00; trabajo de jardín 4,50; relaciones sexuales 5,25; actividades recreativas moderadas 6,00; deportes intensos 7,50. METs = (0,43 × DASI + 9,6) / 3,5. Capacidad reducida: < 4 METs o DASI ≤ 34.

### 6.7 Aclaramiento de creatinina
Cockcroft-Gault con peso real: ((140 − edad) × peso) / (72 × creatinina en mg/dL), × 0,85 en mujeres. Acepta µmol/L con conversión. Si solo hay filtrado estimado del informe, se usa y se indica. Sin dato, las reglas que dependen de la función renal lo dicen y requieren confirmación hasta que se introduzca.

**Entrada del aclaramiento en el paso 8 (§8.2/§8.4):** el aclaramiento es un valor ÚNICO para toda la entrevista. Si lo aporta un módulo (enfermedad renal o trasplante, con la creatinina), ese valor manda. Si no, y se añade un fármaco cuya suspensión depende del riñón (dabigatrán, rivaroxabán, apixabán, edoxabán, fondaparinux y las HBPM para su clasificación y plazos), el paso 8 muestra junto a la medicación una ficha de «función renal» para introducir el aclaramiento directamente, o la creatinina sérica con su fecha (el programa calcula Cockcroft-Gault con la edad, el peso y el sexo del paso 3), o marcar «No disponible». Si se marca «No disponible», esas reglas devuelven «requiere confirmación» (caso A7). Al cambiar el valor en un sitio, se actualiza en el otro y se recalculan las reglas.

**Analítica de hace más de 3 meses (2026-10-04).** Si la analítica de la que sale el aclaramiento (la del módulo renal/trasplante o la fecha anotada en la ficha de función renal del paso 8) es de hace más de 3 meses respecto al día de la intervención (o a la fecha de hoy, si no hay fecha de intervención), el resumen del anestesiólogo muestra una alerta informativa: «Aclaramiento de una analítica de hace más de 3 meses». El cálculo del aclaramiento no cambia; es solo un aviso para que se valore repetir la analítica.

### 6.8 Dosis equivalente de morfina oral
Suma de dosis diarias × factor de `opioides.json`. Factores iniciales (CDC 2022): morfina oral 1; codeína 0,15; tramadol 0,2; tapentadol 0,4; oxicodona 1,5; hidromorfona oral 5; fentanilo transdérmico µg/h × 2,4. Buprenorfina y metadona sin conversión (5.7).

### 6.9 AUDIT-C
Tres preguntas (textos revisados 2026-10-04): 1) ¿Con qué frecuencia consume alguna bebida alcohólica?; 2) ¿Cuántas consumiciones de alcohol suele tomar en un día típico?; 3) ¿Con qué frecuencia toma 6 o más bebidas en una sola ocasión? 0 a 12 puntos, puntuación estándar. **Ninguna pregunta es obligatoria**: la puntuación solo se calcula si las tres están contestadas; si falta alguna, el resumen dice «AUDIT-C no completado» y no genera alertas ni anexo. Positivo ≥ 4 en hombres y ≥ 3 en mujeres: consejo breve y hoja de reducción de consumo. ≥ 8: alerta de riesgo de síndrome de abstinencia perioperatorio.

### 6.10 Fragilidad, deterioro cognitivo y delirium (≥ 65 años)
- Clinical Frailty Scale 1 a 9 con descripción corta de cada nivel. ≥ 5: fragilidad (alerta).
- 4AT, en presencial y en telefónica (el resumen indica la modalidad): alerta (normal 0, alterado 4); AMT4, que pregunta edad, fecha de nacimiento, lugar y año (0 errores 0, 1 error 1, 2 o más o no valorable 2); meses del año al revés (7 o más correctos 0, empieza pero menos de 7 1, no valorable 2); cambio agudo o curso fluctuante (no 0, sí 4). Total 0: improbable. 1 a 3: posible deterioro cognitivo (alerta de riesgo de delirium y recomendaciones de prevención). 4 o más: posible delirium actual (alerta roja, valoración por el anestesiólogo antes de la cirugía).
- Con fragilidad, 4AT ≥ 1 o deterioro cognitivo conocido, la hoja del paciente incluye recomendaciones de prevención del delirium: traer gafas y audífonos, venir acompañado, que el acompañante pueda estar en la recuperación si el circuito lo permite, no empezar sedantes nuevos por su cuenta. La salida del anestesiólogo añade: evitar benzodiacepinas y anticolinérgicos, valorar monitorización de profundidad anestésica.

## 7. Pruebas complementarias (protocolo propio del servicio)

### 7.1 Riesgo quirúrgico (clasificación ESC 2022)
Decisión del servicio (2026-09-30): se sustituye la clasificación anterior por la ESC 2022. Desde `procedimientos.csv`. El riesgo hemorrágico no cambia.
- Bajo (< 1 %): cirugía superficial; mama; dental; tiroides y paratiroides; oftalmología; ginecología menor (legrado, conización, histeroscopia, biopsias); traumatología menor (artroscopias, meniscectomía, ligamentoplastia, mano, muñeca, pie, túnel carpiano, retirada de material); plástica no mayor; urología menor (RTU de próstata y vesical, ureteroscopia, biopsia de próstata, cistoscopia, hidrocele, orquiectomía, vasectomía, circuncisión, catéter doble J); ORL menor (amigdalectomía, adenoidectomía, septoplastia, rinoplastia, cirugía endoscópica nasosinusal, timpanoplastia, mastoidectomía, microcirugía de laringe, drenajes timpánicos); hernia inguinal abierta y umbilical; proctología; endoscopias diagnósticas y con biopsia; resección pulmonar menor por VATS; cirugía pediátrica menor.
- Intermedio (1 a 5 %): intraperitoneal (colecistectomía, apendicectomía, hernia laparoscópica, eventroplastia, colectomías no multiviscerales, gastrectomía, cirugía bariátrica, esplenectomía, hernia de hiato); cabeza y cuello mayor (laringectomía, vaciamiento cervical, parotidectomía, cirugía ortognática, tumor de cavidad oral, traqueotomía, uvulopalatofaringoplastia); intratorácica no mayor (lobectomía, segmentectomía, timectomía, mediastinoscopia, cirugía pleural); neurocirugía; ortopedia mayor (cadera, rodilla, hombro, fémur, columna); urología y ginecología mayores (nefrectomía, prostatectomía, nefrolitotomía percutánea, histerectomía, miomectomía, prolapso, cirugía oncológica ovárica no multivisceral); cesárea; EVAR; endarterectomía carotídea asintomática; angioplastia periférica; trasplante renal; endoscopia terapéutica compleja (CPRE, mucosectomía, polipectomía); radiología intervencionista mayor.
- Alto (> 5 %): suprarrenalectomía; cirugía aórtica y vascular mayor abierta; revascularización abierta de miembro inferior y amputación por isquemia; endarterectomía carotídea sintomática; duodenopancreatectomía; hepatectomía y cirugía de vía biliar; esofagectomía; neumonectomía; trasplante pulmonar o hepático; cistectomía total; cirugía de intestino perforado; cirugía oncológica multivisceral; cirugía cardiaca.

La endarterectomía carotídea se separa en sintomática (alto) y asintomática (intermedio); la amputación de miembro inferior en traumática (intermedio) y por isquemia (alto).

### 7.2 Clase de riesgo del paciente
La más alta de las que asignen los módulos:
- Bajo: menor de 65 años, asintomático en reposo y con esfuerzo, sin comorbilidad cardiovascular, respiratoria, renal ni metabólica y sin medicación activa.
- Bajo-moderado: > 65 años o patología crónica leve controlada (HTA, diabetes, IMC 30 a 40, asma leve intermitente, SAOS tratado, trombofilia como factor V Leiden).
- Moderado: patología crónica grave o leve mal controlada (IMC > 40, EPOC leve-moderada, hepatopatía crónica controlada, insuficiencia cardiaca NYHA I-II, cardiopatía isquémica asintomática, ERC con filtrado 15 a 45, diabetes mal controlada).
- Alto: patología con riesgo vital (insuficiencia cardiaca NYHA III-IV, ERC con filtrado < 15, angina estable, oxigenoterapia domiciliaria, miocardiopatía, valvulopatía moderada-grave).

### 7.3 Tabla de decisión

| Cirugía | Prueba | Bajo | Bajo-moderado | Moderado | Alto |
|---|---|---|---|---|---|
| Bajo riesgo | Hemograma y coagulación | No* | Sí | Sí | Sí |
| Bajo riesgo | Bioquímica** | No | Sí | Sí | Sí |
| Bajo riesgo | ECG | No | Sí | Sí | Sí |
| Bajo riesgo | Rx tórax | No*** | No*** | No*** | No*** |
| Intermedio | Hemograma y coagulación | Sí | Sí | Sí | Sí |
| Intermedio | Bioquímica** | No | Sí | Sí | Sí |
| Intermedio | ECG | No | Sí | Sí | Sí |
| Intermedio | Rx tórax | No*** | No*** | No*** | Sí |
| Alto | Hemograma y coagulación | Sí | Sí | Sí | Sí |
| Alto | Bioquímica** | No | Sí | Sí | Sí |
| Alto | ECG | Sí | Sí | Sí | Sí |
| Alto | Rx tórax | No*** | Sí | Sí | Sí |

\* Paciente de bajo riesgo con cirugía de bajo riesgo: hemograma y coagulación si hay sospecha o antecedente de anemia (Hb < 13 g/dL), trastorno de la coagulación o anticoagulante, posibilidad de anestesia regional (neuroaxial o bloqueo periférico), sangrado importante previsible o HEMSTOP positivo.

\** Bioquímica: creatinina, filtrado glomerular estimado, sodio, potasio, cloro, HbA1c y albúmina. Añadir GOT, GPT y bilirrubina si hay hepatopatía conocida o sospecha de disfunción hepática; ferritina si se sospecha ferropenia, ha habido sangrado reciente o hay alerta de anemia (5.5). BNP o NT-proBNP **solo** en cirugía de riesgo intermedio o alto y si hay alguno de: comorbilidad cardiovascular significativa, fragilidad (CFS ≥ 5) o capacidad funcional reducida (< 4 METs). Cuenta como comorbilidad cardiovascular significativa (decisión del servicio, 2026-10-04): cardiopatía isquémica, insuficiencia cardiaca, valvulopatía moderada o grave, fibrilación auricular u otra arritmia, arteriopatía periférica o aneurisma de aorta, ictus o AIT previo, miocardiopatía e hipertensión pulmonar. La **hipertensión arterial aislada no cuenta**. Nota para el anestesiólogo: si son normales se sigue sin más pruebas; si están elevados (BNP > 92 ng/L o NT-proBNP > 300 a 400 ng/L según laboratorio), completar estudio (ecocardiograma, prueba de estrés o angio-TC coronario) con manejo multidisciplinar.

\*** Rx de tórax solo si hay sospecha de enfermedad pulmonar nueva, síntomas respiratorios nuevos o cambio reciente de los previos, o empeoramiento documentado de enfermedad cardiopulmonar conocida. La aplicación pregunta estos supuestos.

Ecocardiograma: sospecha de valvulopatía nueva, valvulopatía conocida sin ecocardiograma en los últimos 12 meses o empeoramiento clínico de una valvulopatía conocida (más disnea, síncope o presíncope, angina).

Validez: hemograma 30 días, bioquímica 30 días, coagulación 14 días, ECG 3 meses, Rx de tórax 3 meses, ecocardiograma 12 meses (18 si la función ventricular es conocida y estable). En el paso de enfermedades, el apartado opcional «Pruebas recientes» recoge la fecha de la última de cada prueba. La aplicación compara esa fecha con la de la intervención (o, si aún no hay fecha, con el día de hoy, y lo indica): si la prueba sigue vigente ese día, **no se pide** (se descuenta de la lista); si caduca antes, se pide. El BNP o NT-proBNP se pide por indicación (nota **), no tiene ventana de validez y no se descuenta por fecha.

Recordatorio en la salida: la valoración debería hacerse idealmente entre 2 y 4 semanas antes de la cirugía programada.

## 8. Reglas de medicación

### 8.0 Convenciones del motor
- Plazos expresados en horas (ACOD, heparinas, fondaparinux, litio, moclobemida, AINE, dipiridamol, sulodexida, GP IIb/IIIa): se cuentan desde la última toma hasta la hora prevista de la intervención. Una toma que cae exactamente en el límite está permitida.
- Plazos expresados en días (antivitamina K, AAS, P2Y12, triflusal, cilostazol, SGLT2, JAK, fitoterapia, IMAO irreversibles): «suspender N días» significa no tomarlo los N días previos ni el día de la intervención.
- Anticoagulantes con plazo en horas (ACOD, heparinas, fondaparinux): si la primera toma habitual posterior al límite cae como máximo 10 horas después de él, la hoja indica adelantarla a la hora límite («el lunes 12/10, tome la dosis a las 08:00 en lugar de a las 09:00; será la última») en lugar de suprimirla, siempre que quede al menos la mitad del intervalo habitual desde la toma anterior (6 h en pautas cada 12 h, 12 h en pautas cada 24 h). Si no se cumple, la última toma es la anterior permitida. Nunca se atrasa una toma. En el resto de fármacos no se adelantan tomas.
- La aplicación calcula la fecha y hora límite de la última toma y la traduce a lenguaje del paciente según su pauta y hora habitual: «Tome la última dosis el martes 13 de octubre por la mañana. Después no vuelva a tomarlo hasta que se lo indiquen». Siempre con el día de la semana.
- «Mantener» se traduce en «Siga tomándolo como siempre, también el día de la intervención, con un sorbo de agua».
- Sin hora de intervención, se usa 08:00 y la hoja avisa de que si cambia la fecha o la hora debe llamar.
- «Bloqueo periférico» y «bloqueo profundo» son opciones separadas del selector de técnica. Los bloqueos de plano fascial (TAP, erector de la columna, PENG, serrato) son periféricos. Profundos por defecto: paravertebral, plexo lumbar y compartimento del psoas, plexo cervical profundo e intercostal (lista editable en `reglas_farmacos.json`).
- Combinaciones fijas (una sola pastilla): una única instrucción por medicamento comercial con el plazo más restrictivo de sus componentes (ejemplo: «Deje de tomar Synjardy 3 días antes»). Si los principios activos se toman en medicamentos separados, una instrucción por medicamento. Cuando la combinación obligue a retirar la metformina antes de su plazo propio, nota del anestesiólogo: «vigilar glucemia en los días sin tratamiento».
- Cualquier fármaco con `requiere_confirmacion = sí`, o cualquier regla que devuelva ese estado, entra en el mecanismo de la sección 12.
- «Hoy» para los cálculos que comparan con la fecha actual (plazo no alcanzable del paso 1, vigencia de pruebas sin fecha de intervención, recencia de condiciones) es un parámetro explícito del contexto (`fechaReferencia`): la aplicación pasa la fecha real; las pruebas, el informe de casos y el modo entrenamiento pasan una fecha fija (29/09/2026), para que los resultados no dependan del día de ejecución.
- **Regla de pruebas y fechas:** ninguna prueba unitaria puede depender de la fecha real; todas pasan una `fechaReferencia` fija (29/09/2026) al construir el contexto de reglas. Las pruebas de navegador (E2E) calculan las fechas a partir de hoy (la intervención por defecto es hoy + 30 días), nunca con una fecha de calendario fija.
- Fármaco no catalogado: mantener y consultar con el anestesiólogo.
- Cada regla guarda su fuente en los datos: protocolo del servicio o guía concreta (ESC 2022, ESC 2024, CPOC, ACR 2022, CDC 2022, ASRA 2018, EHRA 2021).

### 8.1 Antivitamina K (warfarina, acenocumarol)
- Oftalmología de riesgo bajo o riesgo hemorrágico mínimo: no suspender; comprobar que el último INR está en rango.
- Resto: coordinar la interrupción con el centro de control de anticoagulación del paciente, o suspender warfarina 5 días y acenocumarol 3 días (rango del protocolo 2 a 3; individualizar y monitorizar INR). INR < 1,5 el día de la intervención (el protocolo da el rango 1,3 a 1,5; decide el anestesiólogo).
- Terapia puente (solo con warfarina o acenocumarol) con alto riesgo tromboembólico: válvula mitral o tricúspide mecánica; válvula aórtica mecánica con fibrilación auricular o disfunción sistólica; fibrilación auricular con ictus o AIT en los últimos 3 meses; TVP o TEP en los últimos 3 meses; síndrome antifosfolípido; déficit de antitrombina; homocigosis de factor V Leiden; homocigosis de protrombina G20210A; déficit grave de proteína C o S con trombosis previas. Pauta: suspender el anticoagulante 3 a 5 días antes, iniciar enoxaparina 1 mg/kg cada 12 h SC (dosis calculada con el peso; aclaramiento < 30 mL/min, 1 mg/kg cada 24 h), última dosis la mañana del día previo (24 h antes). Siempre requiere confirmación.

### 8.2 Anticoagulantes orales de acción directa (dabigatrán, rivaroxabán, apixabán, edoxabán)
- Oftalmología de riesgo bajo: no suspender.
- Riesgo hemorrágico bajo sin neuroaxial ni bloqueo profundo: 48 h.
- Riesgo hemorrágico alto, neuroaxial o bloqueo profundo: 72 h.
- Dabigatrán: aclaramiento 50 a 80 mL/min, + 24 h; < 50 mL/min, + 48 h. Los ajustes se suman también al plazo de neuroaxial: con neuroaxial, 72 h (aclaramiento > 80), 96 h (50 a 80) y 120 h (< 50).
- Rivaroxabán, apixabán, edoxabán: aclaramiento < 30 mL/min, + 24 h (con neuroaxial, 96 h).
- Nota para el anestesiólogo con riesgo hemorrágico bajo, sin neuroaxial ni bloqueo profundo y aclaramiento > 50 mL/min: «podría considerarse suspender solo 24 h».
- Criterio de alto riesgo trombótico de 8.1: requiere confirmación con el texto «consultar con hematología o cardiología el cambio a acenocumarol para poder hacer terapia puente».

### 8.3 Antiagregantes
- AAS ≤ 200 mg/día: mantener. En neurocirugía intracraneal y cirugía del canal medular, requiere confirmación (ESC 2022).
- AAS > 200 mg/día: suspender 7 días (rango del protocolo 3 a 7). Indicación cardiovascular: requiere confirmación con la sugerencia de pasar a 100 mg/día.
- Stent tras procedimiento programado de menos de 6 meses o tras síndrome coronario agudo de menos de 12 meses: alerta «valorar diferir la cirugía programada; no suspender la doble antiagregación sin consultar con cardiología», requiere confirmación (ESC 2022). Si además hay técnica neuroaxial prevista o probable, se emiten las dos alertas, la del stent primero y en rojo, y la hoja del paciente no muestra ninguna pauta de antiagregantes hasta la confirmación.
- Inhibidores P2Y12 (plazos del protocolo de suspensión): mantener el AAS si lo toma y suspender clopidogrel 5 días, ticagrelor 5 días y prasugrel 7 días. Con neuroaxial o bloqueo profundo: clopidogrel 7 días, ticagrelor 7 días y prasugrel 10 días.
- P2Y12 en monoterapia: suspender como arriba y requiere confirmación con la sugerencia «valorar sustituir por AAS 100 mg/día durante la retirada».
- Oftalmología de riesgo moderado o alto: sustituir los antiagregantes por AAS 100 mg/día y suspender el P2Y12 con los plazos del protocolo de suspensión indicados arriba. Anticoagulantes: retirada según el protocolo de suspensión (8.1, 8.2, 8.4).
- Oftalmología de riesgo bajo: no suspender antiagregantes ni anticoagulantes.
- Triflusal: 7 días; 10 días con neuroaxial o bloqueo profundo.
- Dipiridamol: 24 h; 48 h con neuroaxial o bloqueo profundo.
- Cilostazol (antiagregante): suspender 3 días (rango 2 a 3) si el riesgo hemorrágico es alto o hay neuroaxial o bloqueo profundo; si no, mantener.
- Sulodexida (glucosaminoglucano, grupo propio en el catálogo; solo regla de medicación, no interviene en la petición de pruebas): suspender 48 h (rango 24 a 48) si el riesgo hemorrágico es alto o hay neuroaxial o bloqueo profundo; si no, mantener.
- Inhibidores GP IIb/IIIa y cangrelor: uso hospitalario; en el catálogo con sus plazos del protocolo (eptifibatida 4 h, 6 h neuroaxial; tirofibán 4 a 8 h, 8 h neuroaxial; cangrelor 1 h, 3 h neuroaxial; abciximab 24 a 48 h). Siempre requieren confirmación.
- Stent, válvula mecánica o alto riesgo trombótico: ninguna suspensión de antiagregante o anticoagulante sin confirmación.

### 8.4 Heparinas y fondaparinux
- Heparina sódica IV: suspender 4 a 6 h antes (uso hospitalario).
- HBPM profiláctica (dosis única diaria): última dosis 12 h antes de la cirugía o de la técnica neuroaxial.
- HBPM terapéutica: última dosis 24 h antes o más. Nota: valorar actividad anti-Xa si hay dudas.
- Profiláctica o terapéutica se deduce comparando la dosis con las tablas de la SETH (enoxaparina, tinzaparina, bemiparina, nadroparina, dalteparina; profilaxis y tratamiento; aclaramiento mayor o menor de 30 mL/min). Si no encaja, se pregunta.
- Fondaparinux profiláctico (2,5 mg/día; 1,5 mg/día con aclaramiento 20 a 50): 36 h; 48 h con neuroaxial, bloqueo profundo o cirugía de alto riesgo hemorrágico. Aclaramiento < 20: contraindicado, alerta.
- Fondaparinux terapéutico (5, 7,5 o 10 mg/día según peso): 48 h con aclaramiento > 50; 72 h con neuroaxial, bloqueo profundo, alto riesgo hemorrágico o aclaramiento < 50.

### 8.5 Antidiabéticos e insulina (protocolo de preanestesia en diabéticos y guía CPOC)
- Metformina: no tomar el día de la intervención. Con contraste yodado previsto, suspender 24 a 48 h antes.
- Sulfonilureas (glibenclamida, glipizida, gliclazida, glimepirida) y glinidas (repaglinida, nateglinida): no tomar el día de la intervención.
- Inhibidores DPP-4: tomar hasta el día previo; no tomar la mañana de la intervención.
- Pioglitazona: no tomar el día de la intervención.
- Agonistas GLP-1 y tirzepatida, con cualquier indicación, también la obesidad: semanales, la última dosis debe ser al menos 7 días antes de la intervención; se omite la única dosis que cae en los 6 días previos o el mismo día de la intervención y la hoja indica su fecha exacta, y dieta de líquidos claros las 24 h previas (hoja anexa); diarios, no tomar los 3 días previos ni el día de la intervención (última dosis 4 días antes: intervención el jueves, última toma el domingo) y ayuno estándar.
- Inhibidores SGLT2: suspender 3 días (4 días ertugliflozina).
- Insulina basal (glargina, detemir, degludec): 80 % de la dosis habitual (reducción del 20 %, guía CPOC) en las tomas que caen la noche previa y la mañana de la intervención, redondeando a la unidad inferior; las tomas de días anteriores se ponen completas.
- Insulina NPH: dosis completa la noche previa y 50 % la mañana de la intervención.
- Insulina rápida o ultrarrápida: suspender la del desayuno; solo pauta correctora según glucemia capilar.
- Insulinas premezcladas: 50 % de la dosis habitual de la mañana de la intervención.
- Bomba de insulina: basal al 80 % y suspender los bolos. La decisión depende **solo del riesgo quirúrgico** (2026-10-04, se retira el régimen): cirugía de riesgo bajo, sin confirmación; riesgo intermedio o alto, requiere confirmación.
- Combinaciones fijas de insulina basal con GLP-1 (degludec más liraglutida, glargina más lixisenatida): requiere confirmación, porque omitir el GLP-1 dejaría sin insulina basal.
- Combinaciones orales: regla más restrictiva de sus componentes.
- Nota para el anestesiólogo en diabéticos: objetivo de glucemia perioperatoria 100 a 180 mg/dL; monitorización preinducción, cada 2 h en cirugía prolongada y cada 2 a 4 h en el postoperatorio hasta reiniciar dieta; si no se ha suspendido el SGLT2, controles cada 1 a 2 h, gasometría en cirugía prolongada, cuerpos cetónicos, fluidos balanceados y vigilancia de cetoacidosis euglucémica (pH < 7,3, bicarbonato < 18 mmol/L o anión gap elevado).

### 8.6 AINE
Ibuprofeno 24 h; naproxeno 72 h (rango 48 a 72); diclofenaco, dexketoprofeno y ketorolaco 24 h; celecoxib y etoricoxib, mantener. Texto al paciente: «si necesita analgesia esos días puede tomar paracetamol o metamizol».

### 8.7 Psicofármacos y neurología
- IMAO irreversibles (tranilcipromina; fenelzina e isocarboxazida si aparecieran): retirar idealmente 10 a 14 días antes, siempre de acuerdo con su psiquiatra. Requiere confirmación. Si no se retiran, nota «anestesia segura con IMAO»: evitar meperidina, tramadol, metadona, efedrina, anfetaminas, linezolid y azul de metileno; preferir morfina (fentanilo y remifentanilo con precaución a dosis bajas), droperidol, dexametasona (ondansetrón con precaución) y vasopresores directos (fenilefrina, adrenalina, noradrenalina).
- Moclobemida (IMAO-A reversible): suspender 24 h y misma nota.
- IMAO-B antiparkinsonianos (rasagilina, selegilina, safinamida): mantener, con la misma nota de fármacos a evitar.
- Litio: suspender 24 h en cirugía de riesgo bajo, 48 h en intermedio y 72 h en alto. Nota: controlar litemia y función renal, reanudar con precaución.
- ISRS, IRSN, antipsicóticos, benzodiacepinas, antiepilépticos y antiparkinsonianos (levodopa incluida): mantener.

### 8.8 Inmunosupresores y reumatología
- Azatioprina, ciclosporina, tacrolimus, micofenolato: por trasplante o enfermedad sistémica grave, mantener. Por enfermedad autoinmune con riesgo alto de infección o complicaciones, suspender 1 a 2 días; como la enfermera no puede valorar ese riesgo, requiere confirmación.
- Metotrexato ≤ 20 mg/semana: mantener. > 20 mg/semana, cirugía mayor con alto riesgo de infección o función renal alterada: requiere confirmación con la sugerencia «valorar omitir 1 o 2 dosis tras consultar con reumatología».
- Leflunomida, hidroxicloroquina, sulfasalazina: mantener (ACR 2022).
- Inhibidores JAK (tofacitinib, baricitinib, upadacitinib): suspender 3 días (ACR 2022).
- Biológicos (anti-TNF, rituximab, tocilizumab, abatacept y otros): nota de planificación «programar la cirugía al final del ciclo, idealmente omitiendo un ciclo; por ejemplo, adalimumab cada 2 semanas, operar justo antes de la siguiente dosis; rituximab, esperar 6 meses desde la infusión si es posible». La aplicación pide fecha de la última dosis y pauta, y calcula en qué punto del ciclo cae la cirugía. Requiere confirmación.

### 8.9 Oncológicos
- Inhibidores de tirosina cinasa y anticuerpos contra receptores de crecimiento (imatinib, dasatinib, nilotinib, erlotinib, sorafenib, sunitinib, cetuximab): continuar hasta la cirugía.
- Antiangiogénicos sistémicos (bevacizumab, aflibercept oncológico, ramucirumab): última dosis hace menos de 6 a 8 semanas, alerta «retrasar cirugía programada al menos 6 a 8 semanas desde la última dosis», requiere confirmación. El aflibercept intravítreo no activa esta regla.

### 8.10 Cardiovasculares
- IECA y ARA-II: no tomar el día de la intervención (la toma de la noche anterior sí se hace), salvo insuficiencia cardiaca con disfunción sistólica, infarto reciente o proteinuria o nefropatía, en cuyo caso se mantienen. La aplicación decide con los módulos y, si falta información, pregunta.
- Sacubitrilo/valsartán: requiere confirmación.
- Betabloqueantes, antagonistas del calcio, nitratos, amiodarona, digoxina, estatinas: mantener (ESC 2022).
- Diuréticos: no tomar la dosis de la mañana de la intervención.

### 8.11 Otros
- Fitoterapia y suplementos con efecto sobre la coagulación o el metabolismo (ginkgo, ajo, ginseng, kava, cúrcuma, vitamina E, omega 3, hipérico y otros): suspender 14 días antes si es posible, mínimo 7.
- Anticonceptivos hormonales combinados y THS: en procedimientos con riesgo trombótico alto (columna del CSV), requiere confirmación. La sugerencia «valorar suspender 4 a 6 semanas antes y método anticonceptivo alternativo» va solo en las notas del anestesiólogo; la hoja del paciente muestra «Sobre su anticonceptivo, el anestesiólogo le llamará para indicarle qué hacer. No lo cambie por su cuenta» hasta la confirmación.
- Sugammadex y anticoncepción (ficha técnica de sugammadex): en toda mujer con anticonceptivo hormonal (NO la terapia hormonal sustitutiva, que no es anticonceptiva) y posible anestesia general (técnica general o «no se sabe»), la **hoja del paciente** (castellano y catalán, PDF, QR y vista interactiva) incluye de forma condicional («si durante la anestesia le administran sugammadex»): anticonceptivo oral, equivale a olvidar una toma —seguir las instrucciones de «dosis olvidada» del prospecto y usar además preservativo 7 días—; anticonceptivo hormonal no oral (implante, DIU hormonal, anillo, parche, inyectable), usar además preservativo durante 7 días. El texto indica que el equipo de anestesia lo confirmará tras la intervención. Las notas del anestesiólogo recuerdan informar a la paciente al alta si se ha usado.
- Corticoides sistémicos: mantener; alerta de dosis de estrés según 5.3.
- Levotiroxina, inhaladores, IBP, alopurinol, bifosfonatos, opioides crónicos: mantener.

### 8.12 Reanudación posoperatoria (solo en las notas del anestesiólogo)
- Antivitamina K: reiniciar la tarde de la intervención o al día siguiente si la hemostasia es adecuada. Si hubo puente, HBPM terapéutica a las 24 h en cirugía de bajo riesgo hemorrágico y a las 48 a 72 h en alto riesgo, hasta INR en rango (ESC 2022).
- ACOD: 24 h tras cirugía de bajo riesgo hemorrágico, 48 a 72 h tras alto riesgo (EHRA 2021). Con catéter neuroaxial, primera dosis al menos 6 h después de retirarlo (ASRA 2018).
- HBPM profiláctica: primera dosis al menos 12 h tras la punción neuroaxial; retirada del catéter al menos 12 h tras la última dosis y siguiente dosis al menos 4 h tras la retirada. HBPM terapéutica: al menos 24 h tras la punción y nunca con catéter colocado (ASRA 2018).
- P2Y12: reanudar en las 24 a 48 h siguientes según hemostasia (ESC 2022). Con catéter, sin dosis de carga se puede reiniciar tras la retirada; con dosis de carga, 6 h después (ASRA 2018).
- AAS a dosis baja: no se interrumpe.

### 8.13 Salida por fármaco
Nombre comercial y principio activo, qué hacer, fecha y hora de la última toma o dosis modificada, regla aplicada, fuente y si requiere confirmación.

### 8.14 Ayuno (protocolo de ayuno de Vithas Barcelona)
Las horas se calculan desde la hora prevista de inducción y se muestran como horas de reloj («puede comer algo ligero hasta las 02:00»).

Adultos sin factores de riesgo:
- Líquidos claros (agua, infusiones, zumo sin pulpa, té o café sin leche, bebidas isotónicas) libres hasta 4 h antes; entre 4 y 2 h antes, máximo 400 mL en total (unos 2 vasos grandes). Nada en las 2 h previas salvo la medicación con un sorbo de agua.
- Comida ligera baja en grasa (tostadas, cereales, fruta): hasta 6 h antes. Comida copiosa, grasa o con mucha proteína (carne): hasta 8 h antes.
- Bebida de carbohidratos (Nutricia PreOp 200 mL o 25 g de maltodextrina en 200 mL de agua fría, bebida despacio) entre 2 y 3 h antes, salvo factores de riesgo de vaciamiento gástrico lento. En la hoja del paciente se llama «bebida de carbohidratos».
- Solo en las notas del anestesiólogo: hasta 50 mL de leche en el café o el té no retrasan la cirugía aunque no se recomienda; chicle o caramelo sin tragar en las 2 h previas no retrasan la cirugía.

Situaciones especiales:
- Diabetes: mismo ayuno que el resto de pacientes, incluida la bebida de carbohidratos; para sus líquidos claros libres, elegir los que no lleven mucho azúcar. La bebida de carbohidratos solo se excluye si hay factores de vaciamiento gástrico lento (por ejemplo, gastroparesia), igual que en cualquier paciente. Con síntomas de gastroparesia, ayuno de sólidos de 8 h y alerta de premedicación con metoclopramida.
- GLP-1 semanal: dieta de líquidos claros las 24 h previas con la hoja anexa (lista de lo permitido; en diabéticos, además, 150 a 200 g de hidratos al día, ajuste de la medicación, controles de glucemia cada 3 a 4 h, actuación si la glucemia es < 100 mg/dL y el ejemplo de plan de ingesta del protocolo). Si no lo ha suspendido: alerta de estómago lleno.
- Reflujo grave o disfagia: ayuno estándar, evitar el día previo los alimentos que le provocan reflujo, mantener la medicación antirreflujo. Sintomático el día de la intervención: alerta de estómago lleno.
- Cirugía bariátrica previa sintomática: ayuno de sólidos de 8 h, alerta de premedicación con metoclopramida y de inducción de secuencia rápida.
- Embarazo ≥ 20 semanas: alerta de ayuno individualizado.
- Nutrición enteral gástrica sin vía aérea protegida: suspender 8 h antes. Pospilórica o con vía aérea protegida: no se suspende.
- Contraste oral en las 4 h previas: alerta de estómago lleno.
- Pediatría: líquidos claros hasta 1 h antes, leche materna 3 h, leche de fórmula y sólidos 6 h; en menores de 6 meses, fórmula 4 h. Aviso de riesgo de hipoglucemia en recién nacidos y lactantes pequeños si el ayuno se alarga.
- Nota para el anestesiólogo cuando el contenido gástrico sea incierto (demencia, barrera idiomática, dolor intenso, enfermedad neuromuscular, GLP-1 no suspendido): valorar ecografía gástrica.
- Indicaciones de profilaxis de aspiración (solo notas del anestesiólogo): ayuno insuficiente, embarazo avanzado, reflujo grave sintomático, obesidad mórbida, diabetes descompensada, gastroparesia, bariátrica sintomática. Incluir la tabla del protocolo con dosis y tiempos (citrato sódico 0,3 M 30 mL VO 10 a 30 min antes; famotidina 20 mg VO 1 a 2 h antes o IV 30 a 60 min antes; omeprazol 40 mg VO la noche previa y/o 2 a 3 h antes, o pantoprazol 40 mg IV 30 a 60 min antes; metoclopramida 10 mg IV 15 a 30 min antes o VO 60 a 90 min antes; eritromicina 3 mg/kg IV, máximo 250 mg, 30 a 60 min antes) con sus precauciones.

### 8.14 bis. Textos de las hojas anexas para el paciente

Textos literales de las hojas anexas de la hoja del paciente (§10.2). Ninguna menciona dosis de fármacos: para la medicación remiten siempre a la hoja de medicación. Se traducen al catalán marcados como pendientes de revisión.

Cuándo se adjunta cada anexo: **1** con GLP-1 semanal sin diabetes; **2** con GLP-1 semanal y diabetes; **3** con diabetes sin GLP-1 semanal; **4** si fuma; **5** si el AUDIT-C es positivo.

**Anexo 1. Dieta de líquidos claros de 24 horas (GLP-1 semanal, paciente no diabético)**
«Durante las 24 horas anteriores a la intervención, desde el [día] a las [hora], tome solo líquidos claros.
Puede tomar: agua; caldos colados, sin grasa ni trozos (de pollo, carne o verduras); gelatina que no sea roja ni morada; zumos sin pulpa (manzana, uva blanca); bebidas isotónicas transparentes; infusiones, té o café sin leche.
No tome: alimentos sólidos, leche ni lácteos, zumos con pulpa, batidos ni suplementos nutricionales.
Las últimas horas: siga el apartado de ayuno de su hoja. Puede tomar líquidos claros hasta 4 horas antes de la intervención; entre 4 y 2 horas antes, como máximo 400 mL en total; en las 2 horas previas, nada, salvo la medicación indicada con un sorbo de agua.»

**Anexo 2. Dieta de líquidos claros de 24 horas en el paciente diabético (GLP-1 semanal y diabetes)**
Todo el texto del anexo 1, y además:
«Como tiene diabetes, durante estas 24 horas necesita tomar azúcar en forma de líquidos claros, repartido cada 2 o 3 horas, para evitar bajadas de azúcar.
Mida su glucosa cada 3 o 4 horas. Si está por debajo de 100 mg/dL, tome 120 mL de zumo de manzana o de bebida isotónica y vuelva a medirla a los 15 o 20 minutos.
Ejemplo de un día:
07:00 · 1 taza (240 mL) de zumo de manzana
09:30 · 1 taza de caldo colado y 1 gelatina sin azúcar
12:00 · 1 vaso (240 mL) de bebida isotónica transparente
14:30 · 1 taza de zumo de uva blanca
17:00 · 1 taza de té sin azúcar y 2 polos de hielo transparentes
19:30 · 1 vaso (240 mL) de bebida isotónica transparente
22:00 · 1 taza de caldo colado o agua y 1 gelatina sin azúcar
Si su glucosa está baja, puede repetir una ración de zumo o de bebida isotónica.
Sus medicamentos para la diabetes: siga exactamente lo que indica su hoja de medicación.
Lleve su medidor de glucosa al hospital.»

**Anexo 3. Ayuno del paciente diabético (sin dieta de 24 horas)**
«Siga el apartado de ayuno de su hoja, incluida la bebida de carbohidratos si su hoja se la indica.
Mida su glucosa al levantarse el día de la intervención. Si está por debajo de 100 mg/dL o nota síntomas de bajada (sudor, temblor, mareo), tome 120 mL de zumo de manzana o de bebida isotónica aunque esté en ayunas, vuelva a medirla a los 15 o 20 minutos y avise al llegar al hospital.
Sus medicamentos para la diabetes: siga exactamente lo que indica su hoja de medicación.
Lleve su medidor de glucosa al hospital.»

**Anexo 4. Tabaco**
«Dejar de fumar antes de la operación reduce las complicaciones de la herida y de los pulmones. Cuanto antes lo deje, mejor, aunque solo sea unos días antes. Si quiere ayuda para dejarlo, consulte con su médico de familia o su farmacéutico. El día de la intervención no fume.»

**Anexo 5. Alcohol**
«Reduzca o evite el alcohol en las semanas previas a la operación. Si bebe alcohol todos los días en cantidad, no lo deje de golpe sin consultarlo: dígalo en la consulta o a su médico de familia, porque dejarlo bruscamente puede ser peligroso. No beba alcohol en las 24 horas anteriores a la intervención.»

### 8.16 Fecha desconocida, márgenes y recálculo

a) El paso 1 permite marcar 'fecha de intervención aún no conocida' y continuar la entrevista.
b) Sin fecha, la hoja del paciente expresa cada instrucción como margen: plazos en días, 'no lo tome los N días anteriores a la intervención ni ese mismo día'; plazos en horas, 'su última toma debe ser como mínimo N horas antes de la hora de la intervención'; 'no tomar el día de la intervención' se mantiene igual; el ayuno, en horas antes de la intervención. Sin fecha no se aplican adelantos de tomas: solo el margen mínimo.
c) Con fecha, la hoja muestra la fecha y hora calculadas y, a continuación, el margen entre paréntesis ('como mínimo 72 horas antes de la intervención'), para que el paciente pueda adaptarse si cambian el día o la hora.
d) El QR del paciente incluye, para cada fármaco, el tipo de plazo, su duración, las horas habituales de toma, si admite adelanto y si es anticoagulante; y la vista del paciente tiene un botón 'Me han dado la fecha o me la han cambiado'. Al introducir la fecha y hora, recalcula todas las instrucciones con las mismas reglas del motor (§8.0), incluidos los adelantos de anticoagulantes.
e) Si al recalcular algún plazo ya no se puede cumplir, la vista del paciente no da pauta para ese fármaco y muestra: 'Con esta fecha ya no es posible seguir la pauta de [nombre comercial]. Llame al [teléfono del servicio] lo antes posible'.
f) Sin fecha, el QR del paciente caduca a los 90 días de su creación (configurable en config.json); con fecha, a los 30 días después de la intervención, como hasta ahora. Si el paciente introduce una fecha nueva, la caducidad se calcula sobre ella.
g) El texto del paciente siempre incluye: 'Si le cambian la fecha o la hora de la intervención, abra de nuevo este código e introduzca la nueva fecha'.

### 8.17 Información sobre su anestesia (riesgos para el paciente)

La hoja del paciente incluye un anexo, «Información sobre su anestesia», con los riesgos de la técnica anestésica prevista, en lenguaje llano y con una escala de frecuencias (muy frecuente a muy rara). El **texto literal** (castellano) es la fuente única `docs/riesgos_anestesia_es.md`; se copia sin cambiar cifras ni palabras a `datos/textos/es/riesgos_anestesia.json`, y una prueba comprueba la coincidencia palabra por palabra. El catalán (`datos/textos/ca/riesgos_anestesia.json`) está marcado como pendiente de revisión del servicio.

**Qué secciones ve cada paciente (según la técnica del paso 7):**
- Anestesia general → sección «anestesia general» (o la de «niño» si el paciente es pediátrico, que la sustituye).
- Neuroaxial: si se indica raquídea → sección de la raquídea; si se indica epidural o combinada → sección de epidural y combinada; si no se especifica → la raquídea más la frase «Si finalmente se usa una anestesia epidural, el anestesiólogo le explicará sus diferencias».
- Bloqueo periférico o profundo → sección «bloqueo de nervios» (ambos la misma). Si el procedimiento es de hombro o brazo (columna `bloqueo_miembro_superior` de `procedimientos.csv`), se añade el párrafo propio de esos bloqueos.
- Sedación → sección «sedación».
- En neuroaxial y en bloqueo, dos casillas opcionales del paso 7 añaden información: «combinada con anestesia general» añade la sección general (o la de niño), y «con sedación» añade la de sedación.
- Oftalmología: tópica → sección de sedación; retrobulbar o peribulbar → sedación más la frase «El anestesiólogo le explicará los riesgos propios del bloqueo del ojo».
- Anestesia local sin sedación → ninguna sección, solo la frase «Su operación se hará con anestesia local, que pone el propio cirujano. Sus riesgos son mínimos».
- Siempre que se muestre algo, se abren con la introducción (tabla de frecuencias) y se cierran con el párrafo de cierre.

**Importante:** estos subcampos del paso 7 (subtipo neuroaxial, «combinada con general», «con sedación») SOLO deciden qué información de riesgos ve el paciente. **No cambian ninguna regla de medicación ni ningún plazo**: para el motor, una técnica neuroaxial sigue siendo «neuroaxial». La batería de casos de referencia da los mismos resultados que antes.

**Presentación:** en la hoja de la consulta y en el PDF, el anexo va en una página nueva y en la primera página aparece la línea «Al final de esta hoja encontrará información sobre su anestesia y sus riesgos». En la vista del paciente por QR, el anexo se muestra en una sección plegable cerrada por defecto. El QR solo transporta las **claves** de las secciones a mostrar (no el texto), por lo que crece muy poco; el texto lo pinta la vista del paciente desde el JSON. El resumen del anestesiólogo muestra la técnica prevista con sus subcampos.

**Fuentes del texto (no para el paciente):** Royal College of Anaesthetists (Common events and risks in anaesthesia, 2019; Your airway and breathing during anaesthesia, 2020; Spinal anaesthetics: risks and side effects, 2025; Nerve damage after a spinal or epidural anaesthetic; Nerve damage associated with peripheral nerve block; Common events and risks for children and young people having a general anaesthetic, 2022); tarjeta informativa de la epidural de parto de la Obstetric Anaesthetists' Association; Cook TM et al., NAP3, Br J Anaesth 2009;102:179-90.

## 9. Cribado de riesgo mitocondrial mtND4 (consenso SEDAR 2026)

Pregunta obligatoria en todos los pacientes. **Pregunta puerta (2026-10-04):** el paso empieza con una sola pregunta, «¿Es posible que su ascendencia materna sea de origen venezolano?». Si la respuesta es **no**, se pasa directamente al paso siguiente, sin alerta y sin línea en la hoja del paciente. Si es **sí**, se muestran el guion y el resto de campos. Guion para la enfermera: «Hacemos esta pregunta a todos los pacientes porque se ha descrito una variante genética heredada por vía materna, más frecuente en familias de origen venezolano, que puede influir en cómo se elige la anestesia».

Preguntas (si la pregunta puerta es «sí»):
- ¿Su madre, su abuela materna u otra persona de la línea materna directa es de origen venezolano?
- ¿Desconoce el origen de su madre? ¿Nació por ovodonación?
- En la familia por línea materna: despertar muy retrasado tras una anestesia, daño neurológico grave, ictus o lesiones cerebrales tras anestesia general, muertes inesperadas en una operación.
- ¿Tiene hecho el estudio genético de la variante mtND4 m.11232T>C? Resultado.

Lógica de alerta: test positivo, alerta roja más recomendación de vigilancia postoperatoria estrecha; test negativo (variante ausente), alerta informativa «variante m.11232T>C ausente; decisión del anestesiólogo»; ascendencia venezolana materna directa, origen materno desconocido, ovodonación o antecedentes familiares compatibles sin test, alerta roja. Medidas en las notas del anestesiólogo:
- Procedimiento diferible y test disponible: test genético (búsqueda específica de la variante, informe explícito de presencia o ausencia, consentimiento informado específico) y diferir la cirugía hasta el resultado.
- No diferible o sin test: evitar halogenados (TIVA), purgado de la máquina y del circuito, priorizar anestesia regional o local con sedación, EEG procesado, normoxia, normocapnia, normotermia, estabilidad hemodinámica, control de glucemia y equilibrio ácido-base; test genético diferido.

En la hoja del paciente, solo: «El anestesiólogo hablará con usted sobre este punto antes de la intervención». Mostrar fuente y fecha del documento para poder actualizarlo (son recomendaciones provisionales).

## 10. Salidas

### 10.1 Texto para SAP (generador por plantillas, sin IA)
Texto plano en bloque, listo para copiar con un botón. El generador redacta frases correctas a partir de las respuestas usando `plantillas_sap.json`:
- Plantillas de frase por bloque y por respuesta, con marcadores (`{farmaco}`, `{dosis}`, `{fecha}`).
- Utilidades gramaticales: enumeraciones con comas e «y» final, singular y plural, concordancia de género, omitir bloques y frases vacíos, fechas en formato corto.
- Lista de abreviaturas permitidas (AP, IQ, tto, HTA, DM2, FA, AG, MP, AB, DTM, HM, NAMC y las que añadamos) y opción de escribirlas desarrolladas.
- Qué negativos se escriben siempre (por ejemplo «NAMC», «niega HM», «niega antecedentes familiares anestésicos», «cribado mtND4 negativo») y cuáles se omiten.
- Opción «solo ASCII» que sustituye tildes y símbolos si SAP da problemas.
- Sin límite de caracteres: el texto recoge los antecedentes patológicos y quirúrgicos y el resultado del consentimiento del paso 10 (2026-10-04); el resto del informe se rellena con los desplegables del propio SAP.
- **Solo las preguntas contestadas** (marcadas o con texto) constan en el SAP; las no contestadas no aparecen. Las preguntas de sí o no se escriben con una **etiqueta breve** (`etiquetaSap` del módulo): sí = la palabra («ortopnea»); no = «no» más la palabra («no ortopnea»). En las preguntas de casillas múltiples, solo las opciones marcadas, en forma breve. *(Decisión del servicio, 2026-10-04.)*
- **Consentimiento (paso 10):** se añade una línea según su estado: «Consentimiento: entregado y explicado (fecha)», «Consentimiento: pendiente de entregar» o «Consentimiento: no procede».
- Las plantillas se editan desde el panel de administración (14.1), con vista previa sobre los casos de entrenamiento.

Ejemplo del estilo esperado:

```
VALORACION PREANESTESICA ENFERMERIA 28/09/2026 (presencial)
Edad 67 a. Peso 82 kg. Talla 170 cm. IMC 28,4.
Alergias: penicilina (exantema). Latex no.
Habitos: exfumador (40 paq-año, deja 2015). AUDIT-C 2.
AP: HTA en tto. DM2 con ADO, HbA1c 7,2% (06/2026), sin complicaciones cronicas conocidas. FA permanente anticoagulada (apixaban), CHA2DS2-VA 3.
IQ previas: colecistectomia 2010 (AG sin incidencias).
Antecedentes anestesicos: sin incidencias. Familiares: niega HM. Cribado mtND4 negativo. HEMSTOP negativo.
Capacidad funcional: >4 METs. CFS 3.
Via aerea: MP II, AB >4 cm, DTM >6,5 cm, movilidad cervical normal, protrusion mandibular posible, protesis parcial superior removible. EGRI 1. Ventilacion con mascarilla: 1 predictor.
Escalas: STOP-Bang 4 (intermedio). Apfel 1.
ASA sugerido III.
Tto habitual: enalapril 10 mg/24h, metformina 850 mg/12h, empagliflozina 10 mg/24h, apixaban 5 mg/12h.
Plan: apixaban ultima dosis 12/10 20:00; empagliflozina ultima dosis 11/10; metformina no el dia de la IQ; enalapril no el dia de la IQ.
Pruebas: hemograma, coagulacion, bioquimica, ECG.
Consentimiento: entregado y explicado 28/09/2026.
Pendiente de confirmacion por anestesiologo: ninguno.
```

### 10.2 Hoja de recomendaciones individualizadas para el paciente
Castellano o catalán, con conmutador de idioma. Lenguaje sencillo, tratamiento de usted, frases cortas, letra grande. En pantalla para leerla en voz alta, en PDF para imprimir y en QR (11.1). Secciones: día y hora de la intervención; qué hacer con cada medicamento, en tabla (nombre comercial, qué hacer, hasta cuándo); ayuno con horas de reloj; qué traer (lista de medicación, informes, CPAP, inhaladores, gafas o audífonos); tabaco y alcohol (consejo breve; hoja anexa si procede); prevención del delirium si procede (6.10); consentimiento (entregado o se entregará el día de la intervención); prehabilitación si procede (sección 13); cuándo llamar (fiebre, catarro, cambios en la medicación, si cambia la fecha o la hora); teléfono de contacto; versión del contenido y fecha. Hojas anexas cuando procedan: dieta líquida de 24 h (GLP-1 semanal), ayuno del paciente diabético, deshabituación tabáquica, reducción del consumo de alcohol.

El QR del paciente se imprime al pie de la hoja. En esta primera versión se usa en la consulta presencial. Deja preparado un botón «Copiar enlace para el paciente» para enviarlo más adelante por WhatsApp corporativo en las valoraciones telefónicas.

### 10.3 Resumen para el anestesiólogo
Pantalla y PDF con: alertas ordenadas por gravedad (roja, amarilla, informativa), puntos que requieren confirmación, cálculos con sus componentes, plan de medicación con regla y fuente, pruebas solicitadas y motivo, ayuno. Apartado plegable «Notas técnicas» con profilaxis de aspiración, anestesia segura con IMAO, medidas mtND4, reanudación posoperatoria de antitrombóticos, notas de diabetes y de dolor. Incluye el QR del anestesiólogo (11.2).

## 11. QR y enlaces sin servidor

Los datos viajan dentro de la propia dirección web, en el fragmento tras la almohadilla (`#`), que el navegador no envía a GitHub Pages. Se serializan, se comprimen (por ejemplo con lz-string o deflate) y se codifican en base64url. El QR contiene esa dirección. No se guarda nada en ningún servidor: el QR es el archivo. Por eso la información sigue disponible aunque en la tablet se abra otro preoperatorio.

Cada carga útil lleva: tipo (paciente o anestesiólogo), versión del esquema, versión del contenido clínico, fecha de creación y fecha de caducidad. Ni nombre, ni número de historia, ni el campo de identificación opcional. Al abrir un enlace caducado, la aplicación muestra «Este enlace ha caducado. Llame al [teléfono]» sin mostrar los datos. La caducidad es una regla de visualización, no un cifrado: documéntalo así en el README.

### 11.1 QR del paciente
- Contiene la hoja ya calculada en forma estructurada (nombre comercial, código de acción y fecha y hora de cada fármaco, horas de ayuno, ids de los anexos aplicables, teléfono, versión de los textos), no las respuestas de la entrevista ni textos largos. La vista del paciente la renderiza en castellano o catalán con los textos de esa versión. Todas las versiones publicadas de `datos/textos/` se conservan en el repositorio (`datos/textos/historico/<versión>/`), para que un QR antiguo se muestre siempre con los mismos textos con que se generó aunque luego actualicemos el contenido.
- Al escanearlo con el móvil se abre una vista solo de lectura, adaptada al móvil, con conmutador castellano y catalán, botón para guardar como PDF y la indicación de cómo añadirla a la pantalla de inicio.
- Caducidad por defecto: 30 días después de la fecha de la intervención (configurable).
- No se genera mientras haya puntos pendientes sin resolver (sección 12).

### 11.2 QR del anestesiólogo
- Contiene la entrevista completa (respuestas, ASA, cálculos, plan, alertas, puntos pendientes) y la versión del contenido con la que se generó.
- Al abrirlo, el anestesiólogo ve el resumen, puede confirmar los puntos pendientes escribiendo su nombre, y la aplicación genera el QR y el enlace definitivos del paciente y el texto de SAP actualizado.
- Si la versión del contenido actual difiere de la del enlace, aviso: «Esta valoración se hizo con la versión X del contenido; revise si alguna recomendación ha cambiado».
- Caducidad por defecto: 60 días desde la creación (configurable).

### 11.3 Tamaño
Un QR admite unos 2,9 KB en modo binario con corrección de errores baja; usa corrección media o baja para que quepa más. Diseña un formato compacto (claves cortas, catálogos referenciados por id y no por texto en el QR del anestesiólogo). Si la carga no cabe, la aplicación lo avisa y ofrece copiar el enlace en su lugar. Pruebas automáticas del tamaño con los casos más complejos de entrenamiento.

## 12. Seguridad clínica

- Cada fármaco o recomendación que requiere confirmación aparece en la hoja del paciente como «Sobre [fármaco], el anestesiólogo le llamará para indicarle qué hacer. No lo cambie por su cuenta», salvo que se marque «confirmado por el anestesiólogo» con su nombre, en la tablet o desde el QR del anestesiólogo. Entonces se muestra la pauta. El nombre aparece en el texto de SAP.
- **La hoja del paciente y el QR se generan SIEMPRE (2026-10-04), sin bloqueo por fármacos pendientes.** Los fármacos pendientes aparecen en la hoja con la frase única de arriba y siguen listados como pendientes, con la opción de confirmarlos, en el resumen del anestesiólogo. Si se confirma un fármaco después, se vuelve a generar la hoja con la pauta.
- Pie en todas las salidas: «Recomendaciones generadas según los protocolos del Servicio de Anestesiología (versión X, revisión fecha). Validación final por el anestesiólogo».
- Si falta un dato que cambia la recomendación (aclaramiento, técnica anestésica, fecha del stent, indicación), la recomendación requiere confirmación y se dice qué dato falta.
- Validación de rangos en peso, talla, edad, dosis y fechas, con aviso ante valores improbables.

## 13. Prehabilitación

Controlada por `prehabilitacion_activa` en `config.json`, por defecto `false` (PreHabilítame es un proyecto piloto). Apagado, no aparece en ninguna salida. Encendido: si la cirugía es de riesgo intermedio o alto y hay capacidad funcional reducida, fragilidad (CFS ≥ 5) o anemia, la hoja del paciente incluye un apartado de prehabilitación con el enlace y un QR a PreHabilítame (https://holaaneshealth-eng.github.io/Prehabilitame/), y las notas del anestesiólogo lo recogen como derivación propuesta.

## 13 bis. Puntos de validación clínica (2026-10-04)

Mecanismo **distinto de las alertas**. Determinadas condiciones generan un **punto de validación** que el anestesiólogo revisa **al principio** de su resumen, con su **motivo** y su **fuente**. Hay dos tipos:

- **Valorar posponer la cirugía programada** (rojo).
- **Validar antes de la intervención** (amarillo).

Cada punto se resuelve con **«Validado por [nombre]»** o **«Posponer o derivar»**. **No bloquean nada**: la entrevista, la hoja y el QR se generan igualmente. Mientras quede algún punto **sin validar**, la hoja del paciente incluye, en castellano y catalán: «Antes de la intervención, el anestesiólogo revisará su caso y, si es necesario, se pondrá en contacto con usted.»

Los puntos se definen en `datos/validaciones.json` (editable desde el panel de administración, §14.1, y recogido en `CONTENIDO_CLINICO.md`, §16 bis). Cada punto enlaza, por su `origen`, con una condición ya evaluada por el programa: una condición de un módulo (`moduloId.preguntaId`, campo `genera`/`si`) o un hecho especial (hoy, `stent_reciente`). El **stent reciente** es un punto de **valorar posponer**.

Condiciones iniciales (clasificación del servicio):

- **Valorar posponer (rojo):** stent coronario reciente; ictus o AIT de menos de 3 meses; posible isquemia miocárdica inestable (angina de reciente comienzo o cambiante); infección respiratoria activa; síntomas respiratorios nuevos en asma/EPOC (posible infección); asma inducida por AINE/aspirina; infección activa en inmunodeprimido (trasplante).
- **Validar antes (amarillo):** TVP o TEP de menos de 3 meses; arritmia con palpitaciones o síncope recientes; bloqueo cardiaco sin marcapasos; hipertensión pulmonar; tensión ≥ 180/110 en la consulta; asma no controlada o inducida por AINE; oxigenoterapia domiciliaria; STOP-Bang ≥ 5 sin diagnóstico de SAOS, o SAOS sin CPAP; hipoglucemias frecuentes o inadvertidas; feocromocitoma o insuficiencia suprarrenal, y dosis de estrés de corticoides; enfermedad renal en diálisis o filtrado < 15; cirrosis con ascitis, varices o encefalopatía; hemoglobina < 10, plaquetopenia/coagulopatía o HEMSTOP positivo; Testigo de Jehová o rechazo de hemoderivados; enfermedad neuromuscular; epilepsia no controlada; deterioro cognitivo sin capacidad de consentir; hipertermia maligna o déficit de pseudocolinesterasa, reacción previa en quirófano, alergia al látex; intubación difícil previa, EGRI ≥ 4, limitación cervical, radioterapia o tumor cervical; posibilidad de embarazo, preeclampsia/HTA gestacional, plaquetopenia (< 80.000/µL, con nota «condiciona la técnica neuroaxial») o placenta previa/acretismo (y, con cesárea previa, riesgo alto de acretismo); prematuro con edad posconcepcional < 60 semanas (o, si no se conocen las semanas al nacer, lactante < 12 meses: «edad gestacional desconocida»), STBUR ≥ 3, cardiopatía congénita; cocaína en la última semana; AUDIT-C ≥ 8; capacidad funcional < 4 METs o fragilidad (CFS ≥ 5) en cirugía de riesgo alto; trasplante reciente (< 6 meses) o niveles de inmunosupresores fuera de rango; miocardiopatía sintomática; brote reciente de esclerosis múltiple; además de los puntos propios de los dispositivos cardiacos implantables (§5.1 bis).

Toda condición de esta lista está anclada a un disparador: una condición de módulo (`moduloId.preguntaId`) o un hecho con nombre (escala, hecho clínico, dato del paso 1, de alergias, de antecedentes o de la vía aérea). Preguntas añadidas como **opcionales** para completar la lista: insuficiencia cardiaca (ingreso reciente, empeoramiento reciente); valvulopatía (estenosis aórtica grave sintomática); HTA (tensión en consulta); fibrilación auricular (síncope/palpitaciones recientes, bloqueo sin marcapasos); enfermedades endocrinas (feocromocitoma, insuficiencia suprarrenal — el módulo de tiroides pasa a «Enfermedades endocrinas»); obstetricia (preeclampsia/HTA gestacional y plaquetas de la última analítica, en el paso de datos básicos); Testigo de Jehová (datos básicos) y cocaína en la última semana (hábitos). El prematuro con edad posconcepcional < 60 semanas se calcula con las semanas de gestación al nacer (ya existentes en pediatría) y la edad en meses del paso 3.

## 14. Herramientas del servicio

### 14.1 Panel de administración de contenido
Sección accesible desde un enlace discreto. Permite ver y editar en tablas y formularios `farmacos.csv`, `procedimientos.csv`, `reglas_farmacos.json`, `modulos/*.json`, `plantillas_sap.json`, `opioides.json`, `coherencia.json` y los textos. Valida en tiempo real y descarga el fichero corregido, listo para subir al repositorio (el panel no escribe en GitHub). Muestra un diff con la versión publicada. Incluye instrucciones paso a paso para subir el fichero desde la web de GitHub y para cambiar la versión del contenido en `config.json`. Evita que tengamos que editar CSV en Excel.

### 14.2 Modo entrenamiento
Carga casos de `casos_entrenamiento/` (los de la sección 15 y los que añadamos) con la entrevista rellenada y resultados esperados. Banda visible «ENTRENAMIENTO» en todas las pantallas y salidas. Se puede comparar lo que ha contestado la enfermera con lo esperado.

### 14.3 Cuadro de mando de uso
Contador guardado solo en el navegador del dispositivo, sin datos clínicos ni identificadores: fecha, hora de inicio, duración, modalidad (presencial o telefónica), tipo de paciente (adulto, pediátrico, obstétrica) y riesgo quirúrgico. Gráficas por día, semana y mes, tiempo medio por entrevista, exportación a CSV y botón de borrado. No cuenta las entrevistas del modo entrenamiento.

### 14.4 Guía imprimible en blanco
Genera, a partir de los módulos, un PDF con el guion de preguntas por pasos y por patología y las casillas para anotar a mano, por si falla el equipo.

## 15. Pruebas automatizadas

Pruebas unitarias de cada escala y cada regla, y de extremo a extremo con estos casos (añade los que veas necesarios). Todos se incluyen también como casos de entrenamiento.

1. Varón de 72 años, 80 kg, HTA y diabetes, FA con apixabán 5 mg/12 h, aclaramiento 45 mL/min, prótesis de rodilla con raquídea. Apixabán: 72 h. CHA2DS2-VA 3.
2. Mujer de 58 años, dabigatrán 150 mg/12 h, aclaramiento 40 mL/min, colecistectomía laparoscópica con anestesia general. Dabigatrán: 48 + 48 = 96 h.
3. Stent farmacoactivo hace 4 meses tras síndrome coronario agudo, AAS más ticagrelor, hernioplastia inguinal. Alerta de diferir, requiere confirmación, sin pauta de suspensión en la hoja del paciente.
4. DM2 con semaglutida semanal, empagliflozina y metformina, cirugía intermedia. Omitir una dosis de semaglutida, dieta líquida de 24 h con anexo para diabéticos, empagliflozina 3 días, metformina el día de la cirugía.
5. Catarata con anestesia tópica y acenocumarol: no suspender.
6. Vitrectomía con clopidogrel en monoterapia: sustituir por AAS 100 mg/día y suspender clopidogrel 5 días.
7. Prótesis de cadera con raquídea y ticagrelor: 7 días.
8. Niño de 5 años, amigdalectomía, ronquido y apneas: ayuno pediátrico, POVOC, STBUR ≥ 3 con alerta, sin STOP-Bang.
9. Adulto con madre venezolana: alerta roja mtND4 y texto neutro en la hoja del paciente.
10. Apertura bucal 3,5 cm, distancia tiromentoniana 5,5 cm, Mallampati III, 95 kg, resto normal: EGRI 6, riesgo elevado.
11. Mujer de 45 años sana, tumorectomía con anestesia general: ninguna prueba. La misma con bloqueo paravertebral previsto: hemograma y coagulación. La misma con HEMSTOP de 2 positivos: coagulación.
12. Warfarina por prótesis mitral mecánica, 80 kg: puente con enoxaparina 80 mg/12 h, última dosis la mañana del día previo; requiere confirmación.
13. Litio y cirugía de alto riesgo: 72 h.
14. Sin hora de cirugía: cálculo con las 08:00 y aviso.
15. Intervención dentro de 3 días con clopidogrel: plazo no alcanzable, alerta y requiere confirmación.
16. Oxicodona 20 mg/12 h más tramadol 100 mg/8 h: 60 + 60 = 120 mg/día de morfina oral, alerta alta y derivación a dolor transicional.
17. Mujer de 78 años, CFS 6, 4AT 2, Hb 11,5, artroplastia de cadera: alertas de fragilidad, riesgo de delirium y anemia, ferritina; apartado de prehabilitación solo si `prehabilitacion_activa = true`.
18. AUDIT-C 9 en varón: alerta de abstinencia y hoja de alcohol.
19. Codificar y decodificar los QR de todos los casos sin pérdida; tamaño dentro del límite; enlace caducado que no muestra datos; aviso de versión de contenido distinta.
20. Fármaco no catalogado escrito a mano: mantener y consultar.
21. `farmacos.csv` con una regla inexistente: la aplicación no deja empezar y señala la fila.
22. Enalapril añadido sin HTA ni insuficiencia cardiaca marcadas: tarjeta de coherencia con las indicaciones posibles; al elegir HTA se abre el módulo sin marcarlo hasta confirmar. Fibrilación auricular marcada sin anticoagulante: tarjeta inversa. Diabetes sin HbA1c: tarjeta de dato que falta.
23. Comprobación de que tras una entrevista completa no queda ningún dato clínico en localStorage, sessionStorage, IndexedDB, cookies ni caché del service worker.

## 16. Entregables

- Repositorio `fernigear-spec/preanestesia` con código, datos iniciales, pruebas y despliegue automático en GitHub Pages (GitHub Actions).
- `README.md` en español: cómo funciona el despliegue, cómo editar el contenido con el panel de administración o a mano, cómo añadir un fármaco, un procedimiento, un módulo, una plantilla de SAP o un caso de entrenamiento, cómo funcionan los QR y sus límites.
- `CONTENIDO_CLINICO.md` generado automáticamente a partir de los datos, con todas las reglas en lenguaje legible y su fuente, para que el servicio lo revise y firme.

## Anexo A. Catálogo inicial de fármacos

Crea `farmacos.csv` con estos fármacos. En todas las filas, `verificado_cima = no`: antes del uso clínico revisaremos cada nombre comercial en CIMA (AEMPS). No inventes nombres comerciales fuera de esta lista; si crees que falta alguno relevante, anótalo como sugerencia al final de `requirements.md`. Añade una fila genérica por principio activo.

Anticoagulantes: acenocumarol (Sintrom); warfarina (Aldocumar); dabigatrán (Pradaxa); rivaroxabán (Xarelto); apixabán (Eliquis); edoxabán (Lixiana); enoxaparina (Clexane, Inhixa); bemiparina (Hibor); tinzaparina (Innohep); dalteparina (Fragmin); nadroparina (Fraxiparina); fondaparinux (Arixtra); heparina sódica (genérico, uso hospitalario).

Antiagregantes: ácido acetilsalicílico (Adiro, Tromalyt); clopidogrel (Plavix, Iscover); prasugrel (Efient); ticagrelor (Brilique); dipiridamol (Persantin); triflusal (Disgren); cilostazol (Pletal); eptifibatida (Integrilin); tirofibán (Aggrastat); cangrelor (Kengrexal).

Glucosaminoglucanos: sulodexida (Aterina).

Antidiabéticos: metformina (Dianben); sitagliptina (Januvia, Tesavel, Xelevia); vildagliptina (Galvus, Jalra); linagliptina (Trajenta); saxagliptina (Onglyza); alogliptina (Vipidia); sitagliptina + metformina (Janumet, Velmetia, Efficib); vildagliptina + metformina (Eucreas, Icandra); linagliptina + metformina (Jentadueto); gliclazida (Diamicron); glimepirida (Amaryl); glibenclamida (Daonil); glipizida (Minodiab); repaglinida (Novonorm); nateglinida (Starlix); pioglitazona (Actos); empagliflozina (Jardiance); dapagliflozina (Forxiga); canagliflozina (Invokana); ertugliflozina (Steglatro); empagliflozina + metformina (Synjardy); dapagliflozina + metformina (Xigduo); empagliflozina + linagliptina (Glyxambi).

GLP-1 y GIP/GLP-1: semaglutida semanal (Ozempic, Wegovy); semaglutida oral diaria (Rybelsus); liraglutida diaria (Victoza, Saxenda); dulaglutida semanal (Trulicity); exenatida (Byetta, dos veces al día; Bydureon, semanal); lixisenatida diaria (Lyxumia); tirzepatida semanal (Mounjaro); insulina degludec + liraglutida (Xultophy); insulina glargina + lixisenatida (Suliqua).

Insulinas: glargina (Lantus, Abasaglar, Toujeo); detemir (Levemir); degludec (Tresiba); NPH (Insulatard, Humulina NPH); lispro (Humalog); aspart (NovoRapid, Fiasp); glulisina (Apidra); regular (Actrapid, Humulina Regular); premezcladas (NovoMix 30, Humalog Mix 25, Humalog Mix 50).

IECA, ARA-II y ARNI: enalapril (Renitec, Eupressin); lisinopril (Zestril, Prinivil); ramipril (Acovil); perindopril (Coversyl); captopril (Capoten); losartán (Cozaar); valsartán (Diovan); candesartán (Atacand, Parapres); irbesartán (Aprovel, Karvea); olmesartán (Olmetec, Openvas, Ixia); telmisartán (Micardis, Pritor); eprosartán; sacubitrilo + valsartán (Entresto).

Otros cardiovasculares: bisoprolol (Emconcor); atenolol (Tenormin); carvedilol (Coropres); nebivolol (Lobivon); metoprolol (Beloken); amlodipino (Norvas); diltiazem (Masdil); verapamilo (Manidon); furosemida (Seguril); torasemida (Sutril); hidroclorotiazida (Esidrex); espironolactona (Aldactone); eplerenona (Elecor); amiodarona (Trangorex); digoxina; atorvastatina (Cardyl, Zarator); rosuvastatina (Crestor); simvastatina (Zocor).

AINE: ibuprofeno (Espidifen, Dalsy, Neobrufen); naproxeno (Naprosyn, Antalgin); diclofenaco (Voltaren); dexketoprofeno (Enantyum); ketorolaco (Toradol, Droal); celecoxib (Celebrex); etoricoxib (Arcoxia).

Opioides: morfina (MST Continus, Sevredol); codeína; tramadol (Adolonta, Zaldiar con paracetamol); tapentadol (Palexia); oxicodona (Oxycontin, Oxynorm, Targin con naloxona); hidromorfona (Jurnista); fentanilo transdérmico (Durogesic); buprenorfina (Transtec, Feliben, Suboxone); metadona.

Psicofármacos y neurología: tranilcipromina (Parnate); moclobemida (Manerix); fenelzina e isocarboxazida (solo principio activo, probablemente no comercializados en España); rasagilina (Azilect); selegilina (Plurimen); safinamida (Xadago); litio (Plenur); levodopa + carbidopa (Sinemet).

Inmunosupresores y reumatología: azatioprina (Imurel); ciclosporina (Sandimmun Neoral); tacrolimus (Prograf, Advagraf, Envarsus); micofenolato (CellCept, Myfortic); metotrexato (Metoject, Imeth, Bertanel, Nordimet); leflunomida (Arava); hidroxicloroquina (Dolquine); sulfasalazina (Salazopyrina); tofacitinib (Xeljanz); baricitinib (Olumiant); upadacitinib (Rinvoq); adalimumab (Humira, Amgevita, Hyrimoz, Imraldi, Idacio, Hulio, Yuflyma); etanercept (Enbrel, Benepali, Erelzi); infliximab (Remicade, Inflectra, Remsima); certolizumab (Cimzia); golimumab (Simponi); tocilizumab (RoActemra); abatacept (Orencia); rituximab (MabThera, Truxima, Rixathon); secukinumab (Cosentyx); ustekinumab (Stelara).

Oncológicos: imatinib (Glivec); dasatinib (Sprycel); nilotinib (Tasigna); erlotinib (Tarceva); sorafenib (Nexavar); sunitinib (Sutent); cetuximab (Erbitux); bevacizumab (Avastin, Mvasi, Zirabev); aflibercept oncológico (Zaltrap); aflibercept intravítreo (Eylea, regla «mantener»); ramucirumab (Cyramza).

Combinaciones antihipertensivas: candesartán + hidroclorotiazida (Atacand Plus, Parapres Plus); perindopril + amlodipino (Viacoram); olmesartán + amlodipino (Sevikar). Otras combinaciones de antidiabéticos e insulinas: dapagliflozina + saxagliptina (Qtern); empagliflozina + metformina + linagliptina (Trijardy); insulina degludec + aspart (Ryzodeg).

Hormonas y otros: levotiroxina (Eutirox, Levothroid); prednisona (Dacortin); metilprednisolona (Urbason); hidrocortisona (Hidroaltesona); anticonceptivos hormonales combinados (fila de grupo); terapia hormonal sustitutiva (fila de grupo); omeprazol; pantoprazol; alopurinol (Zyloric).

Fitoterapia y suplementos: ginkgo, ajo, ginseng, kava, cúrcuma, vitamina E, omega 3, hipérico.

## Anexo B. Catálogo inicial de procedimientos

Crea `procedimientos.csv` con una lista amplia por especialidad (cirugía general, digestivo, urología, ginecología, traumatología, oftalmología, ORL, maxilofacial, plástica, vascular, torácica, neurocirugía, endoscopia, radiología intervencionista, obstetricia, pediatría). Riesgo cardiovascular según 7.1. Riesgo hemorrágico según EHRA 2021:
- Mínimo: extracciones dentarias de 1 a 3 piezas, cirugía periodontal, implantes simples, endoscopia sin biopsia, cirugía superficial (drenaje de abscesos, exéresis cutáneas pequeñas) y la oftalmología de riesgo bajo (catarata con anestesia tópica, chalazión y otras cirugías oftalmológicas menores).
- Bajo: endoscopia con biopsia, biopsia de próstata o vejiga, estudio electrofisiológico o ablación simple, angiografía no coronaria, implante de marcapasos o DAI, procedimientos dentales complejos, colecistectomía laparoscópica, hernioplastia laparoscópica, cirugía colorrectal no oncológica, artroscopia.
- Alto: cirugía cardiaca, revascularización arterial periférica, intervenciones cardiológicas complejas, neurocirugía, punción lumbar, técnicas neuroaxiales, endoscopia compleja (polipectomía, CPRE con esfinterotomía), cirugía abdominal mayor (incluida biopsia hepática), cirugía torácica, urología mayor y biopsia renal, litotricia extracorpórea, ortopedia mayor.

Oftalmología de riesgo moderado o alto: catarata con bloqueo retrobulbar, cirugía palpebral, cirugía lagrimal (dacriocistorrinostomía, dacriocistectomía), queratoplastia, evisceración y enucleación, glaucoma y cerclajes, retina (vitrectomía y otras), estrabismo, descompresión orbitaria y cirugía tumoral.

Técnica neuroaxial o bloqueo profundo probable: cirugía de miembro inferior y cadera, urología baja, cesárea, cirugía perineal y proctológica.

Riesgo trombótico alto (regla de anticonceptivos y THS): artroplastia de cadera y rodilla, fractura de cadera, cirugía oncológica mayor abdominal o pélvica, neurocirugía, cirugía con inmovilización prolongada prevista.
