# Objetivos SMART por iteración — Plataforma Educativa LMS

> Cada objetivo es Específico, Medible, Alcanzable, Relevante y Temporal (SMART). Los Sprints 1 a 8
> se documentan en retrospectiva, con la fecha y evidencia real de cumplimiento tomada de
> [`progress.md`](./progress.md) — no son metas aspiracionales sino el registro honesto de lo que se
> propuso y lo que efectivamente pasó. El Sprint 6 cerró el 2026-09-01; los Sprints 7-8 (Multi-docente)
> cerraron el 2026-09-02/03.

## Sprint 1 — Cimientos: autenticación y sincronización con Auth

1. Tener el esqueleto de Next.js + Prisma + Supabase desplegable en un repositorio Git para el
   26/08/2026, con las 5 tablas del modelo de datos creadas en la base de datos real (Fase 0-2 de
   `Guia_de_implementacion.md`).
2. Implementar `createSyncedUser` (US21) con reversión automática si falla el alta en Supabase Auth,
   y validarlo con al menos 3 pruebas unitarias antes de construir el login sobre él — evita rehacer
   el login si la sincronización llega después (lección explícita documentada en la guía).
3. Que los tres roles (Administrador, Tutor, Estudiante) puedan iniciar sesión y ser redirigidos a su
   panel correspondiente (US01/US05/US13), verificado con pruebas automatizadas en
   `app/dashboard/page.test.ts`, para el cierre del Sprint 1.

## Sprint 2 — Gestión de usuarios y cursos

1. Que un Administrador pueda crear Tutores (US02) y un Tutor pueda crear Estudiantes (US06), ambos
   con alta automática en Supabase Auth vía US21, verificado manualmente iniciando sesión con la
   contraseña temporal generada — cumplido el 26-27/08/2026.
2. Que un Tutor pueda crear cursos (US07) y asignar estudiantes a ellos (US11), con al menos 5 y 6
   pruebas unitarias respectivamente, para que un estudiante no asignado no pueda ver el contenido.
3. Que el email de un usuario pueda editarse desde la plataforma manteniendo sincronizados `Users` y
   Supabase Auth (US22), con reversión si la sincronización falla — 14 pruebas unitarias nuevas,
   cumplido el 28/08/2026.
4. Que el Administrador tenga un listado filtrable por rol de todos los usuarios del sistema (US03),
   validado en navegador real antes del cierre del sprint.

## Sprint 3 — Contenido del curso

1. Que un Tutor pueda publicar contenido de video de YouTube embebido (US08), documento PDF/Word
   descargable (US09) y texto con Markdown (US10) en un curso, cada uno con su propia Server Action
   validada con Zod y con pruebas unitarias — 20 + 16 + 7 pruebas nuevas respectivamente, cumplido
   entre el 27 y 28/08/2026.
2. Que un Estudiante inscrito pueda reproducir esos videos y previsualizar esos documentos sin salir
   de la plataforma (US15/US16), con la restricción de que solo ve contenido de cursos donde está
   inscrito — validado en navegador real el 29/08/2026.
3. Medir la cobertura de pruebas alcanzada al cierre del sprint (77 → 100 pruebas unitarias entre
   US15 y US10) para confirmar que la meta de "pruebas en paralelo con cada historia" del docente se
   está cumpliendo, no dejándose para el final.

## Sprint 4 — Dashboards y progreso

1. Que Administrador y Tutor tengan un panel con indicadores clave de su actividad sin navegar a otra
   pantalla (US18), y que el Estudiante vea su progreso por curso en porcentaje (US19), ambos
   validados en navegador real antes del 31/08/2026.
2. Que un Tutor pueda reordenar y ocultar contenido de un curso (US12), con 12 pruebas unitarias
   cubriendo el intercambio de orden y el filtro de visibilidad, confirmado con `npm test` en la
   máquina del docente (121/121 pruebas).
3. Detectar y corregir, antes del cierre del sprint, cualquier defecto de diseño descubierto en
   verificación manual — objetivo cumplido de forma directa: la verificación en navegador de US19
   reveló que el marcado automático de "visto" no distinguía abrir la página de consumir el
   contenido, y se rediseñó a un botón manual el 31/08/2026 antes de darla por cerrada.

## Sprint 5 — Búsqueda, cierre de historias y control de acceso

1. Que un Estudiante pueda buscar cursos y contenido por palabra clave dentro de lo que tiene acceso
   (US17), validado en navegador real buscando un término real y confirmando los resultados.
2. Que un Administrador pueda desactivar y reactivar una cuenta (US20) y que esa desactivación sea
   efectiva a nivel de Supabase Auth y no solo cosmética en la base de datos (US23), validado
   desactivando una cuenta de prueba y confirmando que no puede iniciar sesión — cumplido el
   31/08/2026.
3. Cerrar las 23 historias del backlog a nivel de implementación (100 %) para el 30/08/2026, dejando
   la validación manual restante como cola explícita en `progress.md` en vez de bloquear el cierre
   del sprint por historias ya funcionalmente completas.

