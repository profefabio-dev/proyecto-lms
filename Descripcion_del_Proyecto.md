# Documento de Descripción del Proyecto — Plataforma Educativa LMS

> Documento ágil requerido por las instrucciones del Proyecto Integrador 2. Complementa a
> [`Backlog.md`](./Backlog.md) (qué se construye) y [`progress.md`](./progress.md) (qué tan avanzado
> está); este documento responde el "por qué" y el "para quién".

## Contexto y problema a resolver

El docente Fabio Andrés Aguirre dicta clases de tecnología y quiere una página propia —al estilo de
sitios de referencia del área como areatecnologia.com— donde publicar el contenido de sus clases de
forma organizada, en vez de repartirlo entre distintas plataformas genéricas (correo, chats, discos
compartidos) que no ofrecen ni una estructura de curso clara ni visibilidad sobre quién realmente
avanzó en el material.

Hoy no existe un espacio único donde:

- Un estudiante pueda ver, en un solo lugar, los cursos en los que está inscrito, su contenido
  (video, texto, documentos) y cuánto ha avanzado en cada uno.
- El docente pueda publicar y organizar ese contenido en cursos, asignar estudiantes, y ver qué tanto
  lo están usando sin tener que preguntar uno por uno.
- Un administrador pueda dar de alta y gestionar las cuentas de los tutores (otros docentes) y
  estudiantes que usan la plataforma, con control real sobre quién tiene acceso.

El problema no es solo "falta un lugar para subir contenido" — es la ausencia de una plataforma tipo
LMS (Learning Management System) *simple* y *propia* del docente, con roles definidos y trazabilidad
del progreso de cada estudiante, sin la complejidad ni el costo de un LMS institucional genérico.

## Visión y alcance

**Visión:** una plataforma web donde el docente Fabio Andrés Aguirre —y, más adelante, otros
docentes— puedan programar sus propios cursos de tecnología, con estudiantes que se autentican,
consumen el contenido y avanzan por rutas de aprendizaje, mientras el docente supervisa avances y
calificaciones sin salir de la plataforma.

**Alcance de este MVP (Producto Mínimo Viable):**

- Tres roles con inicio de sesión propio: Administrador, Tutor (docente) y Estudiante.
- Gestión de usuarios: el Administrador crea Tutores; los Tutores crean Estudiantes; ambos flujos
  sincronizados con la autenticación real (Supabase Auth), no solo con un registro en base de datos.
- Gestión de cursos: el Tutor crea cursos, publica contenido en tres formatos (video de YouTube,
  texto enriquecido, documentos PDF/Word) y asigna estudiantes.
- Consumo de contenido por el Estudiante: reproducción de video embebido, previsualización de PDF,
  lectura de contenido formateado, con control de acceso (solo ve lo que está asignado y visible).
- Seguimiento de progreso: el Estudiante marca contenido como visto y ve su porcentaje de avance por
  curso; el Administrador y el Tutor ven indicadores generales de su actividad.
- Búsqueda de cursos/contenido por palabra clave, para el Estudiante.
- Revocación de acceso (desactivar/reactivar cuentas) sin borrar el historial.

