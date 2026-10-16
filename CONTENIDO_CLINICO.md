# Contenido clínico

> **Documento generado automáticamente** a partir de los datos (`datos/`) y de la lógica del programa.
> Describe **lo que hace la aplicación** —plazos, condiciones, excepciones, confirmaciones, alertas y los textos que ve el paciente— para que el Servicio de Anestesiología lo revise y lo firme. No sustituye al juicio clínico.
>
> **Versión de contenido:** 0.1.0 · **Fecha de revisión clínica:** 2026-09-29
>
> Regenerar: `npm run contenido:clinico`.

## Índice

- 1. Parámetros de configuración
- 2. Convenciones del motor (fechas y adelanto de anticoagulantes)
- 3. Reglas de medicación
- 4. Textos que ve el paciente (muestras)
- 5. Fecha desconocida y recálculo
- 6. Mecanismo de confirmación del anestesiólogo
- 7. Ayuno y hojas anexas
- 8. Sugammadex y anticoncepción
- 9. Cribado mitocondrial mtND4
- 10. ASA sugerido
- 11. Escalas y cálculos
- 12. Clase de riesgo del paciente y pruebas complementarias
- 13. Catálogo de fármacos
- 14. Conversión de opioides
- 15. Procedimientos
- 16. Módulos de enfermedad
- 16 ter. Dispositivos cardiacos implantables
- 16 bis. Puntos de validación clínica
- 17. Pendiente de revisión por el servicio

## Decisiones del servicio (30/09/2026)

_Cambios acordados por el servicio en esta revisión, ya aplicados en el contenido y el comportamiento._

- **Orden de la entrevista (12 pasos):** intervención, datos básicos, alergias, antecedentes, hábitos, enfermedades y hemostasia, técnica anestésica prevista, medicación, vía aérea, consentimiento, origen materno (mtND4) y resultados.
- **Técnica anestésica en un paso propio (paso 7):** si se cambia, las reglas de medicación y las salidas se recalculan; la medicación introducida se conserva al volver.
- **Oftalmología:** la técnica decide el grupo de la catarata (tópica = riesgo bajo; retrobulbar o peribulbar = moderado-alto; sin técnica, moderado-alto y se indica). La oftalmología de riesgo moderado-alto se trata como riesgo hemorrágico alto para los anticoagulantes (§8.1-8.3).
- **Se retira el «carácter» de la intervención y el sufijo «E» del ASA** (ya no se recoge la urgencia).
- **Condiciones especiales (§5.15):** la hipertermia maligna y el déficit de pseudocolinesterasa (personales y familiares) se recogen en el paso de enfermedades, no en antecedentes.
- **Riesgo quirúrgico según la ESC 2022** (sustituye a la clasificación previa de §7.1).
- **AAS (§8.2):** se mantiene salvo espacio cerrado, cirugía de retina o técnica neuroaxial (suspender 5 días); en prevención cardiovascular se confirma y se mantienen 100 mg.
- **HBPM (§8.4):** clasificación profiláctica/terapéutica con dosis, pauta, peso y aclaramiento (tablas SETH por heparina; márgenes ±20 %).
- **Texto para SAP (§10.1):** solo antecedentes patológicos y quirúrgicos, sin límite de caracteres; el resto se rellena con los desplegables del SAP.
- **Codificación del efecto por respuesta (§5.16):** cada respuesta que genera un efecto lo declara en el campo `genera` de su pregunta (véase §16), validado y protegido por un test de cobertura.

## 1. Parámetros de configuración

| Parámetro | Valor |
| --- | --- |
| Borrado por inactividad | 30 min |
| Edad pediátrica máxima | 17 años |
| Validez del QR del paciente (con/sin fecha) | 30 / 90 días |

## 2. Convenciones del motor (fechas y adelanto de anticoagulantes) — §8.0

- Los **plazos en horas** (ACOD, heparinas, fondaparinux, litio, moclobemida, AINE, dipiridamol, sulodexida, GP IIb/IIIa) se cuentan desde la última toma hasta la hora prevista de la intervención. Una toma que cae exactamente en el límite está permitida.
- Los **plazos en días** (antivitamina K, AAS, P2Y12, triflusal, cilostazol, SGLT2, JAK, fitoterapia, IMAO irreversibles): «suspender N días» significa no tomarlo los N días previos ni el día de la intervención.
- **Adelanto de anticoagulantes** (plazo en horas): si la primera toma posterior al límite cae como máximo 10 h después, la hoja indica **adelantarla** a la hora límite («el lunes, tome la dosis a las 08:00 en lugar de a las 09:00; será la última»), siempre que quede al menos la mitad del intervalo desde la toma anterior (6 h en pautas cada 12 h; 12 h en pautas cada 24 h). Si no, la última toma es la anterior permitida. Nunca se atrasa una toma; en el resto de fármacos no se adelantan tomas.
- La fecha/hora límite se traduce a lenguaje del paciente con el **día de la semana**.
- **Combinaciones fijas** (una sola pastilla): una instrucción por medicamento con el plazo más restrictivo de sus componentes. Si la combinación retira la metformina antes de su plazo, nota de vigilar la glucemia.
- Cada regla guarda su **fuente** (protocolo del servicio o guía: ESC 2022/2024, CPOC, ACR 2022, CDC 2022, ASRA 2018, EHRA 2021).

**Bloqueos considerados profundos:** paravertebral, plexo lumbar, compartimento psoas, plexo cervical profundo, intercostal.

## 3. Reglas de medicación

_Cada regla, en lenguaje llano, con su fuente. Los números salen de `datos/reglas_farmacos.json`._

### 3.1. Umbrales de la HBPM (tablas SETH, §8.4)

La HBPM se clasifica en profiláctica o terapéutica con **dosis, pauta, peso y aclaramiento** (no solo la dosis). Si no encaja en ninguna tabla, la aplicación pregunta. Ejemplos: enoxaparina 60 mg/24 h en 90 kg es profilaxis; 40 mg/12 h en 110 kg es profilaxis; 1 mg/kg/12 h es tratamiento; 1 mg/kg/24 h con aclaramiento < 30 es tratamiento.

| Heparina | Profilaxis | Tratamiento |
| --- | --- | --- |
| enoxaparina | ≤ 1 mg/kg/día | ≥ 1.5 mg/kg/día (≥ 1 con aclaramiento < 30) |
| tinzaparina | ≤ 3500 UI/día (< 60 kg) · ≤ 4500 UI/día (≥ 60 kg) | 175 UI/kg/día |
| bemiparina | ≤ 3500 UI/día (≤ 2500 con aclaramiento < 30) | 115 UI/kg/día (85 con aclaramiento < 30) |
| nadroparina | ≤ 2850 UI/día | 172 UI/kg/día · contraindicado con aclaramiento < 30 |
| dalteparina | ≤ 5000 UI/día | 200 UI/kg/día · confirmar con aclaramiento < 30 |

### 3.2. Reglas por fármaco o grupo

#### `avk_warfarina` — Antivitamina K

Antivitamina K (warfarina): suspender 5 días antes. No se suspende en cirugía oftalmológica de bajo riesgo ni si el riesgo hemorrágico es mínimo. Con alto riesgo tromboembólico (válvula mecánica, etc.) se valora terapia puente con HBPM y requiere confirmación del anestesiólogo.

_Fuente: docs/documento_fuente.md §8.1 (protocolo del servicio)_

#### `avk_acenocumarol` — Antivitamina K

Antivitamina K (acenocumarol/Sintrom): suspender 3 días antes. No se suspende en cirugía oftalmológica de bajo riesgo ni si el riesgo hemorrágico es mínimo. Con alto riesgo tromboembólico se valora terapia puente con HBPM y requiere confirmación.

_Fuente: docs/documento_fuente.md §8.1 (protocolo del servicio)_

#### `acod_dabigatran` — ACOD

ACOD dabigatrán: la última toma se fija en HORAS antes, no en plazos absolutos, ajustadas por función renal. Riesgo hemorrágico bajo: 48 h; alto o técnica neuroaxial: 72 h. Con neuroaxial se alarga por aclaramiento (72 h si >80, 96 h si 50-80, 120 h si <50 mL/min). No se suspende en oftalmología de bajo riesgo.

_Fuente: docs/documento_fuente.md §8.2 (protocolo del servicio; EHRA 2021)_

#### `acod_antixa` — ACOD

ACOD anti-Xa (apixabán, rivaroxabán, edoxabán): última toma 48 h antes con riesgo hemorrágico bajo; 72 h con riesgo alto o técnica neuroaxial. Con aclaramiento < 30 mL/min se añaden horas (24 h más; 96 h con neuroaxial). Si falta el aclaramiento, requiere confirmación. No se suspende en oftalmología de bajo riesgo.

_Fuente: docs/documento_fuente.md §8.2 (protocolo del servicio; EHRA 2021)_

#### `aas` — AAS

Ácido acetilsalicílico: se mantiene si la dosis diaria es ≤ 200 mg. Con dosis alta se suspende 7 días antes. En neurocirugía intracraneal o medular y en cirugía de espacio cerrado requiere confirmación aunque la indicación sea cardiovascular.

_Fuente: docs/documento_fuente.md §8.3 (ESC 2022)_

#### `p2y12_clopidogrel` — Antiagregante P2Y12

Clopidogrel: suspender 5 días antes (7 días con técnica neuroaxial o bloqueo profundo). En portador de stent o en monoterapia sin AAS, requiere confirmación del anestesiólogo. Stent reciente: alerta de diferir la cirugía.

_Fuente: docs/documento_fuente.md §8.3 (protocolo del servicio)_

#### `p2y12_ticagrelor` — Antiagregante P2Y12

Ticagrelor: suspender 5 días antes (7 días con neuroaxial o bloqueo profundo). En portador de stent o monoterapia sin AAS, requiere confirmación.

_Fuente: docs/documento_fuente.md §8.3 (protocolo del servicio)_

#### `p2y12_prasugrel` — Antiagregante P2Y12

Prasugrel: suspender 7 días antes (10 días con neuroaxial o bloqueo profundo). En portador de stent o monoterapia sin AAS, requiere confirmación.

_Fuente: docs/documento_fuente.md §8.3 (protocolo del servicio)_

#### `triflusal` — Plazo fijo en días

Triflusal: suspender 7 días antes (10 días con neuroaxial o bloqueo profundo).

_Fuente: docs/documento_fuente.md §8.3_

#### `dipiridamol` — Plazo fijo en horas

Dipiridamol: última toma 24 h antes (48 h con neuroaxial o bloqueo profundo).

_Fuente: docs/documento_fuente.md §8.3_

#### `cilostazol` — Según riesgo hemorrágico

Cilostazol: se mantiene salvo riesgo hemorrágico alto o técnica neuroaxial, en cuyo caso se suspende 3 días antes.

_Fuente: docs/documento_fuente.md §8.3_

#### `sulodexida` — Según riesgo hemorrágico

Sulodexida: se mantiene salvo riesgo hemorrágico alto o neuroaxial (última dosis 48 h antes). No interviene en la decisión de pruebas complementarias.

_Fuente: docs/documento_fuente.md §8.3_

#### `aine_ibuprofeno` — AINE

Ibuprofeno (AINE): suspender 24 h antes.

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_naproxeno` — AINE

Naproxeno (AINE): suspender 72 h antes (vida media larga).

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_diclofenaco` — AINE

Diclofenaco (AINE): suspender 24 h antes.

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_dexketoprofeno` — AINE

Dexketoprofeno (AINE): suspender 24 h antes.

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_ketorolaco` — AINE

