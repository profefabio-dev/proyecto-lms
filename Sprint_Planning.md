# Sprint Planning — Plataforma Educativa LMS

> Sprint Goal, Sprint Backlog, capacity planning y Definition of Done. Los Sprints 1 a 8 ya se
> cerraron — se documentan aquí en retrospectiva, con datos reales tomados de
> [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md). El Sprint 6 cerró el 2026-09-01, y
> los Sprints 7-8 (épica Multi-docente) el 2026-09-03.

## Definition of Done

Una historia (o cualquier cambio de código) se considera terminada cuando cumple **todo** lo
siguiente — es el mismo criterio aplicado, sin excepciones, desde las 23 historias del MVP hasta la
épica Multi-docente y las mejoras operativas (OP):

1. **Implementada** siguiendo los patrones ya establecidos en el proyecto (Server Action con
   validación Zod y autorización server-side; Server Component con guarda de sesión/rol).
2. **Con pruebas unitarias** que cubran los casos de autorización, validación y el caso de éxito.
3. **`npx eslint` limpio** sobre los archivos de código tocados (no solo los de prueba).
4. **`npx tsc --noEmit` sin errores nuevos** — verificado comparando contra el mismo commit sin el
   cambio (`git stash -u` antes/después), para distinguir errores genuinos de los ya conocidos del
   entorno de desarrollo.
5. **`Backlog.md` y `progress.md` actualizados** en el mismo cambio, nunca después — incluye el
   patrón/práctica aplicada y las notas de la sesión de trabajo.
6. **Commit con mensaje descriptivo**, referenciando el ID de la historia cuando aplica (ver
   "Nota de trazabilidad" en `Backlog.md`).
7. **Verificación manual en navegador real** antes de marcar la historia como `Validado: Sí` — es el
   único paso que puede quedar pendiente sin bloquear el avance a la siguiente historia (se agrupa en
   una cola explícita en `progress.md` en vez de detener el sprint).

## Capacity planning del equipo

El "equipo" de este proyecto es **una sola persona** — el docente Fabio Andrés Aguirre— asistida por
Claude (Anthropic) como herramienta de generación de código bajo su dirección y revisión directa
(sin un equipo de desarrollo, QA o diseño separado). Por eso el capacity planning no se mide en horas
por persona sino en velocidad real observada, en puntos de historia (Fibonacci, vía Planning Poker),
sprint a sprint:

| Sprint | Historias cerradas | Puntos de historia (SP) |
|---|---|---|
| 1 | US01, US05, US13, US21 | 14 |
| 2 | US02, US03, US06, US07, US11, US22 | 24 |
| 3 | US08, US09, US10, US15, US16 | 23 |
| 4 | US04, US12, US14, US18, US19 | 27 |
| 5 | US17, US20, US23 | 13 |
| **Subtotal MVP** | **23 historias** | **101 SP** |
| 7 | US24, US25, US26 | 19 |
| 8 | US27, US28 | 8 |
| **Total** | **28 historias** | **128 SP** |

**Velocidad promedio observada (28 historias, 7 sprints con SP asignados): ~18-20 SP por sprint.** La
épica Multi-docente (Sprints 7-8, 27 SP en total) se mantuvo dentro de ese rango, confirmando que la
estimación basada en velocidad observada (en vez de horas-persona teóricas) sigue siendo confiable.

## Sprints 1 a 5 (cerrados)

| Sprint | Sprint Goal |
|---|---|
| 1 | Tener el esqueleto técnico completo (Next.js + Prisma + Supabase) y que los tres roles puedan iniciar sesión, con la sincronización a Supabase Auth resuelta desde el inicio para no rehacer el login después. |
| 2 | Que Administrador y Tutor puedan dar de alta cuentas y gestionar cursos/estudiantes, con el email de cualquier usuario editable sin romper la sincronización con Auth. |
| 3 | Que un curso tenga contenido real (video, documento, texto) y que un Estudiante inscrito pueda consumirlo sin salir de la plataforma. |
| 4 | Que Administrador, Tutor y Estudiante tengan visibilidad de su propia actividad (indicadores, progreso) sin navegar a otra pantalla. |
| 5 | Cerrar el backlog: búsqueda para el Estudiante, y control real de acceso (desactivar/reactivar) para el Administrador. |

