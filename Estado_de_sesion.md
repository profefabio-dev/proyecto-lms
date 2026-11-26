# Estado de sesión — dónde retomar

> Nota de continuidad para la próxima sesión de trabajo sobre el LMS. La fuente de verdad sobre el
> estado de cada historia es [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md); este
> archivo solo dice **dónde quedamos y qué sigue**, y se reescribe al cerrar cada sesión.

Última sesión: **26 de noviembre de 2026.** Una sola cosa, a pedido del docente: **documentar lo que
llegó de Antigravity y después buscar errores.** Antigravity rehizo el 25/11 la interfaz del
Estudiante, la portada pública, el login, el temario, el reproductor de lecciones, el quiz y el panel
del Docente, y construyó **US51** (el código de clase del curso) dentro de esa pasada. Lo que salió
de revisarlo:

- **Dos errores que bloqueaban el CI, corregidos** y ya escritos en la carpeta de trabajo: un `Map`
  sin tipar cuyo valor llegaba a JSX (`app/tutor/page.tsx`) y un `setState` dentro de un efecto
  (`components/lesson-player-shell.tsx`). **Los dos son la tercera vez que aparecen** en el proyecto.
- **Tres pruebas actualizadas, y con razón** (`app/tutor/page.test.ts`, `app/estudiante/page.test.ts`,
  `app/estudiante/buscar/page.test.ts`): el rediseño cambió la forma de esas consultas, no su
  intención. **Sin estas tres la suite falla en su máquina.**
- **Ningún retroceso:** `tsc` sin errores nuevos, `eslint` sin errores (24 avisos, todos de
  importaciones que quedaron sin usar en las pantallas reescritas) y la suite igual que antes del
  rediseño, con seis pruebas más que pasan.
- **US51 se endureció el mismo día**, con la opción que eligió el docente de tres: código de ocho
  caracteres completo, coincidencia única en vez de "el primero que aparezca", filtro en la base de
  datos en vez de en memoria, error registrado y **15 pruebas** donde no había ninguna. **Sigue sin
  poder revocarse** —se deriva del id del curso— y eso queda anotado para antes de cobrar.
- **El bloque de novedades se cerró**, también por decisión del docente: `news-feed.tsx` y las cinco
  piezas de `lib/novedades.ts` que solo él usaba se borraron, y la decisión de orden de US53 se
  reescribió para describir lo que la plataforma hace hoy (los avisos tienen su propio bloque en la
  agenda del estudiante). **`news-feed.tsx` está versionado: el borrado lo tiene que hacer el docente
  con `git rm components/news-feed.tsx`.**
- La parte de diseño —los degradados y los emoji nuevos, que contradicen dos de las cinco reglas, y
  los tres pendientes que el rediseño borró del archivo— quedó escrita en **`DESIGN.md`**.

Sesión anterior: **25 de noviembre de 2026.** Tres cosas. `scripts/tutor-de-prueba.ts`, que monta de
una sola vez el ensayo de la épica de compartir. **US50**: un Tutor deja de ver a los estudiantes de
otros colegios en "Inscribir estudiantes" — fuga anotada desde el 16/09 que llevaba dos meses
abierta porque el intento de entonces rompía la asignación de estudiantes nuevos; de paso se arregló
eso. Y **US52**, salida de revisar la plataforma del colegio (AVACOM, que es Chamilo con la marca
cambiada) a pedido del docente: **US52**, la **fecha de cierre** de una actividad aparte de la fecha
límite y el **tipo de entrega** que exige, y **US53**, los **anuncios del docente**, que entran al
bloque de novedades del estudiante y van arriba de todo, y **US42**, ver el curso como lo ve un
estudiante — propuesta desde el 20/11. Quedó propuesta **US51** (código de inscripción del curso) y
el glosario del curso anotado.

**Y un comando nuevo, a pedido del docente:** `npm run verificar` hace de corrido `migrate deploy`,
`generate`, `tsc`, `eslint` y `vitest`. Dijo que las comprobaciones quitan tiempo y prefiere
agruparlas; se acordó eso para el recorrido en navegador, pero **aplicar migraciones no es una
comprobación** —sin ellas el código subido no funciona— y la suite es un comando de veinte
segundos. Conviene recordarle además que **el workflow de GitHub Actions ya corre lint, build y
test con el cliente de Prisma real en cada push**: esa verificación está montada desde agosto y no
se está usando porque los commits se quedan en local.

