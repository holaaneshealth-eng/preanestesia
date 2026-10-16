# Casos clínicos de referencia (batería independiente)

Preanestesia · AnesHealth · versión 3 (29/09/2026)
Ruta en el repositorio: `docs/casos_referencia.md`

Resultados esperados calculados a mano a partir de `docs/documento_fuente.md`, sin mirar el código. Cada caso debe convertirse en una prueba automática. Si el programa da un resultado distinto, no se corrige la prueba para que pase: se informa al servicio de la discrepancia y se decide cuál de los dos está mal.

## Convenciones comunes

- Intervención: jueves 15/10/2026 a las 08:00, salvo que el caso diga otra cosa.
- Los plazos se cuentan desde la última toma hasta la hora de la intervención. Una toma que cae exactamente en el límite está permitida.
- «Última toma» es la toma habitual más tardía que respeta el plazo, según las horas de toma del paciente.
- Aclaramiento: Cockcroft-Gault salvo que se indique.
- Plazos expresados en días (antivitamina K, AAS, P2Y12, triflusal, cilostazol, SGLT2, JAK, fitoterapia, IMAO): «suspender N días» significa no tomarlo los N días previos ni el día de la intervención.
- Plazos expresados en horas: se cuentan hasta la hora de la intervención.
- Anticoagulantes con plazo en horas (ACOD, heparinas, fondaparinux): si la primera toma habitual posterior al límite cae como máximo 10 horas después de él, se adelanta a la hora límite, siempre que quede al menos la mitad del intervalo habitual desde la toma anterior (6 h en pautas cada 12 h, 12 h en pautas cada 24 h). Si no se cumple, la última toma es la anterior permitida. Nunca se atrasa una toma.
- IECA y ARA-II: no tomar el día de la intervención (la toma de la noche anterior sí se hace).
- GLP-1 semanales: la última dosis debe ser al menos 7 días antes de la intervención.

## A. Anticoagulantes

**A1.** Varón 70 años, 80 kg, HTA, FA. Apixabán 5 mg a las 09:00 y 21:00. Aclaramiento 70 mL/min. Hernioplastia inguinal laparoscópica (riesgo hemorrágico bajo), anestesia general.
Esperado: 48 h. Límite martes 13/10 08:00. Adelantar la toma del martes 13/10 de las 09:00 a las 08:00; es la última. Nota del anestesiólogo «podría considerarse suspender solo 24 h». CHA2DS2-VA 2 (HTA 1, edad 65-74 1). Sin confirmación.

**A2.** Igual que A1 con aclaramiento 25 mL/min.
Esperado: 48 + 24 = 72 h. Adelantar la toma del lunes 12/10 de las 09:00 a las 08:00; es la última. Sin la nota de 24 h.

**A2b.** Igual que A1 (48 h), pero la intervención es el jueves 15/10 a las 13:00.
Esperado: límite martes 13/10 13:00. La toma de las 21:00 cae 8 h después del límite, pero adelantarla a las 13:00 la dejaría a 4 h de la de las 09:00 (menos de 6 h). No se adelanta: última toma martes 13/10 09:00.

**A3.** Rivaroxabán 20 mg a las 21:00. Aclaramiento 25 mL/min. Prótesis total de rodilla con raquídea.
Esperado: 96 h (anti-Xa con neuroaxial y aclaramiento < 30). Límite domingo 11/10 08:00. La toma del domingo a las 21:00 cae 13 h después del límite: no se adelanta. Última toma sábado 10/10 21:00.

**A3b.** Rivaroxabán 20 mg a las 21:00, aclaramiento 60, prótesis de rodilla con raquídea (72 h), intervención el jueves 15/10 a las 13:00.
Esperado: límite lunes 12/10 13:00. Adelantar la toma del lunes 12/10 de las 21:00 a las 13:00 (8 h de adelanto; quedan 16 h desde la toma anterior).

**A4.** Dabigatrán 150 mg a las 09:00 y 21:00. Aclaramiento 90 mL/min. Raquídea.
Esperado: 72 h. Adelantar la toma del lunes 12/10 de las 09:00 a las 08:00; es la última.

**A5.** Igual que A4 con aclaramiento 65 mL/min.
Esperado: 96 h. Adelantar la toma del domingo 11/10 de las 09:00 a las 08:00; es la última.

