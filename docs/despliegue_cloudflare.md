# Cómo publicar AnesHealth en Cloudflare (guía paso a paso)

> **Para quién es esta guía.** Está escrita para alguien **sin conocimientos
> técnicos**. No hay que programar nada: solo hacer clic, copiar y pegar textos tal
> cual aparecen aquí. Cada vez que veas un recuadro con texto, cópialo **exactamente**,
> sin cambiar mayúsculas ni espacios.

> **⚠️ Muy importante — cuándo hacer esto.** Esta migración hay que hacerla **ANTES**
> de empezar a usar el programa con pacientes reales. El motivo: los códigos QR que se
> entregan a los pacientes llevan impresa la dirección web del programa. Si imprimes
> QR con la dirección antigua (la de pruebas, GitHub Pages) y luego cambias de
> dirección, **esos QR dejarían de funcionar**. Por eso primero se fija la dirección
> definitiva (Cloudflare) y, a partir de ahí, ya se pueden imprimir QR para pacientes.

---

## Qué vamos a conseguir

Al terminar esta guía tendrás, con los **planes gratuitos** de Cloudflare:

1. **Dos páginas publicadas** en Cloudflare:
   - La aplicación de **enfermería** (la entrevista completa).
   - La **vista del paciente** (la hoja que se abre al escanear el QR), en la
     dirección `.../paciente/`.
2. **Dos direcciones** del mismo proyecto:
   - **Producción** (rama `main`): `https://<proyecto>.pages.dev`.
   - **Vista previa** (rama `desarrollo`): `https://desarrollo.<proyecto>.pages.dev`.
3. La aplicación de enfermería **protegida con acceso por correo** (un código de un
   solo uso al correo): solo entran los correos que terminan en **`@ext.vithas.es`**.
   La **vista del paciente** (`.../paciente/`) queda **sin protección**, para que
   cualquier paciente pueda abrir su hoja desde casa, en producción y en desarrollo.

> **Sobre el nombre del proyecto.** En esta guía lo llamamos `<proyecto>`. Tú lo
> crearás con el nombre **`aneshealth-preanestesia`**. Si Cloudflare le añadiera algo
> al nombre, usa en toda la guía la **dirección exacta** que te muestre Cloudflare y
> pásamela, porque hay que ponerla también en un fichero del programa (paso final).

---

## Antes de empezar: lo que necesitas tener a mano

- La cuenta de **GitHub** donde está el proyecto (`holaaneshealth-eng/preanestesia`).
- Un **correo electrónico** para crear la cuenta de Cloudflare (puede ser el tuyo).
- La lista de **correos del personal** que debe poder entrar (todos terminan en
  `@ext.vithas.es`).
- Unos 30–45 minutos sin prisa.

> El repositorio puede seguir **en abierto** durante toda esta guía. Ponerlo en privado
> es el **último paso**, y solo cuando tú lo autorices (ver el paso 6).

---

## Paso 1 — Crear el proyecto de Cloudflare Pages

### 1.1 — Crear la cuenta y conectar GitHub

1. Entra en `https://dash.cloudflare.com/sign-up` y crea una cuenta gratuita con tu
   correo. Confirma el correo de verificación que te llegue.
2. En el menú de la izquierda, entra en **Workers & Pages**.
3. Pulsa **Create** (Crear) y luego la pestaña **Pages**.
4. Pulsa **Connect to Git** (Conectar con Git) y elige **GitHub**. Autoriza a
   Cloudflare y, cuando pregunte a qué repositorios, selecciona **solo**
   `preanestesia`.
5. En la lista de repositorios elige **preanestesia** y pulsa **Begin setup**
   (Comenzar configuración).

### 1.2 — Configurar la compilación (¡los valores exactos!)

Rellena los campos **exactamente** con estos valores (copia y pega):

