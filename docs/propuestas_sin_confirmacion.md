# Propuesta: ningún fármaco «pendiente de confirmar» en el resumen (punto 8)

Objetivo: que el programa **proponga siempre una pauta** con la información clínica que tiene, en lugar de dejar el fármaco «pendiente de confirmar» / «el anestesiólogo le llamará». Esta tabla recoge **todas** las situaciones en las que hoy una regla devuelve `requiere confirmación` (`accion: 'consultar'`, `requiereConfirmacion: true`). Para cada una se indica:

- **Fármaco y situación.**
- **Qué hace hoy** (acción y mensaje actuales).
- **Pauta que propondría el programa** (con su fuente: protocolo del servicio, documento fuente o guía). Cuando falta un dato (p. ej. el aclaramiento), la propuesta es **la más prudente**: el plazo más largo.
- **Punto de validación** que quedaría para el anestesiólogo: 🔴 rojo (revisar antes) o 🟡 amarillo (revisar), o — si no haría falta.

> ⚠️ **Pendiente de tu aprobación.** Esta fase solo documenta la propuesta; **no se programa** nada hasta que la revises y la apruebes. Al implementarla, la batería de casos de referencia cambiará **solo** en estas situaciones.

Fuentes abreviadas: **DF** = `docs/documento_fuente.md`; **SERV** = protocolo del servicio; guías citadas tal cual (EHRA 2021, ESC 2022/2024, ACR 2022, CPOC, ASRA 2018, CDC 2022).

---

## 1. ACOD (dabigatrán, rivaroxabán, apixabán, edoxabán) — `src/dominio/reglas/acod.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 1.1 | **Falta el aclaramiento** (anti-Xa o dabigatrán, con o sin neuroaxial) | `consultar`; «el anestesiólogo le llamará»; `datoQueFalta: aclaramiento` | Suspender con el **plazo más largo** del tramo que corresponda: dabigatrán + neuroaxial → **120 h**; dabigatrán sin neuroaxial → base + 48 h; anti-Xa + neuroaxial → **96 h**; anti-Xa sin neuroaxial → base + 24 h. Es decir, asumir CrCl < 30/< 50 (el peor caso). (DF §8.2; EHRA 2021) | 🟡 «aclaramiento no disponible: pauta calculada con el supuesto más prudente; confirmar función renal» |
| 1.2 | **Alto riesgo trombótico** (§8.1: p. ej. ictus/AIT < 3 meses, TVP/TEP < 3 meses, válvula mecánica…) | `consultar`; nota «consultar hematología/cardiología el cambio a acenocumarol para terapia puente» | Suspender el ACOD con el plazo estándar del tramo (72 h alto/neuroaxial) **y** emitir la nota de valorar puente/cambio a AVK como recomendación, sin bloquear la hoja. (DF §8.1/§8.2) | 🔴 «alto riesgo trombótico: valorar terapia puente o cambio a acenocumarol» |

---

## 2. Antivitamina K — warfarina, acenocumarol — `src/dominio/reglas/antivitaminaK.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 2.1 | **Alto riesgo tromboembólico** (puente) | `consultar`; propone ya la pauta de puente (enoxaparina 1 mg/kg) pero marcada «requiere confirmación» | Mantener la **misma pauta ya calculada** (suspender N días + enoxaparina a dosis por peso; última dosis la mañana del día previo) y mostrarla como propuesta. (DF §8.1; ASRA 2018) | 🔴 «terapia puente: confirmar dosis de enoxaparina y riesgo trombótico» |
| 2.2 | **Portador de válvula mecánica o stent** | `consultar`; «ninguna suspensión sin confirmación (§8.3)» | Proponer la suspensión estándar de AVK (INR < 1,5; < 1,4 si neuroaxial) y, si válvula mecánica, añadir la recomendación de puente. (DF §8.1/§8.3) | 🔴 «válvula mecánica/stent: confirmar manejo del anticoagulante» |

---