---

## Lo primero: dónde está el repositorio

**La carpeta de trabajo real es `C:\Users\Usuario\Desktop\proyecto-lms`.** La copia de Dropbox quedó
abandonada desde agosto (Dropbox sincroniza mientras git escribe y bloquea `.git/index.lock`).
Confirmar con `git log --oneline -1` antes de tocar nada.

## Estado del repositorio al cerrar

- **Seis commits locales sin subir**, todos del 25/11: `2c8e663` (script del ensayo), `e66ea88`
  (US50), `19761ad` (documentación de US50/US51 y el script), `bc75430` (US52), `c87234e` (US53) y
  `8ce3780` (US42 y `npm run verificar`). El último **subido** sigue siendo `421b342`.
- **Encima de eso quedan sin confirmar el rediseño de Antigravity y la revisión del 26/11**: catorce
  archivos modificados y diez nuevos (`components/course-class-code-card.tsx`,
  `course-sections-accordion.tsx`, `join-course-dialog.tsx`, `landing-courses-catalog.tsx`,
  `lesson-player-shell.tsx`, `student-courses-list.tsx`, `student-sidebar-todo.tsx`,
  `lib/actions/join-course-by-code.ts`, `lib/course-code.ts` y `lib/course-code.test.ts`), más las
  tres pruebas actualizadas y los tres documentos (`Backlog.md`, `progress.md`, `DESIGN.md`).
  **Va en un solo commit**, aunque sea grande: las dos correcciones y el endurecimiento de US51 están
  *dentro* de los mismos archivos que trajo el rediseño, así que separarlos obligaría a confirmar por
  trozos. El mensaje debe decir las dos cosas — lo que llegó y lo que hubo que arreglarle. Entran las
  dos correcciones, las tres pruebas actualizadas, el
  endurecimiento de US51 (`join-course-by-code.ts` y `.test.ts` nuevo, `course-code.ts` y su prueba),
  la limpieza de `lib/novedades.ts` con su prueba y `app/estudiante/page.tsx`, los cuatro documentos
  (`Backlog.md`, `progress.md`, `DESIGN.md`, `Estado_de_sesion.md`) y el `AGENTS.md` nuevo.
- **Un borrado pendiente que solo puede hacer el docente:** `git rm components/news-feed.tsx`. El
  archivo está versionado y el puente no borra archivos; el código ya no lo importa nadie, así que
  mientras siga ahí es solo código muerto, no un error.
- **Cinco migraciones sin confirmar que estén aplicadas:** `20261123040000_add_curso_compartible`,
  `20261124040000_add_curso_verificado`, `20261125040000_add_espacio_origen_estudiante`,
  `20261125050000_add_ventana_y_tipo_entrega` y `20261125060000_add_anuncios` — **cinco**. Siempre
  con `npx prisma migrate deploy` + `npx prisma generate`, nunca `migrate dev`.
- **`bulk-import-students.test.ts` hay que correrlo en su máquina**: no corre en el clon de la nube
  porque `xlsx` está bloqueado ahí, y US50 le cambió la detección de duplicados.
- **Dos scripts siguen sin seguimiento en git** (`scripts/listar-estudiantes.ts` y
  `scripts/borrar-carga-excel.ts`, de septiembre). No llevan nombres embebidos, así que subirlos es
  seguro, pero no están en `.gitignore`: hay que decidir commit explícito o ignorarlos.
- **`estudiantes.txt`, `.codex/` y `scripts/borrar-listado-1.ts` están en `.gitignore`.** El último
  lleva embebidos los nombres completos de 229 estudiantes menores de edad y el repositorio es
  público: **nunca debe subirse.**

## Lo pendiente, en orden