Ketorolaco (AINE): suspender 24 h antes.

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_celecoxib` — AINE (coxib): mantener

Celecoxib (COX-2): se mantiene (no afecta a la agregación plaquetaria).

_Fuente: docs/documento_fuente.md §8.6_

#### `aine_etoricoxib` — AINE (coxib): mantener

Etoricoxib (COX-2): se mantiene (no afecta a la agregación plaquetaria).

_Fuente: docs/documento_fuente.md §8.6_

#### `metformina` — Antidiabético: no el día

Metformina: no tomar el día de la intervención. Con contraste yodado, suspender 48 h. En combinaciones fijas que la retiran antes de su plazo, nota de vigilar la glucemia.

_Fuente: docs/documento_fuente.md §8.5 (protocolo; CPOC)_

#### `sulfonilurea` — Antidiabético: no el día

Sulfonilurea: no tomar el día de la intervención (riesgo de hipoglucemia en ayunas).

_Fuente: docs/documento_fuente.md §8.5_

#### `glinida` — Antidiabético: no el día

Glinida: no tomar el día de la intervención.

_Fuente: docs/documento_fuente.md §8.5_

#### `dpp4` — Antidiabético: no la mañana

Inhibidor DPP-4: no tomar la mañana de la intervención.

_Fuente: docs/documento_fuente.md §8.5_

#### `pioglitazona` — Antidiabético: no el día

Pioglitazona: no tomar el día de la intervención.

_Fuente: docs/documento_fuente.md §8.5_

#### `sglt2` — SGLT2

Inhibidor SGLT2: suspender 3 días antes (4 días la ertugliflozina) por el riesgo de cetoacidosis euglucémica.

_Fuente: docs/documento_fuente.md §8.5_

#### `glp1_semanal` — GLP-1 semanal

Agonista GLP-1 semanal: la última dosis debe ser al menos 7 días antes de la intervención; si la siguiente cae dentro de esos 7 días, se omite. Dieta líquida las 24 h previas.

_Fuente: docs/documento_fuente.md §8.5 (Decisión 8)_

#### `glp1_diario` — GLP-1 diario

Agonista GLP-1 diario: la última dosis 4 días antes de la intervención.

_Fuente: docs/documento_fuente.md §8.5 (Decisión 8)_

#### `bomba_insulina` — Bomba de insulina

Bomba de insulina: mantener la basal al 80 %. En régimen con ingreso o riesgo cardiovascular intermedio o alto, requiere confirmación del anestesiólogo.

_Fuente: docs/documento_fuente.md §8.5 (Decisión 6)_

#### `insulina_glp1_fija` — Requiere confirmación

Combinación fija insulina basal + GLP-1: requiere confirmación (omitir el GLP-1 dejaría sin insulina basal).

_Fuente: docs/documento_fuente.md §8.5_

#### `litio` — Litio

Litio: última toma 24 h antes con riesgo cardiovascular bajo; 48 h con intermedio; 72 h con alto.

_Fuente: docs/documento_fuente.md §8.7_

#### `ieca_ara2` — IECA/ARA-II

IECA / ARA-II: no tomar el día de la intervención. Excepción: si el motivo es insuficiencia cardiaca con disfunción sistólica, infarto reciente o proteinuria/nefropatía, se mantiene.

_Fuente: docs/documento_fuente.md §8.10 (ESC 2022)_

#### `sacubitrilo_valsartan` — Requiere confirmación

Sacubitrilo/valsartán (Entresto): requiere confirmación del anestesiólogo.

_Fuente: docs/documento_fuente.md §8.10_

#### `corticoide_sistemico` — Mantener

Corticoide sistémico: se mantiene; valorar dosis de estrés perioperatoria si equivale a ≥ 5 mg/día de prednisona más de 3 semanas.

_Fuente: docs/documento_fuente.md §8.11 / §5.3_

#### `diuretico` — No la mañana

Diurético: no tomar la mañana de la intervención.

_Fuente: docs/documento_fuente.md §8.10_

#### `hbpm` — HBPM

HBPM: profiláctica → última dosis 12 h antes; terapéutica → 24 h antes. La clasificación (profiláctica/terapéutica) usa dosis, pauta, peso y aclaramiento (tablas SETH); si no encaja, se pregunta. En dosis terapéutica, nota de valorar anti-Xa si hay dudas.

_Fuente: docs/documento_fuente.md §8.4 (SETH; ASRA 2018)_

#### `heparina_sodica` — Heparina sódica

Heparina sódica intravenosa: uso hospitalario; se suspende 4-6 h antes.

_Fuente: docs/documento_fuente.md §8.4_

#### `fondaparinux` — Fondaparinux

Fondaparinux: profiláctico 36 h antes (48 h con neuroaxial, bloqueo profundo o alto riesgo hemorrágico; contraindicado con aclaramiento < 20, alerta). Terapéutico 48 h antes (72 h con neuroaxial, bloqueo profundo, alto riesgo hemorrágico o aclaramiento < 50).

_Fuente: docs/documento_fuente.md §8.4_

#### `gp_iibiiia` — GP IIb/IIIa

Inhibidor de la glicoproteína IIb/IIIa: requiere confirmación (uso hospitalario).

_Fuente: docs/documento_fuente.md §8.3_

#### `insulina_basal` — Insulina basal

Insulina basal (glargina, degludec, detemir): la dosis de la noche previa y la de la mañana de la intervención, al 80 %.

_Fuente: docs/documento_fuente.md §8.5_

#### `insulina_nph` — Insulina NPH

Insulina NPH: dosis de la noche previa completa; la de la mañana de la intervención, al 50 %.

_Fuente: docs/documento_fuente.md §8.5_

#### `insulina_rapida` — Insulina rápida

Insulina rápida: no ponerse la dosis del desayuno el día de la intervención; solo pauta correctora según la glucemia.

_Fuente: docs/documento_fuente.md §8.5_

#### `insulina_premezclada` — Insulina premezclada

Insulina premezclada: la dosis de la mañana de la intervención, al 50 %.

_Fuente: docs/documento_fuente.md §8.5_

#### `imao_irreversible` — IMAO irreversible

IMAO irreversible: suspender 10-14 días antes; requiere confirmación. Nota: evitar meperidina y azul de metileno (riesgo de síndrome serotoninérgico).

_Fuente: docs/documento_fuente.md §8.7_

#### `moclobemida` — Moclobemida

Moclobemida (IMAO reversible): última toma 24 h antes. Nota: precaución con fármacos serotoninérgicos y meperidina.

_Fuente: docs/documento_fuente.md §8.7_

#### `imao_b` — IMAO-B

IMAO-B (selegilina, rasagilina): se mantiene, con nota al anestesiólogo.

_Fuente: docs/documento_fuente.md §8.7_

#### `inmunosupresor_clasico` — Inmunosupresor clásico

Inmunosupresor clásico: la conducta depende de la indicación. En enfermedad autoinmune, suspender 2 días antes; en trasplante, mantener. Requiere confirmación según la indicación.

_Fuente: docs/documento_fuente.md §8.8 (ACR 2022)_

#### `metotrexato` — Metotrexato

Metotrexato: se mantiene si la dosis semanal es < 20 mg; con ≥ 20 mg/semana, valorar según la función renal.

_Fuente: docs/documento_fuente.md §8.8 (ACR 2022)_

#### `fame_mantener` — FAME (mantener)

FAME que se mantiene (hidroxicloroquina, sulfasalazina, etc.).

_Fuente: docs/documento_fuente.md §8.8 (ACR 2022)_

#### `jak` — Inhibidor JAK

Inhibidor JAK (tofacitinib, baricitinib, etc.): suspender 3 días antes.

_Fuente: docs/documento_fuente.md §8.8 (ACR 2022)_

#### `biologico` — Biológico

Fármaco biológico: requiere confirmación; se procura programar la cirugía a mitad del intervalo entre dosis.

_Fuente: docs/documento_fuente.md §8.8_

#### `tirosina_cinasa` — Tirosina-cinasa

Inhibidor de la tirosina-cinasa: valorar la suspensión perioperatoria según el fármaco; consultar con el anestesiólogo.

_Fuente: docs/documento_fuente.md §8.9_

#### `antiangiogenico` — Antiangiogénico

Antiangiogénico (bevacizumab y similares): retrasar la cirugía 6-8 semanas desde la última dosis; requiere confirmación (alerta).

_Fuente: docs/documento_fuente.md §8.9_

#### `antiangiogenico_intravitreo` — Mantener

Antiangiogénico intravítreo: se mantiene (no afecta a la cirugía).

_Fuente: docs/documento_fuente.md §8.9_

#### `fitoterapia` — fitoterapia

Fitoterapia y suplementos con efecto sobre la coagulación: suspender 14 días antes si es posible (mínimo 7).

_Fuente: docs/documento_fuente.md §8.11_

#### `anticonceptivo_ths` — anticonceptivo ths

Anticonceptivo hormonal / THS: en cirugía de riesgo trombótico alto, valorar suspender 4-6 semanas antes; requiere confirmación. Si no, se mantiene. En ambos casos, advertencia del sugammadex según la vía (oral: instrucciones de «dosis olvidada»; no oral: método de barrera 7 días).

_Fuente: docs/documento_fuente.md §8.11_

#### `mantener_generico` — Mantener

Se mantiene según su vía de administración; sin plazo de suspensión.

_Fuente: docs/documento_fuente.md §8_

#### `alfabloqueante_flacido` — Mantener (aviso oftálmico)

Alfabloqueante urológico (tamsulosina, silodosina): se mantiene; en cirugía oftalmológica, aviso del riesgo de síndrome de iris flácido intraoperatorio.

_Fuente: docs/documento_fuente.md §8_

#### `no_catalogado` — No catalogado

Fármaco no catalogado: mantener y consultar con el anestesiólogo.

_Fuente: docs/documento_fuente.md §8.0_

## 4. Textos que ve el paciente (muestras)

_Muestras con fecha de ejemplo: **martes 4 de noviembre de 2026 a las 08:00**. Los textos salen de `datos/textos/es/paciente.json` (y su traducción al catalán)._

| Situación | Texto para el paciente |
| --- | --- |
| Mantener (oral) | Siga tomándolo como siempre, también el día de la intervención, con un sorbo de agua. |
| Mantener (parche/transdérmica) | Siga con su parche como siempre, también el día de la intervención. |
| Mantener (subcutánea) | Siga con sus inyecciones como siempre. |
| No tomar el día de la intervención | No lo tome el día de la intervención. |
| Suspensión por días | Tome la última dosis el martes 4 de noviembre de 2026 a las 08:00. Después no vuelva a tomarlo hasta que se lo indiquen. (como mínimo 3 días antes de la intervención) |
| Suspensión con adelanto | El martes 4 de noviembre de 2026, tome la dosis a las 08:00 en lugar de a las 09:00. Será la última. Después no vuelva a tomarlo hasta que se lo indiquen. (como mínimo 3 horas antes de la intervención) |
| Margen sin fecha (días) | No lo tome los 3 días anteriores a la intervención ni ese mismo día. |
| Margen sin fecha (horas) | Su última toma debe ser como mínimo 48 horas antes de la hora de la intervención. |
| Requiere confirmación | Sobre Sintrom, el anestesiólogo le llamará para indicarle qué hacer. No lo cambie por su cuenta. |

## 5. Fecha desconocida y recálculo — §8.16

- Si aún no se conoce la fecha, las instrucciones se dan como **margen** («como mínimo 72 horas antes de la intervención») y **no se adelantan tomas**.
- El QR guarda el tipo de plazo (días/horas), la duración, el adelanto y si es anticoagulante, pero **no** fechas ni datos clínicos.
- Cuando el paciente recibe la fecha, abre de nuevo el enlace, la introduce y **se recalcula todo** con fechas concretas.
- Sin hora, se asume las **08:00** y la hoja avisa de que si cambia la fecha o la hora debe llamar.

## 6. Mecanismo de confirmación del anestesiólogo — §12

- Cualquier fármaco con `requiere_confirmacion = sí`, o cualquier regla que devuelva ese estado, queda **pendiente de confirmar**.
- Mientras no se confirme, **no se genera la hoja/QR del paciente**; la pantalla lo señala.
- El anestesiólogo confirma con su **nombre** (queda registrado) o marca «le llamaremos» (la hoja muestra la frase de que le llamarán).
- Casos típicos: AAS en neurocirugía/espacio cerrado, P2Y12 con stent o monoterapia, antivitamina K con puente, sacubitrilo/valsartán, biológicos, antiangiogénicos, bomba de insulina con ingreso o riesgo alto, HBPM que no encaja en las tablas.

## 7. Ayuno y hojas anexas — §8.14 y §8.14 bis

Las horas se calculan desde la hora prevista de inducción y se muestran como horas de reloj.

**Adulto sin factores de riesgo:** líquidos claros libres hasta 4 h antes (entre 4 y 2 h, máx. 400 mL; nada en las 2 h previas salvo medicación con un sorbo); comida ligera hasta 6 h; comida copiosa/grasa/proteica hasta 8 h; bebida de carbohidratos entre 2 y 3 h antes (salvo vaciamiento gástrico lento).

**Situaciones especiales:** diabetes (mismo ayuno; con gastroparesia, sólidos 8 h y premedicación con metoclopramida); GLP-1 semanal (líquidos claros 24 h, hoja anexa; si no se ha suspendido, alerta de estómago lleno); reflujo grave sintomático; bariátrica sintomática (sólidos 8 h + secuencia rápida); embarazo ≥ 20 semanas (ayuno individualizado); nutrición enteral; pediatría (líquidos 1 h, leche materna 3 h, fórmula/sólidos 6 h; fórmula 4 h en < 6 meses).

**Hojas anexas** (§8.14 bis): 1) líquidos claros 24 h (GLP-1 semanal sin diabetes); 2) líquidos claros 24 h en diabético (GLP-1 semanal con diabetes); 3) ayuno del diabético (diabetes sin GLP-1 semanal); 4) tabaco (si fuma); 5) alcohol (si el AUDIT-C es positivo). Ninguna menciona dosis; para la medicación remiten a la hoja de medicación.

## 8. Sugammadex y anticoncepción hormonal — §8.15

- En toda mujer con **anticonceptivo hormonal** (NO la terapia hormonal sustitutiva, que no es anticonceptiva) y posible anestesia general, la **hoja del paciente** incluye un aviso condicional (y las notas del anestesiólogo recuerdan informar a la paciente al alta si se usó sugammadex).
- **Anticonceptivo oral:** si se usa sugammadex, equivale a olvidar una toma → seguir las instrucciones de «dosis olvidada» del prospecto y usar además preservativo 7 días.
- **No oral** (implante, DIU hormonal, anillo, parche, inyectable): si se usa sugammadex, usar además preservativo durante **7 días**.
- El texto va en condicional («si durante la anestesia le administran…») e indica que el equipo de anestesia lo confirmará después de la intervención.

**Texto para el paciente (hoja), castellano:**

- Oral: Si durante la anestesia le administran un medicamento llamado sugammadex, el efecto sobre su anticonceptivo es como si hubiera olvidado una toma de la píldora. En ese caso, siga las instrucciones para una «toma olvidada» del prospecto de su anticonceptivo y, además, use preservativo durante los 7 días siguientes.
- No oral: Si durante la anestesia le administran un medicamento llamado sugammadex, su anticonceptivo puede perder eficacia unos días. En ese caso, use además preservativo durante los 7 días siguientes.
- Confirmación: Usted no sabe de antemano si se usará ese medicamento. El equipo de anestesia se lo confirmará después de la intervención.

## 9. Cribado mitocondrial mtND4 (SEDAR 2026) — §9

- Pregunta obligatoria a todos los pacientes, con guion respetuoso para la enfermera.
- **Alerta roja** si: test positivo; ascendencia venezolana materna directa; origen materno desconocido u ovodonación; o antecedentes familiares compatibles sin test.
- **Alerta informativa** si el test es negativo (variante ausente): decisión del anestesiólogo.
- Medidas (notas del anestesiólogo): si es diferible y hay test, hacer el estudio genético y diferir; si no, evitar halogenados (TIVA), purgar la máquina, priorizar regional, monitorizar profundidad y mantener normoxia/normocapnia/normotermia.
- En la hoja del paciente solo: «El anestesiólogo hablará con usted sobre este punto antes de la intervención».

## 10. ASA sugerido — §6.1

Cada respuesta de los módulos lleva una clase ASA mínima (ejemplos ASA 2020). El ASA sugerido es el máximo y se muestran las respuestas que lo determinan. Se puede modificar a mano; las salidas indican el valor final y si se ha modificado. El sufijo **E** de urgencia se ha retirado (decisión del servicio, 30/09/2026).

- ASA I: sano, no fumador, alcohol mínimo o nulo.
- ASA II: fumador activo, bebedor social, embarazo, IMC 30 a < 40, diabetes o HTA bien controladas, enfermedad pulmonar leve.
- ASA III: diabetes/HTA mal controladas, EPOC, IMC ≥ 40, dependencia de alcohol, marcapasos, FE moderadamente reducida, ERC en diálisis, infarto/ictus/stent de más de 3 meses.
- ASA IV: infarto/ictus/stent de menos de 3 meses, isquemia activa, disfunción valvular grave, FE gravemente reducida, ERC sin diálisis.

## 11. Escalas y cálculos — §6

Cada escala muestra la puntuación, la categoría y los componentes que suman.

- **EGRI (El-Ganzouri)** vía aérea: apertura bucal, distancia tiromentoniana, Mallampati, movilidad cervical, protrusión, peso e intubación difícil previa. **≥ 4: riesgo elevado** de laringoscopia difícil. En telefónica, EGRI parcial con aviso «exploración pendiente».
- **Langeron** (ventilación difícil con mascarilla): barba, IMC > 26, edéntulo, edad > 55, ronquido. **≥ 2: riesgo.**
- **STOP-Bang** (adultos sin SAOS diagnosticado): ronquido, cansancio, apneas, HTA, IMC > 35, edad > 50, cuello > 40 cm, varón. 0-2 bajo; 3-4 intermedio; **5-8 alto (alerta)**; también alto con ≥ 2 de los cuatro primeros más varón/IMC/cuello.
- **STBUR** (niños): 5 ítems de sueño. **≥ 3: riesgo (alerta); 5: alerta alta.**
- **Apfel** (NVPO adultos): mujer, no fumador, NVPO/cinetosis previas, opioides postoperatorios. 0=10 %, 1=20 %, 2=40 %, 3=60 %, 4=80 %.
- **POVOC** (NVPO niños): cirugía ≥ 30 min, edad ≥ 3, estrabismo, NVPO del niño o familiares. 0=9 %, 1=10 %, 2=30 %, 3=55 %, 4=70 %.
- **CHA₂DS₂-VA** (FA/flúter): IC 1, HTA 1, edad ≥ 75 = 2, diabetes 1, ictus/AIT/tromboembolismo 2, enfermedad vascular 1, edad 65-74 = 1. Informativo.
- **Capacidad funcional**: dos pisos y DASI; METs = (0,43 × DASI + 9,6) / 3,5. **Reducida: < 4 METs o DASI ≤ 34.**
- **Aclaramiento** (Cockcroft-Gault) con peso real; sin dato, las reglas dependientes del riñón lo indican y requieren confirmación.
- **AUDIT-C**: positivo ≥ 4 (hombres) o ≥ 3 (mujeres) → consejo y hoja de alcohol; **≥ 8: alerta de abstinencia**.
- **Fragilidad/delirium (≥ 65)**: CFS 1-9 (**≥ 5: fragilidad, alerta**); 4AT (0 improbable; **1-3 posible deterioro, alerta**; **≥ 4 posible delirium, alerta roja**).
- **Morfina equivalente** (§6.8): suma de dosis × factor (opioides.json). **≥ 50 mg/día: alerta; ≥ 90 mg/día: alerta alta.** Buprenorfina y metadona sin conversión.
- **HEMSTOP**: **≥ 2 positivo** → se pide coagulación aunque la tabla no lo pida, y alerta.

## 12. Clase de riesgo del paciente y pruebas complementarias — §7

**Clase de riesgo** (la más alta que asignen los módulos): bajo, bajo-moderado, moderado, alto.

**Tabla de decisión de pruebas** (§7.3):

| Cirugía | Prueba | Bajo | Bajo-moderado | Moderado | Alto |
| --- | --- | --- | --- | --- | --- |
| Bajo riesgo | Hemograma y coagulación | No* | Sí | Sí | Sí |
| Bajo riesgo | Bioquímica | No | Sí | Sí | Sí |
| Bajo riesgo | ECG | No | Sí | Sí | Sí |
| Bajo riesgo | Rx tórax | No*** | No*** | No*** | No*** |
| Intermedio | Hemograma y coagulación | Sí | Sí | Sí | Sí |
| Intermedio | Bioquímica | No | Sí | Sí | Sí |
| Intermedio | ECG | No | Sí | Sí | Sí |
| Intermedio | Rx tórax | No*** | No*** | No*** | Sí |
| Alto | Hemograma y coagulación | Sí | Sí | Sí | Sí |
| Alto | Bioquímica | No | Sí | Sí | Sí |
| Alto | ECG | Sí | Sí | Sí | Sí |
| Alto | Rx tórax | No*** | Sí | Sí | Sí |

\* Bajo/bajo: hemograma y coagulación solo si sospecha de anemia, trastorno de coagulación/anticoagulante, anestesia regional posible, sangrado previsible o HEMSTOP positivo. \*** Rx de tórax solo ante sospecha o cambio de enfermedad cardiopulmonar (la aplicación pregunta).

**BNP o NT-proBNP (nota \*\*):** solo en cirugía de riesgo intermedio o alto y si hay comorbilidad cardiovascular significativa, fragilidad (CFS ≥ 5) o capacidad funcional reducida (< 4 METs). Cuenta como comorbilidad cardiovascular significativa: cardiopatía isquémica, insuficiencia cardiaca, valvulopatía moderada o grave, fibrilación auricular u otra arritmia, arteriopatía periférica o aneurisma de aorta, ictus o AIT previo, miocardiopatía e hipertensión pulmonar. La hipertensión arterial aislada **no** cuenta (decisión del servicio, 2026-10-04).

**Validez:** hemograma 30 días, bioquímica 30 días, coagulación 14 días, ECG 3 meses, Rx tórax 3 meses, ecocardiograma 12 meses (18 si la función ventricular es conocida y estable). El apartado «Pruebas recientes» del paso de enfermedades recoge la fecha de cada prueba; la aplicación la compara con la de la intervención (o con hoy si aún no hay fecha, indicándolo) y **descuenta** las que sigan vigentes ese día. El BNP/NT-proBNP se pide por indicación y no se descuenta por fecha.

## 13. Catálogo de fármacos

_`datos/farmacos.csv`. `verificado_cima` indica si el nombre comercial se ha comprobado en CIMA (AEMPS)._

### aine

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Espidifen\|Dalsy\|Neobrufen | ibuprofeno | `aine_ibuprofeno` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Naprosyn\|Antalgin | naproxeno | `aine_naproxeno` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Voltaren | diclofenaco | `aine_diclofenaco` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Enantyum | dexketoprofeno | `aine_dexketoprofeno` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| ketorolaco | ketorolaco | `aine_ketorolaco` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Toradol | ketorolaco | `aine_ketorolaco` | no | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Celebrex | celecoxib | `aine_celecoxib` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Arcoxia | etoricoxib | `aine_etoricoxib` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### analgesicos

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Gelocatil\|Termalgin\|Efferalgan | paracetamol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Nolotil | metamizol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### antiagregantes

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Adiro\|Tromalyt | acido_acetilsalicilico | `aas` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Plavix\|Iscover | clopidogrel | `p2y12_clopidogrel` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Efient | prasugrel | `p2y12_prasugrel` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Brilique | ticagrelor | `p2y12_ticagrelor` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Persantin | dipiridamol | `dipiridamol` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Disgren | triflusal | `triflusal` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Pletal | cilostazol | `cilostazol` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Integrilin | eptifibatida | `gp_iibiiia` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Aggrastat | tirofiban | `gp_iibiiia` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Kengrexal | cangrelor | `gp_iibiiia` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### anticoagulantes

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Sintrom | acenocumarol | `avk_acenocumarol` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Aldocumar | warfarina | `avk_warfarina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Pradaxa | dabigatran | `acod_dabigatran` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xarelto | rivaroxaban | `acod_antixa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Eliquis | apixaban | `acod_antixa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lixiana | edoxaban | `acod_antixa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Clexane\|Inhixa | enoxaparina | `hbpm` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Hibor | bemiparina | `hbpm` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Innohep | tinzaparina | `hbpm` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Fragmin | dalteparina | `hbpm` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Fraxiparina | nadroparina | `hbpm` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Arixtra | fondaparinux | `fondaparinux` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| heparina sodica | heparina_sodica | `heparina_sodica` | no | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### antidiabeticos

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Dianben | metformina | `metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Januvia\|Tesavel\|Xelevia | sitagliptina | `dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Galvus\|Jalra | vildagliptina | `dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trajenta | linagliptina | `dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Onglyza | saxagliptina | `dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Vipidia | alogliptina | `dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Janumet\|Velmetia\|Efficib | sitagliptina+metformina | `dpp4+metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Eucreas\|Icandra | vildagliptina+metformina | `dpp4+metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Jentadueto | linagliptina+metformina | `dpp4+metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Diamicron | gliclazida | `sulfonilurea` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Amaryl | glimepirida | `sulfonilurea` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Daonil | glibenclamida | `sulfonilurea` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Minodiab | glipizida | `sulfonilurea` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Novonorm | repaglinida | `glinida` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Starlix | nateglinida | `glinida` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Actos | pioglitazona | `pioglitazona` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Jardiance | empagliflozina | `sglt2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Forxiga | dapagliflozina | `sglt2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Invokana | canagliflozina | `sglt2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Steglatro | ertugliflozina | `sglt2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Synjardy | empagliflozina+metformina | `sglt2+metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xigduo | dapagliflozina+metformina | `sglt2+metformina` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Glyxambi | empagliflozina+linagliptina | `sglt2+dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Qtern | dapagliflozina+saxagliptina | `sglt2+dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trijardy | empagliflozina+metformina+linagliptina | `sglt2+metformina+dpp4` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### cardiovascular

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Renitec | enalapril | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zestril\|Prinivil | lisinopril | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Acovil | ramipril | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Coversyl | perindopril | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Capoten | captopril | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cozaar | losartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Diovan | valsartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Atacand\|Parapres | candesartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Aprovel\|Karvea | irbesartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Olmetec\|Openvas\|Ixia | olmesartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Micardis\|Pritor | telmisartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| eprosartan | eprosartan | `ieca_ara2` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Entresto | sacubitrilo+valsartan | `sacubitrilo_valsartan` | sí | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Emconcor | bisoprolol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tenormin | atenolol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Coropres | carvedilol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lobivon | nebivolol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Beloken | metoprolol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Norvas | amlodipino | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Masdil | diltiazem | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Manidon | verapamilo | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seguril | furosemida | `diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sutril | torasemida | `diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Esidrex | hidroclorotiazida | `diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Aldactone | espironolactona | `diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Elecor | eplerenona | `diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trangorex | amiodarona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| digoxina | digoxina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cardyl\|Zarator | atorvastatina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Crestor | rosuvastatina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zocor | simvastatina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Atacand Plus\|Parapres Plus | candesartan+hidroclorotiazida | `ieca_ara2+diuretico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Viacoram | perindopril+amlodipino | `ieca_ara2+mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sevikar | olmesartan+amlodipino | `ieca_ara2+mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### digestivo

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Nexium\|Axiago | esomeprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Opiren | lansoprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Pariet | rabeprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### fitoterapia

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| ginkgo | ginkgo | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| ajo | ajo | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| ginseng | ginseng | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| kava | kava | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| curcuma | curcuma | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| vitamina E | vitamina_e | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| omega 3 | omega_3 | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| hiperico | hiperico | `fitoterapia` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### glp1

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Ozempic\|Wegovy | semaglutida | `glp1_semanal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Rybelsus | semaglutida | `glp1_diario` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Victoza\|Saxenda | liraglutida | `glp1_diario` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trulicity | dulaglutida | `glp1_semanal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Byetta\|Bydureon | exenatida | `glp1_semanal` | no | subcutanea | ✓ verificado (2026-09-30, CIMA manual) |
| Lyxumia | lixisenatida | `glp1_diario` | no | subcutanea | ✓ verificado (2026-09-30, CIMA manual) |
| Mounjaro | tirzepatida | `glp1_semanal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### glucosaminoglucanos

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Aterina | sulodexida | `sulodexida` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### hematologia

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Fero-Gradumet\|Tardyferon | sulfato_ferroso | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Ferbisol | ferroglicina_sulfato | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Ferinject | hierro_carboximaltosa | `mantener_generico` | no | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Venofer | hierro_sacarosa | `mantener_generico` | no | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### hormonas

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Eutirox | levotiroxina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Dacortin | prednisona | `corticoide_sistemico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Urbason | metilprednisolona | `corticoide_sistemico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Hidroaltesona | hidrocortisona | `corticoide_sistemico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| terapia hormonal sustitutiva | terapia_hormonal_sustitutiva | `anticonceptivo_ths` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| omeprazol | omeprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| pantoprazol | pantoprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zyloric | alopurinol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Deltius\|Thorens | colecalciferol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Hidroferol | calcifediol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| anticonceptivo oral combinado | etinilestradiol | `anticonceptivo_ths` | no | oral | ✗ sin verificar |
| anticonceptivo oral solo gestágeno | desogestrel | `anticonceptivo_ths` | no | oral | ✗ sin verificar |
| implante anticonceptivo\|Implanon NXT | etonogestrel | `anticonceptivo_ths` | no | implante | ✗ sin verificar |
| DIU hormonal\|Mirena\|Kyleena\|Jaydess | levonorgestrel | `anticonceptivo_ths` | no | intrauterina | ✗ sin verificar |
| anillo vaginal\|NuvaRing\|Circlet | etonogestrel\|etinilestradiol | `anticonceptivo_ths` | no | vaginal | ✗ sin verificar |
| parche anticonceptivo\|Evra | norelgestromina\|etinilestradiol | `anticonceptivo_ths` | no | transdermica | ✗ sin verificar |
| anticonceptivo inyectable\|Depo-Progevera | medroxiprogesterona | `anticonceptivo_ths` | no | intramuscular | ✗ sin verificar |
| terapia hormonal sustitutiva oral\|THS oral | estradiol | `anticonceptivo_ths` | no | oral | ✗ sin verificar |
| terapia hormonal sustitutiva parche\|THS parche | estradiol | `anticonceptivo_ths` | no | transdermica | ✗ sin verificar |
| terapia hormonal sustitutiva vaginal\|THS vaginal | estradiol | `anticonceptivo_ths` | no | vaginal | ✗ sin verificar |

### inmunosupresores

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Imurel | azatioprina | `inmunosupresor_clasico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sandimmun Neoral | ciclosporina | `inmunosupresor_clasico` | no | oral | ✓ verificado (2026-09-30, CIMA manual) |
| Prograf\|Advagraf\|Envarsus | tacrolimus | `inmunosupresor_clasico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| CellCept\|Myfortic | micofenolato | `inmunosupresor_clasico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Metoject\|Imeth\|Bertanel\|Nordimet | metotrexato | `metotrexato` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Arava | leflunomida | `fame_mantener` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Dolquine | hidroxicloroquina | `fame_mantener` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Salazopyrina | sulfasalazina | `fame_mantener` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xeljanz | tofacitinib | `jak` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Olumiant | baricitinib | `jak` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Rinvoq | upadacitinib | `jak` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Humira\|Amgevita\|Hyrimoz\|Imraldi\|Idacio\|Hulio\|Yuflyma | adalimumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Enbrel\|Benepali\|Erelzi | etanercept | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Remicade\|Inflectra\|Remsima | infliximab | `biologico` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cimzia | certolizumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Simponi | golimumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| RoActemra | tocilizumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Orencia | abatacept | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| MabThera\|Truxima\|Rixathon | rituximab | `biologico` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cosentyx | secukinumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Stelara | ustekinumab | `biologico` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### insulinas

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Xultophy | insulina_degludec+liraglutida | `insulina_glp1_fija` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Suliqua | insulina_glargina+lixisenatida | `insulina_glp1_fija` | sí | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lantus\|Abasaglar\|Toujeo | insulina_glargina | `insulina_basal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Levemir | insulina_detemir | `insulina_basal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tresiba | insulina_degludec | `insulina_basal` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Insulatard\|Humulina NPH | insulina_nph | `insulina_nph` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Humalog | insulina_lispro | `insulina_rapida` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| NovoRapid\|Fiasp | insulina_aspart | `insulina_rapida` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Apidra | insulina_glulisina | `insulina_rapida` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Actrapid\|Humulina Regular | insulina_regular | `insulina_rapida` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| NovoMix 30 | insulina_aspart | `insulina_premezclada` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Humalog Mix 25 | insulina_lispro | `insulina_premezclada` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Humalog Mix 50 | insulina_lispro | `insulina_premezclada` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Ryzodeg | insulina_degludec+insulina_aspart | `insulina_premezclada` | no | subcutanea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### neurologia

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Keppra | levetiracetam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Briviact | brivaracetam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lamictal\|Labileno | lamotrigina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Depakine | acido_valproico | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tegretol | carbamazepina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trileptal | oxcarbazepina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Vimpat | lacosamida | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Topamax | topiramato | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zonegran | zonisamida | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Neosidantoina | fenitoina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Fycompa | perampanel | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zebinix | eslicarbazepina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Neurontin | gabapentina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lyrica | pregabalina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### oftalmologia

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Timoftol | timolol | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Alphagan | brimonidina | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trusopt | dorzolamida | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Azopt | brinzolamida | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xalatan | latanoprost | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lumigan | bimatoprost | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Travatan | travoprost | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| pilocarpina | pilocarpina | `mantener_generico` | no | colirio | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Edemox | acetazolamida | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### oncologicos

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Glivec | imatinib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sprycel | dasatinib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tasigna | nilotinib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tarceva | erlotinib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Nexavar | sorafenib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sutent | sunitinib | `tirosina_cinasa` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Erbitux | cetuximab | `tirosina_cinasa` | no | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Avastin\|Mvasi\|Zirabev | bevacizumab | `antiangiogenico` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zaltrap | aflibercept | `antiangiogenico` | sí | intravenosa | ✓ verificado (2026-09-30, CIMA manual) |
| Eylea | aflibercept | `antiangiogenico_intravitreo` | no | intravitrea | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cyramza | ramucirumab | `antiangiogenico` | sí | intravenosa | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### opioides

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| MST Continus\|Sevredol | morfina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| codeina | codeina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Adolonta\|Zaldiar | tramadol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Palexia | tapentadol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Oxycontin\|Oxynorm\|Targin | oxicodona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Jurnista | hidromorfona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Durogesic | fentanilo | `mantener_generico` | no | transdermica | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Feliben\|Transtec | buprenorfina | `mantener_generico` | no | transdermica | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Suboxone | buprenorfina\|naloxona | `mantener_generico` | no | sublingual | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| metadona | metadona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### psicofarmacos

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Parnate | tranilcipromina | `imao_irreversible` | sí | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Manerix | moclobemida | `moclobemida` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| fenelzina | fenelzina | `imao_irreversible` | sí | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| isocarboxazida | isocarboxazida | `imao_irreversible` | sí | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Azilect | rasagilina | `imao_b` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Plurimen | selegilina | `imao_b` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xadago | safinamida | `imao_b` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Plenur | litio | `litio` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Sinemet | levodopa+carbidopa | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Prozac\|Adofen | fluoxetina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Besitran | sertralina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seroxat\|Motivan | paroxetina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seropram | citalopram | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cipralex\|Esertia | escitalopram | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Dumirox | fluvoxamina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Vandral\|Dobupal | venlafaxina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Pristiq | desvenlafaxina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Cymbalta\|Xeristar | duloxetina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Rexer | mirtazapina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Deprax | trazodona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Elontril | bupropion | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Brintellix | vortioxetina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tryptizol | amitriptilina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Paxtibi | nortriptilina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Anafranil | clomipramina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Valium | diazepam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Orfidal\|Idalprem | lorazepam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trankimazin | alprazolam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Rivotril | clonazepam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Lexatin | bromazepam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Noctamid | lormetazepam | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Tranxilium | clorazepato | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Stilnox\|Dalparan | zolpidem | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Limovan | zopiclona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seroquel | quetiapina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Zyprexa | olanzapina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Risperdal | risperidona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Invega | paliperidona | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Xeplion | paliperidona | `mantener_generico` | no | intramuscular | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Abilify | aripiprazol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| haloperidol | haloperidol | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Leponex | clozapina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Etumina | clotiapina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### respiratorio

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Ventolin\|Buto-Asma | salbutamol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Terbasmin | terbutalina | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Atrovent | ipratropio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Oxis\|Foradil | formoterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Serevent\|Beglan\|Inaspir | salmeterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Onbrez | indacaterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Spiriva | tiotropio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Incruse | umeclidinio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seebri | glicopirronio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Eklira | aclidinio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Pulmicort | budesonida | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Flixotide\|Flusonal | fluticasona | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Becloasma | beclometasona | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Symbicort\|Rilast | budesonida+formoterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Seretide\|Anasma\|Inaladuo\|Plusvent | fluticasona+salmeterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Foster\|Formodual | beclometasona+formoterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Relvar | fluticasona_furoato+vilanterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Anoro | umeclidinio+vilanterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Ultibro | glicopirronio+indacaterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Spiolto | tiotropio+olodaterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Duaklir | aclidinio+formoterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trelegy | fluticasona_furoato+umeclidinio+vilanterol | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Trimbow | beclometasona+formoterol+glicopirronio | `mantener_generico` | no | inhalada | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Singulair | montelukast | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