## 3. Antiagregantes — `src/dominio/reglas/antiagregantes.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 3.1 | **AAS ≤ 200 mg en cirugía de espacio cerrado** (intracraneal/medular) | `consultar` | Proponer **suspender 5 días** (criterio más prudente para espacio cerrado) e indicar que se confirme si el riesgo de sangrado del SNC justifica mantenerla. (DF §8.3) | 🟡 «AAS en cirugía de espacio cerrado: confirmar suspensión» |
| 3.2 | **AAS > 200 mg/día con indicación cardiovascular** que debería suspenderse | `consultar`; nota «valorar pasar a 100 mg/día» | Proponer **mantener a dosis cardioprotectora (100 mg/día)** como pauta concreta. (DF §8.3) | 🟡 «AAS > 200 mg: confirmar bajada a 100 mg/día» |
| 3.3 | **Inhibidores GP IIb/IIIa o cangrelor** (uso hospitalario) | `consultar`; plazo en horas calculado | Mantener el **plazo ya calculado** como propuesta (son de manejo hospitalario); nota de que lo gestiona el equipo. (DF §8.3) | 🟡 «antiagregante hospitalario: confirmar con el equipo» |
| 3.4 | **Stent coronario reciente** (`evaluarStent`, §8.3) | marca el stent como reciente y suprime la pauta de antiagregantes en la hoja; alerta | Proponer **mantener la doble antiagregación** y la recomendación de diferir la cirugía electiva hasta cumplir el plazo del stent. (DF §8.3; ESC 2024) | 🔴 «stent reciente: valorar diferir la cirugía / no suspender antiagregantes» |

---

## 4. Antidiabéticos — `src/dominio/reglas/antidiabeticos.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 4.1 | **Combinación fija insulina basal + GLP-1** (p. ej. iGlarLixi) | `consultar`; «omitir el GLP-1 dejaría sin insulina basal» | Proponer **tratar el componente basal como insulina basal** (reducción del 20 % la noche previa y la mañana, CPOC) y no omitir el conjunto; nota de que es combinación fija. (DF §8.5; CPOC) | 🟡 «combinación fija basal + GLP-1: confirmar manejo de la insulina» |

---

## 5. Cardiovasculares — `src/dominio/reglas/cardiovasculares.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 5.1 | **IECA/ARA-II sin saber si hay IC/infarto/nefropatía** | `consultar`; `datoQueFalta` | Propuesta prudente: **no tomar la dosis de la mañana** de la intervención (pauta por defecto de IECA/ARA-II cuando no hay indicación de mantener). (DF §8.10) | 🟡 «IECA/ARA-II: confirmar si hay IC/infarto/nefropatía (mantener) o no» |
| 5.2 | **Sacubitrilo/valsartán** | `consultar` | Proponer **suspender 24 h antes** (vida media larga; se trata como IECA/ARA-II de alto efecto). (DF §8.10) | 🟡 «sacubitrilo/valsartán: confirmar suspensión 24 h» |

---

## 6. Heparinas y fondaparinux — `src/dominio/reglas/heparinas.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 6.1 | **HBPM cuya dosis no encaja en profilaxis ni tratamiento** (tablas SETH) | `consultar`; `datoQueFalta: profiláctica/terapéutica` | Propuesta prudente: tratar como **terapéutica (24 h antes)**, el plazo más largo. (DF §8.4; SETH) | 🟡 «HBPM: confirmar si es dosis profiláctica (12 h) o terapéutica (24 h)» |
| 6.2 | **Fondaparinux profiláctico con CrCl < 20** | `consultar`; «contraindicado» | Proponer **suspender con el plazo más largo (p. ej. 48 h)** y nota de contraindicación relativa por aclaramiento muy bajo. (DF §8.4) | 🔴 «fondaparinux con CrCl < 20: confirmar manejo» |

---

## 7. Inmunosupresores y reumatología — `src/dominio/reglas/inmunosupresores.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 7.1 | **Inmunosupresor clásico por enfermedad autoinmune** (azatioprina, etc.) | `consultar`; «valorar suspender 1-2 días» | Propuesta por defecto: **mantener** (criterio ACR 2022 para la mayoría de clásicos salvo indicación en contra) y nota de valorar según cirugía/infección. (ACR 2022) | 🟡 «inmunosupresor autoinmune: confirmar mantener o suspender 1-2 días» |
| 7.2 | **Metotrexato > 20 mg/semana** | `consultar`; «valorar omitir 1-2 dosis» | Propuesta: **mantener** (ACR 2022 recomienda mantener MTX en cirugía electiva incluso a dosis altas, salvo función renal alterada); nota de valorar omitir 1-2 dosis si cirugía de alto riesgo de infección o CrCl bajo. (ACR 2022) | 🟡 «metotrexato > 20 mg: confirmar mantener (ACR) u omitir» |
| 7.3 | **Biológico** (anti-TNF, etc.) | `consultar`; «programar al final del ciclo» | Propuesta: **programar la cirugía al final del intervalo de dosis** (omitir idealmente una) y dar la fecha concreta de la última dosis como referencia. (ACR 2022) | 🟡 «biológico: confirmar encaje de la cirugía con el ciclo» |

