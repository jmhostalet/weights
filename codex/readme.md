# Weights: contexto y especificación para continuar o reproducir la app

Última revisión: 9 de noviembre de 2026. Este documento está en español para el desarrollador; **toda la interfaz de la aplicación debe estar en inglés**, incluidos mensajes, ayudas, errores y etiquetas de accesibilidad.

## 1. Objetivo y fuentes de referencia

Weights es un diario personal de entrenamiento de pesas: permite registrar máquinas, series, repeticiones, kilos y minutos de bicicleta por día, consultar el volumen levantado y sincronizar entre dispositivos mediante el Google Drive de cada usuario.

Referencias del repositorio:

- `weights.html`: implementación completa y referencia visual y funcional principal. Conservar sus estilos, SVG y comportamiento al modificarla.
- `codex/readme.md`: requisitos, decisiones y contexto de producto para cualquier IA o desarrollador.
- `GOOGLE_DRIVE_SETUP.md`: configuración de Google, uso de la sincronización y migración del formato antiguo.
- `scripts/stamp-version.py`: inserta la versión visible usando la zona Europe/Madrid.
- `.github/workflows/pages.yml`: valida y publica una versión nueva en cada push a `main`.
- `tests/sync.test.cjs`: pruebas ejecutables del almacenamiento y la sincronización; no necesitan acceso a Google.

La inspiración original es `macrodiario.html` del proyecto hermano MacroDiario. Se adaptaron su arquitectura de archivo único y su lenguaje visual a pesas. Si está disponible en el mismo entorno, se encuentra en `../MacroDiario/macrodiario.html`. **No es una dependencia de ejecución** y no se deben copiar sus funciones de comida, Firebase, chat, amigos o escaneo de códigos.

Para reproducir la app, implementar lo descrito aquí y reutilizar los recursos originales de `weights.html` si están disponibles. No sustituir el diseño por una landing, un dashboard de escritorio o un sistema visual diferente.

## 2. Arquitectura y ejecución

- Aplicación estática en **un solo `weights.html`**, con HTML, CSS, JavaScript y SVG integrados.
- JavaScript nativo: sin framework, backend propio, Firebase, base de datos compartida, bundler ni instalación de dependencias para ejecutar la app.
- Funciona localmente sin iniciar sesión; la conexión a Google es opcional y sirve para sincronizar.
- Las fuentes Inter y Poppins se solicitan a Google Fonts, con `sans-serif` como alternativa.
- Google Identity Services se carga desde `https://accounts.google.com/gsi/client` al abrir la conexión; el acceso a Drive se realiza mediante `fetch` desde el navegador.
- Abrir el HTML directamente permite el uso local en navegadores compatibles; Google requiere HTTPS o localhost.
- Para desarrollo: `python3 -m http.server 8000`, y abrir `http://localhost:8000/weights.html`.
- Requiere navegador moderno: `localStorage`, `<dialog>`, `fetch`, `crypto.randomUUID()`, fechas y formato internacional.
- No hay service worker, instalación PWA, proceso de sincronización en segundo plano ni caché offline de todos los recursos. Guardar entrenamientos sin conexión no implica que una primera visita pueda cargar la página sin red.

## 3. Diseño visual que se debe conservar

Diseño pensado primero para móvil, con una columna centrada de **640 px de ancho máximo**, altura mínima `100dvh` y márgenes laterales habituales de 20 px. En pantallas de hasta 360 px se reducen a 12 px.

| Elemento | Valor o comportamiento |
|---|---|
| Fondo general | `#F4F5FA` |
| Tarjetas | Blanco `#FFFFFF` |
| Texto principal | `#20232E` |
| Texto secundario | `#73798D` |
| Bordes suaves | `#ECEDF4` |
| Verde principal | `#0FBF8F` |
| Verde oscuro | `#087D5E` |
| Verde suave | `#E3F8F1` |
| Error / peligro | `#D72D55` |
| Tipografía de cuerpo | Inter |
| Títulos y cifras destacadas | Poppins |
| Radio de tarjetas | 22 px |
| Radio de botones principales | 14 px |
| Radio de campos | 10 px |
| Sombra de tarjetas | `0 2px 10px #20232e0d, 0 10px 24px -12px #20232e1a` |
| Cifra del volumen diario | 36 px, peso 800; 30 px en pantallas muy pequeñas |