### urologia

| Nombres comerciales | Principios | Regla | Confirmación | Vía | Verificación |
| --- | --- | --- | --- | --- | --- |
| Omnic\|Urolosin | tamsulosina | `alfabloqueante_flacido` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Silodyx\|Urorec | silodosina | `alfabloqueante_flacido` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Benestan | alfuzosina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| Carduran | doxazosina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |
| terazosina | terazosina | `mantener_generico` | no | oral | ✓ verificado (2026-09-30, cotejo CIMA asistido) |

## 14. Conversión de opioides a morfina oral equivalente

| Opioide | Factor |
| --- | --- |
| morfina oral | 1 |
| codeina | 0.15 |
| tramadol | 0.2 |
| tapentadol | 0.4 |
| oxicodona | 1.5 |
| hidromorfona oral | 5 |
| fentanilo transdermico | 2.4 |

**Sin conversión** (valoración específica): buprenorfina, metadona.

## 15. Procedimientos

_`datos/procedimientos.csv`. Riesgo cardiovascular según §7.1 (el alto se reserva para vascular mayor, cardiaca, neumonectomía, torácica mayor, hepatopancreática y oncológica multivisceral)._

### cardiaca

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bypass coronario | alto | alto | no | no_aplica | no | si | no | no |
| Recambio valvular | alto | alto | no | no_aplica | no | si | no | no |
| Reparacion valvular | alto | alto | no | no_aplica | no | si | no | no |
| Cirugia de aorta ascendente | alto | alto | no | no_aplica | no | si | no | no |

### cardiologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Implante de marcapasos o DAI | intermedio | bajo | no | no_aplica | no | no | no | no |
| Ablacion cardiaca | intermedio | bajo | no | no_aplica | no | no | no | no |
| Estudio electrofisiologico | intermedio | bajo | no | no_aplica | no | no | no | no |
| Cateterismo coronario diagnostico | intermedio | bajo | no | no_aplica | no | no | no | no |
| Angioplastia coronaria con stent | alto | alto | no | no_aplica | no | si | no | no |
| Valvuloplastia percutanea | alto | alto | no | no_aplica | no | si | no | no |
| Implante valvular aortico transcateter (TAVI) | alto | alto | no | no_aplica | no | si | no | no |