---

## 8. Oncológicos — `src/dominio/reglas/oncologicos.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 8.1 | **Antiangiogénico sistémico, última dosis < 6-8 semanas (o fecha desconocida)** | `consultar`; «diferir»; `datoQueFalta` si no hay fecha | Propuesta prudente: **recomendar diferir** hasta ≥ 6-8 semanas desde la última dosis; si falta la fecha, asumir reciente (el supuesto más prudente) y proponer diferir. (DF §8.9) | 🔴 «antiangiogénico reciente: valorar diferir la cirugía» |

---

## 9. Otros — `src/dominio/reglas/otros.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 9.1 | **Fármaco no catalogado** (escrito a mano) | `consultar`; «mantener y consultar» | Propuesta por defecto: **mantener** y nota «fármaco no incluido en el catálogo: el programa no le aplica reglas; revisar». (SERV) | 🟡 «fármaco no catalogado: revisar manejo» |
| 9.2 | **Anticonceptivo hormonal / THS con riesgo trombótico alto** | `consultar`; «valorar suspender 4-6 semanas» | Propuesta: **mantener** (no se suspende de forma rutinaria por una cirugía) con nota de valorar suspensión 4-6 semanas antes solo en cirugía de muy alto riesgo trombótico + profilaxis. (DF §8.11) | 🟡 «anticonceptivo/THS: confirmar si procede suspender» |
| 9.3 | **Plazo no alcanzable** (cualquier fármaco cuyo plazo cae en el pasado con la fecha actual) | `consultar`; «el anestesiólogo le llamará» | Propuesta: dar la **última toma posible / instrucción de la toma lo antes posible** y alerta de que el plazo ideal no se cumple; nunca dejar sin pauta. (DF §8.16) | 🟡 «plazo no alcanzable con esta fecha: confirmar manejo» |

---

## 10. Psicofármacos — `src/dominio/reglas/psicofarmacos.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 10.1 | **IMAO irreversible** (tranilcipromina, fenelzina, isocarboxazida) | `consultar`; «retirar 10-14 días de acuerdo con psiquiatra» | Propuesta: **mantener** por defecto con la **nota de «anestesia segura con IMAO»** (evitar meperidina, tramadol, etc.) como pauta operativa; recomendar coordinar con psiquiatría la posible retirada 10-14 días. (DF §8.7) | 🟡 «IMAO irreversible: confirmar retirada con psiquiatría o anestesia segura con IMAO» |

---

## 11. Motor / combinaciones — `src/dominio/reglas/motor.ts`, `despachador.ts`

| # | Situación | Qué hace hoy | Pauta propuesta (fuente) | Validación |
|---|-----------|--------------|--------------------------|------------|
| 11.1 | **Falta la hora de la toma** para calcular un plazo en horas | `consultar`; `datoQueFalta: hora de la toma` | Propuesta prudente: asumir la **hora habitual más temprana razonable** (o la hora de la intervención como referencia) y calcular el plazo; nota de confirmar la hora real. (SERV) | 🟡 «falta la hora de la toma: pauta con hora asumida» |
| 11.2 | **`consultarGenerico`** (vía del despachador para reglas que escalan a confirmación) | `consultar` | Hereda la propuesta de la regla concreta que la motiva (ver filas anteriores). | según la regla |
| 11.3 | **Combinación fija** que incluye un componente «requiere confirmación» | `masRestrictiva` hace ganar siempre a «requiere confirmación» | Al eliminar la confirmación de los componentes, la combinación mostrará el **plazo más restrictivo** de las pautas propuestas. (DF §8.0) | hereda el color del componente más restrictivo |

---

### Resumen de criterios transversales
- **Dato ausente (aclaramiento, hora, fecha, dosis):** siempre la opción **más prudente** (plazo más largo / asumir el peor caso) y dejar un punto de validación amarillo para confirmar el dato.
- **Riesgo trombótico/stent/válvula/antiangiogénico:** se propone una pauta, pero queda **punto rojo** porque la decisión clínica es relevante.
- **Fármaco no catalogado:** mantener + aviso; nunca sin pauta.
- Ningún fármaco queda sin instrucción en la hoja del paciente.