**A6.** Igual que A4 con aclaramiento 45 mL/min.
Esperado: 120 h. Adelantar la toma del sábado 10/10 de las 09:00 a las 08:00; es la última.

**A7.** Edoxabán 60 mg a las 09:00. Sin creatinina disponible. Colecistectomía laparoscópica.
Esperado (punto 8, 1.1): suspensión con el supuesto más prudente del tramo (si hubiera filtrado glomerular apuntado, se usaría como aproximación); última toma lunes 12/10 08:00. Punto de validación amarillo «función renal no disponible: confirmar». En la hoja, la pauta de suspensión (no «el anestesiólogo le llamará»).

**A8.** Apixabán por FA con ictus hace 2 meses. Colectomía.
Esperado (punto 8, 1.2): alerta de ictus reciente. Suspensión estándar del tramo (sin cambiar a acenocumarol ni terapia puente, EHRA 2021/PAUSE); última toma domingo 11/10 08:00. Punto de validación rojo «alto riesgo trombótico: valorar manejo con hematología o cardiología».

**A9.** Acenocumarol a las 18:00 por FA sin criterios de alto riesgo trombótico. Colecistectomía laparoscópica.
Esperado: suspender 3 días (72 h). Última toma domingo 11/10 18:00. Coordinar con su control de anticoagulación. INR < 1,5 el día de la intervención. Sin terapia puente.

**A10.** Warfarina a las 18:00 por FA, CHA2DS2-VA 5, sin ictus reciente. Colecistectomía laparoscópica.
Esperado: suspender 5 días (120 h). Última toma viernes 09/10 18:00. Sin terapia puente (la puntuación alta no es criterio de puente en el protocolo).

**A11.** Warfarina por válvula aórtica mecánica, sin FA ni disfunción sistólica.
Esperado (punto 8, 2.2): suspensión estándar sin terapia puente; última toma viernes 09/10 18:00. Punto de validación rojo «válvula mecánica/stent: confirmar el manejo del anticoagulante».

**A12.** Acenocumarol por TVP hace 6 semanas. 70 kg. Aclaramiento 25 mL/min. Colectomía.
Esperado (punto 8, 2.1): alerta de TVP reciente. Pauta de puente con enoxaparina 70 mg cada 24 h (aclaramiento < 30), última toma domingo 11/10 18:00 y última dosis de puente la mañana del miércoles 14/10. Punto de validación rojo «terapia puente: confirmar dosis y riesgo trombótico».

**A13.** Acenocumarol. Catarata con bloqueo retrobulbar.
Esperado: oftalmología de riesgo moderado-alto. Suspender según el protocolo general (3 días), no «mantener».

**A14.** Apixabán 5 mg a las 09:00 y 21:00, aclaramiento 70 mL/min. Vitrectomía con anestesia general.
Esperado: oftalmología de riesgo moderado-alto tratada como riesgo hemorrágico alto: 72 h. Adelantar la toma del lunes 12/10 de las 09:00 a las 08:00; es la última.

**A15.** Apixabán 5 mg a las 09:00 y 21:00. Catarata con anestesia tópica.
Esperado: no suspender.

**A16.** Apixabán 5 mg a las 09:00 y 21:00, aclaramiento 70 mL/min. Catarata con bloqueo peribulbar.
Esperado: 72 h. Adelantar la toma del lunes 12/10 de las 09:00 a las 08:00; es la última.

## B. Heparinas y fondaparinux

**B1.** Enoxaparina 40 mg a las 18:00, 70 kg, aclaramiento > 30 (profiláctica). Raquídea.
Esperado: 12 h. Límite miércoles 14/10 20:00. Última dosis miércoles 14/10 18:00.

**B2.** Igual que B1 con la dosis a las 21:00.
Esperado: adelantar la dosis del miércoles 14/10 a las 20:00 o antes.

**B3.** Enoxaparina 80 mg a las 09:00 y 21:00, 80 kg, aclaramiento 60 (terapéutica: 1 mg/kg/12 h).
Esperado: clasificada como terapéutica. 24 h. Adelantar la dosis del miércoles 14/10 de las 09:00 a las 08:00; no ponerse la de las 21:00.