### cirugia general

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hernioplastia inguinal abierta | bajo | bajo | no | no_aplica | no | no | no | no |
| Hernioplastia inguinal laparoscopica | intermedio | bajo | no | no_aplica | no | no | no | no |
| Hernioplastia umbilical | bajo | bajo | no | no_aplica | no | no | no | no |
| Eventroplastia de pared abdominal | intermedio | alto | no | no_aplica | no | no | no | no |
| Colecistectomia laparoscopica | intermedio | bajo | no | no_aplica | no | no | no | no |
| Colecistectomia abierta | intermedio | alto | no | no_aplica | no | no | no | no |
| Apendicectomia | intermedio | bajo | no | no_aplica | no | no | no | no |
| Colectomia no oncologica | intermedio | alto | no | no_aplica | no | no | no | no |
| Colectomia oncologica | intermedio | alto | no | no_aplica | no | si | no | no |
| Hemicolectomia | intermedio | alto | no | no_aplica | no | si | no | no |
| Reseccion anterior de recto | intermedio | alto | si | no_aplica | no | si | no | no |
| Amputacion abdominoperineal | intermedio | alto | si | no_aplica | no | si | no | no |
| Gastrectomia | intermedio | alto | no | no_aplica | no | si | no | no |
| Esofagectomia | alto | alto | no | no_aplica | no | si | no | no |
| Bypass gastrico | intermedio | alto | no | no_aplica | no | si | no | no |
| Gastrectomia vertical | intermedio | alto | no | no_aplica | no | si | no | no |
| Tiroidectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Paratiroidectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Suprarrenalectomia laparoscopica | alto | alto | no | no_aplica | no | si | no | no |
| Esplenectomia | intermedio | alto | no | no_aplica | no | si | no | no |
| Mastectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Tumorectomia de mama | bajo | bajo | no | no_aplica | no | no | no | no |
| Biopsia de ganglio centinela | bajo | bajo | no | no_aplica | no | no | no | no |
| Exeresis cutanea pequena | bajo | minimo | no | no_aplica | no | no | no | no |
| Drenaje de absceso | bajo | minimo | no | no_aplica | no | no | no | no |
| Cirugia de fistula anal | bajo | bajo | si | no_aplica | no | no | no | no |
| Hemorroidectomia | bajo | bajo | si | no_aplica | no | no | no | no |
| Exeresis de sinus pilonidal | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia perineal o proctologica | bajo | bajo | si | no_aplica | no | no | no | no |
| Colocacion de reservorio subcutaneo | bajo | bajo | no | no_aplica | no | no | no | no |
| Otro procedimiento | intermedio | bajo | no | no_aplica | no | no | no | no |

### dermatologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exeresis de tumor cutaneo | bajo | minimo | no | no_aplica | no | no | no | no |
| Cirugia de Mohs | bajo | bajo | no | no_aplica | no | no | no | no |

### digestivo

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Endoscopia digestiva alta diagnostica | bajo | minimo | no | no_aplica | no | no | no | no |
| Colonoscopia diagnostica | bajo | minimo | no | no_aplica | no | no | no | no |
| Endoscopia con biopsia | bajo | bajo | no | no_aplica | no | no | no | no |
| Colonoscopia con polipectomia | intermedio | alto | no | no_aplica | no | no | no | no |
| CPRE con esfinterotomia | intermedio | alto | no | no_aplica | no | no | no | no |
| Mucosectomia endoscopica | intermedio | alto | no | no_aplica | no | no | no | no |
| Gastrostomia endoscopica percutanea | intermedio | bajo | no | no_aplica | no | no | no | no |
| Ligadura endoscopica de varices esofagicas | intermedio | alto | no | no_aplica | no | no | no | no |
| Biopsia hepatica | intermedio | alto | no | no_aplica | no | no | no | no |
| Manometria esofagica | bajo | minimo | no | no_aplica | no | no | no | no |
| Gastroscopia terapeutica | intermedio | alto | no | no_aplica | no | no | no | no |
| Dilatacion esofagica endoscopica | intermedio | bajo | no | no_aplica | no | no | no | no |

### ginecologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Histerectomia | intermedio | alto | no | no_aplica | no | no | no | no |
| Histerectomia laparoscopica | intermedio | alto | no | no_aplica | no | no | no | no |
| Anexectomia | intermedio | alto | no | no_aplica | no | no | no | no |
| Laparoscopia ginecologica diagnostica | bajo | bajo | no | no_aplica | no | no | no | no |
| Legrado uterino | bajo | bajo | no | no_aplica | no | no | no | no |
| Conizacion cervical | bajo | bajo | no | no_aplica | no | no | no | no |
| Histeroscopia | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia de prolapso genital | intermedio | alto | si | no_aplica | no | no | no | no |
| Cabestrillo suburetral | bajo | bajo | si | no_aplica | no | no | no | no |
| Miomectomia | intermedio | alto | no | no_aplica | no | no | no | no |
| Cirugia oncologica ovarica | intermedio | alto | no | no_aplica | no | si | no | no |
| Biopsia endometrial | bajo | minimo | no | no_aplica | no | no | no | no |

### maxilofacial

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cirugia ortognatica | intermedio | alto | no | no_aplica | no | no | no | no |
| Extraccion de terceros molares | bajo | bajo | no | no_aplica | no | no | no | no |
| Extraccion de 1 a 3 piezas dentarias | bajo | minimo | no | no_aplica | no | no | no | no |
| Implante dental simple | bajo | minimo | no | no_aplica | no | no | no | no |
| Implante dental complejo con injerto | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia periodontal | bajo | minimo | no | no_aplica | no | no | no | no |
| Osteosintesis de fractura mandibular | intermedio | bajo | no | no_aplica | no | no | no | no |
| Cirugia de tumor de cavidad oral | intermedio | alto | no | no_aplica | no | no | no | no |

### neurocirugia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Craneotomia por tumor | intermedio | alto | no | no_aplica | no | si | si | no |
| Craneotomia por aneurisma | intermedio | alto | no | no_aplica | no | si | si | no |
| Evacuacion de hematoma subdural | intermedio | alto | no | no_aplica | no | si | si | no |
| Derivacion ventriculoperitoneal | intermedio | alto | no | no_aplica | no | no | si | no |
| Cirugia transesfenoidal de hipofisis | intermedio | alto | no | no_aplica | no | si | si | no |
| Cirugia del canal medular | intermedio | alto | si | no_aplica | no | si | si | no |
| Implante de estimulador medular | intermedio | alto | si | no_aplica | no | no | si | no |
| Puncion lumbar | bajo | alto | si | no_aplica | no | no | si | no |

### obstetricia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cesarea | intermedio | alto | si | no_aplica | si | no | no | no |
| Parto instrumental | intermedio | alto | si | no_aplica | si | no | no | no |
| Legrado obstetrico | bajo | bajo | no | no_aplica | si | no | no | no |
| Cerclaje cervical | bajo | bajo | si | no_aplica | si | no | no | no |

### oftalmologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cirugia de catarata con anestesia topica | bajo | minimo | no | riesgo_bajo | no | no | no | no |
| Cirugia de chalazion | bajo | minimo | no | riesgo_bajo | no | no | no | no |
| Cirugia de pterigion | bajo | minimo | no | riesgo_bajo | no | no | no | no |
| Cirugia de catarata con bloqueo retrobulbar o peribulbar | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Cirugia palpebral | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Dacriocistorrinostomia | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Dacriocistectomia | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Queratoplastia | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Evisceracion ocular | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Enucleacion ocular | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Cirugia de glaucoma | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Cerclaje escleral | bajo | bajo | no | riesgo_moderado_alto | no | no | no | si |
| Vitrectomia | bajo | bajo | no | riesgo_moderado_alto | no | no | no | si |
| Cirugia de desprendimiento de retina | bajo | bajo | no | riesgo_moderado_alto | no | no | no | si |
| Cirugia de estrabismo | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Descompresion orbitaria | bajo | alto | no | riesgo_moderado_alto | no | no | no | no |
| Cirugia tumoral ocular | bajo | alto | no | riesgo_moderado_alto | no | no | no | no |
| Inyeccion intravitrea | bajo | minimo | no | riesgo_bajo | no | no | no | no |

### orl

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amigdalectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Adenoidectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Septoplastia | bajo | bajo | no | no_aplica | no | no | no | no |
| Rinoseptoplastia | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia endoscopica nasosinusal | bajo | bajo | no | no_aplica | no | no | no | no |
| Timpanoplastia | bajo | bajo | no | no_aplica | no | no | no | no |
| Mastoidectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Tiroidectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Parotidectomia | intermedio | bajo | no | no_aplica | no | no | no | no |
| Laringectomia | intermedio | alto | no | no_aplica | no | no | no | no |
| Vaciamiento cervical ganglionar | intermedio | alto | no | no_aplica | no | no | no | no |
| Microcirugia de laringe | bajo | bajo | no | no_aplica | no | no | no | no |
| Traqueotomia | intermedio | bajo | no | no_aplica | no | no | no | no |
| Septorrinoplastia de revision | bajo | bajo | no | no_aplica | no | no | no | no |
| Uvulopalatofaringoplastia | intermedio | bajo | no | no_aplica | no | no | no | no |

### pediatria

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amigdalectomia pediatrica | bajo | bajo | no | no_aplica | no | no | no | no |
| Adenoidectomia pediatrica | bajo | bajo | no | no_aplica | no | no | no | no |
| Drenajes timpanicos | bajo | minimo | no | no_aplica | no | no | no | no |
| Circuncision | bajo | minimo | no | no_aplica | no | no | no | no |
| Herniorrafia inguinal pediatrica | bajo | bajo | si | no_aplica | no | no | no | no |
| Orquidopexia | bajo | bajo | si | no_aplica | no | no | no | no |
| Cirugia de fimosis | bajo | minimo | no | no_aplica | no | no | no | no |
| Frenulectomia | bajo | minimo | no | no_aplica | no | no | no | no |
| Correccion de hipospadias | bajo | bajo | si | no_aplica | no | no | no | no |
| Apendicectomia pediatrica | intermedio | bajo | no | no_aplica | no | no | no | no |
| Cirugia de estrabismo pediatrica | bajo | bajo | no | riesgo_moderado_alto | no | no | no | no |
| Cirugia de cardiopatia congenita | alto | alto | no | no_aplica | no | si | no | no |

### plastica

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rinoplastia | bajo | bajo | no | no_aplica | no | no | no | no |
| Abdominoplastia | intermedio | bajo | no | no_aplica | no | no | no | no |
| Mamoplastia de aumento | bajo | bajo | no | no_aplica | no | no | no | no |
| Mamoplastia de reduccion | bajo | bajo | no | no_aplica | no | no | no | no |
| Reconstruccion mamaria con colgajo | intermedio | alto | no | no_aplica | no | si | no | no |
| Lipectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Injerto de piel | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia de colgajo | intermedio | alto | no | no_aplica | no | no | no | no |
| Dermolipectomia | intermedio | bajo | no | no_aplica | no | no | no | no |

### radiologia intervencionista

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Angiografia no coronaria | intermedio | bajo | no | no_aplica | no | no | no | no |
| Embolizacion arterial | intermedio | alto | no | no_aplica | no | no | no | no |
| Drenaje percutaneo guiado | bajo | bajo | no | no_aplica | no | no | no | no |
| Biopsia percutanea guiada por imagen | bajo | bajo | no | no_aplica | no | no | no | no |
| Nefrostomia percutanea | intermedio | alto | no | no_aplica | no | no | no | no |
| Quimioembolizacion hepatica | intermedio | alto | no | no_aplica | no | no | no | no |

### toracica

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Neumonectomia | alto | alto | no | no_aplica | no | si | no | no |
| Lobectomia pulmonar | intermedio | alto | no | no_aplica | no | si | no | no |
| Segmentectomia pulmonar | intermedio | alto | no | no_aplica | no | si | no | no |
| Videotoracoscopia (VATS) | bajo | alto | si | no_aplica | no | si | no | no |
| Mediastinoscopia | intermedio | bajo | no | no_aplica | no | no | no | no |
| Biopsia pleural | intermedio | bajo | no | no_aplica | no | no | no | no |
| Pleurodesis | intermedio | bajo | no | no_aplica | no | no | no | no |
| Timectomia | intermedio | alto | no | no_aplica | no | si | no | no |

### traumatologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Artroplastia total de rodilla | intermedio | alto | si | no_aplica | no | si | no | no |
| Artroplastia total de cadera | intermedio | alto | si | no_aplica | no | si | no | no |
| Artroplastia de hombro | intermedio | alto | si | no_aplica | no | no | no | no |
| Osteosintesis de fractura de cadera | intermedio | alto | si | no_aplica | no | si | no | no |
| Osteosintesis de femur | intermedio | alto | si | no_aplica | no | si | no | no |
| Osteosintesis de tibia | intermedio | alto | si | no_aplica | no | no | no | no |
| Osteosintesis de humero | intermedio | bajo | si | no_aplica | no | no | no | no |
| Osteosintesis de muneca | bajo | bajo | si | no_aplica | no | no | no | no |
| Artroscopia de rodilla | bajo | bajo | si | no_aplica | no | no | no | no |
| Artroscopia de hombro | bajo | bajo | si | no_aplica | no | no | no | no |
| Ligamentoplastia de rodilla | bajo | bajo | si | no_aplica | no | no | no | no |
| Meniscectomia artroscopica | bajo | bajo | si | no_aplica | no | no | no | no |
| Artrodesis lumbar | intermedio | alto | si | no_aplica | no | si | si | no |
| Discectomia lumbar | intermedio | alto | si | no_aplica | no | no | si | no |
| Laminectomia | intermedio | alto | si | no_aplica | no | si | si | no |
| Cirugia de mano | bajo | bajo | si | no_aplica | no | no | no | no |
| Liberacion del tunel carpiano | bajo | minimo | no | no_aplica | no | no | no | no |
| Cirugia de Dupuytren | bajo | bajo | si | no_aplica | no | no | no | no |
| Cirugia de hallux valgus | bajo | bajo | si | no_aplica | no | no | no | no |
| Artroscopia de tobillo | bajo | bajo | si | no_aplica | no | no | no | no |
| Retirada de material de osteosintesis | bajo | bajo | si | no_aplica | no | no | no | no |
| Amputacion de miembro inferior (traumatica) | intermedio | alto | si | no_aplica | no | si | no | no |
| Infiltracion articular | bajo | minimo | no | no_aplica | no | no | no | no |

### urologia

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RTU de prostata | intermedio | alto | si | no_aplica | no | no | no | no |
| RTU de tumor vesical | intermedio | alto | si | no_aplica | no | no | no | no |
| Nefrolitotomia percutanea | intermedio | alto | no | no_aplica | no | no | no | no |
| Ureteroscopia | bajo | bajo | si | no_aplica | no | no | no | no |
| Litotricia extracorporea | intermedio | alto | no | no_aplica | no | no | no | no |
| Prostatectomia radical | intermedio | alto | si | no_aplica | no | no | no | no |
| Nefrectomia | intermedio | alto | no | no_aplica | no | si | no | no |
| Nefrectomia parcial | intermedio | alto | no | no_aplica | no | si | no | no |
| Cistectomia radical | alto | alto | no | no_aplica | no | si | no | no |
| Biopsia de prostata | bajo | bajo | no | no_aplica | no | no | no | no |
| Biopsia renal | intermedio | alto | no | no_aplica | no | no | no | no |
| Vasectomia | bajo | minimo | no | no_aplica | no | no | no | no |
| Orquiectomia | bajo | bajo | no | no_aplica | no | no | no | no |
| Cirugia de hidrocele | bajo | bajo | si | no_aplica | no | no | no | no |
| Colocacion de cateter doble J | bajo | bajo | si | no_aplica | no | no | no | no |
| Cistoscopia diagnostica | bajo | minimo | no | no_aplica | no | no | no | no |
| Circuncision en adulto | bajo | minimo | no | no_aplica | no | no | no | no |

### vascular

| Procedimiento | R. cardiovascular | R. hemorrágico | Neuroaxial/bloqueo | Oftalmológico | Obstétrico | R. trombótico alto | Espacio cerrado | Retina |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cirugia de aorta abdominal | alto | alto | no | no_aplica | no | si | no | no |
| Reparacion endovascular de aneurisma (EVAR) | intermedio | alto | no | no_aplica | no | si | no | no |
| Revascularizacion arterial periferica | alto | alto | no | no_aplica | no | si | no | no |
| Bypass femoropopliteo | alto | alto | si | no_aplica | no | si | no | no |
| Endarterectomia carotidea sintomatica | alto | alto | no | no_aplica | no | si | no | no |
| Endarterectomia carotidea asintomatica | intermedio | alto | no | no_aplica | no | si | no | no |
| Amputacion por isquemia | alto | alto | si | no_aplica | no | si | no | no |
| Fistula arteriovenosa para dialisis | intermedio | bajo | no | no_aplica | no | no | no | no |
| Safenectomia por varices | bajo | bajo | si | no_aplica | no | no | no | no |
| Escleroterapia de varices | bajo | minimo | no | no_aplica | no | no | no | no |
| Ligadura de varices | bajo | minimo | no | no_aplica | no | no | no | no |
| Colocacion de reservorio venoso | bajo | bajo | no | no_aplica | no | no | no | no |

## 16. Módulos de enfermedad (anamnesis dirigida, §5.16)