| Campo en Cloudflare | Qué escribir (valor exacto) |
|---|---|
| **Project name** (Nombre del proyecto) | `aneshealth-preanestesia` |
| **Production branch** (Rama de producción) | `main` |
| **Framework preset** (Preajuste) | `None` (Ninguno) — o `Vite` si aparece |
| **Build command** (Orden de compilación) | `npm run build:prod` |
| **Build output directory** (Carpeta de salida) | `dist` |
| **Root directory** (Carpeta raíz) | *(déjalo vacío)* |

> **🔴 Clave:** la orden de compilación tiene que ser **`npm run build:prod`**, NO
> `npm run build`. La versión `build:prod` es la de **producción ofuscada** (código
> protegido).

Después, despliega **Environment variables (advanced)** (Variables de entorno,
avanzado) y añade **una** variable, para fijar la versión de Node:

| Variable (Variable name) | Valor (Value) |
|---|---|
| `NODE_VERSION` | `22` |

### 1.3 — Limitar las ramas que se publican

Queremos que, además de producción (`main`), se publique **solo** la rama `desarrollo`
como vista previa (ninguna otra).

1. Guarda y despliega (**Save and Deploy**). Cloudflare hará el primer build de `main`.
2. Cuando termine, entra en el proyecto → **Settings** (Configuración) →
   **Builds & deployments** (Compilaciones y despliegues) → **Branch control**
   (Control de ramas).
3. En **Preview branches** (Ramas de vista previa) elige la opción de **ramas
   concretas** («Include specific branches» / «Only these branches») y escribe una
   sola rama:

   ```
   desarrollo
   ```

4. Guarda.

> Resultado: `main` se publica en `https://<proyecto>.pages.dev` y `desarrollo` en
> `https://desarrollo.<proyecto>.pages.dev`. Ninguna otra rama se publica.

---

## Paso 2 — Comprobar que carga la dirección de desarrollo

1. En el proyecto de Pages, pestaña **Deployments** (Despliegues), busca el último
   despliegue de la rama `desarrollo` (si aún no hay, haz un cambio pequeño en esa rama
   o espera al siguiente push; el programa ya está preparado para compilarse en
   Cloudflare).
2. Abre `https://desarrollo.<proyecto>.pages.dev`. Debe cargar la app de enfermería con
   la banda **«VERSIÓN DE PRUEBA · NO USAR CON PACIENTES»** arriba.
3. Abre `https://desarrollo.<proyecto>.pages.dev/paciente/`. Debe cargar la vista del
   paciente (una página distinta, la de la hoja).

> Todavía **no hay protección por correo**: eso se activa en los pasos 3 y 4. De
> momento solo comprobamos que las dos páginas cargan.

---

## Paso 3 — Activar Cloudflare Access (Zero Trust) en el plan gratuito

1. En el menú de la izquierda de Cloudflare, pulsa **Zero Trust**.
2. La primera vez te pedirá un nombre de «equipo» (team name): escribe algo sencillo,
   por ejemplo `aneshealth`, y confirma.
3. Cuando pregunte por un plan, elige el **Free** (Gratuito) y continúa. (No hace falta
   tarjeta para el plan gratuito.)

> Cloudflare Access ya trae activado el método de **código de un solo uso al correo**
> (One-time PIN) en el plan gratuito, así que no hay que configurar nada más de eso.

---

## Paso 4 — Proteger el proyecto (y dejar `/paciente` libre)

Queremos proteger **todas** las direcciones del proyecto (producción, desarrollo y las
de cada despliegue) salvo la vista del paciente.

### 4.1 — Crear la aplicación de Access que protege el proyecto

1. En Zero Trust, ve a **Access → Applications** y pulsa **Add an application**.
2. Elige **Self-hosted** (Autoalojada).
3. Rellena:
   - **Application name** (Nombre): `AnesHealth enfermería`.
   - **Session duration** (Duración de la sesión): `24 hours`.