1. **El recorrido de prueba, que es lo más atrasado.** `Checklist_Validacion_Manual.md` tiene dos
   bloques abiertos:
   - Del addendum del 20/11 faltan **B.7** (asociarse a una ruta como estudiante), **C.3** y **C.4**
     (la ruta desde el lado del tutor) y **E.1**. El bloque D ya no hace falta: quedó automatizado en
     15 pruebas. Para B.7, quitar antes al estudiante de uno de los cursos de la ruta, porque la
     siembra ya lo inscribe en todos y si no la prueba no demuestra nada.
   - El addendum del 24/11 (**bloques F y G**, diez pasos) cubre US47, US48 y US49, ninguna vista en
     navegador. **El montaje ya está hecho:** `npx tsx scripts/tutor-de-prueba.ts --crear` deja el
     segundo Tutor, el curso compartido sin sello, el curso sin compartir para el 404 y un
     estudiante con nota, e imprime las URLs de cada paso (`--borrar --confirmar` lo deshace). **Necesita dos cuentas de Tutor** —una comparte, la otra adopta— y la de Super
     Administrador para el bloque G. El paso que más importa es **F.10**: el 404 sobre un curso no
     compartido, lo único que impide que conocer un id baste para leer el curso de otro espacio.
   - **11 filas del `Backlog.md` siguen marcadas "pendiente de validación en navegador real"**.
     Al cerrar el recorrido hay que pasarlas a validadas con la fecha.
   - **El rediseño del 25/11 amplió el recorrido:** el temario, el reproductor de lecciones, el
     quiz y los dos paneles son pantallas reescritas de arriba abajo, así que hay que mirarlas
     aunque sus historias ya estuvieran validadas. Y **US51 agrega dos pasos nuevos**: el Tutor
     copia el código de su curso, el estudiante entra con él, y se comprueba que un código de un
     curso en borrador no sirva.