_Preguntas que se abren al marcar cada enfermedad. Junto a cada pregunta se indica, cuando procede, qué genera cada respuesta (alerta, nota, prueba, clase de riesgo, ASA, regla o dato clínico), codificado en el propio módulo (§5.16, decisión del servicio). El motor sigue calculando el efecto en su capa; esto es la traza legible._

### Anemia

_Fuente: docs/documento_fuente.md §5.5_

- **Tipo de anemia (si se conoce)** — _opcion_: Ferropénica (falta de hierro) / Por déficit de B12 o fólico / De enfermedad crónica / Hemolítica / Talasemia / Desconocida
- **Tratamiento actual** — _opcion_: Hierro oral / Hierro intravenoso / Vitamina B12 / Eritropoyetina / Ninguno
- **Última hemoglobina** (g/dL) — _numero_
  - Por qué: Una Hb < 13 g/dL antes de cirugía con sangrado previsible aconseja optimizar la anemia y pedir ferritina.
  - Genera → 🧪 prueba: si < 13 g/dL → apoya pedir hemograma y ferritina; valorar optimizar la anemia. _(§7.3)_
  - Genera → 🔔 alerta amarilla: si < 10 g/dL → hemoglobina < 10 g/dL: validar antes de la intervención (optimizar la anemia). _(§7.3)_ **[se emite]**
- **Fecha de esa hemoglobina** — _fecha_
- **¿Ferropenia (falta de hierro) conocida?** — _boolean_
- **¿Sangrado reciente?** — _boolean_
- **Síntomas** — _opcion_multiple_: Cansancio / Falta de aire / Palidez

### Anticoagulación / antiagregación

_Fuente: docs/documento_fuente.md §5.5_

- **¿Por qué toma el anticoagulante/antiagregante?** — _opcion_: Fibrilación auricular / Prótesis valvular / Trombosis venosa / embolia (TVP/TEP) / Trombofilia / Stent coronario / Otra / no lo sabe
  - Por qué: La indicación determina si hay alto riesgo trombótico y si se puede suspender sin más.
- **Fecha de la TVP/TEP (si esa es la indicación)** — _fecha_

### Artritis reumatoide

_Fuente: docs/documento_fuente.md §5.8, §5.16.13_

- **¿Dolor, rigidez o limitación para mover el cuello?** — _boolean_
  - Por qué: En la artritis reumatoide puede haber inestabilidad de las vértebras del cuello: hay que evitar movimientos bruscos al dormir al paciente.
  - Genera → 🔔 alerta roja: si = sí → inestabilidad atloaxoidea (cuello). _(§5.16.13)_ **[se emite]**
- **¿Dificultad para abrir la boca o problemas de la mandíbula?** — _boolean_
  - Por qué: Limita el acceso a la vía aérea para la intubación.
  - Genera → 🔔 alerta amarilla: si = sí → posible vía aérea difícil. _(§5.16.13)_ **[se emite]**
- **¿Ronquera crónica o falta de aire?** — _boolean_
  - Por qué: Puede indicar afectación de las articulaciones de la laringe (cricoaritenoidea).
  - Genera → 🔔 alerta amarilla: si = sí → posible afectación cricoaritenoidea. _(§5.16.13)_ **[se emite]**
- **Si toma inmunosupresores, ¿por qué motivo?** — _opcion_: Enfermedad autoinmune / Enfermedad sistémica grave / Trasplante
  - Por qué: La suspensión de los inmunosupresores clásicos depende de la indicación.
- **¿Ha tomado corticoides (cortisona) en los últimos 3 meses?** — _boolean_
  - Por qué: Una pauta prolongada de corticoides puede requerir una dosis de estrés perioperatoria (§5.3).
  - Genera → 📝 nota: si ≥ 5 mg/día de prednisona > 3 semanas (equivalente) → valorar dosis de estrés perioperatoria. _(§5.16.14)_ **[se emite]**
- **¿Cuál?** — _opcion_: Prednisona / Prednisolona / Metilprednisolona / Deflazacort / Dexametasona / Hidrocortisona
- **Dosis diaria** (mg) — _numero_
- **Duración** (semanas) — _numero_

### Asma o EPOC

_Fuente: docs/documento_fuente.md §5.2, §5.16.3, §5.16.4_

- **¿Qué enfermedad respiratoria tiene?** — _opcion_: Asma / EPOC / Ambas
  - Genera → 📊 clase de riesgo: si = EPOC o ambas → sube la clase de riesgo del paciente a moderada. _(§5.2)_
  - Genera → 🅰 ASA: si = EPOC o ambas → ASA mínimo 3. _(§5.2)_
- **Fecha de la última crisis** — _fecha_
- **¿Crisis o agudización en el último mes?** — _boolean_
  - Por qué: Una agudización reciente puede aconsejar posponer la cirugía programada; la intubación puede desencadenar broncoespasmo si no está controlada.
  - Genera → 🔔 alerta amarilla: si = sí → asma no controlada. _(§5.16.3)_ **[se emite]**
- **Visitas a urgencias o ingresos por asma/EPOC en el último año** — _numero_
- **¿Corticoides orales en el último año?** — _boolean_
- **¿Ingresos en el último año?** — _boolean_
  - Genera → 🔔 alerta amarilla: si = sí → asma no controlada. _(§5.16.3)_ **[se emite]**
- **Uso del inhalador de rescate (veces por semana)** — _numero_
  - Por qué: Usar el rescate más de 2 veces por semana indica que el asma no está bien controlada.
  - Genera → 🔔 alerta amarilla: si > 2 veces/semana → asma no controlada. _(§5.16.3)_ **[se emite]**
- **Desencadenantes de las crisis** — _opcion_multiple_: Infecciones / Frío / Estrés / Alergias / Ejercicio / AINE o aspirina / Otros
  - Por qué: Si los AINE o la aspirina desencadenan crisis, deben evitarse en el perioperatorio (alerta).
  - Genera → 🔔 alerta roja: si incluye AINE/aspirina → asma inducida por AINE: evitar AINE perioperatorios. _(§5.16.3)_ **[se emite]**
- **Disnea (escala mMRC), si es EPOC** — _opcion_: 0 — solo con ejercicio intenso / 1 — al andar deprisa o subir cuesta / 2 — anda más despacio que otros de su edad / 3 — para a los 100 m o pocos minutos / 4 — no sale de casa / al vestirse
- **¿Usa oxígeno en casa?** — _boolean_
  - Por qué: La oxigenoterapia domiciliaria sube la clase de riesgo del paciente.
  - Genera → 📊 clase de riesgo: si = sí → sube la clase de riesgo del paciente a alta. _(§5.2)_
  - Genera → 🔔 alerta amarilla: si = sí → oxigenoterapia domiciliaria: validar antes de la intervención. _(§5.16.4)_ **[se emite]**
- **Tipo de oxígeno domiciliario** — _opcion_: Nocturno / Continuo
- **¿Usa CPAP o BiPAP?** — _boolean_
- **¿Tos con expectoración habitual?** — _boolean_
- **¿Cambio reciente en el color o la cantidad del esputo, o síntomas respiratorios nuevos?** — _boolean_
  - Por qué: Un cambio reciente puede indicar infección activa y es uno de los supuestos que indican pedir radiografía de tórax.
  - Genera → 🔔 alerta amarilla: si = sí → posible infección respiratoria activa: valorar posponer la cirugía programada. _(§5.16.4)_ **[se emite]**
  - Genera → 🧪 prueba: si = sí → radiografía de tórax. _(§7.3)_

### Cáncer en tratamiento

_Fuente: docs/documento_fuente.md §5.10, §8.9_

- **Tipo de cáncer** — _texto_
- **Tratamiento en curso** — _opcion_multiple_: Quimioterapia / Inmunoterapia / Antiangiogénico (bevacizumab u otros) / Hormonal / Ninguno ahora
- **Fecha de la última dosis del tratamiento sistémico** — _fecha_
  - Por qué: Los antiangiogénicos requieren separar la cirugía al menos 6-8 semanas de la última dosis.
- **¿Ha recibido antraciclinas o trastuzumab?** — _boolean_
  - Por qué: Estos fármacos pueden dañar el corazón: conviene revisar un ecocardiograma reciente.
- **¿Radioterapia en cuello o tórax?** — _boolean_
  - Por qué: La radioterapia cervical puede dificultar la vía aérea (alerta).

### Cardiopatía isquémica / infarto

_Fuente: docs/documento_fuente.md §5.1_

- **¿Ha tenido un infarto o un síndrome coronario agudo?** — _boolean_
  - Por qué: Un infarto reciente aumenta el riesgo perioperatorio y cambia el manejo de la medicación del corazón.
- **Fecha del infarto o síndrome coronario agudo** — _fecha_
  - Por qué: Un infarto de menos de 60 días aconseja posponer la cirugía programada.
  - Genera → 🔔 alerta roja: si infarto hace menos de 60 días → infarto de miocardio hace menos de 60 días: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **¿Le han revascularizado las arterias del corazón?** — _opcion_: No / Sí, con cateterismo (angioplastia/stent) / Sí, con cirugía (bypass)
- **¿La revascularización fue completa o incompleta?** — _opcion_: Completa / Incompleta / No lo sabe
- **¿Le pusieron un stent (muelle) en las arterias del corazón?** — _boolean_
  - Por qué: El tipo de stent y el tiempo desde su colocación determinan si se puede suspender la antiagregación.
  - Genera → ℹ dato: si = sí → stent coronario: condiciona la antiagregación y puede obligar a diferir la cirugía (§8). _(§5.1)_
- **Fecha del stent** — _fecha_
- **Tipo de stent** — _opcion_: Farmacoactivo (liberador de fármaco) / Convencional (metálico) / Desconocido
- **Motivo del stent** — _opcion_: Programado (procedimiento electivo) / Por síndrome coronario agudo (infarto/angina inestable)
- **¿Tiene angina (dolor u opresión en el pecho al esforzarse) actualmente?** — _boolean_
- **¿Con qué esfuerzo le aparece la angina?** — _opcion_: Solo con grandes esfuerzos / Con esfuerzos moderados / Con mínimos esfuerzos / En reposo
  - Genera → 📊 clase de riesgo: si = mínimos esfuerzos o reposo → sube la clase de riesgo del paciente a alta (angina activa). _(§5.1)_
  - Genera → 🅰 ASA: si = mínimos esfuerzos o reposo → ASA mínimo 4 (angina activa). _(§5.1)_
  - Genera → 🔔 alerta roja: si = mínimos esfuerzos o reposo → angina con mínimos esfuerzos o en reposo: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **¿La angina ha cambiado (más frecuente o más intensa) en las últimas semanas?** — _boolean_
  - Por qué: Una angina que cambia recientemente puede indicar isquemia inestable: es una señal de alerta.
  - Genera → 🔔 alerta roja: si = sí → posible isquemia inestable. _(§5.1)_ **[se emite]**
- **Última prueba de esfuerzo o de detección de isquemia** — _opcion_: No se ha hecho / Negativa / Positiva / No concluyente
- **Fecha de la prueba de isquemia** — _fecha_
- **Fecha del último ecocardiograma** — _fecha_
- **Fracción de eyección (FEVI), si se conoce** (%) — _numero_
- **Cardiólogo de referencia** — _texto_

### Depresión o ansiedad

_Fuente: docs/documento_fuente.md §5.6_

- **Diagnóstico** — _texto_
- **¿Toma un IMAO o litio?** — _boolean_
  - Por qué: Los IMAO y el litio tienen reglas específicas de manejo perioperatorio.

### Dermatomiositis o polimiositis

_Fuente: docs/documento_fuente.md §5.8, §5.16.13_

- **¿Debilidad en el cuello o dificultad para tragar?** — _boolean_
  - Por qué: Aumenta el riesgo de aspiración durante la anestesia.
  - Genera → 🔔 alerta amarilla: si = sí → riesgo de aspiración. _(§5.16.13)_ **[se emite]**
- **¿Falta de aire o fatiga inusual al caminar?** — _boolean_
  - Por qué: Puede indicar afectación de los músculos respiratorios o del pulmón.
  - Genera → 🔔 alerta amarilla: si = sí → posible afectación respiratoria. _(§5.16.13)_ **[se emite]**
- **¿Problemas de corazón conocidos?** — _boolean_
  - Por qué: Estas enfermedades pueden inflamar el corazón (miocarditis).
  - Genera → 🔔 alerta amarilla: si = sí → posible miocarditis. _(§5.16.13)_ **[se emite]**
- **¿Ha tomado corticoides (cortisona) en los últimos 3 meses?** — _boolean_
  - Por qué: Una pauta prolongada de corticoides puede requerir una dosis de estrés perioperatoria (§5.3).
  - Genera → 📝 nota: si ≥ 5 mg/día de prednisona > 3 semanas (equivalente) → valorar dosis de estrés perioperatoria. _(§5.16.14)_ **[se emite]**
- **¿Cuál?** — _opcion_: Prednisona / Prednisolona / Metilprednisolona / Deflazacort / Dexametasona / Hidrocortisona
- **Dosis diaria** (mg) — _numero_
- **Duración** (semanas) — _numero_

### Demencia o deterioro cognitivo

_Fuente: docs/documento_fuente.md §5.6, §5.16.5_

- **Cuidador principal** — _texto_
- **Representante legal** — _texto_
- **¿Puede otorgar el consentimiento?** — _opcion_: Sí / No / Dudosa
  - Por qué: Si no puede consentir, el consentimiento lo firma su representante legal.
  - Genera → 🔔 alerta amarilla: si = no o dudosa → consentimiento por representante legal. _(§5.16.5)_ **[se emite]**
- **Nivel de dependencia** — _opcion_: Independiente / Dependencia parcial / Dependencia total
- **¿Episodios previos de agitación, delirio o desorientación nocturna?** — _boolean_
  - Por qué: Son un factor de riesgo importante de delirium después de la operación.
  - Genera → 🔔 alerta amarilla: si = sí → alto riesgo de delirium postoperatorio. _(§5.16.5)_ **[se emite]**

### Diabetes

_Fuente: docs/documento_fuente.md §5.3, §5.16.2, §8.5_

- **Tipo de diabetes** — _opcion_: Tipo 1 / Tipo 2 / Otra / no lo sabe
- **Años de evolución** — _numero_
- **HbA1c más reciente** (%) — _numero_
  - Por qué: Una HbA1c > 8,5 % indica mal control y puede aconsejar optimizar antes de una cirugía programada.
  - Genera → 📊 clase de riesgo: si > 8,5 % → sube la clase de riesgo del paciente a moderada. _(§5.3)_
  - Genera → 🅰 ASA: si > 8,5 % → ASA mínimo 3; en otro caso, mínimo 2. _(§5.3)_
  - Genera → 🔔 alerta roja: si > 8,5 % → HbA1c > 8,5 % (mal control): valorar posponer la cirugía programada para optimizar. _(§5.3 (ESC 2022))_ **[se emite]**
- **Fecha de la HbA1c** — _fecha_
- **Tratamiento** — _opcion_: Solo dieta / Pastillas / Insulina / Pastillas e insulina
- **Frecuencia de hipoglucemias (bajadas de azúcar)** — _opcion_: Nunca / Alguna al mes / Alguna a la semana / A diario
  - Por qué: El ayuno y los ajustes de insulina aumentan el riesgo de hipoglucemia; conviene conocer su frecuencia.
  - Genera → 🔔 alerta amarilla: si = semanal o diaria → hipoglucemias frecuentes o inadvertidas. _(§5.16.2)_ **[se emite]**
- **¿Nota cuándo le baja el azúcar?** — _boolean_
  - Por qué: Las hipoglucemias inadvertidas son especialmente peligrosas en el ayuno perioperatorio.
  - Genera → 🔔 alerta amarilla: si = no (no las detecta) → hipoglucemias frecuentes o inadvertidas. _(§5.16.2)_ **[se emite]**
- **Complicaciones crónicas** — _opcion_multiple_: Cardiopatía isquémica / Nefropatía / Pie diabético / Vasculopatía de extremidades / Retinopatía
  - Genera → 🧪 prueba: si incluye nefropatía → cuenta como proteinuria/nefropatía: apoya pedir bioquímica renal. _(§7.3)_
- **¿Síntomas de gastroparesia (náuseas/vómitos de comida sin digerir, saciedad precoz, distensión, glucemias erráticas)?** — _boolean_
  - Por qué: La gastroparesia alarga el ayuno de sólidos y aconseja premedicación con metoclopramida.
  - Genera → 📝 nota: si = sí → alarga el ayuno de sólidos; valorar premedicación con metoclopramida. _(§5.3)_ **[se emite]**
- **¿Hipoglucemias frecuentes?** — _boolean_
- **¿Lleva bomba de insulina o sensor de glucosa?** — _opcion_: No / Bomba de insulina / Sensor / Bomba y sensor

### Distrofia o enfermedad neuromuscular

_Fuente: docs/documento_fuente.md §5.6, §5.16.11_

- **Tipo** — _opcion_: Distrofia de Duchenne / Distrofia de Becker / Distrofia miotónica / Miastenia gravis / Otra
  - Genera → 📝 nota: si = Duchenne o Becker → evitar succinilcolina y valorar evitar halogenados. _(§5.16.11)_ **[se emite]**
