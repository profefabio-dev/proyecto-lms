# Backlog — Plataforma Educativa LMS (Docente Fabio Andrés Aguirre)

> Este backlog es la versión "viva" del Product Backlog Priorizado entregado en `Proyecto 2.docx` (sección 3), actualizado según las observaciones del docente del 20/08/2026. Trabaja en conjunto con [`progress.md`](./progress.md): cada historia tiene aquí su definición y prioridad, y en `progress.md` se registra su implementación, pruebas y validación. **El campo `Estado` de este archivo debe coincidir siempre con la fila correspondiente en `progress.md`.**

Priorización: MoSCoW (Must / Should / Could / Won't). Estimación: Planning Poker, escala Fibonacci (1, 2, 3, 5, 8, 13).

Convenciones de `Estado`: `Por hacer` · `En progreso` · `Hecho` · `Bloqueado`.

---

## Cambios de esta revisión (feedback del docente)

- Se agregan **US21, US22 y US23**: sincronización de la tabla `Users` (Prisma/PostgreSQL) con Supabase Auth. El documento original definía el login (US01, US05, US13) asumiendo que el usuario ya existe en Supabase Auth, pero no especificaba **cómo** ni **cuándo** se crea/actualiza/revoca ese usuario en Auth cuando Admin o Tutor lo gestionan desde la plataforma. Es un vacío real de arquitectura, no solo de documentación: sin esto, un Tutor creado por el Admin (US02) o un Estudiante creado por el Tutor (US06) queda registrado en la base de datos de la app pero **no puede iniciar sesión** porque no existe en Supabase Auth.
- Se añade la columna `Estado` a cada historia para trazabilidad con `progress.md`.
- Se afinan los criterios de aceptación de **US02** y **US06** para dejar explícita su dependencia de la sincronización con Auth.
- Se re-evalúa **US20** (antes "Won't have"): pasa a **Should have** porque ahora depende directamente de US23 (revocación de acceso en Auth), y sin esa base no tiene sentido implementarla más adelante sin rehacer trabajo.

---

## Backlog priorizado (MVP — 23 historias, cerrado en Sprint 6)

| ID | Rol | Historia de Usuario | Criterios de Aceptación | MoSCoW | SP | Sprint | Estado |
|----|-----|----------------------|--------------------------|--------|----|--------|--------|
| US01 | Administrador | Como administrador, quiero iniciar sesión con mis credenciales para acceder al panel de administración. | El sistema valida credenciales contra Supabase Auth; con datos incorrectos muestra error sin revelar cuál campo falló; con datos correctos redirige al dashboard de Admin y crea una sesión válida. | Must | 2 | 1 | Hecho |
| US02 | Administrador | Como administrador, quiero crear cuentas de tutores para habilitar la gestión de cursos por parte de los docentes. | El Admin crea un tutor con nombre, email y rol; **la creación dispara US21 (alta en Supabase Auth) de forma transaccional**; si falla el alta en Auth, no debe quedar un registro huérfano en `Users`; el tutor recibe invitación de acceso; el registro aparece en el listado de usuarios. | Must | 3 | 2 | Hecho |
| US03 | Administrador | Como administrador, quiero ver un listado de todos los usuarios del sistema para supervisar la plataforma. | El listado muestra nombre, email, rol y estado; permite filtrar por rol. | Must | 3 | 2 | Hecho |
| US04 | Administrador | Como administrador, quiero consultar indicadores generales (usuarios y cursos activos) para tomar decisiones. | El dashboard muestra número total de usuarios por rol y de cursos activos, actualizado en tiempo real. | Should | 5 | 4 | Hecho |
| US05 | Tutor | Como tutor, quiero iniciar sesión para acceder a mi panel de gestión. | Login válido redirige al dashboard de Tutor; login inválido muestra mensaje de error. | Must | 2 | 1 | Hecho |
| US06 | Tutor | Como tutor, quiero crear estudiantes para habilitar su acceso a mis cursos. | El Tutor registra nombre, apellido y email; **la creación dispara US21 (alta en Supabase Auth) de forma transaccional**; el estudiante queda en estado activo y puede iniciar sesión inmediatamente con las credenciales generadas. | Must | 3 | 2 | Hecho |
| US07 | Tutor | Como tutor, quiero crear cursos con título, descripción e imagen para organizar mi contenido. | El curso se crea con título, descripción e imagen obligatorios; queda en estado borrador o publicado. | Must | 5 | 2 | Hecho |
| US08 | Tutor | Como tutor, quiero publicar contenido en video (YouTube) para enseñar de forma audiovisual. | El contenido de tipo video se reproduce embebido dentro del curso sin salir de la plataforma. | Must | 5 | 3 | Hecho |
| US09 | Tutor | Como tutor, quiero subir documentos (PDF, Word) para complementar mis clases. | El documento se sube, se asocia a un contenido y queda disponible para descarga por los estudiantes inscritos. | Must | 5 | 3 | Hecho |
| US10 | Tutor | Como tutor, quiero crear contenido textual para explicar conceptos por escrito. | El contenido de tipo texto admite formato enriquecido (títulos, listas, negritas) y se guarda correctamente. | Should | 3 | 3 | Hecho |
| US11 | Tutor | Como tutor, quiero asignar estudiantes a mis cursos para controlar quién tiene acceso. | El Tutor asocia uno o varios estudiantes a un curso; los no asignados no pueden ver el contenido. | Must | 5 | 2 | Hecho |
| US12 | Tutor | Como tutor, quiero ordenar y mostrar/ocultar contenidos dentro de un curso para controlar el flujo de aprendizaje. | El Tutor reordena contenidos por arrastre o campo de orden; el contenido oculto no es visible para estudiantes. | Could | 3 | 4 | Hecho |
| US13 | Estudiante | Como estudiante, quiero iniciar sesión para acceder a mis cursos asignados. | Login válido redirige al dashboard de Estudiante mostrando únicamente sus cursos asignados. | Must | 2 | 1 | Hecho (redirección verificada; el listado de cursos llega con US14) |
| US14 | Estudiante | Como estudiante, quiero visualizar el listado de mis cursos para saber en qué estoy inscrito. | El listado muestra únicamente los cursos donde el estudiante fue asignado, con su estado (activo/finalizado). | Must | 3 | 4 | Hecho |
| US15 | Estudiante | Como estudiante, quiero reproducir los videos de un curso para aprender el contenido audiovisual. | El video se reproduce embebido; el estudiante puede pausar, retroceder y avanzar. | Must | 5 | 3 | Hecho |
| US16 | Estudiante | Como estudiante, quiero visualizar y descargar documentos de un curso para estudiar el material. | El estudiante puede previsualizar el PDF en el navegador y descargarlo sin errores. | Must | 5 | 3 | Hecho |
| US17 | Estudiante | Como estudiante, quiero buscar cursos o contenidos por palabra clave para encontrar información rápido. | La búsqueda filtra resultados por título/descripción y muestra coincidencias en menos de 2 segundos. | Could | 5 | 5 | Hecho |
| US18 | Admin/Tutor | Como administrador o tutor, quiero ver un dashboard con el resumen de mi actividad para tener visibilidad rápida del estado. | El dashboard muestra métricas clave según el rol (usuarios, cursos, contenidos) sin necesidad de navegar a otras pantallas. | Should | 8 | 4 | Hecho |
| US19 | Estudiante | Como estudiante, quiero ver un dashboard con mi progreso general para saber cuánto contenido he consumido. | El dashboard muestra porcentaje de avance por curso, calculado sobre contenidos vistos vs. total. | Should | 8 | 4 | Hecho (validada en navegador real el 2026-08-31 con el diseño de marcado manual — ver `progress.md`) |
| US20 | Administrador | Como administrador, quiero desactivar usuarios para revocar accesos sin borrar su historial. | El usuario desactivado no puede iniciar sesión; su información e historial permanecen intactos; **depende de US23** para que la revocación se refleje también en Supabase Auth. | Should *(reclasificada, antes Won't)* | 3 | 5 | Hecho (validada en navegador real el 2026-08-31) |
| **US21** | Sistema | Como sistema, quiero sincronizar automáticamente cada usuario creado por Admin o Tutor con Supabase Auth, para que pueda iniciar sesión con las credenciales generadas sin pasos manuales. | Al crear un Tutor (US02) o Estudiante (US06), el backend llama a la Admin API de Supabase Auth (`service_role`, nunca desde el cliente) para crear el usuario; se guarda `auth_id` como FK en `Users` vinculando ambos registros; la operación es transaccional: si falla el alta en Auth, se revierte la creación en `Users` (o se marca en estado `error_sync` para reintento) y no queda usuario huérfano en ninguna de las dos fuentes. | Must | 8 | 1 | Hecho (función base implementada y probada; falta conectarla a US02/US06) |
| **US22** | Sistema | Como sistema, quiero mantener sincronizados los datos de contacto (email) entre `Users` y Supabase Auth, para evitar inconsistencias que impidan el inicio de sesión. | Si el Admin/Tutor edita el email de un usuario desde la plataforma, se actualiza también en Supabase Auth en la misma operación; si la actualización en Auth falla, el cambio en `Users` no se persiste (rollback) y se informa el error al usuario. | Should | 5 | 2 | Hecho |
| **US23** | Sistema | Como sistema, quiero revocar el acceso de un usuario en Supabase Auth cuando es desactivado desde la plataforma, para que la desactivación sea efectiva y no solo cosmética. | Al desactivar un usuario (US20), se invalidan sus sesiones activas en Supabase Auth y se bloquea su capacidad de generar nuevas sesiones (ban/disable), sin eliminar el registro; al reactivarlo, recupera acceso. | Should | 5 | 5 | Hecho (validada en navegador real el 2026-08-31: cuenta desactivada no puede iniciar sesión; ver `progress.md` para el alcance real del "ban" de la Admin API de Supabase) |

---

## Resumen de priorización (MVP)

- **Must have:** US01, US02, US03, US05, US06, US07, US08, US09, US11, US13, US14, US15, US16, US21 — funcionalidad núcleo del MVP (incluye ahora la sincronización de alta con Auth, sin la cual el resto del Must-have no es utilizable en producción).
- **Should have:** US04, US10, US18, US19, US20, US22, US23 — mejoran la experiencia y la integridad del sistema pero no bloquean el primer entregable funcional.
- **Could have:** US12, US17 — deseables si el tiempo del sprint lo permite.
- **Won't have (este MVP):** ninguna por ahora — US20 se reclasificó a Should have en esta revisión.

**Las 23 historias anteriores (US01–US23) cierran el MVP y quedaron `Hecho` al cierre del Sprint 6 (2026-09-01).** Todo lo que sigue es la siguiente épica, fuera del MVP original.

---

## Épica: Múltiples Docentes (multi-tenant) — cerrada, Sprint 7-8

> Nace de la visión original del proyecto ("más adelante se buscará integrar nuevos docentes...", ver
> `Descripcion_del_Proyecto.md`) y del riesgo documentado ahí mismo sobre la ausencia de un concepto de
> "espacio" en el modelo de datos actual. Con el docente se tomaron dos decisiones de diseño que
> definen esta épica:
>
> 1. **Aislamiento de datos: espacios separados para Administradores/Tutores, Estudiantes compartidos
>    entre docentes.** Cada docente (Tutor) y su Administrador operan dentro de su propio espacio —
>    aislado del resto. Pero un Estudiante **es una cuenta única y global**: puede inscribirse en
>    cursos de distintos docentes/espacios sin crear una cuenta nueva por cada uno. Decisión tomada el
>    02/09/2026, revirtiendo la propuesta inicial de "espacios totalmente separados también para
>    Estudiantes" — el docente señaló que obligar a un Estudiante a tener una cuenta distinta por
>    docente generaría confusión y fricción real, sin beneficio claro a cambio.
> 2. **Rol creador de espacios: nuevo rol Super Administrador.** Se agrega un rol por encima del
>    Administrador actual (`SUPERADMIN`), reservado al dueño de la plataforma. El Administrador de cada
>    espacio conserva exactamente las capacidades que ya tiene hoy (US02, US03, US20) pero acotadas a su
>    propio espacio — no puede crear otros espacios.
>
> El espacio del docente Fabio Andrés Aguirre (todo lo construido en el MVP) se migra como el primer
> espacio ("espacio por defecto"), sin pedirle ninguna acción manual ni afectar sus datos actuales. Los
> Estudiantes que ya existen no necesitan ningún cambio: nunca tuvieron un espacio propio que migrar.
>
> **Por qué esto simplifica el trabajo, no lo complica:** las pantallas de Estudiante (US14 "mis
> cursos", US17 "buscar", US19 "mi progreso") ya filtran todo por inscripción real
> (`inscritos: { some: { userId } }` en `CourseUsers`), nunca por una noción de "mi espacio" — así que
> siguen funcionando exactamente igual, sin ningún cambio de código, aunque un mismo Estudiante termine
> inscrito en cursos de dos docentes distintos. El trabajo de aislamiento (US24) se concentra por
> completo en las pantallas de Administrador/Tutor.
>
> **Cerrada el 02/09/2026, confirmada por completo el 03/09/2026** — las 5 historias (US24–US28) están
> `Hecho`. Las 4 con interfaz propia quedaron validadas en navegador real contra datos de producción
> (creación, listado, desactivación y reactivación de un espacio de prueba, "Castellano"); US26
> (regresión del MVP, sin interfaz propia) se verificó por revisión de código y pruebas automatizadas, y
> quedó confirmada del todo el 03/09/2026 con el run [CI #15](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33696504610)
> en verde (cliente de Prisma real, sin ningún error).

| ID | Rol | Historia de Usuario | Criterios de Aceptación | MoSCoW | SP | Sprint | Estado |
|----|-----|----------------------|--------------------------|--------|----|--------|--------|
| **US24** | Sistema | Como sistema, quiero que cada Administrador y Tutor (y, por herencia, sus Cursos) pertenezca a un único Espacio, para que la gestión y los datos de un docente nunca sean visibles ni accesibles desde el espacio de otro docente. | Se agrega la entidad `Espacios` y `espacioId` (FK, obligatoria) a `Users` **solo para los roles ADMINISTRADOR y TUTOR** (`SUPERADMIN` y `ESTUDIANTE` no tienen `espacioId`); los cursos heredan el espacio de su Tutor; las consultas de Admin/Tutor (listado de tutores, listado de usuarios administrables, cursos, dashboards) filtran siempre por el espacio del usuario autenticado; el listado de Estudiantes que ve un Administrador/Tutor se limita a quienes tengan al menos una inscripción (`CourseUsers`) en un curso de su espacio — nunca a todos los Estudiantes de la plataforma; pruebas unitarias verifican que un Administrador/Tutor de un espacio no puede leer ni escribir datos de otro espacio aunque conozca el ID directamente; las pantallas de Estudiante (US14, US17, US19) se verifican sin cambios, confirmando que su filtro actual por inscripción ya es correcto para cuentas compartidas entre espacios. | Must | 8 | 7 | Hecho, en producción y validada en navegador real: además de la validación propia de US24, la sesión de Oscar Henao (Administrador del espacio "Castellano") en `/admin/usuarios` el 2026-09-02 confirma en la práctica que solo ve su propia cuenta — ningún usuario de otros espacios |
| **US25** | Super Administrador | Como super administrador, quiero crear un nuevo espacio de docente (con su primer Administrador) para habilitar el registro de un nuevo profesor en la plataforma. | Se crea un `Espacio` con nombre del docente/institución y, junto con él, su primer usuario Administrador; ese Administrador queda acotado a gestionar únicamente su propio espacio; el alta del Administrador se sincroniza con Supabase Auth igual que US21 (transaccional, sin usuarios huérfanos). | Must | 8 | 7 | Hecho (validada en navegador real el 2026-09-02: el docente creó un espacio de prueba y confirmó que el nuevo Administrador queda acotado a su propio espacio) |
| **US26** | Administrador | Como administrador de mi espacio, quiero seguir creando tutores, estudiantes y cursos exactamente igual que hoy, para no tener que aprender un flujo nuevo cuando se habilite multi-docente. | US02/US06/US07/US11 siguen funcionando sin cambios visibles para el Administrador/Tutor de un espacio ya existente; el espacio de Fabio Aguirre se crea automáticamente como espacio por defecto al migrar (ver nota de la épica), sin ninguna acción manual de su parte; un Estudiante creado por un Tutor de un espacio puede luego ser asignado por un Tutor de **otro** espacio a uno de sus cursos, sin duplicar su cuenta ni pedirle un nuevo registro; no hay regresión en ninguna de las 23 historias del MVP. | Must | 3 | 7 | Hecho y confirmada del todo el 2026-09-03: revisión de código de las 23 historias, eslint/tsc/suite de pruebas completa sin regresiones reales (se detectó y corrigió un error de tipos aislado en `storage.test.ts`, sin relación con esta épica), y run [CI #15](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33696504610) en verde con cliente de Prisma real — ver `progress.md` |
| **US27** | Super Administrador | Como super administrador, quiero ver un listado de todos los espacios registrados en la plataforma para supervisar el conjunto. | El listado muestra nombre del espacio, Administrador principal, cantidad de tutores/estudiantes activos/cursos y estado (activo/inactivo). | Should | 3 | 8 | Hecho (validada en navegador real el 2026-09-02: el docente confirmó el listado completo — Administrador principal, Tutores, Estudiantes, Cursos y Estado — funcionando con datos reales de sus dos espacios) |
| **US28** | Super Administrador | Como super administrador, quiero desactivar un espacio completo para revocar el acceso de un docente que deja la plataforma, sin borrar su historial. | Al desactivar un espacio, ningún Administrador ni Tutor de ese espacio puede iniciar sesión, reutilizando la lógica de US20/US23 aplicada a todos sus usuarios a la vez; los Estudiantes que tenían cursos en ese espacio **no se ven afectados en su cuenta** (siguen pudiendo iniciar sesión y ver sus cursos de otros espacios, si los tienen) — solo pierden acceso a los cursos del espacio desactivado; se puede reactivar sin pérdida de datos. | Should | 5 | 8 | Hecho, validada por completo en navegador real el 2026-09-02: el docente desactivó el espacio de prueba "Castellano" y confirmó que su Administrador (Oscar Henao) quedó sin poder iniciar sesión; luego lo reactivó y confirmó que recuperó el acceso con la misma contraseña — ver `progress.md` |

**Ya no aplica ("Won't have" descartado en esta revisión):** la versión anterior de este backlog
descartaba explícitamente que un mismo Estudiante pudiera inscribirse en cursos de más de un
espacio/docente. Esa restricción se revirtió el 02/09/2026 — es ahora el comportamiento **esperado y
soportado** por diseño (ver nota de la épica arriba).

### Resumen de priorización (épica Multi-docente)

- **Must have (Sprint 7, ~19 SP):** US24, US25, US26 — sientan la base de aislamiento por espacio
  entre Administradores/Tutores, y permiten dar de alta al segundo docente sin romper el espacio
  actual de Fabio Aguirre ni obligar a ningún Estudiante existente a duplicar su cuenta.
- **Should have (Sprint 8, ~8 SP):** US27, US28 — visibilidad y control operativo sobre los espacios
  una vez que el aislamiento de datos (US24) ya existe; no bloquean poder operar con un segundo
  docente.

---

## Mejoras operativas (fuera de las épicas de arriba)

> Ajustes pedidos directamente por el docente sobre funcionalidad ya `Hecho` del MVP, o vacíos
> operativos reales detectados al usar la plataforma, que no encajan en ninguna épica planificada (ni
> el MVP original ni Multi-docente). Se numeran con prefijo `OP` para no interferir con la numeración
> `US` de las dos tablas de arriba.

| ID | Rol | Historia de Usuario | Criterios de Aceptación | MoSCoW | SP | Sprint | Estado |
|----|-----|----------------------|--------------------------|--------|----|--------|--------|
| **OP01** | Administrador/Tutor | Como administrador o tutor, quiero poder restablecerle la contraseña a un usuario que la olvidó (especialmente Estudiantes, en su mayoría niños) para que pueda volver a acceder sin depender de haber anotado la contraseña temporal original. | Un Administrador puede restablecer la contraseña de cualquier usuario; un Tutor solo la de sus Estudiantes (mismo modelo de permisos que US22); la contraseña nueva se genera en el servidor y se muestra una sola vez en pantalla, igual que al crear una cuenta (US02/US06); no existe ninguna forma de "ver" la contraseña actual de un usuario (Supabase Auth solo guarda su hash) — el restablecimiento es la única vía posible y así quedó explicado al docente. | Should | 3 | 6.2 | Hecho (pendiente confirmación visual del docente) |
| **OP02** | Super Administrador (script) | Como docente, si pierdo las contraseñas anotadas de mis Administradores, quiero poder restablecérselas todas de una vez sin recrear sus cuentas, para no perder su historial ni sus asociaciones con tutores/cursos. | Script `scripts/reset-admin-passwords.ts`: recorre todos los usuarios con rol `ADMINISTRADOR` (en cualquier espacio) y les asigna una contraseña temporal nueva vía `resetSyncedUserPassword`, mostrándola una sola vez en consola; no crea ni elimina ningún usuario. | Could | 2 | — | Hecho — usado y confirmado por el docente el 2026-09-02 (incidente real de pérdida de contraseñas) |
| **OP03** | Super Administrador | Como super administrador, quiero poder restablecerle la contraseña al Administrador principal de cualquier espacio directamente desde `/superadmin`, para poder darle acceso a un docente que la perdió (o entrar yo mismo a verificar algo de ese espacio) sin depender de un script de terminal. | Un Super Administrador puede restablecer la contraseña de un usuario con rol `ADMINISTRADOR` de cualquier espacio (nunca la de un Tutor o Estudiante — eso sigue siendo responsabilidad exclusiva del Administrador de ese espacio, vía OP01); la contraseña nueva se genera en el servidor y se muestra una sola vez, mismo patrón que OP01; el botón aparece en la columna Acciones de `/superadmin`, junto al de Desactivar/Reactivar (US28), solo cuando el espacio tiene un Administrador principal. | Should | 3 | 8 | Hecho, en GitHub (commit `bbea480`, confirmado en CI el 2026-09-03) y usado con éxito por el docente el 2026-09-02: restableció la contraseña de Oscar Henao (Administrador del espacio "Castellano") desde `/superadmin` y con eso pudo terminar de probar US28 de punta a punta |

---

## Propuesto / por planificar (sin sprint asignado todavía)

> Historias que ya se conversaron con el docente y quedaron definidas, pero **todavía no se han
> construido ni se les asignó sprint** — se anotan aquí con su número para no perderlas, y se mueven a
> una tabla de épica/sprint cuando se prioricen.

> **Actualización 05/09/2026:** el docente evaluador del proyecto revisó la plataforma —incluida la
> pantalla "Mis cursos" del Estudiante rediseñada el 04/09/2026, que dijo que **se puede dejar así por
> ahora**— y compartió capturas del LMS institucional de la Universidad del Valle (Canvas) como
> **ejemplos de referencia** para mejorar el aspecto visual más adelante. Aclaró explícitamente que son
> solo inspiración para nuevas historias, no algo a replicar tal cual. De esa revisión salen **US30**
> (mejora general, todavía sin construir) y **US31** (un problema más puntual que señaló de una vez —
> ver abajo, **implementada y confirmada por el docente** el mismo día, tras cuatro rondas de ajuste).

| ID | Rol | Historia de Usuario | Criterios de Aceptación | MoSCoW | SP | Sprint | Estado |
|----|-----|----------------------|--------------------------|--------|----|--------|--------|
| **US29** | Administrador/Tutor | Como administrador o tutor, quiero cargar el archivo con el listado de estudiantes que ya genera el sistema de mi colegio — en Excel o en PDF, según lo que el colegio entregue — para darlos de alta masivamente, sin tener que crear cada cuenta una por una como hoy (US06). | **(1) Formatos aceptados, sin igual peso.** *Excel (`.xls` o `.xlsx`) es la ruta preferida:* se lee con una librería de parseo de celdas (`xlsx`/SheetJS en Node), que entrega filas y columnas ya estructuradas, sin heurísticas de texto de por medio — se probó contra un archivo real del sistema del colegio (formato binario antiguo `.xls`, generado por "SAE 2.0") y se leyó sin errores, incluidas sus distintas hojas (una por grado/grupo). *PDF con texto seleccionable (no escaneado) queda como ruta de respaldo*, para cuando el colegio solo entregue PDF: se extrae como texto plano línea por línea (se probó la detección automática de tablas de la librería típica de Node para esto y, en un PDF real de este tipo, solo reconoció el encabezado, ninguna fila de estudiantes) y se interpreta con un parser basado en el patrón "número + resto de la línea = nombre" — más frágil ante variaciones de formato entre colegios, así que aquí la vista previa editable (ver más abajo) es aún más importante como red de seguridad. Si el archivo no es reconocible en ninguno de los dos formatos, se informa el error sin intentar adivinar. **(2) Detección de columnas por encabezado, no por posición fija** (aplica a ambos formatos): el conjunto y orden de columnas puede cambiar según el colegio — se ignora sin fallar cualquier columna no reconocida (`Nro`, `Foto`, etc.). **(3) Varios grupos en un mismo archivo:** cuando el Excel trae varias hojas (una por grado/grupo, como en el ejemplo real: 6A, 6B, 6C…), se debe poder elegir qué hoja(s) importar en una misma carga, en vez de asumir una sola. Para PDF, el equivalente es reconocer el cambio de grupo dentro del texto a partir del título de cada tabla ("Listado de Estudiantes X"). **(4) Campos a extraer — alcance cerrado (aclarado el 03/09/2026):** por ahora, **únicamente** nombre y apellido(s) del estudiante, y el grado/curso al que pertenece (ej. "6A", "7A" — visto en el título de la hoja/tabla, o en una columna propia si el colegio lo trae así). Ninguna otra columna del archivo (número de fila, foto, etc.) se usa por ahora. Queda anotado que **más adelante podría agregarse también el número de documento de identidad** como dato adicional a extraer — no se construye en esta versión, solo se deja registrado para no perderlo. **(5) Fuera de alcance — encabezado institucional (aclarado el 03/09/2026):** el bloque de encabezado que traen estos archivos (nombre del colegio, NIT, código DANE, año lectivo, director de grupo, y cualquier dato institucional similar) **nunca se lee ni se usa para ningún análisis** — se ignora por completo, aunque aparezca en la misma hoja/página que la tabla de estudiantes. **(6) Separación nombre/apellido:** cuando vengan concatenados en un solo campo tipo "Apellidos, Nombres", se resta el nombre (si existe una columna `Nombre` aparte) del final de ese campo para aislar el/los apellido(s) — heurístico, no infalible, por lo que antes de confirmar la carga se muestra una **vista previa editable** de los estudiantes detectados (incluyendo el grado/grupo leído), para corregir manualmente cualquier fila mal separada o mal leída. **(7) Email:** ninguno de los dos formatos trae uno (son menores de edad, normalmente sin correo propio) — se genera automáticamente un email interno (no es una dirección real, solo sirve como usuario de login), mostrado junto con la contraseña temporal en el resumen final, igual que ya pasa con las cuentas nuevas (US02/US06/OP01). **(8) Duplicados:** si ya existe un estudiante con el mismo nombre+apellido (o el email generado colisiona con uno existente), se omite — no se duplica ni se sobrescribe — y se informa en el resumen final cuántos se omitieron y por qué. **(9) Creación:** reutiliza `createSyncedUser` (US21) por cada estudiante, con el mismo patrón transaccional de rollback ya establecido si falla la sincronización con Supabase Auth a mitad del lote ("todo o nada por fila", igual que US28 para un lote de varios usuarios). **(10) Asignación a curso — flujo principal, no solo opcional:** el Tutor carga el listado completo y lo asigna de una sola vez a uno de sus cursos (reutiliza US11 para inscribir a todos los estudiantes recién creados); si lo sube un Administrador, quedan creados sin inscripción, para que un Tutor los asigne después. **(11) Resultado:** al terminar, se muestra un resumen con cuántos estudiantes se crearon, cuántos se omitieron por duplicados, y la lista de credenciales generadas (nombre, email, contraseña temporal) lista para entregar. | Should | Por estimar | Por planificar | Por hacer — definida el 2026-09-03, ampliada el mismo día (formato de entrada Excel/PDF) y precisada de nuevo el mismo día (alcance cerrado de campos a extraer: solo nombre, apellido y grado; encabezado institucional siempre ignorado); pendiente de estimación (Planning Poker) y de asignarla a un sprint |
| **US30** | Estudiante/Tutor | Como estudiante, quiero que el contenido de un curso se organice en secciones plegables con un indicador claro de estado (disponible, no disponible, semana actual) y una lista de archivos más compacta, para ubicar el material que necesito sin perderme entre espacios vacíos. | Inspirado en capturas del LMS de la Universidad del Valle (Canvas) compartidas por el docente evaluador el 05/09/2026 — **solo como referencia de nivel visual, no para replicar tal cual, ni su paleta de colores**: secciones/módulos colapsables con flecha de expandir-contraer; insignia de estado por sección (ej. "Semana actual", "No disponible"); dentro de cada sección, lista de archivos con ícono por tipo de contenido; indicador de avance por sección (ítems completados de un total, en el estilo de progreso "estilo Duolingo" ya definido en US19/v2, no el de Canvas). Aplica al detalle de curso tanto del Tutor (que organiza) como del Estudiante (que consume). Queda pendiente de diseño de detalle: cómo se relaciona con el modelo de datos actual de `Contenidos` (hoy es una lista plana por curso, sin agrupación en secciones/semanas). **Nota (05/09/2026):** la barra lateral de índice agregada en US31 ya cubre parte de la necesidad de navegación rápida sin tocar el modelo de datos; esta historia sigue pendiente para el agrupamiento real en secciones/semanas. | Could | Por estimar | Por planificar | Por hacer — definida el 2026-09-05 a partir del feedback del docente evaluador; sin diseño de detalle ni estimación todavía; probablemente requiera antes una decisión de modelo de datos (¿se agrega una entidad "Sección/Módulo" a `Contenidos`, o se agrupa solo visualmente por algún campo existente?) |
| **US31** | Estudiante | Como estudiante, quiero que la vista de contenidos de un curso aproveche mejor el espacio de la pantalla y muestre cada contenido con más peso visual, para identificarlos más fácil y que la pantalla no se sienta tan vacía. | Feedback directo del docente evaluador el 05/09/2026 sobre la vista actual de detalle de curso del Estudiante: "tienen mucho espacio libre y los contenidos como tal se ven muy pequeños". Implementado en cuatro rondas el mismo día, cada una a partir de una devolución concreta: **(1)** tarjetas con ícono de color por tipo, numeración y título más grande (`components/course-content-item.tsx`), más un resumen de avance arriba de la lista; **(2)** el docente confirmó que seguía "desaprovechándose" el ancho de pantalla (espacio en blanco a los lados en monitores anchos), así que se pasó a un layout de dos columnas: contenido a la izquierda y una barra lateral fija (`components/course-content-outline.tsx`) a la derecha con el resumen de avance y un índice de navegación; **(3)** el docente pidió agrandar las tarjetas "al menos al doble" — se duplicaron las medidas clave (ícono, título, padding) y se agrandó también el contenido embebido (video, texto, PDF); **(4)** el docente confirmó que se veía más grande pero pidió llevarlo "más allá" — otro escalón completo de tamaño sobre todo lo anterior. **Confirmado por el docente el 05/09/2026**: "ya lo revise, ahora si se ve mas grande. podemos dejarlo asi mientras tanto". | Should | 3 | — | **Hecho y confirmado por el docente** el 05/09/2026, tras cuatro rondas de ajuste de tamaño el mismo día |

---

## Nota de trazabilidad

Cada vez que se abra un Pull Request que implemente una historia de este backlog, debe:
1. Referenciar el ID de la historia (ej. `US21`) en el título del PR.
2. Incluir las pruebas unitarias correspondientes en el mismo PR.
3. Actualizar la fila correspondiente en `progress.md` antes de solicitar revisión.