Orden de la pantalla:

1. Cabecera con logotipo verde de mancuerna, título **Weights** y botón circular de información.
2. Calendario semanal horizontal con flechas anterior/siguiente.
3. Acción de conectar/sincronizar y texto de estado.
4. Botón de revisión de conflictos, solo cuando existan.
5. Fecha del día seleccionado.
6. Tarjeta de resumen: total semanal, volumen diario y tres contadores.
7. Encabezado **Your workout** y número de máquinas añadidas.
8. Tarjetas de las máquinas, o estado vacío.
9. Botón verde **+ Add machine**.
10. Indicador final **Total weight lifted**, en kg.
11. Pie: **Your progress, one set at a time.**, **Saved automatically in this browser.** y **Version yymmdd.hhmmss**.

La tarjeta de resumen queda fija al hacer scroll (`position: sticky; top: 8px; z-index: 2`). La cabecera y calendario se desplazan normalmente.

El favicon es un **SVG integrado como data URI**, de 32 × 32, fondo verde principal con esquinas de 8 px y una mancuerna blanca horizontal de discos y barra. No necesita archivos de imagen ni generación de imágenes. Mantener el favicon y el logotipo coherentes con la marca.

## 4. Calendario y resumen

- Al abrir se selecciona la fecha local actual, no una fecha UTC que pueda caer en otro día.
- Claves de día: `YYYY-MM-DD`. Al convertirlas a `Date`, usar mediodía local (`T12:00:00`); desplazar con calendario local para evitar cambios accidentales por zona horaria.
- La semana va de lunes a domingo. Las flechas desplazan semana y fecha seleccionada siete días.
- Cada botón de día mide aproximadamente 42 × 58 px, tiene forma de píldora y muestra abreviatura inglesa del día y número.
- Día seleccionado: fondo oscuro y letras blancas. Hoy, si no está seleccionado: borde interior verde. Días con máquinas registradas: punto verde inferior.
- El carrusel puede desplazarse horizontalmente si los siete días no caben.
- Fechas y números usan formato `en-GB`; los números admiten hasta dos decimales en el resumen.
- La fecha muestra **Today ·** solo si es hoy, seguida de día de semana, día, mes y año en inglés.
- Resumen semanal: sumar volumen de los siete días visibles. Actualmente su etiqueta es **This week**, incluso al consultar otra semana.
- Resumen diario: **Total weight lifted today**, unidad kg, y contadores **Machines**, **Sets**, **Warm-up**.
- `Machines` incluye la bicicleta si está añadida. `Sets` cuenta solo series de fuerza. `Warm-up` muestra los minutos de bicicleta.
- El resumen refleja la fecha seleccionada, aunque las etiquetas actuales incluyan la palabra “today”.

## 5. Máquinas, series y valores predeterminados 

El botón **+ Add machine** abre un diálogo **Add machine**, con este orden y estos identificadores estables:

| ID | Nombre visible | Registro |
|---|---|---|
| `bike` | Warm-up bike | Minutos |
| `abs` | Abdominals | Series de repeticiones y peso |
| `pulldown` | Lat pulldown | Series de repeticiones y peso |
| `quads` | Quadriceps | Series de repeticiones y peso |
| `calves` | Calves | Series de repeticiones y peso |
| `biceps` | Biceps | Series de repeticiones y peso |