4. En **Application domain** (Dominio de la aplicación) añade **dos** entradas, para
   cubrir producción y todas las vistas previas/despliegues:
   - `<proyecto>.pages.dev` (deja la ruta vacía).
   - `*.<proyecto>.pages.dev` (el asterisco cubre `desarrollo.…` y las direcciones de
     cada despliegue; deja la ruta vacía).

   > Si tu panel solo deja poner **un** dominio por aplicación, crea **dos aplicaciones
   > iguales**: una para `<proyecto>.pages.dev` y otra para `*.<proyecto>.pages.dev`,
   > ambas con la misma política del punto 4.3.

### 4.2 — Dejar la vista del paciente SIN protección (excepción)

La vista del paciente (`/paciente`) tiene que abrirse **sin iniciar sesión**, en
producción y en desarrollo.

- Si la aplicación del punto 4.1 permite añadir **excepciones por ruta** (Bypass):
  añade una ruta **`/paciente`** (y, si deja, también **`/paciente/*`**) con política
  de tipo **Bypass** (Omitir) y condición **Everyone** (Todos).

- Si tu versión de Cloudflare **no** permite la excepción dentro de la misma
  aplicación, hazlo con **dos aplicaciones de Access** (Cloudflare aplica siempre la
  ruta más concreta primero, así que la del paciente «gana»):

  1. **Aplicación «paciente» (créala PRIMERO).** Self-hosted, con estos dominios y la
     ruta `/paciente`:
     - `<proyecto>.pages.dev/paciente`
     - `*.<proyecto>.pages.dev/paciente`

     Política: **Action = Bypass**, **Include = Everyone** (Todos). Así cualquier
     paciente entra sin código, en producción y en desarrollo.
  2. **Aplicación «enfermería».** Self-hosted, con los dominios del punto 4.1
     (`<proyecto>.pages.dev` y `*.<proyecto>.pages.dev`, rutas vacías) y la política de
     correo del punto 4.3.

### 4.3 — Política de acceso: solo correos `@ext.vithas.es`

En la aplicación que protege la app de enfermería, crea la política de entrada:

1. **Add policy** (Añadir política):
   - **Policy name** (Nombre): `Personal Vithas`.
   - **Action** (Acción): **Allow** (Permitir).
2. En **Configure rules → Include** (Incluir), elige **Emails ending in** (Correos que
   terminan en) y escribe **exactamente**:

   ```
   @ext.vithas.es
   ```

   > **🔴 Muy importante:** tiene que ser **`@ext.vithas.es`** (con `ext.`). Cloudflare
   > compara el **final exacto** del correo, así que **`@vithas.es` NO vale**: no
   > cubriría los correos `@ext.vithas.es`. Es el único dominio que usamos.
   >
   > Si algún día hubiera que dar acceso a un correo suelto que no termine así, se añade
   > aparte con otra regla **Include → Emails** (Correos) y la dirección completa.
3. Guarda la política y la aplicación.

---

## Paso 5 — Comprobar la protección (navegador en modo incógnito)

Hazlo en una **ventana de incógnito** (así no usas una sesión ya iniciada):

1. Abre `https://<proyecto>.pages.dev` → **debe pedir el correo y el código**. Escribe
   un correo `@ext.vithas.es`, copia el código que llegue y entra.
2. Abre `https://<proyecto>.pages.dev/paciente/` → **no debe pedir código**, se abre
   directamente.
3. Repite las dos comprobaciones con la dirección de desarrollo:
   - `https://desarrollo.<proyecto>.pages.dev` → pide código.
   - `https://desarrollo.<proyecto>.pages.dev/paciente/` → no pide código.

> Si `/paciente/` pidiera código, revisa la excepción del punto 4.2 (que esté
> **antes**/por encima y que cubra los dos dominios).

---

## Paso 6 — Cierre (SOLO cuando lo autorices expresamente)

Estos pasos se hacen **al final**, cuando hayas probado todo y des el visto bueno.
Hasta entonces, el programa sigue funcionando también en GitHub Pages.