**B4.** Fondaparinux 2,5 mg a las 09:00, aclaramiento 60. Cirugía de riesgo hemorrágico bajo sin neuroaxial.
Esperado: 36 h. Límite martes 13/10 20:00. La dosis del miércoles a las 09:00 cae 13 h después del límite: no se adelanta. Última dosis martes 13/10 09:00.

**B5.** Fondaparinux 7,5 mg a las 09:00, 70 kg, aclaramiento 40 (terapéutico).
Esperado: 72 h (aclaramiento < 50). Adelantar la dosis del lunes 12/10 de las 09:00 a las 08:00; ya no ponerse más.

## C. Antiagregantes

**C1.** AAS 100 mg por prevención secundaria. Colecistectomía.
Esperado: mantener.

**C2.** AAS 100 mg. Craneotomía (neurocirugía intracraneal).
Esperado (punto 8, 3.1): suspender 5 días (criterio prudente en espacio cerrado); última toma viernes 09/10 09:00. Punto de validación amarillo «confirmar la suspensión».

**C3.** AAS 300 mg a las 09:00, indicación no cardiovascular.
Esperado: mantener (dosis > 200 mg, pero la colecistectomía no es de muy alto riesgo de sangrado y no hay técnica neuroaxial).

**C4.** AAS 300 mg por indicación cardiovascular.
Esperado: mantener, sin confirmación (no hay que suspenderlo).

**C3b.** AAS 300 mg a las 09:00, indicación no cardiovascular. Prótesis de rodilla con raquídea.
Esperado: suspender 5 días. Última toma viernes 09/10 a las 09:00.

**C4b.** AAS 300 mg por indicación cardiovascular. Craneotomía por tumor.
Esperado (punto 8, corrección C4b): en espacio cerrado, cualquier dosis de AAS se suspende 5 días (igual que el C2); última toma viernes 09/10 09:00. La bajada de dosis solo se aplica fuera del espacio cerrado. Punto de validación amarillo.

**C4c.** AAS 300 mg a las 09:00, indicación no cardiovascular. Vitrectomía.
Esperado: suspender 5 días. Última toma viernes 09/10 a las 09:00.

**C5.** AAS + clopidogrel. Stent farmacoactivo programado hace 4 meses. Hernia inguinal.
Esperado: alerta roja «valorar diferir». Requiere confirmación. Ninguna pauta de antiagregantes en la hoja del paciente.

**C6.** AAS + clopidogrel 75 mg a las 09:00. Stent por SCA hace 14 meses. Colecistectomía, anestesia general.
Esperado (punto 8, corrección C6): no es reciente. Mantener el AAS; suspender el clopidogrel 5 días (última toma viernes 09/10 09:00). Punto de validación amarillo «stent no reciente: confirmar la suspensión del P2Y12 con cardiología si hay dudas».

**C7.** Clopidogrel en monoterapia a las 09:00 por ictus antiguo. Prótesis de rodilla con raquídea.
Esperado (punto 8): 7 días (neuroaxial). Última toma miércoles 07/10 09:00. Punto de validación amarillo con la sugerencia de AAS 100 mg durante la retirada.

**C8.** Triflusal 300 mg a las 09:00 y 21:00. Colecistectomía, anestesia general.
Esperado: 7 días. Última toma miércoles 07/10 21:00.

**C9.** Cilostazol 100 mg a las 09:00 y 21:00. Artroscopia de rodilla con anestesia general.
Esperado: mantener (riesgo hemorrágico bajo, sin neuroaxial).

**C10.** Igual que C9 con raquídea.
Esperado: 3 días. Última toma domingo 11/10 21:00.

## D. Antidiabéticos

**D1.** Synjardy (empagliflozina + metformina) a las 09:00 y 21:00.
Esperado: una sola instrucción para Synjardy, 3 días. Última toma domingo 11/10 21:00. Nota del anestesiólogo «vigilar glucemia en los días sin tratamiento».

**D2.** Jardiance 10 mg a las 09:00 y Dianben 850 mg a las 09:00 y 21:00 (pastillas separadas).
Esperado: dos instrucciones. Empagliflozina: última toma domingo 11/10 09:00. Metformina: no tomar el día de la intervención (última toma miércoles 14/10 21:00). Sin nota de glucemia.