- **¿Le cuesta respirar tumbado o usa ventilación nocturna (BiPAP)?** — _boolean_
  - Por qué: La debilidad de los músculos respiratorios aumenta el riesgo de insuficiencia respiratoria tras la anestesia.
  - Genera → 🔔 alerta roja: si = sí → riesgo de insuficiencia respiratoria postoperatoria. _(§5.16.11)_ **[se emite]**
- **Fecha del último ecocardiograma** — _fecha_
  - Por qué: Muchas distrofias afectan al corazón; sin ecocardiograma en los últimos 12 meses conviene valorarlo.
  - Genera → 📝 nota: si sin ecocardiograma en 12 meses → valorar ecocardiograma. _(§5.16.11)_ **[se emite]**
- **¿Fiebre muy alta o complicaciones graves en una anestesia, en usted o su familia?** — _boolean_
  - Por qué: Puede indicar susceptibilidad a hipertermia maligna o a reacciones musculares graves.
  - Genera → 🔔 alerta roja: si = sí → sospecha de hipertermia maligna o reacción muscular grave. _(§5.16.11)_ **[se emite]**

### Dolor crónico

_Fuente: docs/documento_fuente.md §5.7, §5.16.7_

- **Localización del dolor** — _texto_
- **Posturas en las que el dolor es insoportable o zonas sin sensibilidad** — _texto_
  - Por qué: Ayuda a colocar al paciente en el quirófano evitando posturas dolorosas o zonas con déficit.
- **¿Tiene un déficit neurológico previo?** — _boolean_
  - Por qué: Debe quedar documentado antes de la anestesia para poder compararlo después.
- **Descripción del déficit neurológico** — _texto_

### Enfermedad hepática / cirrosis

_Fuente: docs/documento_fuente.md §5.4_

- **Causa** — _opcion_: Alcohol / Viral (hepatitis B/C) / Metabólica (hígado graso) / Otra / no lo sabe
- **¿Tiene cirrosis?** — _boolean_
  - Por qué: La hepatopatía conocida hace que se añadan transaminasas y bilirrubina a la analítica.
- **¿Ascitis (líquido en el abdomen)?** — _boolean_
  - Por qué: La cirrosis con ascitis es hepatopatía descompensada: aconseja validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. _(§5.4)_ **[se emite]**
- **¿Varices esofágicas conocidas?** — _boolean_
  - Por qué: La cirrosis con varices es hepatopatía descompensada: aconseja validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. _(§5.4)_ **[se emite]**
- **¿Episodios de encefalopatía (confusión)?** — _boolean_
  - Por qué: La cirrosis con encefalopatía es hepatopatía descompensada: aconseja validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. _(§5.4)_ **[se emite]**
- **¿Plaquetas bajas conocidas?** — _boolean_

### Enfermedad inflamatoria intestinal

_Fuente: docs/documento_fuente.md §5b, §5.16.14, §8.8_

- **Tipo** — _opcion_: Enfermedad de Crohn / Colitis ulcerosa
- **Si toma inmunosupresores, ¿por qué motivo?** — _opcion_: Enfermedad autoinmune / Enfermedad sistémica grave
  - Por qué: La suspensión de los inmunosupresores clásicos depende de la indicación.
- **¿Ha tomado corticoides (cortisona) en los últimos 3 meses?** — _boolean_
  - Por qué: Una pauta prolongada de corticoides puede requerir una dosis de estrés perioperatoria (§5.3).
  - Genera → 📝 nota: si ≥ 5 mg/día de prednisona > 3 semanas (equivalente) → valorar dosis de estrés perioperatoria. _(§5.16.14)_ **[se emite]**
- **¿Cuál?** — _opcion_: Prednisona / Prednisolona / Metilprednisolona / Deflazacort / Dexametasona / Hidrocortisona
- **Dosis diaria** (mg) — _numero_
- **Duración** (semanas) — _numero_

### Enfermedad renal crónica

_Fuente: docs/documento_fuente.md §5.4, §6.7_

- **Estadio o filtrado conocido** — _opcion_: No lo sabe / Leve (filtrado > 60) / Moderada (filtrado 30-60) / Grave (filtrado 15-30) / Terminal (filtrado < 15)
  - Genera → 📊 clase de riesgo: si = terminal → sube la clase de riesgo del paciente a alta. _(§5.4)_
  - Genera → 🅰 ASA: si = terminal → ASA mínimo 4 (moderada/grave: mínimo 3). _(§5.4)_
  - Genera → 🔔 alerta amarilla: si = terminal (filtrado < 15) → enfermedad renal terminal (filtrado < 15): validar antes de la intervención. _(§5.4)_ **[se emite]**
- **Creatinina más reciente** (mg/dL) — _numero_
  - Por qué: La creatinina permite calcular el aclaramiento, del que dependen los plazos de varios anticoagulantes.
- **Fecha de esa creatinina** — _fecha_
- **¿Está en diálisis?** — _opcion_: No / Sí, hemodiálisis / Sí, diálisis peritoneal
  - Por qué: La enfermedad renal en diálisis aconseja validar el momento y la coordinación con nefrología antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = en hemodiálisis o peritoneal → enfermedad renal en diálisis: validar antes de la intervención. _(§5.4)_ **[se emite]**
- **Días de diálisis y brazo de la fístula** — _texto_
- **¿Tiene un trasplante renal?** — _boolean_
- **¿Tiene proteinuria o nefropatía conocida?** — _boolean_
  - Por qué: La proteinuria/nefropatía hace que los IECA/ARA-II se mantengan el día de la cirugía.
  - Genera → 💊 regla: si = sí → los IECA/ARA-II se mantienen el día de la cirugía. _(§8)_

### Epilepsia

_Fuente: docs/documento_fuente.md §5.6, §5.16.9_

- **Fecha aproximada de la última crisis** — _fecha_
  - Por qué: Una crisis en el último mes indica epilepsia no bien controlada.
  - Genera → 🔔 alerta amarilla: si crisis en el último mes → epilepsia no controlada. _(§5.16.9)_ **[se emite]**
- **Frecuencia de las crisis** — _opcion_: Diaria / Semanal / Mensual / Anual / Menos de una al año
- **Tipo de crisis** — _opcion_: Generalizada tónico-clónica / Focal con pérdida de conciencia / Focal sin pérdida de conciencia / Ausencias / Desconocido
- **¿Tiene aura o pródromos antes de la crisis?** — _boolean_
- **Desencadenantes** — _opcion_multiple_: Falta de sueño / Estrés / Fiebre / Luces parpadeantes / Alcohol / Olvido de la medicación / Otros
- **¿Ha tenido un estatus epiléptico (crisis muy prolongada)?** — _boolean_
  - Por qué: Un estatus previo o crisis recientes indican epilepsia no controlada: no debe omitirse la medicación.
  - Genera → 🔔 alerta amarilla: si = sí → epilepsia no controlada. _(§5.16.9)_ **[se emite]**

### Esclerosis múltiple

_Fuente: docs/documento_fuente.md §5.6, §5.16.12_

- **Fecha del último brote** — _fecha_
  - Por qué: Un brote en los últimos 3 meses es una señal de alerta.
  - Genera → 🔔 alerta amarilla: si brote en los últimos 3 meses → brote reciente de esclerosis múltiple. _(§5.16.12)_ **[se emite]**
- **Síntomas del último brote** — _texto_
- **Movilidad habitual** — _opcion_: Camina sin ayuda / Camina con ayuda / Silla de ruedas / Encamado
  - Por qué: La movilidad y la debilidad basales deben quedar documentadas para comparar tras la anestesia.
- **Debilidad basal (descripción)** — _texto_
- **¿Empeora con el calor (fenómeno de Uhthoff)?** — _boolean_
  - Por qué: Si empeora con el calor, conviene mantener una normotermia estricta durante la cirugía.
  - Genera → 📝 nota: si = sí → mantener normotermia estricta. _(§5.16.12)_ **[se emite]**
- **¿Ha tomado corticoides (cortisona) en los últimos 3 meses?** — _boolean_
  - Por qué: Una pauta prolongada de corticoides puede requerir una dosis de estrés perioperatoria (§5.3).
  - Genera → 📝 nota: si ≥ 5 mg/día de prednisona > 3 semanas (equivalente) → valorar dosis de estrés perioperatoria. _(§5.16.14)_ **[se emite]**
- **¿Cuál?** — _opcion_: Prednisona / Prednisolona / Metilprednisolona / Deflazacort / Dexametasona / Hidrocortisona
- **Dosis diaria** (mg) — _numero_
- **Duración** (semanas) — _numero_

### Fibrilación auricular / arritmia

_Fuente: docs/documento_fuente.md §5.1, §6.5_

- **Tipo de arritmia** — _opcion_: Fibrilación auricular paroxística / Fibrilación auricular persistente / Fibrilación auricular permanente / Flutter auricular / Otra arritmia
- **¿Ha tenido un ictus, un AIT o una embolia?** — _boolean_
  - Por qué: Un ictus/AIT reciente (menos de 3 meses) con FA es criterio de alto riesgo y puede requerir terapia puente.
- **Fecha del ictus/AIT/embolia** — _fecha_
  - Por qué: Un ictus/AIT de menos de 3 meses es alerta roja (valorar posponer la cirugía programada).
  - Genera → 🔔 alerta roja: si ictus/AIT en los últimos 3 meses → ictus o AIT de menos de 3 meses: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **¿Palpitaciones o síncope (desmayo) recientes?** — _boolean_
  - Por qué: Las palpitaciones o síncopes recientes con una arritmia aconsejan validar el control del ritmo antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → arritmia con palpitaciones o síncope recientes: validar antes de la intervención. _(§5.1)_ **[se emite]**
- **¿Bloqueo cardiaco conocido sin marcapasos?** — _boolean_
  - Por qué: Un bloqueo cardiaco conocido sin marcapasos aconseja validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → bloqueo cardiaco conocido sin marcapasos: validar antes de la intervención. _(§5.1)_ **[se emite]**

### Hipertensión pulmonar

_Fuente: docs/documento_fuente.md §5.2_

- **¿Tiene diagnóstico de hipertensión pulmonar?** — _boolean_
  - Por qué: La hipertensión pulmonar aumenta mucho el riesgo anestésico y es una señal de alerta (§5.2). Cuenta como comorbilidad cardiovascular para pedir BNP o NT-proBNP (§7.3).
  - Genera → 🔔 alerta amarilla: si = sí → hipertensión pulmonar: valorar antes de la intervención. _(§5.2)_ **[se emite]**
- **Tratamiento específico (si lo tiene)** — _texto_

### Enfermedades endocrinas (tiroides, suprarrenal)

_Fuente: docs/documento_fuente.md §5.3_

- **Tipo de problema tiroideo** — _opcion_: Hipotiroidismo / Hipertiroidismo / Sin problema tiroideo
- **¿Tiene bocio grande o le han operado del tiroides?** — _boolean_
  - Por qué: El bocio grande o la cirugía tiroidea previa pueden dificultar la vía aérea (señal de alerta).
- **Fecha del último control** — _fecha_
- **¿Tiene un feocromocitoma o paraganglioma?** — _boolean_
  - Por qué: El feocromocitoma exige preparación específica (bloqueo alfa) y coordinación antes de la cirugía: punto de validación.
  - Genera → 🔔 alerta amarilla: si = sí → feocromocitoma: validar la preparación (bloqueo alfa) antes de la intervención. _(§5.3)_ **[se emite]**
- **¿Tiene insuficiencia suprarrenal (enfermedad de Addison o tratamiento con corticoides por el suprarrenal)?** — _boolean_
  - Por qué: La insuficiencia suprarrenal exige dosis de estrés de corticoides perioperatoria: punto de validación.
  - Genera → 🔔 alerta amarilla: si = sí → insuficiencia suprarrenal: validar la pauta de corticoides de estrés antes de la intervención. _(§5.3)_ **[se emite]**

### Hipertensión arterial

_Fuente: docs/documento_fuente.md §5.1, §5.16.1_

- **Años de evolución** — _numero_
- **Cifras habituales en casa (p. ej. 130/80)** — _texto_
- **¿Está bien controlada?** — _opcion_: Bien controlada / Mal controlada / No lo sabe
  - Genera → 🅰 ASA: si = mal → ASA mínimo 3 (HTA mal controlada); en otro caso, mínimo 2. _(§5.16.1)_
- **Síntomas de mal control** — _opcion_multiple_: Cefalea frecuente / Acúfenos (pitidos en los oídos) / Visión borrosa
  - Por qué: Cefalea, acúfenos o visión borrosa pueden indicar que la tensión no está bien controlada.
  - Genera → 🔔 alerta amarilla: si alguno marcado → posible HTA mal controlada. _(§5.16.1)_ **[se emite]**
- **Tensión medida hoy en la consulta** — _opcion_: Menor de 180/110 / 180/110 o más / No medida
  - Por qué: Una tensión ≥ 180/110 en la consulta aconseja validar el control antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = 180/110 o más → tensión arterial ≥ 180/110 en la consulta: validar antes de la intervención. _(§5.16.1)_ **[se emite]**

### Ictus/AIT y trombosis venosa (TVP/TEP)

_Fuente: docs/documento_fuente.md §5.1_

- **¿Ha tenido un ictus o un AIT?** — _boolean_
- **Fecha del ictus/AIT** — _fecha_
  - Por qué: Menos de 3 meses desde el ictus/AIT es una señal de alerta.
  - Genera → 🔔 alerta roja: si ictus/AIT en los últimos 3 meses → ictus o AIT de menos de 3 meses: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **Secuelas** — _texto_
- **¿Ha tenido una trombosis venosa (TVP) o una embolia de pulmón (TEP)?** — _boolean_
- **Fecha de la TVP/TEP** — _fecha_
  - Por qué: Una TVP/TEP de menos de 3 meses es criterio de alto riesgo trombótico (posible terapia puente).
  - Genera → 🔔 alerta amarilla: si TVP/TEP en los últimos 3 meses → TVP o TEP de menos de 3 meses: valorar antes de la intervención. _(§5.1)_ **[se emite]**

### Infección respiratoria reciente

_Fuente: docs/documento_fuente.md §5.2, §5.12, §5.16.8_

- **Síntomas actuales** — _opcion_multiple_: Fiebre / Dolor de garganta / Malestar general / Mucosidad abundante / Tos productiva
  - Por qué: Una infección respiratoria activa aumenta el riesgo de complicaciones y puede aconsejar posponer la cirugía programada.
  - Genera → 🔔 alerta amarilla: si fiebre o tos productiva (infección activa) → infección respiratoria activa: valorar posponer la cirugía programada (§5.2, §5.12). _(§5.16.8)_ **[se emite]**
- **Días de evolución** — _numero_

### Insuficiencia cardiaca

_Fuente: docs/documento_fuente.md §5.1_

- **Clase funcional (NYHA)** — _opcion_: I — sin síntomas con la actividad normal / II — síntomas con esfuerzos moderados / III — síntomas con pequeños esfuerzos / IV — síntomas en reposo
  - Por qué: La clase NYHA describe cuánto le limita el corazón y sube la clase de riesgo del paciente.
  - Genera → 📊 clase de riesgo: si = III o IV → sube la clase de riesgo del paciente a alta. _(§5.1)_
  - Genera → 🅰 ASA: si = III o IV → ASA mínimo 4. _(§5.1)_
  - Genera → 🔔 alerta roja: si = III o IV → insuficiencia cardiaca muy sintomática (NYHA III-IV): valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **Fracción de eyección (FEVI), si se conoce** (%) — _numero_
  - Por qué: Una FEVI reducida (≤ 40 %) hace que los IECA/ARA-II se mantengan el día de la cirugía.
  - Genera → 💊 regla: si ≤ 40 % → los IECA/ARA-II se mantienen el día de la cirugía. _(§8)_
- **¿Le han dicho que tiene el corazón «débil» o con la función disminuida (disfunción sistólica)?** — _boolean_
  - Genera → 💊 regla: si = sí → los IECA/ARA-II se mantienen el día de la cirugía. _(§8)_
- **Fecha del último ingreso por insuficiencia cardiaca** — _fecha_
  - Por qué: Un ingreso por insuficiencia cardiaca en los últimos 3 meses indica una posible descompensación: puede aconsejar posponer la cirugía programada.
  - Genera → 🔔 alerta roja: si ingreso en los últimos 3 meses → ingreso por insuficiencia cardiaca en los últimos 3 meses: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **¿Ha empeorado últimamente (más ahogo, más hinchazón o más fatiga que de costumbre)?** — _boolean_
  - Por qué: Un empeoramiento reciente sugiere una insuficiencia cardiaca descompensada: puede aconsejar posponer la cirugía programada.
  - Genera → 🔔 alerta roja: si = sí → empeoramiento reciente de la insuficiencia cardiaca: valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**
- **¿Necesita dormir incorporado o con varias almohadas (ortopnea)?** — _boolean_
- **¿Tiene hinchazón de piernas (edemas)?** — _boolean_
- **Fecha del último ecocardiograma** — _fecha_

### Lupus u otra conectivopatía

_Fuente: docs/documento_fuente.md §5.8, §5.16.13_

- **Órganos afectados** — _opcion_multiple_: Riñón / Corazón / Pulmón / Sistema nervioso / Hematológico / Piel y articulaciones
  - Por qué: La afectación de riñón, corazón o pulmón cambia las pruebas y el riesgo.
  - Genera → 📝 nota: si incluye riñón → valorar creatinina y sedimento urinario. _(§5.16.13)_ **[se emite]**