1. **Apuntar los QR a la dirección definitiva.** En GitHub, abre `datos/config.json` y
   pon el nombre del proyecto de Cloudflare en la línea `cloudflare_proyecto`
   (normalmente ya será `aneshealth-preanestesia`; si Cloudflare te dio otro nombre,
   pon ese):

   ```json
   "cloudflare_proyecto": "aneshealth-preanestesia",
   ```

   > Con esto, los QR de **producción** apuntan a `https://<proyecto>.pages.dev/paciente/`
   > y los de **desarrollo** a `https://desarrollo.<proyecto>.pages.dev/paciente/`,
   > automáticamente. No hay que tocar nada más para los QR.

2. **Fusionar `desarrollo` en `main`.** Solo con tu autorización expresa. Al fusionar,
   Cloudflare publicará producción en `https://<proyecto>.pages.dev` (sin la banda de
   prueba).

3. **Poner el repositorio en privado.** En GitHub → **Settings → General → Danger Zone
   → Change repository visibility → Make private**. Cloudflare seguirá pudiendo
   compilarlo porque ya le diste permiso en el paso 1.

4. **Desactivar GitHub Pages.** En GitHub → **Settings → Pages → Source = None**
   (Ninguno). Y en el fichero del flujo de trabajo `.github/workflows/desarrollo.yml`,
   quita **solo** los pasos de despliegue a Pages (subir el artefacto y el `job`
   `deploy`). **Las pruebas del CI (typecheck, Vitest, E2E y la verificación de
   builds) se mantienen**: son las que garantizan que nada se rompe.

> A partir de aquí, la dirección buena es la de Cloudflare (`main`), y la de pruebas es
> `desarrollo.<proyecto>.pages.dev`.

---

## Paso 7 (opcional) — Usar un dominio propio

Si el hospital tiene (o compra) un dominio propio (por ejemplo
`preanestesia.vithasbarcelona.es`):

1. En el proyecto de Pages → **Custom domains** → **Set up a custom domain** y sigue
   las instrucciones.
2. **Repite el paso 4** (protección y excepción `/paciente`) usando también ese dominio.

---

## Paso 8 — Comprobación final en dispositivos reales (¡no te lo saltes!)

Antes de usar el programa con el primer paciente, haz esta prueba **en los dispositivos
de verdad del servicio**: las **tablets** (incluido **iPad**, si se usa) **y** un
**móvil** (como el de un paciente). En cada dispositivo:

1. **Abrir producción** `https://<proyecto>.pages.dev`: pide el código por correo,
   entras y la app va **fluida**. No aparece la banda de prueba.
2. **Recorrer una entrevista completa** con un caso de ejemplo hasta el resumen.
3. **Generar el QR del paciente** y comprobar que aparece.
4. **Escanear el QR con un móvil:** se abre la **vista del paciente** en `.../paciente/`
   **sin pedir código**.
5. **Comprobar la hoja:** se ve bien, funciona el cambio **castellano ↔ catalán**, el
   botón **«Me han dado la fecha o me la han cambiado»** (recalcula días/horas) y
   **Guardar como PDF**.
6. **Confirmar la protección** en incógnito: `https://<proyecto>.pages.dev` pide código;
   `https://<proyecto>.pages.dev/paciente/` no.

---

## Resumen de los valores exactos (chuleta)

| Dónde | Valor exacto |
|---|---|
| Nombre del proyecto (Project name) | `aneshealth-preanestesia` |
| Rama de producción (Production branch) | `main` |
| Rama de vista previa (Preview branch) | solo `desarrollo` |
| Orden de compilación (Build command) | `npm run build:prod` |
| Carpeta de salida (Build output directory) | `dist` |
| Variable de entorno | `NODE_VERSION` = `22` |
| Dominios protegidos (Access) | `<proyecto>.pages.dev` y `*.<proyecto>.pages.dev` |
| Correos permitidos (Emails ending in) | `@ext.vithas.es` |
| Ruta sin protección (pacientes) | `/paciente` (Bypass / Everyone), en los dos dominios |
| Nombre del proyecto en `datos/config.json` | `cloudflare_proyecto` = `aneshealth-preanestesia` |