**D3.** Ertugliflozina a las 09:00.
Esperado: 4 días. Última toma sábado 10/10 09:00.

**D4.** Ozempic semanal, los lunes.
Esperado: se omite la dosis del lunes 12/10; última dosis lunes 05/10. Dieta de líquidos claros desde el miércoles 14/10 a las 08:00.

**D5.** Ozempic semanal, los jueves.
Esperado: una sola dosis omitida, la del jueves 15/10 (día de la intervención). La del jueves 08/10 se toma (7 días antes).

**D6.** Rybelsus diario a las 08:00.
Esperado: no tomar los 3 días previos ni el día de la intervención. Última toma domingo 11/10.

**D7.** Tresiba 30 UI a las 09:00.
Esperado: al ser una dosis diaria de mañana, no hay «noche previa» que ajustar. La mañana de la intervención (jueves 15/10), 24 UI (80 % de 30, redondeado a la unidad inferior). Los días anteriores, la dosis de siempre.

**D8.** Insulatard 20 UI a las 08:00 y 10 UI a las 21:00.
Esperado: miércoles 14/10 a las 21:00, 10 UI (completa). Jueves 15/10 por la mañana, 10 UI (50 %).

**D9.** NovoMix 30, 20 UI por la mañana.
Esperado: 10 UI la mañana de la intervención.

**D10.** Bomba de insulina. Tumorectomía de mama (riesgo quirúrgico bajo).
Esperado: basal al 80 % y suspender bolos. Sin confirmación (la decisión depende solo del riesgo quirúrgico).

**D11.** Bomba de insulina. Colectomía (riesgo quirúrgico intermedio).
Esperado (punto 8, corrección 5): venir con la bomba funcionando a su ritmo basal habitual y traer material de recambio; en el hospital se decide si se mantiene o se pasa a insulina en el suero. Punto de validación amarillo «valorar pasar a insulina intravenosa (CPOC/JBDS)».

## E. Otros fármacos

**E1.** Enalapril 20 mg a las 09:00. HTA, sin insuficiencia cardiaca.
Esperado: no tomar el día de la intervención. Última toma miércoles 14/10 09:00.

**E1b.** Losartán 50 mg a las 21:00. HTA.
Esperado: no tomar el día de la intervención. Última toma miércoles 14/10 21:00.

**E2.** Enalapril. Insuficiencia cardiaca con FEVI 30 %.
Esperado: mantener.

**E3.** Entresto a las 09:00.
Esperado (punto 8, 5.2): suspender 24 h antes (vida media larga); última toma martes 13/10 09:00. Punto de validación amarillo «confirmar la suspensión».

**E4.** Furosemida 40 mg a las 09:00.
Esperado: no tomar la mañana de la intervención. Última toma miércoles 14/10 09:00.

**E5.** Litio 400 mg a las 09:00 y 21:00. Colecistectomía (riesgo intermedio).
Esperado: 48 h. Última toma lunes 12/10 21:00. Nota de litemia y función renal.

**E6.** Moclobemida 150 mg a las 09:00 y 21:00.
Esperado: 24 h. Última toma martes 13/10 21:00. Nota de anestesia segura con IMAO.

**E7.** Tranilcipromina.
Esperado (punto 8, 10.1): mantener por defecto con la nota de anestesia segura con IMAO. Punto de validación amarillo «confirmar retirada 10-14 días con psiquiatría o anestesia segura con IMAO».

**E8.** Rasagilina.
Esperado: mantener, con la nota de fármacos a evitar.

**E9.** Ibuprofeno 600 mg a las 00:00, 08:00 y 16:00.
Esperado: 24 h. Última toma miércoles 14/10 08:00 (cae justo en el límite y está permitida). Texto de alternativa con paracetamol o metamizol.

**E10.** Naproxeno 500 mg a las 09:00 y 21:00.
Esperado: 72 h. Última toma domingo 11/10 21:00 (los AINE no adelantan tomas).

**E11.** Metotrexato 15 mg semanal por artritis reumatoide. Prótesis de cadera.
Esperado: mantener.