- Solo una instancia de cada máquina por día. En el selector, una máquina ya añadida queda deshabilitada con **Already added**.
- Cada opción y tarjeta tiene un icono SVG lineal que represente el ejercicio real. Bicicleta, abdominales, jalón, cuádriceps y bíceps tienen dibujos propios de persona/aparato; **Calves debe usar exactamente el mismo icono que Quadriceps**, por petición expresa del usuario.
- Los SVG de ejercicio usan `viewBox="0 0 32 32"`, trazo redondeado, sin relleno y grosor aproximado de 1,6. Se muestran a 30 × 30 dentro de una caja verde suave de 38 × 38 con radio de 12 px. Reutilizar `exercisePaths` y `exerciseIcon()` del HTML para fidelidad exacta.
- Al añadir una máquina de fuerza, crear inmediatamente **una serie de 12 repeticiones**.
- El peso inicial es el de la última serie disponible de esa misma máquina, buscando desde la fecha seleccionada hacia atrás. Incluir el día seleccionado si ya tiene series; excluir siempre días posteriores. Saltar días donde esa máquina no tenga series. Si no hay historial, usar **20 kg**.
- **+ Add set** crea otra serie con **12 repeticiones**, reutilizando el último peso según esa misma regla; no copiar el número anterior de repeticiones.
- Repeticiones: entero de **1 a 999**, campo numérico con teclado apropiado.
- Peso: desplegable de **20 a 70 kg, ambos incluidos, con paso de 1 kg**: 51 opciones. No texto libre, libras ni fracciones.
- Cada fila muestra número de serie empezando en 1, repeticiones, peso y acción de eliminar.
- Eliminar una serie es inmediato; las restantes se renumeran. Se permite una máquina sin series.
- Eliminar una máquina exige confirmar en diálogo **Remove machine?**, con **Remove machine** y **Keep machine**. Solo afecta al día seleccionado.
- La bicicleta empieza en **0 minutos**; campo de 0 a 1440 minutos, con paso de 0,1. No tiene series ni kilos.
- Guardar los cambios válidos de campos mediante `change`; escribir un valor inválido no debe incorporarlo al modelo. Mostrar validación nativa y permitir corregirlo.
- No guardar cambios de datos por enfocar un campo o introducir el mismo valor otra vez.

## 6. Cálculos

```text
volumen de una serie = repeticiones × peso en kg
volumen de una máquina = suma del volumen de sus series
volumen diario = suma de todas las máquinas de fuerza del día
volumen semanal = suma del volumen diario de los siete días visibles
```

Ejemplo: 12 repeticiones × 30 kg = **360 kg**. Dos series iguales suman **720 kg**. La bicicleta se registra aparte y nunca incrementa los kg.

Mostrar el total diario en el resumen superior y de nuevo al final; mostrar también el subtotal de cada máquina de fuerza.

**No existe cálculo de kcal en la app.** Se habló de estimaciones orientativas para el usuario (53 años, 187 cm y 89 kg; sesiones de 30–40 minutos), pero no se solicitó implementar esa función. Esos datos personales no son valores predeterminados del producto ni deben guardarse en perfiles o usarse en cálculos sin una petición nueva. No convertir automáticamente kilos acumulados en kcal.

## 7. Modelo de datos y persistencia compatible

Los entrenamientos se leen en memoria como un objeto `logs` por fecha:

```json
{
  "2026-11-09": [
    { "type": "bike", "minutes": 10 },
    { "type": "biceps", "sets": [
      { "reps": 12, "weight": 30 },
      { "reps": 12, "weight": 32 }
    ] }
  ]
}
```

Un día sin máquinas puede omitirse de `logs`. El orden de las máquinas y series se conserva.

Claves de `localStorage`:

| Clave | Uso |
|---|---|
| `weights_logs_v1` | Formato histórico de `logs`; leer y migrar si falta el estado de revisiones. Ya no es el almacenamiento autoritativo. |
| `weights_sync_v2` | Estado actual autoritativo: `{ "version": 2, "account": null o ID de Drive, "records": [...] }`. |
| `weights_google_client_id` | Configuración pública de cliente OAuth; la constante del HTML tiene prioridad. |

Cada revisión guarda una **instantánea completa de un día**, no una máquina aislada:

```json
{
  "id": "4df5534f-08d8-4cb3-b613-ab5bf778fa42",
  "date": "2026-11-09",
  "machines": [{ "type": "biceps", "sets": [{ "reps": 12, "weight": 30 }] }],
  "parents": [],
  "time": 1794222000000
}
```

- `id`: UUID generado por `crypto.randomUUID()`; `time`: milisegundos de `Date.now()`.
- `parents`: IDs de las revisiones de ese mismo día que la nueva revisión sustituye.
- Validar fechas reales, catálogo, tipos, rangos, duplicados de máquinas, IDs únicos y grafo de padres. Rechazar ciclos, padres inexistentes o de otro día; el límite actual de validación es de 20.000 revisiones.
- Al iniciar sin estado actual, crear una revisión raíz por día del formato histórico y escribir el estado nuevo, conservando el antiguo.
- Reconstruir `logs` a partir del historial. No reiniciar el diario ni sobrescribir silenciosamente datos corruptos.
- Ante error de almacenamiento, mostrar aviso y pausar la sincronización; no presentar datos sin guardar como sincronizados.
- Si otra pestaña modifica `weights_sync_v2`, desconectar y bloquear edición/sync hasta recargar para evitar mezclar estados o cuentas.