El detalle de tareas de cada historia (criterios de aceptación, archivos, pruebas) vive en
`Backlog.md` y `progress.md` — no se duplica aquí para evitar que ambos documentos se desincronicen.

## Sprint 6 (cerrado el 2026-09-01) — Endurecimiento, diseño y documentación

**Sprint Goal:** dejar la plataforma lista para mostrarse en una URL pública, con identidad visual
propia, un pipeline de CI corriendo, y la documentación ágil completa que exige el proyecto —
sin agregar historias de negocio nuevas al backlog original. **Cumplido en su totalidad.**

### Sprint Backlog

| Tarea | Estado al cierre de este documento |
|---|---|
| Rediseño de US19 a marcado manual de contenido visto (detectado en verificación manual) | Hecho, validado en navegador |
| Validación manual de US20/US23 (desactivar bloquea el login) | Hecho, validado en navegador |
| Corrección cosmética: columnas pegadas en tablas de usuarios | Hecho |
| Workflow de CI (`.github/workflows/ci.yml`): lint + tsc + tests + build en cada PR | Hecho — run [#6](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33433559108) en verde el 2026-08-31 |
| Conectar el repositorio a Vercel para despliegue automático | Hecho — primer deployment de producción en estado "Ready" el 2026-08-31 (commit `d6fa47e`) |
| Primer pase de diseño visual (paleta de marca, header de navegación, botón de cerrar sesión, Cards/Badges) en las 11 pantallas protegidas | Hecho, confirmado visualmente por el docente |
| Documentación ágil completa (este documento y los otros 4 que lo acompañan) | Hecho |
| Row Level Security (RLS) activado (sin políticas) en las 6 tablas de Supabase | Hecho — migración aplicada contra la base de datos real el 2026-09-01 (`npx prisma db execute` + `migrate resolve`, confirmado con `prisma migrate status`: "Database schema is up to date!") |
| Segundo pase de diseño visual (íconos, miniaturas de imagen de curso, estados vacíos) | Hecho |
| Lista de chequeo única para la ronda de validación manual pendiente (12 historias) | Hecho — `Checklist_Validacion_Manual.md` ejecutada por el docente el 2026-08-31, sin fallos; las 23 historias del backlog quedan `Validado: Sí` |

### Cierre del Sprint 6

Con RLS aplicado el 2026-09-01, las tres acciones que solo el docente podía hacer desde sus propias
cuentas y máquina (CI en verde, Vercel conectado, RLS aplicado) quedaron completas — el Sprint Goal se
cumplió en su totalidad. No queda ninguna tarea pendiente del Sprint 6.

## Sprint 6.1 (fuera de backlog original) — Ajustes de UX post-lanzamiento

> El 01/09/2026, ya con el Sprint 6 cerrado, el docente pidió tres ajustes puntuales de experiencia de
> usuario detectados al usar la plataforma real. No son historias del backlog original ni de la épica
> Multi-docente — se documentan aquí como trabajo intersprint, siguiendo la misma Definition of Done.

| Tarea | Estado |
|---|---|
| Mensaje claro de "cuenta desactivada" en el login (antes se confundía con contraseña incorrecta) | Hecho — `check-account-status.ts`, `app/login/page.tsx`, `components/login-form.tsx` |
| Menú de navegación lateral desplegable (antes header horizontal), a pedido del docente para parecerse más a un LMS tipo Blackboard | Hecho — `components/app-shell.tsx`, aplicado a las 10 páginas protegidas |
| Nombre completo del usuario visible sin truncar, tanto en el panel de usuario como en el título "Plataforma Fabio Aguirre" del menú lateral | Hecho |
| Edición de nombre y apellido de cualquier usuario (antes solo el email era editable) | Hecho — `update-user-name.ts`, `edit-user-name-form.tsx`, en las tablas de Admin→Usuarios, Admin→Tutores y Tutor→Estudiantes |
| Botones "Editar datos"/"Editar email" separados visualmente (antes aparecían pegados como texto plano) | Hecho — mismo estilo de botón que ya usaba la columna Estado |

## Sprint 6.2 (fuera de backlog original) — Restablecimiento de contraseñas (OP01, OP02)

> El docente pidió una forma de restablecer la contraseña de un usuario que la olvidó, especialmente
> Estudiantes (en su mayoría niños). Documentado en `Backlog.md` con prefijo `OP` (mejora operativa),
> no como historia de una épica planificada.

| Tarea | Estado |
|---|---|
| Administrador/Tutor restablece la contraseña de cualquier usuario que administra (OP01) | Hecho (pendiente confirmación visual final del docente — no hay registro de esa confirmación explícita, ver `Checklist_Validacion_Manual.md`) |
| Script `scripts/reset-admin-passwords.ts`: restablece de una sola vez la contraseña de todos los Administradores (OP02) | Hecho — usado y confirmado por el docente el 02/09/2026 ante un incidente real de pérdida de contraseñas anotadas |

## Sprint 7 (cerrado el 2026-09-02) — Multi-docente: base de aislamiento

**Sprint Goal:** que la plataforma soporte más de un docente, con los espacios de Administrador/Tutor
completamente aislados entre sí, **sin obligar a los Estudiantes a duplicar su cuenta** por cada
docente al que se inscriban — y sin ninguna regresión sobre las 23 historias del MVP ni sobre el
espacio actual de Fabio Aguirre. Cubre el Must-have de la épica Multi-docente (`Backlog.md`): US24
(modelo de datos y aislamiento de Administrador/Tutor), US25 (Super Administrador crea espacios) y
US26 (compatibilidad del Administrador actual, incluyendo Estudiantes compartidos entre espacios).
**Cumplido en su totalidad — 19 SP, dentro de la velocidad promedio observada.**

### Sprint Backlog

| Tarea | Historia | Estado |
|---|---|---|
| Migración de `prisma/schema.prisma`: entidad `Espacios`, rol `SUPERADMIN`, `espacioId` en `Users` (solo Administrador/Tutor) | US24 | Hecho — aplicada contra la base de datos real sin pérdida de datos |
| Filtrado por espacio en consultas de Administrador/Tutor: usuarios, tutores, cursos, dashboards | US24 | Hecho |
| Listado de Estudiantes visto por un Administrador/Tutor limitado a quienes tengan inscripción en su espacio (vía `CourseUsers`, no vía `espacioId`) | US24 | Hecho |
| Pruebas unitarias de aislamiento cruzado entre espacios (Administrador/Tutor) | US24 | Hecho |
| Confirmado sin cambios de código que US14/US17/US19 (pantallas de Estudiante) siguen correctas, porque ya filtran por inscripción real | US24 | Confirmado |
| Alta de espacio + primer Administrador por el Super Administrador, sincronizada con Supabase Auth | US25 | Hecho, validado en navegador real el 02/09/2026 |
| Migración del espacio actual de Fabio Aguirre como espacio por defecto, sin acción manual de su parte | US26 | Hecho |

**Validación de cierre:** revisión de código de las 23 historias del MVP, `eslint`/`tsc`/suite completa
de pruebas sin regresiones reales, y el run [CI #15](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33696504610)
en verde con cliente de Prisma real (confirmado el 03/09/2026) — más la sesión real de un Administrador
del espacio de prueba "Castellano" en `/admin/usuarios`, confirmando que solo ve su propia cuenta.

## Sprint 8 (cerrado el 2026-09-02) — Multi-docente: visibilidad y control operativo

**Sprint Goal:** que el Super Administrador tenga visibilidad y control sobre los espacios ya
aislados por el Sprint 7, sin bloquear la posibilidad de operar con un segundo docente. Cubre el
Should-have de la épica Multi-docente: US27 (listado de espacios) y US28 (desactivar/reactivar un
espacio completo). **Cumplido en su totalidad — 8 SP.**

### Sprint Backlog

| Tarea | Historia | Estado |
|---|---|---|
| Listado de espacios con Administrador principal, tutores/estudiantes activos, cursos y estado | US27 | Hecho, validado en navegador real el 02/09/2026 con datos reales de los dos espacios del docente |
| Desactivar/reactivar un espacio completo (reutilizando la lógica de US20/US23 sobre todos sus usuarios) | US28 | Hecho, validado de punta a punta el 02/09/2026: se desactivó el espacio de prueba "Castellano", su Administrador quedó sin poder iniciar sesión, y recuperó el acceso al reactivarlo |
| Super Administrador restablece la contraseña del Administrador principal de cualquier espacio desde `/superadmin` (OP03, mejora operativa fuera de la épica pero construida en el mismo sprint) | OP03 | Hecho, en GitHub desde el commit `bbea480`, usado con éxito por el docente el 02/09/2026 para terminar de probar US28 de punta a punta |

**Con el Sprint 8 cerrado, la épica Multi-docente completa (US24-US28) queda `Hecho` — 27 SP, 5
historias, cero regresiones sobre el MVP.**

## Sprint 9 (a definir) — feedback visual externo y siguiente historia de negocio

> No es un sprint formalmente planificado todavía — se documenta aquí lo que ya pasó fuera de
> cualquier épica planificada, y lo que queda por decidir.

### Trabajo ya hecho (fuera de backlog, entre el 02 y el 05/09/2026)

| Tarea | Estado |
|---|---|
| Rediseño visual del panel del Estudiante en tres vueltas (v1 inspirado en Chamilo, v2 "estilo Duolingo" con gamificación, v3 optimización de rendimiento) | Hecho, confirmado por el docente el 04/09/2026: "se puede dejar así por ahora" |
| US31 — la vista de detalle de curso del Estudiante aprovecha mejor el espacio de pantalla y da más peso visual a cada contenido, en cuatro rondas de ajuste el mismo día | Hecho y confirmado por el docente el 05/09/2026 |
| Corrección de UX: se quita la X duplicada del menú lateral en escritorio (redundante con el botón de hamburguesa) | Hecho el 05/09/2026 |
| Revisión de calidad de código: dos duplicados reales corregidos (`generarPasswordTemporal`, `ICONO_POR_TIPO`) y sincronización de la documentación de la raíz del repositorio | Hecho el 05/09/2026 |

### Por decidir

- **US29** (carga masiva de estudiantes por Excel/PDF) o **US30** (secciones plegables estilo Canvas,
  a partir del feedback del docente evaluador externo) — ninguna tiene sprint asignado. US29 está
  completamente definida y no depende de ninguna decisión de diseño pendiente; US30 necesita antes
  decidir el modelo de datos (¿entidad "Sección/Módulo" nueva, o agrupación solo visual?).
- Una vez elegida, se planifica formalmente como Sprint 9 con su propio Sprint Goal, siguiendo la
  misma lógica de capacity planning basada en velocidad observada (~18-20 SP).

### Notas de planificación

- Este sprint (una vez definido) puede depender de que el docente aplique una migración de esquema en
  su propia máquina si se elige US30 (posible entidad "Sección/Módulo") — mismo patrón que las
  migraciones anteriores, no puede ejecutarse desde una sesión de Claude en la nube.
- Las tres vueltas del rediseño visual y las cuatro rondas de US31 no se planificaron como sprint
  formal porque fueron iteración directa sobre feedback en vivo del docente en su propio navegador,
  no historias con criterios de aceptación fijados de antemano — se documentan igual, con la misma
  Definition of Done (pruebas, verificación, documentación en el mismo cambio).