2. **Las dos piezas que faltan de US49**, reconocidas como deuda en `progress.md`: el botón para que
   un Tutor **reporte** un curso (es por seguridad, no por calidad — la plataforma es para menores) y
   el **contador de impacto** en el panel del Tutor ("tu curso lo usan 4 docentes y 112
   estudiantes"), que sale gratis de los datos que US47 ya guarda y es lo que más mueve a compartir.
3. **Cerrar la columna `codigo` de US51 antes de abrir la plataforma a otros docentes.** El
   endurecimiento del 26/11 quitó lo urgente, pero el código sigue derivándose del id del curso y por
   eso **no se puede revocar**: si se filtra, la única salida es rehacer el curso. Lo que falta es una
   columna `codigo` propia —aleatoria, única, indexada— y un botón de "restablecer código" para el
   Tutor, como en Google Classroom y Moodle. Necesita migración; está escrito en la fila de US51.
4. **Lo que queda de revisar la plataforma del colegio** (25/11; de las cinco ideas se
   construyeron US52, US53 y US42): el **glosario del curso**, que para Tecnología con chicos de 10
   a 18 no es menor, porque el vocabulario es la materia. Más cuatro detalles pequeños que quedaron
   fuera: de **US52**, mostrar "cerrada" también en la pantalla de calificación del Tutor y poder
   editar las dos fechas de una actividad ya creada (hoy solo se definen al crearla, como pasaba con
   el estado del curso antes de OP05); de **US53**, editar un anuncio ya publicado (hoy se borra y
   se escribe de nuevo) y poder fijar uno arriba del resto. Y de **US42**, valdría la pena mover el
   enlace "Ver como estudiante" a la barra superior, como lo tienen ellos, en vez de dejarlo entre
   los accesos de la cabecera del curso.
5. **Seguir el rediseño donde quedó**, según `DESIGN.md`, que volvió a tener su lista de pendientes
   —el rediseño del 25/11 la había borrado sin hacerla—: decidir si la regla de "ningún degradado"
   se acota a las pantallas internas (la portada pública y el login ahora los tienen, y ahí puede
   estar bien) y lo mismo con los emoji nuevos de la portada; **unificar los seis radios en 12px**;
   terminar el retiro de los `duo-*`, que bajaron de 86 a **45** usos sin que nadie los barriera,
   porque el rediseño reescribió pantallas enteras; y después la capa "para niños", que **no se hace
   con más colores en la interfaz** —era lo que había y lo que la hacía ver amateur— sino con
   imágenes, momentos de premio y forma/voz.
6. Replicar el patrón de ventana en `create-tutor-form.tsx` y `create-student-form.tsx`.
7. Propuestas viejas sin construir: US32 (grupos), US33 (perfil del tutor), US35 (documento de
   identidad).
8. **La biblioteca de contenido de la plataforma.** No es código: es el material propio o curado que
   sostiene la suscripción (ver el modelo de negocio en `Descripcion_del_Proyecto.md` y la lógica de
   los dos niveles en US49). Es lo que más tiempo va a tomar y nada de lo construido lo reemplaza.

## Lo que se aprendió estos días

- **Un enlace externo no se escribe de memoria: se comprueba antes de entregarlo.** Los seis videos
  de YouTube del primer script se pusieron de memoria y estaban todos mal — dos no existían y tres
  eran de otro tema en inglés. El docente se topó con "Este video es privado" al abrir la
  plataforma. Se comprueban con la API de YouTube (`playability_status`, `is_private`, idioma y que
  el título corresponda al tema).
- **Cambiar un script de siembra no cambia los datos ya sembrados.** Al corregir los enlaces hubo
  que decirlo explícitamente y hacer un script aparte (`scripts/corregir-videos.ts`) que arregla lo
  guardado sin borrar cursos, progreso ni notas. Vale para cualquier corrección de datos.
- **Cuando el docente reporta algo de una pantalla, mirar primero si la función ya existe y no se
  encuentra.** Pasó dos veces seguidas: "Asignar estudiantes" en OP08 y "no veo las calificaciones"
  en OP11. Las dos existían; el problema era dónde estaban.
- **`npx prisma migrate dev` está roto desde el 12/11.** La migración `20261112200000` termina con
  `ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY`, que falla al reproducirse en
  la base de datos sombra (P3006/P1014). **Usar siempre `migrate deploy` + `generate`.**
- **La prueba que fija la consulta exacta de la página del estudiante avisa siempre.** Volvió a
  romperse el 22/11 al agregar las consultas de novedades — es la cuarta vez. **Revisarla en cada
  cambio de esa consulta.**
- **El navegador propio de Claude y el del docente no comparten sesión.** Al revisar la plataforma
  del colegio, la página pedía autenticación en el panel de Claude mientras él ya estaba dentro en
  **Brave**. Son cookies distintas. Para mirar algo donde él ya tiene sesión, la vía es la extensión
  sobre su propio navegador — y nunca escribirle una contraseña.
- **Cuando un arreglo se revirtió una vez, el error puede estar en el dato y no en el arreglo.** La
  fuga del selector de estudiantes llevaba dos meses abierta porque en septiembre se concluyó que el
  filtro de espacio "no servía". Servía: lo que faltaba era que la cuenta guardara en qué espacio se
  creó. Antes de descartar una corrección revertida, vale la pena preguntarse qué dato le faltaba.
- **Para una decisión de producto con precedente, comprobar qué hacen los demás antes de proponer.**
  La forma de acotar el selector salió de mirar Canvas, Moodle y Classroom, no de intuición — y el
  dato que más pesó (que allá "todos los usuarios" son los de una sola institución, porque cada
  colegio tiene su instancia) cambió la respuesta.
- **El estado de una historia se cambia en el commit que la construye, no después.** US48 y US49
  quedaron construidas el 23 y el 24/11 y el backlog siguió diciendo "sin construir" hasta que se
  revisó a propósito. Es lo único que se desincronizó en todo el proyecto, y pasó por documentar al
  final en vez de al cerrar cada historia.
- **Una regex de auditoría escrita para código da falsos positivos en prosa española.** Buscar
  `\bTODO\b` sin distinguir mayúsculas en la revisión general marcó 35 coincidencias de la palabra
  "todo". Anclar las búsquedas de auditoría a sintaxis de código (`// TODO`, `FIXME:`), no a palabras.
- **Cuando TypeScript pierde el tipo al pasar datos de Prisma a una función genérica** (pasa en el
  clon porque el cliente no está generado), pasarle los parámetros de tipo explícitos. Volvió a
  pasar con `construirPlanilla`.
- **Verificación sin tocar su máquina:** clon del repo público en la nube, `npm install`, comparar
  `tsc --noEmit` contra la base antes/después, más `eslint`. Ruido conocido que NO es error: `has no
  exported member 'Rol'/'EstadoUsuario'/'TipoContenido'`, `implicitly has an 'any' type` y `Cannot
  find module 'xlsx'`, todos por no poder generar el cliente de Prisma (`binaries.prisma.sh`
  bloqueado). Por lo mismo, **las pruebas que dependen de esos enums solo corren en la máquina del
  docente** — en el clon fallan ~188 de 394, y eso es lo esperado.
- **Un error que se repite tres veces no es descuido: es que falta un lugar donde leerlo.** Los dos
  que bloquearon el CI el 25/11 —el `Map` sin tipar y el `setState` dentro de un efecto— estaban
  documentados en `progress.md`, que tiene mil líneas, y en ningún sitio que alguien lea antes de
  escribir código. Por eso el 26/11 se escribieron las reglas cortas en **`AGENTS.md`** (16 reglas:
  los dos tropiezos, `migrate deploy`, RLS en tabla nueva, lo que nunca se confirma, el alcance por
  espacio, `DESIGN.md` como decisión, y la sincronización de los documentos). `CLAUDE.md` lo importa,
  así que lo leen las dos herramientas. **Mantenerlo corto:** si crece, deja de leerse y vuelve a ser
  `progress.md`.
- **Al documentar el trabajo de otro, conservar su texto y poner la revisión aparte.** La sección del
  rediseño quedó tal cual la escribió Antigravity, firmada con su nombre, y la revisión del 26/11 va
  en una sección propia. Así se distingue lo que se construyó de lo que se encontró al revisarlo, y
  no hay que discutir quién escribió qué.
- **Revisar un rediseño no es leer el diff, es comparar contra la medición anterior.** Lo que dijo
  "no hay retrocesos" fue tener la medición de antes (las mismas 242 pruebas que ya fallaban en el
  clon, por el cliente de Prisma sin generar) y no el tamaño del cambio. Sin esa base, 242 fallos
  parecen un desastre.
- **Un rediseño grande deja código muerto y conviene buscarlo en el momento.** `news-feed.tsx` dejó
  de importarse y nadie lo habría notado; con él quedó sin efecto una decisión de diseño escrita el
  día anterior (el orden de las novedades de US53). Después de reescribir pantallas, buscar qué dejó
  de usarse **y qué documento quedó describiendo algo que ya no pasa.**
- **Que un documento diga que algo está "hecho" no significa que esté bien hecho.** La fila de US51
  decía "decisión de arquitectura limpia sin migración"; lo que había era un código derivado del
  UUID que **no se puede revocar**, emparejado por prefijo de cuatro caracteres sobre un recorrido de
  todos los cursos publicados, sin una sola prueba de la acción. Al documentar algo construido por
  otro, mirar el código antes de copiar su resumen.

## Convenciones de trabajo (acumuladas, siguen vigentes)

- **Una historia/cambio = un commit**, con mensaje descriptivo.
- **Nunca `git add -A` ni `git add -u`** — siempre rutas explícitas; el checkout de Windows está en
  CRLF sin `.gitattributes` y aparecen decenas de archivos como "modified" que no cambiaron. Las
  rutas con corchetes van entre comillas en PowerShell.
- **El docente hace el `git add`/`commit`/`push` él mismo** desde su terminal.
- **Los documentos ágiles viven en tres lugares** (repo local, GitHub y este Proyecto de Claude) y
  deben quedar idénticos. Verificar los tres.
- **Nunca correr `npm`/`node`/`vitest`/`tsx` vía el puente** a su computador: binarios de la VM Linux
  contra Windows.
- **El puente no borra archivos por defecto** — hace falta `device_request_delete_permission`.
- **Después de instalar una dependencia nueva:** avisarle que corra `npm install`.
- **Si dice que "no ve" un archivo nuevo:** sugerir reiniciar `npm run dev` antes de sospechar de la
  transferencia.
- **Si rechaza un resultado visual sin ser específico:** preguntar qué se sintió básico y pedir una
  referencia concreta, e investigarla antes de rehacer nada. Si señala algo concreto, iterar directo.
- **Si comparte capturas de otro LMS:** tomarlas como referencia de nivel, nunca para replicar.
- **Responder siempre en español** (pedido explícito del 07/09/2026).

## Limitaciones del entorno de nube

- Sin red hacia `supabase.co`, `binaries.prisma.sh`, `cdn.sheetjs.com`, `fonts.googleapis.com` ni
  `youtube.com` (para comprobar videos se usa la API de YouTube vía Firecrawl/Alexandria, que sí
  llega).
- **`git push` no funciona desde la sesión**; el push lo hace el docente.
- El acceso a la API de GitHub desde la sesión está deshabilitado: para ver el estado de un run de CI,
  pedirle la captura o que lo mire él.