- **¿Trombosis previa o síndrome antifosfolípido?** — _boolean_
  - Por qué: El síndrome antifosfolípido es criterio de alto riesgo trombótico; márquelo también en el módulo de trombofilia.
  - Genera → ℹ dato: si = sí → criterio de alto riesgo trombótico (enlaza con trombofilia §8.1). _(§5.16.13)_
- **¿Anemia o plaquetas bajas recientes?** — _boolean_
  - Por qué: Motiva hemograma y coagulación aunque la tabla no los pida.
  - Genera → 🔔 alerta amarilla: si = sí → anemia o plaquetopenia recientes. _(§5.16.13)_ **[se emite]**
  - Genera → 🧪 prueba: si = sí → hemograma y coagulación. _(§5.16.13)_
- **¿Ha tomado corticoides (cortisona) en los últimos 3 meses?** — _boolean_
  - Por qué: Una pauta prolongada de corticoides puede requerir una dosis de estrés perioperatoria (§5.3).
  - Genera → 📝 nota: si ≥ 5 mg/día de prednisona > 3 semanas (equivalente) → valorar dosis de estrés perioperatoria. _(§5.16.14)_ **[se emite]**
- **¿Cuál?** — _opcion_: Prednisona / Prednisolona / Metilprednisolona / Deflazacort / Dexametasona / Hidrocortisona
- **Dosis diaria** (mg) — _numero_
- **Duración** (semanas) — _numero_

### Marcapasos o DAI (dispositivo cardiaco implantable)

_Fuente: docs/documento_fuente.md §5.1 bis (British Heart Rhythm Society, Thomas et al., Anaesthesia 2022;77:808-17)_

- **Tipo de dispositivo** — _opcion_: Marcapasos convencional / Marcapasos sin cables (tipo Micra) / Desfibrilador automático (DAI) / DAI subcutáneo (S-ICD) / Resincronizador sin desfibrilador (TRC-P) / Resincronizador con desfibrilador (TRC-D) / Holter implantable o registrador de eventos / No lo sabe
  - Por qué: El tipo de dispositivo determina las precauciones perioperatorias y la respuesta al imán.
- **Motivo del implante** — _opcion_: Bloqueo cardiaco / Ritmo lento o enfermedad del seno / Ablación del nodo AV / Insuficiencia cardiaca (resincronización) / Arritmia ventricular o riesgo de muerte súbita / Estudio de síncope o palpitaciones (Holter) / No lo sabe
  - Por qué: El motivo ayuda a estimar si el paciente puede ser dependiente del marcapasos (p. ej. bloqueo o ablación del nodo AV).
- **Fabricante** — _opcion_: Medtronic / Boston Scientific / Biotronik / Abbott (St. Jude) / MicroPort (LivaNova/Sorin) / Otro / No lo sabe
  - Por qué: La colocación del imán y su efecto dependen del fabricante. Suele figurar en la tarjeta del dispositivo que lleva el paciente.
- **Localización del generador** — _opcion_: Debajo de la clavícula izquierda / Debajo de la clavícula derecha / Lateral del tórax o axila (S-ICD) / Abdomen / Otra
- **Hospital donde le implantaron el dispositivo** — _texto_
- **Hospital donde le hacen el seguimiento** — _texto_
- **Fecha de la última revisión del dispositivo** — _fecha_
  - Por qué: El dispositivo debe estar revisado antes de la cirugía: marcapasos en los últimos 12 meses, DAI o resincronizador en los últimos 6 meses. La revisión a distancia cuenta igual.
- **¿La última revisión fue a distancia (telemonitorización)?** — _boolean_
- **¿Le han dicho que la batería se está agotando o que hay que cambiarlo pronto?** — _opcion_: No / Sí / No lo sabe
  - Por qué: Una batería próxima a agotarse puede alterar la respuesta del dispositivo durante la cirugía.
- **¿El dispositivo forma parte de un ensayo clínico?** — _boolean_
  - Por qué: Un dispositivo en ensayo clínico puede comportarse de forma no estándar; conviene coordinar con la unidad de arritmias.
- **¿Le han dicho en la consulta de marcapasos que es dependiente del marcapasos?** — _opcion_: Sí / No / No lo sabe
  - Por qué: La dependencia del marcapasos cambia las precauciones (riesgo de interferencia del bisturí eléctrico). Solo la confirma la consulta que sigue el dispositivo.

### Miocardiopatía

_Fuente: docs/documento_fuente.md §5.1_

- **Tipo de miocardiopatía (si lo conoce)** — _opcion_: Dilatada / Hipertrófica / Restrictiva / Otra o no la sabe
- **Fecha del último ecocardiograma** — _fecha_
- **¿Disnea, síncope o palpitaciones recientes?** — _boolean_
  - Por qué: La miocardiopatía cuenta como comorbilidad cardiovascular para pedir BNP o NT-proBNP (§7.3). Los síntomas recientes aconsejan valorarla antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → miocardiopatía sintomática: valorar antes de la intervención. _(§5.1)_ **[se emite]**

### Obesidad

_Fuente: docs/documento_fuente.md §5.3_

- **Observaciones (el IMC se calcula con el peso y la talla del paso 2)** — _texto_
  - Por qué: El grado de obesidad se obtiene del IMC; un IMC ≥ 40 es una alerta y sube la clase de riesgo.

### Obstetricia (embarazo)

_Fuente: docs/documento_fuente.md §5.13_

- **Semanas de gestación** (semanas) — _numero_
  - Por qué: A partir de las 20 semanas el ayuno se individualiza y se añade profilaxis de aspiración.
  - Genera → 📝 nota: si ≥ 20 semanas → embarazo ≥ 20 semanas: ayuno individualizado y profilaxis de aspiración. _(§5.13)_ **[se emite]**
- **¿Embarazo múltiple (gemelar o más)?** — _boolean_
  - Por qué: El embarazo múltiple aumenta el riesgo de hemorragia y de hipotensión.
  - Genera → 📝 nota: si = sí → embarazo múltiple: mayor riesgo de hemorragia y de hipotensión. _(§5.13)_ **[se emite]**
- **¿Preeclampsia o hipertensión gestacional?** — _boolean_
  - Por qué: La preeclampsia o la HTA gestacional aconsejan validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = sí → preeclampsia o HTA gestacional: validar antes de la intervención. _(§5.13)_ **[se emite]**
- **Plaquetas de la última analítica** (×10⁹/L) — _numero_
  - Por qué: Una plaquetopenia < 80.000/µL condiciona la técnica neuroaxial: aconseja validar antes de la intervención.
- **¿Diabetes gestacional?** — _boolean_
  - Por qué: La diabetes gestacional cambia el manejo del ayuno y de la glucemia.
- **Tratamiento de la diabetes gestacional** — _opcion_: Solo dieta / Metformina / Insulina
  - Genera → 📝 nota: si = insulina → diabetes gestacional con insulina: aplicar la pauta de insulina y el control de glucemia del ayuno. _(§5.13)_ **[se emite]**
- **¿Problemas de columna?** — _opcion_: Ninguno / Cirugía de columna previa / Escoliosis / Otros
  - Por qué: Los problemas de columna pueden dificultar la técnica neuroaxial.
  - Genera → 📝 nota: si = cirugía, escoliosis u otros → problemas de columna: valorar la técnica neuroaxial. _(§5.13)_ **[se emite]**
- **Número de cesáreas previas** — _numero_
  - Por qué: Las cesáreas previas aumentan el riesgo de acretismo si hay placenta previa.
- **¿Dificultad previa con la epidural o la raquídea?** — _boolean_
  - Por qué: Una dificultad previa con la técnica neuroaxial conviene tenerla en cuenta al planificarla.
  - Genera → 📝 nota: si = sí → dificultad previa con la epidural/raquídea: valorar la técnica neuroaxial. _(§5.13)_ **[se emite]**
- **¿Placenta previa o sospecha de acretismo?** — _boolean_
  - Por qué: La placenta previa o el acretismo conllevan riesgo de hemorragia masiva: aconsejan reservar hemoderivados y planificar la cirugía.

### Parkinson

_Fuente: docs/documento_fuente.md §5.6, §5.16.10_

- **Horario de la levodopa (no debe omitirse)** — _texto_
  - Por qué: La levodopa no se suspende; conviene conocer su horario para no interrumpirla.
- **¿Dificultad para tragar o mal manejo de la saliva?** — _boolean_
  - Por qué: Aumenta el riesgo de aspiración durante la anestesia.
  - Genera → 🔔 alerta amarilla: si = sí → riesgo de aspiración. _(§5.16.10)_ **[se emite]**
- **¿Mareo intenso al ponerse de pie?** — _boolean_
  - Por qué: Indica disfunción autonómica, con riesgo de bajadas graves de tensión durante la anestesia.
  - Genera → 🔔 alerta amarilla: si = sí → disfunción autonómica (riesgo de hipotensión). _(§5.16.10)_ **[se emite]**

### Pediatría

_Fuente: docs/documento_fuente.md §5.12, §6.3, §6.4_

- **¿Nació prematuro (antes de las 37 semanas)?** — _boolean_
  - Por qué: En lactantes con edad posconcepcional < 60 semanas hay riesgo de apnea postoperatoria.
- **Semanas de gestación al nacer** (semanas) — _numero_
- **¿Ha tenido catarro, mocos o tos en las últimas 2 a 4 semanas?** — _boolean_
  - Por qué: Una infección respiratoria de vías altas reciente puede aconsejar revalorar el día de la intervención (§5.12).
- **Síntomas actuales** — _opcion_multiple_: Fiebre / Mocos espesos o amarillentos / Tos con mucosidad
- **¿Ronca más de la mitad de las noches?** — _boolean_
  - Por qué: Componente del STBUR, escala de riesgo respiratorio en niños (§6.3).
- **¿Ronca fuerte?** — _boolean_
  - Por qué: Componente del STBUR (§6.3).
- **¿Se le oye esforzarse para respirar mientras duerme?** — _boolean_
  - Por qué: Componente del STBUR (§6.3).
- **¿Le han visto dejar de respirar mientras duerme?** — _boolean_
  - Por qué: Componente del STBUR (§6.3).
- **¿Se levanta cansado o está somnoliento durante el día?** — _boolean_
  - Por qué: Componente del STBUR (§6.3).
- **¿Padres o hermanos con náuseas o vómitos importantes tras una anestesia?** — _boolean_
  - Por qué: El antecedente familiar de NVPO suma en la escala POVOC del niño (§6.4).
- **¿Tiene una cardiopatía congénita?** — _boolean_
  - Por qué: Requiere valoración específica por el anestesiólogo: punto de validación (§5.12).
  - Genera → 🔔 alerta amarilla: si = sí → cardiopatía congénita (paciente pediátrico): validar antes de la intervención. _(§5.12)_ **[se emite]**
- **Diagnóstico y si está corregida** — _texto_
- **¿Tiene algún síndrome (por ejemplo, síndrome de Down)?** — _boolean_
  - Por qué: Algunos síndromes se asocian a vía aérea difícil o inestabilidad cervical (§5.12).
- **¿Cuál?** — _texto_
- **¿Ha recibido alguna vacuna en la última semana?** — _boolean_
- **¿El niño o los padres están muy nerviosos o creen que necesitará premedicación?** — _boolean_
  - Por qué: Se registra para que el anestesiólogo valore la premedicación (§5.12).

### Reflujo gastroesofágico

_Fuente: docs/documento_fuente.md §5.9, §8.14_

- **¿Cómo es el reflujo?** — _opcion_: Leve u ocasional / Grave / frecuente
- **¿Está con síntomas estos días?** — _boolean_
  - Por qué: El reflujo grave sintomático el día de la cirugía es una alerta de estómago lleno.
- **¿Toma tratamiento para el reflujo?** — _boolean_

### Apnea del sueño (SAOS)

_Fuente: docs/documento_fuente.md §5.2, §6.3_

- **¿Tiene diagnóstico confirmado de apnea del sueño?** — _boolean_
  - Por qué: Con diagnóstico confirmado no hace falta calcular STOP-Bang; sin diagnóstico, se calcula.
- **¿Usa CPAP o BiPAP?** — _boolean_
- **¿La usa la mayoría de las noches?** — _boolean_
  - Por qué: Un SAOS diagnosticado que no usa la CPAP aconseja validar antes de la intervención.
  - Genera → 🔔 alerta amarilla: si = no la usa habitualmente → SAOS diagnosticado que no usa la CPAP habitualmente: validar antes de la intervención. _(§5.2)_ **[se emite]**
- **Presión de la CPAP (si la sabe)** — _texto_
- **¿Ronca fuerte (se oye a través de la puerta o molesta a quien duerme al lado)?** — _boolean_
  - Por qué: Es uno de los cuatro componentes principales del STOP-Bang (§6.3).
  - Genera → ℹ dato: si = sí → suma un punto en el STOP-Bang; STOP-Bang ≥ 5 genera alerta de riesgo alto. _(§6.3)_
- **¿Se siente cansado o somnoliento durante el día?** — _boolean_
  - Por qué: Componente STOP-Bang: somnolencia diurna (§6.3).
- **¿Alguien le ha visto dejar de respirar mientras duerme?** — _boolean_
  - Por qué: Componente STOP-Bang: apneas observadas (§6.3).
- **Perímetro del cuello** (cm) — _numero_
  - Por qué: Un cuello > 40 cm suma en el STOP-Bang (§6.3).
  - Genera → ℹ dato: si > 40 cm → suma un punto en el STOP-Bang; STOP-Bang ≥ 5 genera alerta de riesgo alto. _(§6.3)_

### Trasplante de órgano

_Fuente: docs/documento_fuente.md §5.10, §5.16.15, §8.8_

- **Órgano trasplantado** — _opcion_: Riñón / Hígado / Corazón / Pulmón / Páncreas / Médula ósea / Otro
  - Genera → 📝 nota: si = corazón → corazón denervado. _(§5.16.15)_ **[se emite]**
  - Genera → 🔔 alerta amarilla: si = riñón → evitar AINE. _(§5.16.15)_ **[se emite]**
  - Genera → 📝 nota: si = pulmón → reflejo tusígeno abolido. _(§5.16.15)_ **[se emite]**
- **Fecha del trasplante** — _fecha_
  - Por qué: Un trasplante de menos de 6 meses implica inmunosupresión intensa.
  - Genera → 🔔 alerta amarilla: si < 6 meses → trasplante reciente. _(§5.16.15)_ **[se emite]**
- **Fecha de la última analítica del injerto** — _fecha_
- **Creatinina más reciente (si es trasplante renal)** (mg/dL) — _numero_
  - Por qué: En el trasplante renal, la creatinina permite calcular el aclaramiento.
- **Fecha de esa creatinina** — _fecha_
- **Episodios de rechazo** — _opcion_: Nunca / En el pasado / En los últimos 6 meses
- **Fecha de la última revisión con el equipo de trasplante** — _fecha_
- **¿Aporta informe del equipo de trasplante?** — _boolean_
- **¿Los niveles de los inmunosupresores están en rango?** — _opcion_: Sí / No / No lo sabe
  - Por qué: Niveles fuera de rango pueden requerir ajuste antes de la cirugía.
  - Genera → 🔔 alerta amarilla: si = no (fuera de rango) → niveles de inmunosupresores fuera de rango. _(§5.16.15)_ **[se emite]**
- **¿Fiebre, infección reciente o antibiótico/antifúngico actual?** — _boolean_
  - Por qué: Una infección activa en un paciente inmunodeprimido puede aconsejar posponer la cirugía programada.
  - Genera → 🔔 alerta amarilla: si = sí → infección activa en inmunodeprimido: valorar posponer. _(§5.16.15)_ **[se emite]**
- **Profilaxis antiinfecciosa (cotrimoxazol, antivirales…)** — _texto_
- **Según el órgano: fatiga o falta de aire (corazón/pulmón), tos (pulmón), medicamentos sin receta (riñón)** — _texto_
  - Por qué: El corazón trasplantado puede tener isquemia indolora; en el riñón hay que evitar AINE; en el pulmón hay riesgo de retención de secreciones.

### Trastorno de la coagulación / trombofilia

_Fuente: docs/documento_fuente.md §5.5_

- **Tipo de trastorno conocido** — _opcion_multiple_: Hemofilia / Enfermedad de von Willebrand / Plaquetas bajas / Otro
- **Trombofilia (si la hay)** — _opcion_: No / Factor V Leiden heterocigoto / Factor V Leiden homocigoto / Protrombina G20210A heterocigota / Protrombina G20210A homocigota / Déficit de antitrombina / Déficit de proteína C o S con trombosis previas / Síndrome antifosfolípido
  - Por qué: Algunas trombofilias graves son criterio de alto riesgo trombótico (posible terapia puente).

### Valvulopatía / prótesis valvular

_Fuente: docs/documento_fuente.md §5.1_

- **¿Qué válvula está afectada?** — _opcion_: Aórtica / Mitral / Tricúspide / Pulmonar / Varias
- **Gravedad** — _opcion_: Leve / Moderada / Grave / No lo sabe
  - Genera → 📊 clase de riesgo: si = moderada o grave → sube la clase de riesgo del paciente a alta. _(§5.1)_
  - Genera → 🅰 ASA: si = grave → ASA mínimo 4 (moderada: mínimo 3). _(§5.1)_