## 8. Sincronización: decisión vigente de producto

**Cada usuario guarda sus datos en su propio Google Drive.** Un mismo proyecto OAuth de Weights sirve a todas las cuentas autorizadas. No usar Firestore ni almacenar todos los diarios en un proyecto del desarrollador.

La versión actual usa únicamente autorización de Google y permisos de Drive:

- **Sin contraseña adicional, clave de recuperación, HMAC del correo ni cifrado propio.** Se probó una versión cifrada y el usuario pidió eliminar esa complejidad.
- Los archivos cloud son JSON legible. No prometer cifrado de extremo a extremo.
- El dueño del proyecto OAuth no recibe por ello acceso administrativo a los archivos de los usuarios. La app sí tiene el acceso que cada usuario autoriza.
- Los datos locales son igualmente legibles en el perfil del navegador.
- No pedir a cada usuario que cree proyectos, bases de datos, IDs OAuth o claves API. Eso pertenece al desarrollador y se configura una vez.

### Experiencia de conexión

1. Sin sesión vigente, el botón superior muestra **☁ Connect Google Drive** y abre el diálogo de conexión.
2. El usuario confirma que los entrenamientos de ese navegador pertenecen a la cuenta que va a elegir.
3. **Connect Google Drive** abre el selector de cuenta/consentimiento de Google.
4. Tras identificar la cuenta, sincronizar inicialmente para recuperar y fusionar los datos cloud.
5. Con sesión vigente, el botón superior muestra **☁ Sync now** y sincroniza directamente: **no debe abrir de nuevo el menú ni pedir conexión en cada pulsación**.
6. El menú sigue accesible desde información → **Manage Google Drive connection**. Incluye **Sync now** y **Disconnect**.
7. Desconectar borra token y estado de conexión en memoria, pero conserva diario local, vínculo de cuenta y archivos cloud. No revoca el consentimiento en Google.

El token de acceso se conserva solo en memoria. No guardar tokens ni credenciales en `localStorage`. Al recargar o caducar la sesión se requiere reconectar; no prometer conexión permanente. La caducidad actual se calcula con `expires_in` menos 30 segundos de margen.

El primer sync correcto vincula el diario del navegador a `user.permissionId` de Drive. Rechazar otra cuenta antes de subir datos; recomendar otro perfil de navegador para otra persona.

### Cuándo sincronizar

Requisito expreso: **sincronizar automáticamente solo al introducir cambios reales**.

- Crear, editar o eliminar máquinas/series, cambiar minutos y resolver conflictos cuenta como cambio.
- Guardar primero en local y programar sync tras **1800 ms** de pausa; agrupar cambios próximos.
- No programar sync si el valor no cambia.
- No sincronizar automáticamente al consultar días, enfocar/desenfocar sin cambios, volver a la pestaña o recuperar la red.
- Excepciones deliberadas: sincronización inicial al conectar Google y botón manual **Sync now**.
- No reemplazar un campo mientras se escribe. Si hay un cambio pendiente y el campo mantiene foco, posponer el sync; retomarlo al salir del campo. `focusout` por sí solo no genera sincronizaciones.
- No ejecutar sincronizaciones simultáneas. Deshabilitar los controles de edición mientras se sincroniza y conservar cambios pendientes para otra pasada si procede.
- Sin conexión o con error, conservar los datos locales y mostrar el estado. No borrar ni simular éxito. No hay polling ni reintentos periódicos automáticos: otro cambio, conexión inicial o acción manual puede reintentar.
- Mostrar estados en inglés, como **Changes pending sync**, **Syncing workouts…**, **Synced · HH:mm** y errores comprensibles.

### Protocolo de Drive y conflictos

