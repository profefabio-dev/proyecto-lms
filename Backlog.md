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

## Backlog priorizado

| ID | Rol | Historia de Usuario | Criterios de Aceptación | MoSCoW | SP | Sprint | Estado |
|----|-----|----------------------|--------------------------|--------|----|--------|--------|
| US01 | Administrador | Como administrador, quiero iniciar sesión con mis credenciales para acceder al panel de administración. | El sistema valida credenciales contra Supabase Auth; con datos incorrectos muestra error sin revelar cuál campo falló; con datos correctos redirige al dashboard de Admin y crea una sesión válida. | Must | 2 | 1 | Hecho |
| US02 | Administrador | Como administrador, quiero crear cuentas de tutores para habilitar la gestión de cursos por parte de los docentes. | El Admin crea un tutor con nombre, email y rol; **la creación dispara US21 (alta en Supabase Auth) de forma transaccional**; si falla el alta en Auth, no debe quedar un registro huérfano en `Users`; el tutor recibe invitación de acceso; el registro aparece en el listado de usuarios. | Must | 3 | 2 | Hecho |
| US03 | Administrador | Como administrador, quiero ver un listado de todos los usuarios del sistema para supervisar la plataforma. | El listado muestra nombre, email, rol y estado; permite filtrar por rol. | Must | 3 | 2 | Hecho |
| US04 | Administrador | Como administrador, quiero consultar indicadores generales (usuarios y cursos activos) para tomar decisiones. | El dashboard muestra número total de usuarios por rol y de cursos activos, actualizado en tiempo real. | Should | 5 | 4 | Por hacer |
| US05 | Tutor | Como tutor, quiero iniciar sesión para acceder a mi panel de gestión. | Login válido redirige al dashboard de Tutor; login inválido muestra mensaje de error. | Must | 2 | 1 | Hecho |
| US06 | Tutor | Como tutor, quiero crear estudiantes para habilitar su acceso a mis cursos. | El Tutor registra nombre, apellido y email; **la creación dispara US21 (alta en Supabase Auth) de forma transaccional**; el estudiante queda en estado activo y puede iniciar sesión inmediatamente con las credenciales generadas. | Must | 3 | 2 | Hecho |
| US07 | Tutor | Como tutor, quiero crear cursos con título, descripción e imagen para organizar mi contenido. | El curso se crea con título, descripción e imagen obligatorios; queda en estado borrador o publicado. | Must | 5 | 2 | Hecho |
| US08 | Tutor | Como tutor, quiero publicar contenido en video (YouTube) para enseñar de forma audiovisual. | El contenido de tipo video se reproduce embebido dentro del curso sin salir de la plataforma. | Must | 5 | 3 | Hecho |
| US09 | Tutor | Como tutor, quiero subir documentos (PDF, Word) para complementar mis clases. | El documento se sube, se asocia a un contenido y queda disponible para descarga por los estudiantes inscritos. | Must | 5 | 3 | Hecho |
| US10 | Tutor | Como tutor, quiero crear contenido textual para explicar conceptos por escrito. | El contenido de tipo texto admite formato enriquecido (títulos, listas, negritas) y se guarda correctamente. | Should | 3 | 3 | Hecho |
| US11 | Tutor | Como tutor, quiero asignar estudiantes a mis cursos para controlar quién tiene acceso. | El Tutor asocia uno o varios estudiantes a un curso; los no asignados no pueden ver el contenido. | Must | 5 | 2 | Hecho |
| US12 | Tutor | Como tutor, quiero ordenar y mostrar/ocultar contenidos dentro de un curso para controlar el flujo de aprendizaje. | El Tutor reordena contenidos por arrastre o campo de orden; el contenido oculto no es visible para estudiantes. | Could | 3 | 4 | Por hacer |
| US13 | Estudiante | Como estudiante, quiero iniciar sesión para acceder a mis cursos asignados. | Login válido redirige al dashboard de Estudiante mostrando únicamente sus cursos asignados. | Must | 2 | 1 | Hecho (redirección verificada; el listado de cursos llega con US14) |
| US14 | Estudiante | Como estudiante, quiero visualizar el listado de mis cursos para saber en qué estoy inscrito. | El listado muestra únicamente los cursos donde el estudiante fue asignado, con su estado (activo/finalizado). | Must | 3 | 4 | Hecho |
| US15 | Estudiante | Como estudiante, quiero reproducir los videos de un curso para aprender el contenido audiovisual. | El video se reproduce embebido; el estudiante puede pausar, retroceder y avanzar. | Must | 5 | 3 | Hecho |
| US16 | Estudiante | Como estudiante, quiero visualizar y descargar documentos de un curso para estudiar el material. | El estudiante puede previsualizar el PDF en el navegador y descargarlo sin errores. | Must | 5 | 3 | Hecho |
| US17 | Estudiante | Como estudiante, quiero buscar cursos o contenidos por palabra clave para encontrar información rápido. | La búsqueda filtra resultados por título/descripción y muestra coincidencias en menos de 2 segundos. | Could | 5 | 5 | Por hacer |
| US18 | Admin/Tutor | Como administrador o tutor, quiero ver un dashboard con el resumen de mi actividad para tener visibilidad rápida del estado. | El dashboard muestra métricas clave según el rol (usuarios, cursos, contenidos) sin necesidad de navegar a otras pantallas. | Should | 8 | 4 | Por hacer |
| US19 | Estudiante | Como estudiante, quiero ver un dashboard con mi progreso general para saber cuánto contenido he consumido. | El dashboard muestra porcentaje de avance por curso, calculado sobre contenidos vistos vs. total. | Should | 8 | 4 | Por hacer |
| US20 | Administrador | Como administrador, quiero desactivar usuarios para revocar accesos sin borrar su historial. | El usuario desactivado no puede iniciar sesión; su información e historial permanecen intactos; **depende de US23** para que la revocación se refleje también en Supabase Auth. | Should *(reclasificada, antes Won't)* | 3 | 5 | Por hacer |
| **US21** | Sistema | Como sistema, quiero sincronizar automáticamente cada usuario creado por Admin o Tutor con Supabase Auth, para que pueda iniciar sesión con las credenciales generadas sin pasos manuales. | Al crear un Tutor (US02) o Estudiante (US06), el backend llama a la Admin API de Supabase Auth (`service_role`, nunca desde el cliente) para crear el usuario; se guarda `auth_id` como FK en `Users` vinculando ambos registros; la operación es transaccional: si falla el alta en Auth, se revierte la creación en `Users` (o se marca en estado `error_sync` para reintento) y no queda usuario huérfano en ninguna de las dos fuentes. | Must | 8 | 1 | Hecho (función base implementada y probada; falta conectarla a US02/US06) |
| **US22** | Sistema | Como sistema, quiero mantener sincronizados los datos de contacto (email) entre `Users` y Supabase Auth, para evitar inconsistencias que impidan el inicio de sesión. | Si el Admin/Tutor edita el email de un usuario desde la plataforma, se actualiza también en Supabase Auth en la misma operación; si la actualización en Auth falla, el cambio en `Users` no se persiste (rollback) y se informa el error al usuario. | Should | 5 | 2 | Hecho |
| **US23** | Sistema | Como sistema, quiero revocar el acceso de un usuario en Supabase Auth cuando es desactivado desde la plataforma, para que la desactivación sea efectiva y no solo cosmética. | Al desactivar un usuario (US20), se invalidan sus sesiones activas en Supabase Auth y se bloquea su capacidad de generar nuevas sesiones (ban/disable), sin eliminar el registro; al reactivarlo, recupera acceso. | Should | 5 | 5 | Por hacer |

---

## Resumen de priorización

- **Must have:** US01, US02, US03, US05, US06, US07, US08, US09, US11, US13, US14, US15, US16, US21 — funcionalidad núcleo del MVP (incluye ahora la sincronización de alta con Auth, sin la cual el resto del Must-have no es utilizable en producción).
- **Should have:** US04, US10, US18, US19, US20, US22, US23 — mejoran la experiencia y la integridad del sistema pero no bloquean el primer entregable funcional.
- **Could have:** US12, US17 — deseables si el tiempo del sprint lo permite.
- **Won't have (este MVP):** ninguna por ahora — US20 se reclasificó a Should have en esta revisión.

## Nota de trazabilidad

Cada vez que se abra un Pull Request que implemente una historia de este backlog, debe:
1. Referenciar el ID de la historia (ej. `US21`) en el título del PR.
2. Incluir las pruebas unitarias correspondientes en el mismo PR.
3. Actualizar la fila correspondiente en `progress.md` antes de solicitar revisión.