## Sprint 6 (cerrado el 2026-09-01) — Endurecimiento, diseño visual y documentación

1. Tener un workflow de CI (`lint` + `tsc --noEmit` + pruebas + build) corriendo automáticamente en
   cada Pull Request antes del cierre de este sprint — **cumplido el 31/08/2026**, confirmado con el
   run [#6](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33433559108) en verde en la
   pestaña Actions de GitHub.
2. Conectar el repositorio a Vercel para que cada push a `main` despliegue automáticamente, con una
   URL pública de la plataforma funcionando antes del cierre de este sprint — **cumplido el
   31/08/2026**, primer deployment de producción en estado "Ready" (commit `d6fa47e`).
3. Dar identidad visual real a las 11 pantallas protegidas (paleta de marca, navegación por rol,
   cierre de sesión) — cumplido el 31/08/2026, verificado con `eslint`/`tsc --noEmit` limpios y
   confirmado visualmente por el docente en su propio navegador.
4. Entregar la documentación ágil completa que piden las instrucciones del proyecto (este documento,
   descripción del proyecto, arquitectura C4, sprint planning, herramientas) para el 31/08/2026 —
   cumplido.
5. Activar Row Level Security en las 6 tablas de Supabase para que la API REST pública que Supabase
   genera automáticamente (`anon`/`authenticated`) deje de exponer datos sin pasar por la
   autorización de la aplicación, sin afectar las consultas de Prisma — **cumplido el 2026-09-01**:
   migración aplicada contra la base de datos real (`npx prisma db execute` + `migrate resolve`),
   confirmado con `npx prisma migrate status`: "Database schema is up to date!".

**Con el objetivo 5 cumplido, los 5 objetivos SMART del Sprint 6 quedan cerrados — no hay ningún
pendiente abierto del Sprint 6 ni de las 23 historias del backlog.**

## Sprint 7 (cerrado el 2026-09-02) — Multi-docente: base de aislamiento

> El docente confirmó avanzar con la épica de múltiples docentes (ver `Backlog.md`, sección "Épica:
> Múltiples Docentes"), con dos decisiones de diseño tomadas el 01-02/09/2026: espacios separados
> **entre Administradores y Tutores** (no entre Estudiantes — un Estudiante es una cuenta única y
> compartida que puede inscribirse en cursos de distintos docentes, decisión tomada el 02/09/2026
> para evitar que tuviera que crear una cuenta nueva por cada docente), y un nuevo rol Super
> Administrador para crear espacios nuevos.

1. Diseñar y aplicar la migración de `prisma/schema.prisma` que agrega la entidad `Espacios`, el rol
   `SUPERADMIN`, y `espacioId` en `Users` **solo para los roles Administrador y Tutor** (un Estudiante
   no tiene `espacioId`), migrando el espacio actual de Fabio Aguirre como "espacio por defecto" sin
   pérdida ni alteración de sus datos existentes — **cumplido el 02/09/2026**, validado con
   `npx prisma migrate status` contra la base de datos real antes de tocar ninguna consulta de la
   aplicación.
2. Implementar el filtrado por espacio (US24) en las consultas de Administrador/Tutor (listado de
   tutores, de usuarios administrables, de cursos, dashboards) — incluyendo que el listado de
   Estudiantes que ve un Administrador/Tutor se limite a quienes tengan al menos una inscripción en un
   curso de su espacio — con pruebas unitarias que confirmen que un Administrador/Tutor de un espacio
   no puede leer ni escribir datos de otro espacio aunque conozca su ID. **Cumplido el 02/09/2026** —
   confirmado además, sin necesidad de cambiar código, que las pantallas de Estudiante (US14, US17,
   US19) siguen funcionando igual porque ya filtran por inscripción real, no por un espacio único del
   Estudiante.
3. Que un Super Administrador pueda crear un nuevo espacio de docente con su primer Administrador
   (US25) — **cumplido y validado en navegador real el 02/09/2026**: el docente creó un espacio de
   prueba ("Castellano") de principio a fin, confirmó que puede iniciar sesión y gestionar su propio
   espacio de forma aislada, y confirmó además que un Estudiante existente puede ser asignado por ese
   nuevo Tutor a uno de sus cursos sin crear una cuenta nueva.
4. Confirmar cero regresiones en las 23 historias del MVP tras introducir el modelo de espacios,
   corriendo la suite completa de pruebas (`npm test`, en la máquina del docente con Prisma real
   generado) y repitiendo el mismo checklist de validación manual usado en el cierre del Sprint 6 —
   **cumplido y confirmado del todo el 03/09/2026**: revisión de código de las 23 historias del MVP,
   `eslint`/`tsc`/suite completa de pruebas sin regresiones reales (se detectó y corrigió un error de
   tipos aislado en `storage.test.ts`, sin relación con esta épica), y el run
   [CI #15](https://github.com/profefabio-dev/proyecto-lms/actions/runs/33696504610) en verde con
   cliente de Prisma real.

**Con los 4 objetivos cumplidos, el Sprint 7 queda cerrado — US24, US25 y US26 pasan a `Hecho`.**

## Sprint 8 (cerrado el 2026-09-02) — Multi-docente: visibilidad y control operativo

> Cubre el Should-have de la épica Multi-docente (US27, US28), una vez que el aislamiento de datos del
> Sprint 7 (US24) ya estaba en producción.

1. Que un Super Administrador pueda ver un listado de todos los espacios registrados, con
   Administrador principal, cantidad de tutores/estudiantes activos/cursos y estado (US27) —
   **cumplido y validado en navegador real el 02/09/2026** con datos reales de los dos espacios del
   docente (el suyo propio y el de prueba "Castellano").
2. Que un Super Administrador pueda desactivar un espacio completo, revocando el acceso de todos sus
   Administradores y Tutores sin afectar a los Estudiantes que tuvieran cursos ahí (solo pierden
   acceso a esos cursos puntuales, no a su cuenta) (US28) — **cumplido y validado de punta a punta el
   02/09/2026**: se desactivó el espacio de prueba "Castellano", su Administrador (Oscar Henao) quedó
   sin poder iniciar sesión, y recuperó el acceso con la misma contraseña al reactivarlo.
3. Dar al Super Administrador una forma de restablecer la contraseña del Administrador principal de
   cualquier espacio directamente desde `/superadmin`, sin depender de un script de terminal (OP03,
   mejora operativa construida en el mismo sprint) — **cumplido**, en GitHub desde el commit
   `bbea480`, usado con éxito por el docente el 02/09/2026 para restablecer la contraseña de Oscar
   Henao y así terminar de probar US28 de punta a punta.

**Con los 3 objetivos cumplidos, el Sprint 8 queda cerrado — US27 y US28 pasan a `Hecho`. La épica
Multi-docente completa (US24-US28, Sprints 7-8) cierra el 03/09/2026 sin ninguna regresión sobre el
MVP.**

## Trabajo intersprint (02-05/09/2026) — sin sprint formal asignado

> No cumple con un Sprint Goal planificado de antemano (es iteración directa sobre feedback en vivo o
> incidentes puntuales), pero se documenta con la misma exigencia de evidencia que los sprints de
> arriba, siguiendo la Definition of Done.

1. Dar al Administrador/Tutor una forma de restablecer la contraseña de un usuario que la olvidó
   (OP01), y al docente un script para restablecer de una sola vez la de todos sus Administradores
   ante una pérdida real de contraseñas anotadas (OP02) — **OP02 cumplido y confirmado por el docente
   el 02/09/2026** ante un incidente real; **OP01 implementado pero sin una confirmación visual final
   registrada** del docente (ver `Checklist_Validacion_Manual.md`), a diferencia del resto de historias
   de esta lista.
2. Que el panel del Estudiante tenga una identidad visual "a la altura de un LMS real" tras la
   devolución del docente de que la primera versión (inspirada en Chamilo) "es muy básica" —
   **cumplido el 04/09/2026** con el rediseño "estilo Duolingo" (paleta de gamificación, componentes
   3D presionables, confeti al completar un curso) y una v3 de optimización de rendimiento el mismo
   día, confirmado por el docente: "se puede dejar así por ahora".
3. Que la vista de detalle de curso del Estudiante aproveche mejor el espacio de pantalla y dé más
   peso visual a cada contenido (US31), a partir del feedback de un docente evaluador externo del
   proyecto — **cumplido y confirmado por el docente el 05/09/2026**, tras cuatro rondas de ajuste de
   tamaño y layout el mismo día ("ya lo revise, ahora si se ve mas grande. podemos dejarlo asi
   mientras tanto").
4. Corregir la inconsistencia de UX señalada por el mismo evaluador externo (la X del menú lateral y
   el botón de hamburguesa hacían lo mismo en escritorio) — **cumplido el 05/09/2026**, la X ahora se
   oculta siempre en escritorio.
5. Revisar el proyecto completo en busca de errores y código duplicado antes de seguir con nuevas
   historias, a pedido explícito del docente — **cumplido el 05/09/2026**: dos duplicados de código
   reales corregidos (`generarPasswordTemporal()` en 6 archivos, `ICONO_POR_TIPO` en 2 componentes),
   cero regresiones (`eslint`/`tsc`/`vitest`/`next build` con el mismo resultado exacto de siempre), y
   la documentación de la raíz del repositorio (`Backlog.md`, `progress.md`, y estos 6 documentos)
   sincronizada con el estado real del proyecto tras detectar que llevaba desactualizada desde ~02/09.

## Sprint 9 (a definir)

Queda pendiente decidir y planificar formalmente el siguiente turno de trabajo entre **US29** (carga
masiva de estudiantes por Excel/PDF, completamente definida desde el 03/09/2026, sin decisiones de
diseño pendientes) y **US30** (secciones plegables estilo Canvas, necesita antes una decisión de
modelo de datos) — ver `Sprint_Planning.md` para el detalle de lo que falta antes de fijar el Sprint
Goal de este sprint.
