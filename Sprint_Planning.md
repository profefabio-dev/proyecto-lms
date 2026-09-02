# Sprint Planning — Plataforma Educativa LMS

> Sprint Goal, Sprint Backlog, capacity planning y Definition of Done. Los Sprints 1 a 5 ya se
> cerraron — se documentan aquí en retrospectiva, con datos reales tomados de
> [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md). El Sprint 6 es el que está en curso.

## Definition of Done

Una historia (o cualquier cambio de código) se considera terminada cuando cumple **todo** lo
siguiente — es el mismo criterio aplicado, sin excepciones, a las 23 historias del backlog:

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
| **Total** | **23 historias** | **101 SP** |

**Velocidad promedio observada: ~20 SP por sprint.** Esto se usa como base para estimar el Sprint 6
(ver abajo) en vez de una capacidad teórica de horas-persona, que no aplica a un equipo de una sola
persona con asistencia de IA.

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

## Sprint 6 (en curso) — Endurecimiento, diseño y documentación

**Sprint Goal:** dejar la plataforma lista para mostrarse en una URL pública, con identidad visual
propia, un pipeline de CI corriendo, y la documentación ágil completa que exige el proyecto —
sin agregar historias de negocio nuevas al backlog original.

### Sprint Backlog

| Tarea | Estado al cierre de este documento |
|---|---|
| Rediseño de US19 a marcado manual de contenido visto (detectado en verificación manual) | Hecho, validado en navegador |
| Validación manual de US20/US23 (desactivar bloquea el login) | Hecho, validado en navegador |
| Corrección cosmética: columnas pegadas en tablas de usuarios | Hecho |
| Workflow de CI (`.github/workflows/ci.yml`): lint + tsc + tests + build en cada PR | Hecho — creado, pendiente confirmar el primer run en verde en GitHub Actions |
| Conectar el repositorio a Vercel para despliegue automático | Pendiente — depende de que el docente lo haga desde su cuenta de Vercel |
| Primer pase de diseño visual (paleta de marca, header de navegación, botón de cerrar sesión, Cards/Badges) en las 11 pantallas protegidas | Hecho, confirmado visualmente por el docente |
| Documentación ágil completa (este documento y los otros 4 que lo acompañan) | Hecho |
| Row Level Security (RLS) activado (sin políticas) en las 6 tablas de Supabase | Hecho — migración creada, pendiente que el docente la aplique con `prisma db execute` (requiere conexión real a la base de datos) |
| Segundo pase de diseño visual (íconos, miniaturas de imagen de curso, estados vacíos) | Hecho |
| Lista de chequeo única para la ronda de validación manual pendiente (12 historias) | Hecho — `Checklist_Validacion_Manual.md` ejecutada por el docente el 2026-08-31, sin fallos; las 23 historias del backlog quedan `Validado: Sí` |

### Capacity estimada para lo que resta del Sprint 6

Con la validación manual ya cerrada (23/23 historias), lo único que le falta al Sprint 6 son tres
acciones que solo el docente puede hacer desde sus propias cuentas y máquina, ninguna de las cuales
requiere más trabajo de implementación: aplicar la migración de RLS contra la base de datos real
(`prisma db execute`, ya documentado en `progress.md`), conectar el repositorio a Vercel, y confirmar
el primer run en verde de GitHub Actions. El resto del Sprint Goal —diseño visual, documentación
ágil, RLS del lado del código, y ahora la validación completa— ya está cerrado.