- API Drive v3, espacio **`appDataFolder`**, oculto en la lista normal de Drive.
- Scope único: `https://www.googleapis.com/auth/drive.appdata`.
- Consultar la cuenta con `about?fields=user(permissionId,emailAddress)`.
- Listar archivos paginando con `pageSize=1000`, campos `nextPageToken,files(id,name)` y filtro `trashed = false and name contains 'weights-revision-'`.
- Un archivo inmutable por revisión; nombre actual **`weights-revision-v3-{UUID}.json`**, MIME `application/json` y padre `appDataFolder`.
- Contenido actual: **`{ "version": 3, "record": { ...revisión... } }`**. El formato cloud v3 no cambia la versión local v2: son contratos diferentes.
- Crear con `POST /upload/drive/v3/files?uploadType=multipart&fields=id`; descargar con `GET /drive/v3/files/{id}?alt=media`.
- Autorización mediante cabecera `Authorization: Bearer ...`; solicitudes sin caché. No subir tokens ni configuración OAuth dentro de los entrenamientos.
- Descargar y validar antes de fusionar, vincular cuenta y subir revisiones faltantes. Rechazar contenido inválido o un mismo ID con datos distintos.
- Deduplicar por ID de revisión. Un reintento puede crear archivos duplicados en Drive, pero no debe duplicar el entrenamiento.
- No sobrescribir ni borrar archivos anteriores; la eliminación de un entrenamiento es otra revisión con `machines: []`. No resucitar datos borrados al fusionar dispositivos.

Una revisión es “cabeza” si ninguna otra del mismo día la nombra en sus padres. Con una cabeza, mostrarla; con varias, conservar todas y señalar conflicto. Para la visualización provisional se ordenan por `time` y, en empate, por `id`, y se muestra la última.

Los cambios de días diferentes se fusionan solos. Dos ramas del mismo día requieren elección explícita mediante **Review N conflicting day(s)** y el diálogo **Choose a workout version**. Mostrar los ejercicios, series y pesos de cada alternativa, incluida una versión vacía/borrada. La elección crea una revisión con **todas las cabezas como padres**. Una edición normal solo desciende de la cabeza provisional: no debe resolver silenciosamente las ramas restantes. El historial se conserva.

### Compatibilidad con la antigua versión cifrada

- Archivos antiguos: `weights-revision-v2-{UUID}.json`. No eliminarlos, sobrescribirlos ni ignorarlos silenciosamente.
- Si todos sus IDs tienen revisión equivalente local o en el formato nuevo, se puede republicar el historial en v3 sin pedir contraseña.
- Si falta alguna revisión, detener sync antes de subir o vincular la cuenta e indicar que debe migrarse desde el dispositivo original. Si tampoco conserva los datos, la recuperación exige la app anterior y la antigua contraseña; esta versión no descifra esos archivos.
- No implementar migraciones destructivas ni afirmar que el login de Google permite descifrar el historial antiguo.

## 9. Configuración del desarrollador y publicación

Configuración pública ya incorporada en `GOOGLE_CLIENT_ID`:

```text
129980170490-qkd2idjrog1i72nicnapommnte6c5t9t.apps.googleusercontent.com
```

Este ID es público, no una contraseña. No incluir nunca un client secret en el HTML. Con la constante configurada, **App owner setup queda oculto**; el usuario solo conecta su cuenta. Si falta, el código ofrece configuración del propietario con enlace a `GOOGLE_DRIVE_SETUP.md` y campo para el ID.

- Repositorio: `https://github.com/jmhostalet/weights`, rama utilizada `main`.
- URL de la app: `https://jmhostalet.github.io/weights/weights.html`.
- Origen JavaScript autorizado: `https://jmhostalet.github.io`, sin ruta `/weights`.
- Opcional para desarrollo: `http://localhost:8000`, si se autoriza también en Google.
- Cliente OAuth de tipo **Web application**, flujo popup de Google Identity Services; no requiere URI de redirección en este diseño.
- El desarrollador habilita Google Drive API y configura audiencia/consentimiento. Para pruebas, añadir las cuentas de prueba; para público general, completar los requisitos de publicación que muestre Google. Consultar la guía y la documentación oficial si cambia la consola; no asumir que los requisitos externos son inmutables.
- No afirmar que existen páginas de privacidad o términos publicadas si no están realmente creadas y desplegadas.
- Cambiar archivos locales no publica la app. Un push a GitHub y su despliegue de Pages son pasos distintos; un despliegue en curso o la caché puede seguir mostrando la versión anterior.
- Si el usuario ve una versión antigua, comprobar el HTML local, `main`, el estado de Actions/Pages y la URL pública. Un parámetro `?v=...` o recarga sin caché ayuda a diagnosticar caché, pero no sustituye un despliegue pendiente o fallido.
- No anunciar publicación, éxito del login o sincronización real sin comprobarlo. Las pruebas con respuestas simuladas de Google no prueban la configuración OAuth del proyecto.

