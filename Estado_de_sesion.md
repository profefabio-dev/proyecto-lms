# Estado de sesión — dónde retomar

> Nota de continuidad para la próxima sesión de trabajo sobre el LMS. La fuente de verdad sobre el
> estado de cada historia es [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md); este
> archivo solo dice **dónde quedamos y qué sigue**, y se reescribe al cerrar cada sesión.

Última sesión: **25 de noviembre de 2026.** Tres cosas. `scripts/tutor-de-prueba.ts`, que monta de
una sola vez el ensayo de la épica de compartir. **US50**: un Tutor deja de ver a los estudiantes de
otros colegios en "Inscribir estudiantes" — fuga anotada desde el 16/09 que llevaba dos meses
abierta porque el intento de entonces rompía la asignación de estudiantes nuevos; de paso se arregló
eso. Y **US52**, salida de revisar la plataforma del colegio (AVACOM, que es Chamilo con la marca
cambiada) a pedido del docente: la **fecha de cierre** de una actividad, aparte de la fecha límite, y
el **tipo de entrega** que el docente exige. Quedó propuesta **US51** (código de inscripción del
curso) y tres ideas más anotadas de esa revisión.

---

## Lo primero: dónde está el repositorio

**La carpeta de trabajo real es `C:\Users\Usuario\Desktop\proyecto-lms`.** La copia de Dropbox quedó
abandonada desde agosto (Dropbox sincroniza mientras git escribe y bloquea `.git/index.lock`).
Confirmar con `git log --oneline -1` antes de tocar nada.

## Estado del repositorio al cerrar

- Último commit **subido**: `421b342` (documentación de US48 y US49). Encima quedan **sin confirmar**
  los archivos de `scripts/tutor-de-prueba.ts`, de **US50** y de **US52** — ver los comandos que se
  le dejaron en el chat de ese día.
- **Cuatro migraciones sin confirmar que estén aplicadas:** `20261123040000_add_curso_compartible`,
  `20261124040000_add_curso_verificado`, `20261125040000_add_espacio_origen_estudiante` y
  `20261125050000_add_ventana_y_tipo_entrega`. Siempre con `npx prisma migrate deploy` +
  `npx prisma generate`, nunca `migrate dev`.
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
   - **Diez historias construidas siguen marcadas "pendiente de validación en navegador real"** en
     `Backlog.md`. Al cerrar el recorrido hay que pasarlas a validadas con la fecha.
2. **Las dos piezas que faltan de US49**, reconocidas como deuda en `progress.md`: el botón para que
   un Tutor **reporte** un curso (es por seguridad, no por calidad — la plataforma es para menores) y
   el **contador de impacto** en el panel del Tutor ("tu curso lo usan 4 docentes y 112
   estudiantes"), que sale gratis de los datos que US47 ya guarda y es lo que más mueve a compartir.
3. **US51 — el código de inscripción del curso.** Propuesta el 25/11, sin estimar. Antes de
   construirla hay que **resolver un nudo con el docente**: el código sirve si el estudiante ya tiene
   cuenta, y hoy los estudiantes no se registran solos y la mayoría no tiene correo propio (US29 les
   genera uno interno). Si el código habilitara el registro, hay que decidir con qué se registra un
   menor sin correo — eso toca US35 (documento de identidad) y el registro público de Supabase Auth,
   que sigue activado como hallazgo sin corregir desde el 12/11. Con la suscripción por docente esta
   es la historia de más valor comercial que hay en el backlog: es lo que permite que un docente
   empiece sin administrador, sin archivo del colegio y sin área de sistemas. **Y resuelve una
   segunda pregunta abierta** que el docente planteó el 25/11: hoy un espacio es una institución
   con varios tutores adentro, así que dos profesores del mismo colegio comparten estudiantes sin
   duplicar cuentas; si cada profesor fuera su propio espacio —tentador con la suscripción por
   docente— el mismo alumno terminaría con dos cuentas y el avance partido, y desde US50 la
   plataforma ya no lo advierte. El código del curso evita tener que elegir.
4. **Las tres ideas que quedaron de revisar la plataforma del colegio** (25/11), en este orden de
   conveniencia: **US42, la vista de estudiante** como interruptor permanente en la barra —ahí la
   tienen así y es lo que un docente usa todo el tiempo; hay que reestimarla porque US43 cambió la
   pantalla que debe reflejar—; **anuncios del docente**, porque las novedades de OP11 son
   automáticas y no hay forma de decir "mañana traigan la protoboard"; y el **glosario del curso**,
   que para Tecnología con chicos de 10 a 18 no es menor, porque el vocabulario es la materia. De
   US52 quedaron fuera dos detalles pequeños: mostrar "cerrada" también en la pantalla de
   calificación del Tutor, y poder editar las dos fechas de una actividad ya creada (hoy solo se
   definen al crearla, como pasaba con el estado del curso antes de OP05).
5. **Seguir el rediseño donde quedó**, según `DESIGN.md`: unificar los seis radios en uno, y después
   la capa "para niños". **No se hace con más colores en la interfaz** —era lo que había y lo que la
   hacía ver amateur— sino con imágenes, momentos de premio y forma/voz.
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