**E12.** Adalimumab cada 2 semanas, última dosis jueves 08/10.
Esperado (punto 8, 7.3): se propone programar la cirugía al final del ciclo; la intervención cae a mitad de ciclo (última dosis 08/10, ciclo de 14 días). Punto de validación amarillo «confirmar el encaje de la cirugía con el ciclo».

**E13.** Bevacizumab, última dosis hace 4 semanas.
Esperado (punto 8, 8.1): alerta roja de retrasar la cirugía al menos 6-8 semanas desde la última dosis. Texto al paciente «Avise a su oncólogo de la fecha de la operación antes de recibir la siguiente dosis». Punto de validación rojo.

**E14.** Eylea (aflibercept intravítreo).
Esperado: mantener; no activa la regla de antiangiogénicos.

**E15.** Ginkgo.
Esperado: suspender 14 días si es posible, mínimo 7.

**E16.** Mujer 35 años, anticonceptivo combinado oral. Prótesis de cadera (riesgo trombótico alto), anestesia general posible.
Esperado (punto 8, 9.2): mantener por defecto (no se suspende de rutina por la cirugía); la nota del anestesiólogo valora suspender 4-6 semanas antes solo en muy alto riesgo. Punto de validación amarillo. Además, la advertencia de sugammadex para anticonceptivo oral.

**E17.** Mujer 30 años, implante anticonceptivo. Colecistectomía, anestesia general.
Esperado: sin la regla de riesgo trombótico. Advertencia de sugammadex para anticonceptivo no oral (barrera 7 días).

## F. Escalas

**F1.** STOP-Bang: varón 56 años, ronca, HTA, IMC 36, cuello 42 cm, sin cansancio ni apneas.
Esperado: 6, riesgo alto, alerta.

**F2.** STOP-Bang: mujer 45 años, ronca y cansancio diurno, IMC 30, cuello 36 cm, sin HTA.
Esperado: 2, riesgo bajo.

**F3.** Apfel: mujer no fumadora con cinetosis, cirugía de riesgo intermedio, opioides «no se sabe».
Esperado: 4, 80 %.

**F4.** CHA2DS2-VA: mujer 76 años, diabetes, insuficiencia cardiaca.
Esperado: 4 (edad ≥ 75 2, diabetes 1, IC 1; el sexo no puntúa).

**F5.** DASI: autocuidado, caminar en casa, 1-2 manzanas, un piso de escaleras, tareas ligeras y moderadas de casa, relaciones sexuales.
Esperado: DASI 24,2; METs 5,7; capacidad reducida (DASI ≤ 34, aunque los METs calculados superen 4).

**F6.** Cockcroft-Gault: varón 80 años, 60 kg, creatinina 1,2 mg/dL.
Esperado: 42 mL/min. Mismo caso en mujer: 35 mL/min.

**F7.** 4AT telefónico: alerta normal, 1 error en AMT4, meses al revés con menos de 7 correctos, sin cambio agudo.
Esperado: 2, posible deterioro cognitivo; recomendaciones de prevención del delirium; el resumen indica modalidad telefónica.

**F8.** 4AT con cambio agudo o curso fluctuante y el resto normal.
Esperado: 4, alerta roja de posible delirium.

**F9.** EGRI telefónico: peso 115 kg, intubación difícil previa dudosa; exploración no disponible.
Esperado: EGRI parcial 3, con el aviso «exploración pendiente».

**F10.** Langeron: varón 60 años, barba, IMC 27, dentado, no ronca.
Esperado: 3 predictores, riesgo de ventilación difícil.

**F11.** Morfina equivalente: fentanilo transdérmico 25 µg/h y tapentadol 100 mg cada 12 h.
Esperado: 60 + 80 = 140 mg/día, alerta alta, alerta de dolor transicional.

**F12.** AUDIT-C mujer, 3 puntos.
Esperado: positivo, consejo breve y hoja de alcohol; sin alerta de abstinencia.

**F13.** HEMSTOP con 2 respuestas positivas. Mujer 40 años sana, tumorectomía de mama.
Esperado: se pide coagulación (y hemograma) aunque la tabla no lo pida; alerta.

## G. Pruebas complementarias