- **¿Lleva prótesis (válvula artificial)?** — _opcion_: No / Sí, mecánica / Sí, biológica
  - Por qué: Una prótesis mecánica obliga a coordinar la anticoagulación y puede requerir terapia puente.
  - Genera → ℹ dato: si = mecánica → criterio de alto riesgo trombótico: coordinar anticoagulación y valorar terapia puente (§8.1). _(§5.1)_
- **Posición de la prótesis** — _opcion_: Aórtica / Mitral / Tricúspide
- **Fecha del último ecocardiograma** — _fecha_
  - Por qué: Si no hay ecocardiograma en los últimos 12 meses o hay síntomas nuevos, se solicita uno.
- **¿Síntomas nuevos (más disnea, síncope o angina)?** — _boolean_
  - Genera → 🧪 prueba: si = sí → ecocardiograma. _(§7.3)_
- **¿Estenosis aórtica grave con síntomas (síncope, angina o disnea)?** — _boolean_
  - Por qué: La estenosis aórtica grave sintomática es una valvulopatía de alto riesgo: puede aconsejar posponer la cirugía programada.
  - Genera → 🔔 alerta roja: si = sí → valvulopatía grave sintomática (estenosis aórtica grave sintomática): valorar posponer la cirugía programada. _(§5.1 (ESC 2022))_ **[se emite]**

## 16 ter. Dispositivos cardiacos implantables (§5.1 bis)

_Recomendaciones según el tipo de dispositivo, la dependencia y la zona del procedimiento (British Heart Rhythm Society, Thomas et al., Anaesthesia 2022;77:808-17). La zona sale de la columna `zona_dispositivo` de `procedimientos.csv`. Las notas y los puntos de validación los calcula `src/dominio/reglas/dispositivosCardiacos.ts`._

| Dispositivo | Zona | Recomendación |
| --- | --- | --- |
| Holter / registrador | cualquiera | Sin precauciones (opcional: revisar antes y borrar memoria después). |
| Marcapasos (no dependiente) | supraumbilical | Monitorizar sin reprogramar. |
| Marcapasos (dependiente) | supraumbilical | Considerar modo asíncrono (frecuencia fija) con bisturí prolongado. |
| Marcapasos | infraumbilical | Monitorizar sin reprogramar; si dependiente, imán disponible. |
| DAI / TRC-D | supraumbilical / ocular / endoscopia | Desactivar terapias (programador o imán); si dependiente, frecuencia fija. |
| DAI / TRC-D | infraumbilical | Monitorizar; razonable no desactivar; imán disponible. |
| Marcapasos / DAI | cardiaca | Reprogramación (marcapasos) / desactivación del DAI. |
| Marcapasos / DAI | dental | Nada salvo bisturí eléctrico. |
| Marcapasos | litotricia | Revisar en el mes siguiente; no enfocar la onda cerca del generador. |
| DAI | litotricia | Desactivar o imán durante la sesión. |
| DAI | neurocirugia | Preferir desactivación con programador al imán. |
| Marcapasos sin cables | cualquiera | No responde al imán; requiere su programador. |
| DAI subcutáneo (S-ICD) | cualquiera | No estimula; imán en la axila. |

**Colocación del imán por fabricante:** Medtronic, Boston Scientific y Biotronik, centrado sobre el generador (Biotronik pierde efecto a las 8 h: retirar y recolocar); Abbott (St. Jude), desplazado con el borde del anillo sobre el extremo del generador; MicroPort (LivaNova/Sorin), descentrado evitando la cabeza del dispositivo.

**Precauciones generales** (función de marcapasos o DAI): ECG desde el inicio (comprobar pulso/oximetría); desfibrilador externo y marcapasos transcutáneo disponibles; parches anteroposteriores lejos del generador; bisturí bipolar en ráfagas cortas; placa de retorno con el trayecto lejos del generador; evitar paños magnéticos sobre el tórax. DAI desactivado: monitorización continua, desfibrilador con parches, reactivar en recuperación (responsabilidad del equipo quirúrgico).

**Puntos de validación (§13 bis, amarillos):** DAI/TRC-D en supraumbilical, cardiaca, ocular, endoscopia o litotricia; marcapasos dependiente («sí»/«no lo sabe») en supraumbilical, cardiaca o endoscopia; revisión > 12 meses (marcapasos) / > 6 meses (DAI/TRC) o desconocida; batería agotándose o «no lo sabe»; dispositivo en ensayo clínico. Coordinar con la unidad de arritmias o la consulta de dispositivos.

## 16 bis. Puntos de validación clínica (§13 bis)

_Mecanismo distinto de las alertas: condiciones que el anestesiólogo revisa al principio de su resumen, de dos tipos. No bloquean nada; cada una se resuelve con «Validado por [nombre]» o «Posponer o derivar». Mientras quede alguna sin validar, la hoja del paciente indica que el anestesiólogo revisará su caso. Se definen en `datos/validaciones.json` (editable desde el panel de administración). Los dispositivos cardiacos implantables añaden además puntos propios según tipo/zona/dependencia (§16 ter)._

**🔴 Valorar posponer la cirugía programada**

| Motivo | Origen | Fuente |
| --- | --- | --- |
| Insuficiencia cardiaca muy sintomática (NYHA III-IV): valorar posponer la cirugía programada. | `insuficiencia_cardiaca.nyha` | §5.1 (ESC 2022) |
| Ingreso por insuficiencia cardiaca en los últimos 3 meses: valorar posponer la cirugía programada. | `insuficiencia_cardiaca.ultimo_ingreso` | §5.1 (ESC 2022) |
| Empeoramiento reciente de la insuficiencia cardiaca: valorar posponer la cirugía programada. | `insuficiencia_cardiaca.empeoramiento_reciente` | §5.1 (ESC 2022) |
| Angina inestable o de reciente cambio: valorar posponer la cirugía programada. | `cardiopatia_isquemica.angina_cambio_reciente` | §5.1 (ESC 2022) |
| Angina con mínimos esfuerzos o en reposo: valorar posponer la cirugía programada. | `cardiopatia_isquemica.angina_esfuerzo` | §5.1 (ESC 2022) |
| Infarto de miocardio hace menos de 60 días: valorar posponer la cirugía programada. | `cardiopatia_isquemica.infarto_fecha` | §5.1 (ESC 2022) |
| Stent coronario reciente (< 6 meses programado, < 12 meses por SCA): valorar diferir la cirugía programada; no suspender la doble antiagregación sin consultar con cardiología. | `stent_reciente` | §8.3 (ESC 2022) |
| Ictus o AIT de menos de 3 meses: valorar posponer la cirugía programada. | `ictus_o_tvp.ictus_fecha` | §5.1 (ESC 2022) |
| Ictus o AIT de menos de 3 meses: valorar posponer la cirugía programada. | `fibrilacion_auricular.ictus_ait_fecha` | §5.1 (ESC 2022) |
| Valvulopatía grave sintomática (en especial estenosis aórtica grave): valorar posponer la cirugía programada. | `valvulopatia.estenosis_aortica_grave_sintomatica` | §5.1 (ESC 2022) |
| Infección respiratoria activa o reciente (fiebre, tos productiva o cambio del esputo): valorar posponer la cirugía programada. | `infeccion_respiratoria.sintomas` | §5.2, §5.12 |
| Síntomas respiratorios nuevos (posible infección respiratoria activa): valorar posponer la cirugía programada. | `asma_epoc.sintomas_respiratorios_nuevos` | §5.16.4 |
| EPOC o asma con agudización en el último mes: valorar posponer la cirugía programada. | `asma_epoc.crisis_ultimo_mes` | §5.16.3 |
| EPOC o asma con agudización reciente (ingreso): valorar posponer la cirugía programada. | `asma_epoc.ingresos_ultimo_anio` | §5.16.3 |
| HbA1c > 8,5 % (mal control): valorar posponer la cirugía programada para optimizar. | `diabetes.hba1c` | §5.3 (ESC 2022) |
| 4AT ≥ 4: posible delirium actual. Valorar posponer la cirugía programada. | `cuatro_at_alto` | §6.10 |
| Trasplante con infección activa (o rechazo reciente): valorar posponer la cirugía programada. | `trasplante.infeccion_activa` | §5.16.15 |
| mtND4: variante positiva o factores de riesgo, con procedimiento diferible y test disponible. Valorar diferir para el estudio genético. | `mtnd4_rojo` | §9 (SEDAR 2026) |

**🟡 Validar antes de la intervención**

| Motivo | Origen | Fuente |
| --- | --- | --- |
| TVP o TEP de menos de 3 meses: validar antes de la intervención. | `ictus_o_tvp.tvp_tep_fecha` | §5.1 |
| Fibrilación auricular u otra arritmia con palpitaciones o síncope recientes: validar antes de la intervención. | `fibrilacion_auricular.sincope_palpitaciones_reciente` | §5.1 |
| Bloqueo cardiaco conocido sin marcapasos: validar antes de la intervención. | `fibrilacion_auricular.bloqueo_sin_marcapasos` | §5.1 |
| Hipertensión pulmonar: validar antes de la intervención. | `hipertension_pulmonar.confirmada` | §5.2 |
| Tensión arterial ≥ 180/110 en la consulta: validar antes de la intervención. | `hta.tension_consulta` | §5.16.1 |
| Asma no controlada (uso de rescate más de 2 veces por semana): validar antes de la intervención. | `asma_epoc.rescate_semana` | §5.16.3 |
| Asma inducida por AINE/aspirina: validar antes de la intervención (evitar AINE perioperatorios). | `asma_epoc.desencadenantes` | §5.16.3 |
| Oxigenoterapia domiciliaria: validar antes de la intervención. | `asma_epoc.oxigeno_domiciliario` | §5.16.4 |
| STOP-Bang ≥ 5 sin diagnóstico de SAOS: validar antes de la intervención. | `stop_bang_alto` | §6.3 |
| SAOS diagnosticado que no usa la CPAP: validar antes de la intervención. | `saos.cumplimiento` | §5.2 |
| Hipoglucemias frecuentes: validar el control de la diabetes antes de la intervención. | `diabetes.frecuencia_hipoglucemias` | §5.16.2 |
| Hipoglucemias inadvertidas (no las detecta): validar el control de la diabetes antes de la intervención. | `diabetes.detecta_hipoglucemias` | §5.16.2 |
| Corticoterapia con criterio de dosis de estrés perioperatoria: validar antes de la intervención. | `corticoide_dosis_estres` | §5.3 |
| Enfermedad renal terminal (filtrado < 15): validar antes de la intervención. | `enfermedad_renal.estadio` | §5.4 |
| Enfermedad renal en diálisis: validar antes de la intervención. | `enfermedad_renal.dialisis` | §5.4 |
| Cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. | `enfermedad_hepatica.ascitis` | §5.4 |
| Cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. | `enfermedad_hepatica.varices` | §5.4 |
| Cirrosis con ascitis, varices o encefalopatía: validar antes de la intervención. | `enfermedad_hepatica.encefalopatia` | §5.4 |
| Hemoglobina < 10 g/dL: validar antes de la intervención (optimizar la anemia). | `anemia.hemoglobina` | §7.3 |
| Cuestionario de sangrado HEMSTOP positivo, o plaquetopenia/coagulopatía conocidas: validar antes de la intervención. | `hemstop_positivo` | §5.5 |
| Testigo de Jehová o rechazo de hemoderivados: validar antes de la intervención. | `testigo_jehova` | §5.8 |
| Miastenia gravis, distrofias musculares u otra enfermedad neuromuscular: validar antes de la intervención. | `distrofia_muscular.insuficiencia_respiratoria` | §5.16.11 |
| Epilepsia no controlada (crisis reciente): validar antes de la intervención. | `epilepsia.ultima_crisis` | §5.16.9 |
| Epilepsia no controlada (estatus epiléptico previo): validar antes de la intervención. | `epilepsia.estatus_previo` | §5.16.9 |
| Deterioro cognitivo sin capacidad para consentir: validar el consentimiento por representante legal antes de la intervención. | `deterioro_cognitivo.capacidad_consentir` | §5.16.5 |
| Hipertermia maligna o déficit de pseudocolinesterasa (personal o familiar): validar antes de la intervención. | `hipertermia_maligna_pseudocolinesterasa` | §5.15 |
| Reacción alérgica previa en quirófano: validar antes de la intervención. | `reaccion_alergica_quirofano` | §5.6 |
| Alergia al látex: validar antes de la intervención (quirófano libre de látex). | `alergia_latex` | §5.6 |
| Intubación difícil previa confirmada: validar la vía aérea antes de la intervención. | `intubacion_dificil_previa` | §6.2 |
| EGRI ≥ 4 (predicción de vía aérea difícil): validar la vía aérea antes de la intervención. | `egri_alto` | §6.2 |
| Limitación cervical por artritis reumatoide o espondilitis: validar la vía aérea antes de la intervención. | `limitacion_cervical_reumatica` | §6.2 |
| Radioterapia o tumor cervical: validar la vía aérea antes de la intervención. | `radioterapia_tumor_cervical` | §6.2 |
| Posible inestabilidad atloaxoidea (artritis reumatoide con afectación cervical): validar la vía aérea y el cuello antes de la intervención. | `artritis_reumatoide.afectacion_cervical` | §5.16.13 |
| Posibilidad de embarazo en cirugía no obstétrica: validar antes de la intervención. | `posible_embarazo` | §5.9 |
| STBUR ≥ 3 (riesgo respiratorio perioperatorio en el niño): validar antes de la intervención. | `stbur_alto` | §6.3 |
| Consumo de cocaína en la última semana: validar antes de la intervención. | `cocaina_reciente` | §5.7 |
| AUDIT-C ≥ 8 (riesgo de síndrome de abstinencia alcohólica): validar antes de la intervención. | `audit_abstinencia` | §6.9 |
| Capacidad funcional < 4 METs o fragilidad (CFS ≥ 5) en cirugía de riesgo alto: validar antes de la intervención. | `fragilidad_mets_riesgo_alto` | §6.6 |
| Trasplante reciente (menos de 6 meses): validar antes de la intervención. | `trasplante.fecha` | §5.16.15 |
| Niveles de inmunosupresores fuera de rango: validar antes de la intervención. | `trasplante.niveles_en_rango` | §5.16.15 |
| Miocardiopatía sintomática: validar antes de la intervención. | `miocardiopatia.sintomas` | §5.1 |
| Brote de esclerosis múltiple en los últimos 3 meses: validar antes de la intervención. | `esclerosis_multiple.ultimo_brote_fecha` | §5.16.12 |
| Feocromocitoma: validar la preparación (bloqueo alfa) antes de la intervención. | `hipotiroidismo.feocromocitoma` | §5.3 |
| Insuficiencia suprarrenal: validar la pauta de corticoides de estrés antes de la intervención. | `hipotiroidismo.insuficiencia_suprarrenal` | §5.3 |
| Cardiopatía congénita (paciente pediátrico): validar antes de la intervención. | `pediatria.cardiopatia_congenita` | §5.12 |
| Prematuro con edad posconcepcional < 60 semanas (riesgo de apnea postoperatoria): validar antes de la intervención. | `prematuro_edad_posconcepcional` | §5.12 |
| Prematuro de edad gestacional desconocida (lactante < 12 meses): validar antes de la intervención (posible riesgo de apnea). | `prematuro_gestacion_desconocida` | §5.12 |
| Preeclampsia o HTA gestacional: validar antes de la intervención. | `obstetricia.preeclampsia` | §5.13 |
| Plaquetopenia (< 80.000/µL): validar antes de la intervención; condiciona la técnica neuroaxial. | `plaquetopenia_obstetrica` | §5.13 |
| Placenta previa o sospecha de acretismo: riesgo de hemorragia masiva: reservar hemoderivados y planificar la cirugía. | `placenta_previa` | §5.13 |
| Placenta previa con una o más cesáreas previas: riesgo alto de acretismo. | `placenta_previa_cesareas` | §5.13 |

## 17. Pendiente de revisión por el servicio

- **Traducciones al catalán:** los textos de la hoja del paciente en catalán (`datos/textos/ca/paciente.json`) están marcados como pendientes de revisión clínica.
- **Filas del catálogo sin verificar en CIMA (verificado_cima ≠ sí): 10.**
  - `anticonceptivo_oral_combinado` — anticonceptivo oral combinado (no)
  - `anticonceptivo_oral_gestageno` — anticonceptivo oral solo gestágeno (no)
  - `anticonceptivo_implante` — implante anticonceptivo\|Implanon NXT (no)
  - `anticonceptivo_diu_hormonal` — DIU hormonal\|Mirena\|Kyleena\|Jaydess (no)
  - `anticonceptivo_anillo_vaginal` — anillo vaginal\|NuvaRing\|Circlet (no)
  - `anticonceptivo_parche` — parche anticonceptivo\|Evra (no)
  - `anticonceptivo_inyectable` — anticonceptivo inyectable\|Depo-Progevera (no)
  - `ths_oral` — terapia hormonal sustitutiva oral\|THS oral (no)
  - `ths_transdermica` — terapia hormonal sustitutiva parche\|THS parche (no)
  - `ths_vaginal` — terapia hormonal sustitutiva vaginal\|THS vaginal (no)

---
_Generado el 2026-10-16._