**Explícitamente fuera de alcance de este MVP** (ver `Backlog.md`, sección "Resumen de priorización
(MVP)"): calificaciones numéricas de actividades evaluables, integración de múltiples docentes con
sus propios espacios independientes (eso llegó después, como la épica siguiente — ver más abajo), y
cualquier forma de pago o suscripción. El MVP (US01–US23) cerró completo, validado y desplegado el
2026-09-01 (Sprint 6).

**Actualización 02-03/09/2026 — Épica Multi-docente cerrada.** Tras el MVP, el docente confirmó avanzar
con la integración de múltiples docentes como la siguiente épica del proyecto, con dos decisiones de
diseño:

1. **Aislamiento de datos entre Administradores y Tutores — pero no entre Estudiantes.** Cada docente
   (Tutor) y su Administrador operan en su propio espacio, sin acceso a los datos de otros espacios.
   Un Estudiante, en cambio, es una cuenta única y compartida: puede inscribirse en cursos de
   distintos docentes sin crear una cuenta nueva por cada uno. Esta segunda parte se decidió el
   02/09/2026, revirtiendo la propuesta inicial de aislar también a los Estudiantes por espacio — el
   docente señaló que obligarlos a tener una cuenta distinta por cada profesor generaría confusión y
   fricción, sin ningún beneficio real a cambio.
2. **Rol creador de espacios: nuevo rol Super Administrador**, reservado al dueño de la plataforma,
   para dar de alta nuevos docentes.

**La épica quedó cerrada y confirmada del todo el 03/09/2026** — las 5 historias (US24-US28) están
`Hecho` y validadas en navegador real contra datos de producción, incluyendo un espacio de prueba
("Castellano") con su propio Administrador, creado, listado, desactivado y reactivado con éxito. El
detalle completo vive en `Backlog.md`, sección "Épica: Múltiples Docentes"; la planificación de sprint
(ya cerrada) en `Sprint_Planning.md` (Sprint 7-8) y los objetivos SMART correspondientes en
`Objetivos_SMART.md`. **Con esto, "integrar nuevos docentes" deja de ser solo la visión a futuro que
menciona este documento — la plataforma ya soporta más de un docente; falta dar de alta al segundo
docente real** (hoy solo existe el espacio de Fabio Aguirre en producción y el espacio de prueba usado
para validar la épica).

**Actualización 02-05/09/2026 — mejoras operativas y feedback externo.** En paralelo y después de la
épica Multi-docente, se agregaron tres mejoras operativas fuera de cualquier épica planificada,
numeradas `OP` en `Backlog.md`: **OP01** (Administrador/Tutor restablece la contraseña de un usuario
que la olvidó), **OP02** (script de restablecimiento masivo para Administradores, usado en un
incidente real de pérdida de contraseñas el 02/09) y **OP03** (Super Administrador restablece la
contraseña del Administrador principal de cualquier espacio desde `/superadmin`). Además, un docente
evaluador externo del proyecto revisó la plataforma el 04-05/09/2026: dio el visto bueno a un rediseño
visual completo del panel del Estudiante (estilo "Duolingo", con gamificación) y a la vista de detalle
de curso (US31, aprovechamiento del espacio de pantalla), y dejó una historia nueva sin construir
todavía (**US30**, secciones plegables inspiradas en el LMS Canvas de la Universidad del Valle, solo
como referencia de nivel visual).

**Actualización 05/09/2026 — revisión de calidad de código.** A pedido del docente, se hizo una
revisión completa del proyecto en busca de errores y código duplicado antes de seguir con nuevas
historias. Se encontraron y corrigieron dos duplicados de código reales (`generarPasswordTemporal()` y
el mapa `ICONO_POR_TIPO`, ambos consolidados en módulos compartidos de `lib/`), sin regresiones. De
paso se detectó que la documentación de la raíz del repositorio (`Backlog.md`, `progress.md`, y estos
mismos 6 documentos) llevaba desactualizada desde ~02/09 — este documento forma parte de esa
sincronización.

## Stakeholders identificados

| Stakeholder | Rol frente al proyecto | Interés principal |
|---|---|---|
| Fabio Andrés Aguirre | Dueño del producto (Product Owner), Super Administrador de la plataforma y único Tutor real hoy; también desarrollador, asistido por Claude (Anthropic) como herramienta de generación de código bajo su dirección y revisión | Tener su propia plataforma de clases funcionando, y aprobar el Proyecto Integrador 2 con evidencia real de metodología ágil |
| Administrador de espacio | Usuario del rol Administrador (en la práctica, el mismo docente en su propio espacio, más el Administrador del espacio de prueba usado para validar la épica Multi-docente) | Gestionar tutores y usuarios de su propio espacio, y tener visibilidad general dentro de él |
| Estudiantes | Usuarios finales del rol Estudiante; cuenta única y global — pueden tener cursos de distintos docentes/espacios con una sola cuenta | Acceder fácilmente al contenido de sus cursos y ver su propio progreso, sin importar cuántos docentes dicten esos cursos |
| Futuros Tutores (docentes adicionales) | Usuarios potenciales del rol Tutor, con su propio espacio aislado a cargo de un Administrador propio (ya soportado desde la épica Multi-docente, pendiente de un segundo docente real) | Tener un espacio propio y aislado para programar sus cursos, sin tener que gestionar cuentas de Estudiante que ya existen en otro espacio |
| Docente/evaluador externo del proyecto | Evaluador que revisó la plataforma en producción el 04-05/09/2026 y dio feedback directo sobre el diseño visual (referencia: LMS Canvas de la Universidad del Valle) | Que la plataforma se sienta a la altura de un LMS institucional real en su nivel visual, además de funcional |
| Docente/evaluador del curso "Proyecto Integrador 2" | Evaluador académico del proyecto | Verificar que el proyecto siga una metodología ágil real (backlog, sprints, pruebas, CI/CD) y que el producto funcione |

## Restricciones y riesgos

**Restricciones:**

- **Técnicas:** Next.js (App Router) + Prisma + PostgreSQL en Supabase + Supabase Auth/Storage;
  desplegada en Vercel (conectada desde el 31/08/2026, con despliegue automático en cada push a
  `main`); sin presupuesto para servicios de pago (todo corre en los planes gratuitos de
  Supabase/Vercel/GitHub).
- **De equipo:** un solo desarrollador (el docente), con curva de aprendizaje activa sobre el stack
  (ver `Guia_de_implementacion.md`) — no hay equipo de QA ni de diseño separado.
- **De entorno de desarrollo asistido:** parte del código se escribió con ayuda de sesiones de Claude
  en un entorno de nube sin acceso de red a `supabase.co` ni a `binaries.prisma.sh`, lo que impide
  generar el cliente real de Prisma o correr migraciones ahí — toda migración de base de datos y buena
  parte de la verificación final (`npm test` completo) debe correrse en la máquina del docente. Esto
  está documentado en detalle en `progress.md` y no es una limitación del producto final, sino del
  proceso de construcción.
- **De continuidad documental:** con el proyecto viviendo en tres lugares a la vez —el repositorio
  local del docente, GitHub, y este Proyecto de Claude— la documentación de alguno de los tres puede
  desincronizarse del resto si una sesión de trabajo no la actualiza explícitamente. Ocurrió el
  05/09/2026 (ver actualización de arriba) y quedó corregido, pero es una restricción real del proceso,
  no solo un incidente aislado.

**Riesgos identificados:**

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El bloqueo de Supabase Auth ("ban") no invalida un token de sesión ya emitido antes de expirar — una cuenta recién desactivada podría conservar acceso hasta por ~1 hora | Baja (ventana corta) | Medio | Segunda capa de verificación de `estado` en `app/dashboard/page.tsx`, documentada en `progress.md` (US20/US23) |
| Migraciones de base de datos solo pueden aplicarse desde la máquina del docente, nunca desde una sesión de Claude en la nube | Alta (ocurre en cada cambio de esquema) | Medio (retraso, no pérdida de datos) | Instrucciones explícitas paso a paso en cada entrega que cambia `schema.prisma`, verificadas con `npx prisma migrate status` — aplicado sin incidentes en la migración de `Espacios`/`SUPERADMIN` de la épica Multi-docente |
| Al ser un solo desarrollador, un error de disponibilidad (enfermedad, tiempo) puede detener el proyecto por completo | Media | Alto | Documentación exhaustiva (`Backlog.md`, `progress.md`, `Estado_de_sesion.md`) para que cualquier sesión de trabajo futura retome sin depender de memoria no escrita |
| Falta de pruebas end-to-end (solo hay pruebas unitarias) puede dejar pasar errores de integración real con Supabase | Media | Medio | Verificación manual en navegador real antes de marcar una historia como `Validado: Sí` (ver `progress.md`); CI corre en un entorno con Prisma real generado |
| La documentación de la raíz del repositorio (`Backlog.md`, `progress.md`, y estos documentos) puede desincronizarse del estado real del proyecto o de este Proyecto de Claude si una sesión de trabajo no la actualiza en el mismo momento en que cambia el código | Media (ya ocurrió una vez, el 05/09/2026) | Medio (no afecta al producto, sí a la evidencia de metodología ágil que exige el curso) | Verificar los tres lugares (repo local, GitHub, Proyecto de Claude) al cierre de cada sesión de trabajo relevante, no asumir que uno refleja a los otros dos — convención agregada explícitamente el 05/09/2026 tras detectar el desfase |
| Al ser los Estudiantes cuentas compartidas entre espacios (no aisladas), un Administrador/Tutor mal implementado podría terminar viendo Estudiantes o datos de otros espacios sin relación real con el suyo | Baja (US24 ya cerrada, validada en navegador real y con pruebas unitarias dedicadas) | Alto si reapareciera (fuga de datos entre docentes) | US24 exige explícitamente que el listado de Estudiantes visible para un Administrador/Tutor se limite a quienes tengan una inscripción real (`CourseUsers`) en un curso de su propio espacio, con pruebas unitarias dedicadas a este caso — confirmado en producción el 02/09/2026 con la sesión de un Administrador de espacio de prueba |

**Riesgo cerrado (ya no aplica):** la ausencia de un concepto de "espacio" en el modelo de datos, antes
listado como el riesgo más alto de este documento, quedó resuelto con la migración de US24 — la épica
Multi-docente está cerrada y en producción desde el 03/09/2026.
