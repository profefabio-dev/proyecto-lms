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

**Explícitamente fuera de alcance de este MVP** (ver `Backlog.md`, sección "Resumen de priorización"):
calificaciones numéricas de actividades evaluables, integración de múltiples docentes con sus propios
espacios independientes, y cualquier forma de pago o suscripción. La descripción del proyecto
menciona ambas como visión a futuro ("más adelante se buscará integrar nuevos docentes..."), pero no
son parte de las 23 historias de este backlog.

## Stakeholders identificados

| Stakeholder | Rol frente al proyecto | Interés principal |
|---|---|---|
| Fabio Andrés Aguirre | Dueño del producto (Product Owner) y único Tutor real hoy; también desarrollador, asistido por Claude (Anthropic) como herramienta de generación de código bajo su dirección y revisión | Tener su propia plataforma de clases funcionando, y aprobar el Proyecto Integrador 2 con evidencia real de metodología ágil |
| Administrador de la plataforma | Usuario del rol Administrador (en la práctica, el mismo docente mientras no haya más personal) | Gestionar tutores y usuarios, y tener visibilidad general del sistema |
| Estudiantes | Usuarios finales del rol Estudiante | Acceder fácilmente al contenido de sus cursos y ver su propio progreso |
| Futuros Tutores (docentes adicionales) | Usuarios potenciales del rol Tutor, fuera del alcance de este MVP | Tener un espacio propio para programar sus cursos, una vez se soporte multi-docente |
| Docente/evaluador del curso "Proyecto Integrador 2" | Evaluador académico del proyecto | Verificar que el proyecto siga una metodología ágil real (backlog, sprints, pruebas, CI/CD) y que el producto funcione |

## Restricciones y riesgos

**Restricciones:**

- **Técnicas:** Next.js (App Router) + Prisma + PostgreSQL en Supabase + Supabase Auth/Storage;
  despliegue previsto en Vercel; sin presupuesto para servicios de pago (todo corre en los planes
  gratuitos de Supabase/Vercel/GitHub).
- **De equipo:** un solo desarrollador (el docente), con curva de aprendizaje activa sobre el stack
  (ver `Guia_de_implementacion.md`) — no hay equipo de QA ni de diseño separado.
- **De entorno de desarrollo asistido:** parte del código se escribió con ayuda de sesiones de Claude
  en un entorno de nube sin acceso de red a `supabase.co` ni a `binaries.prisma.sh`, lo que impide
  generar el cliente real de Prisma o correr migraciones ahí — toda migración de base de datos y buena
  parte de la verificación final (`npm test` completo) debe correrse en la máquina del docente. Esto
  está documentado en detalle en `progress.md` y no es una limitación del producto final, sino del
  proceso de construcción.

**Riesgos identificados:**

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El bloqueo de Supabase Auth ("ban") no invalida un token de sesión ya emitido antes de expirar — una cuenta recién desactivada podría conservar acceso hasta por ~1 hora | Baja (ventana corta) | Medio | Segunda capa de verificación de `estado` en `app/dashboard/page.tsx`, documentada en `progress.md` (US20/US23) |
| Migraciones de base de datos solo pueden aplicarse desde la máquina del docente, nunca desde una sesión de Claude en la nube | Alta (ocurre en cada cambio de esquema) | Medio (retraso, no pérdida de datos) | Instrucciones explícitas paso a paso en cada entrega que cambia `schema.prisma`, verificadas con `npx prisma migrate status` |
| Al ser un solo desarrollador, un error de disponibilidad (enfermedad, tiempo) puede detener el proyecto por completo | Media | Alto | Documentación exhaustiva (`Backlog.md`, `progress.md`, `Estado_de_sesion.md`) para que cualquier sesión de trabajo futura retome sin depender de memoria no escrita |
| Falta de pruebas end-to-end (solo hay pruebas unitarias) puede dejar pasar errores de integración real con Supabase | Media | Medio | Verificación manual en navegador real antes de marcar una historia como `Validado: Sí` (ver `progress.md`); CI corre en un entorno con Prisma real generado |
| Multi-docente (visión a futuro) no está en el modelo de datos actual — `Courses.tutorId` asume un tutor por curso, lo cual sí soporta varios tutores, pero no hay ningún concepto de "espacio" o "instancia" separada por docente | Baja por ahora (fuera del MVP) | Alto si se decide implementar sin planearlo | Se deja documentado aquí explícitamente como decisión consciente de diseño, para que una futura iteración lo evalúe desde el inicio en vez de parchearlo |