### Versionado visible en cada push

- Mostrar en el pie `<span id="appVersion">Version yymmdd.hhmmss</span>`.
- La versión representa la fecha/hora de generación de esa publicación en **Europe/Madrid** (incluido horario de verano). Por ejemplo, `261109.173359` corresponde al 9 de noviembre de 2026 a las 17:33:59.
- Cada push a `main` ejecuta `.github/workflows/pages.yml`: comprueba la lógica, genera `_site/weights.html` con `scripts/stamp-version.py`, copia la guía de Google y publica el artefacto en Pages. También permite ejecución manual.
- Seleccionar una vez **Settings → Pages → Build and deployment → Source: GitHub Actions**. El flujo sustituye la publicación directa desde una rama para que Pages sirva el HTML con la versión generada.
- La marca se genera al preparar el despliegue que corresponde al push, no al abrir la página. No usar la hora del navegador del visitante como versión ni regenerarla al guardar entrenamientos.
- El flujo no crea commits automáticos: el archivo fuente conserva su última versión estampada localmente y el HTML publicado recibe la nueva. Para actualizar la copia local, ejecutar `python3 scripts/stamp-version.py`.
- El script acepta `--output` para escribir una copia y `--timestamp` con zona horaria para verificaciones reproducibles. No cambiar el identificador `appVersion` sin adaptar el script.
- Un push a una rama distinta de `main` no actualiza la versión pública. Solo el último despliegue completado es la versión visible; la caché puede mostrar temporalmente otra anterior.

## 10. Accesibilidad y validación

- Mantener etiquetas accesibles de botones de icono y campos, asociadas al ejercicio y número de serie.
- Días con `aria-pressed`; avisos con `role="alert"`; estados de sync con `role="status"`; total final con `aria-live="polite"`.
- Diálogos nativos con títulos asociados, cierre explícito y navegación de teclado. Foco visible con contorno verde.
- SVG decorativos con `aria-hidden="true"`; no depender del icono para identificar el ejercicio.
- Respetar `prefers-reduced-motion`; animación de entrada breve solo si el usuario permite movimiento.

Ejecutar las pruebas de lógica cuando se modifiquen datos o sincronización:

```bash
node --test tests/sync.test.cjs
```

La suite actual tiene 13 pruebas y cubre migración, datos corruptos, validación cloud, conflictos y borrados, transferencia entre dispositivos simulados, caducidad, desconexión, separación de cuentas, errores de red, formato cifrado antiguo, botón Sync directo y programación solo ante cambios reales. El número puede crecer; conservar la cobertura, no el número como objetivo.

Comprobar en navegador cuando se cambie la interfaz: móvil de unos 390 × 844 px y pantallas estrechas, navegación semanal, alta/edición/borrado, total de 12 × 30 = 360 kg, pesos predeterminados históricos, icono compartido de gemelos/cuádriceps, ausencia de contraseña y flujo de conexión. Para cambios de sync, verificar también dos contextos de navegador, borrados y conflictos. Distinguir siempre pruebas simuladas de una comprobación real con consentimiento de Google.

## 11. Reglas para futuras modificaciones

- Preservar los datos existentes y los identificadores de máquinas, claves locales, esquema cloud y revisiones, salvo migración explícita y compatible.
- Mantener archivo único, interfaz en inglés y estilo de MacroDiario adaptado a pesas.
- No reintroducir Firebase, una contraseña adicional ni sincronización automática por mera navegación.
- No personalizar el producto con los datos de edad, altura o peso mencionados en la conversación.
- Consultar al usuario si una decisión nueva modifica propiedad de datos, experiencia de login o añade funciones fuera del alcance; los cambios rutinarios pueden resolverse siguiendo esta especificación.
- Actualizar este documento si cambia una decisión de producto o el contrato de datos. Separar lo ya implementado de propuestas futuras.