**G1.** Varón 70 años, HTA controlada, METs ≥ 4. Prótesis de rodilla (riesgo intermedio).
Esperado: paciente bajo-moderado. Hemograma y coagulación, bioquímica, ECG. Sin Rx de tórax. Sin BNP.

**G2.** Mujer 40 años sana, sin medicación. Colecistectomía laparoscópica (riesgo intermedio).
Esperado: hemograma y coagulación. Sin bioquímica, sin ECG, sin Rx.

**G3.** Varón 60 años, insuficiencia cardiaca NYHA III. Colectomía (riesgo intermedio). ECG de hace 2 meses, coagulación de hace 20 días.
Esperado: paciente alto. Hemograma y coagulación (la coagulación caduca antes de la intervención), bioquímica con BNP o NT-proBNP, Rx de tórax. ECG vigente el día de la intervención: no se repite.

## H. Ayuno

**H1.** Adulto sin factores de riesgo.
Esperado: comida copiosa hasta las 00:00; comida ligera hasta las 02:00; líquidos claros libres hasta las 04:00; entre 04:00 y 06:00, máximo 400 mL; bebida de carbohidratos entre las 05:00 y las 06:00; nada desde las 06:00 salvo la medicación con un sorbo de agua.

**H2.** Niño de 2 años.
Esperado: fórmula y sólidos hasta las 02:00; leche materna hasta las 05:00; líquidos claros hasta las 07:00.

**H3.** Lactante de 4 meses con leche de fórmula.
Esperado: fórmula hasta las 04:00; aviso de riesgo de hipoglucemia.

**H4.** Diabético con síntomas de gastroparesia.
Esperado: sólidos hasta las 00:00 (8 h); sin bebida de carbohidratos; alerta de premedicación con metoclopramida.

## I. mtND4 y coherencia

**I1.** Madre venezolana, test genético negativo.
Esperado: alerta informativa «variante m.11232T>C ausente; decisión del anestesiólogo».

**I2.** Abuela materna venezolana, sin test.
Esperado: alerta roja.

**I3.** Abuela paterna venezolana, resto negativo.
Esperado: sin alerta (no es línea materna).

**I4.** Prednisona añadida sin ninguna indicación recogida.
Esperado: tarjeta de coherencia con las indicaciones posibles; no marca ninguna enfermedad.

**I5.** SAOS marcado sin CPAP en la medicación ni en el módulo.
Esperado: tarjeta inversa sugiriendo preguntar por la CPAP.

## Decisiones del servicio incorporadas

1. IECA y ARA-II: no tomar el día de la intervención, para que el paciente no esté dos días sin tratamiento.
2. GLP-1 semanales: la última dosis debe ser al menos 7 días antes de la intervención.
3. Anticoagulantes con plazo en horas (ACOD, heparinas, fondaparinux): adelantar a la hora límite la primera toma posterior al límite si cae como máximo 10 horas después, siempre que quede al menos la mitad del intervalo habitual desde la toma anterior. Nunca se atrasa una toma. En el resto de fármacos no se adelantan tomas.
4. Bomba de insulina (2026-10-04): se retira el régimen (CMA/ingreso); la decisión depende solo del riesgo quirúrgico. Riesgo bajo: basal al 80 % y suspender bolos. Riesgo intermedio o alto (punto 8): venir con la bomba a su ritmo basal habitual y traer recambios; en el hospital se decide si se mantiene o se pasa a insulina intravenosa; punto de validación amarillo (CPOC/JBDS). Casos D10 y D11 actualizados.
5. Punto 8 (fase ágil): ningún fármaco queda «pendiente de confirmar». Cada regla propone siempre una pauta concreta y, cuando la decisión clínica es relevante, deja un punto de validación 🔴 (posponer) o 🟡 (validar) para el anestesiólogo. Si el punto es rojo, la hoja del paciente añade la línea «El anestesiólogo revisará esta indicación y le llamará si hay algún cambio». Falta de aclaramiento: se usa el filtrado glomerular apuntado como aproximación y, si no lo hay, el tramo más prudente (A7). Falta la hora de la toma: se asume la toma más tardía (23:59). Plazo no alcanzable: «No tome más dosis desde hoy» (rojo). Casos afectados: A7, A8, A11, A12, C2, C4b, C6, C7, D11, E3, E7, E12, E13, E16.
