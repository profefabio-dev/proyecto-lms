# Objetivos SMART por iteración — Plataforma Educativa LMS

> Cada objetivo es Específico, Medible, Alcanzable, Relevante y Temporal (SMART). Los Sprints 1 a 5
> se documentan en retrospectiva, con la fecha y evidencia real de cumplimiento tomada de
> [`progress.md`](./progress.md) — no son metas aspiracionales sino el registro honesto de lo que se
> propuso y lo que efectivamente pasó. El Sprint 6 es la iteración en curso.

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

## Sprint 6 (en curso) — Endurecimiento, diseño visual y documentación

1. Tener un workflow de CI (`lint` + `tsc --noEmit` + pruebas + build) corriendo automáticamente en
   cada Pull Request antes del cierre de este sprint, confirmado con al menos un run en verde en la
   pestaña Actions de GitHub.
2. Conectar el repositorio a Vercel para que cada push a `main` despliegue automáticamente, con una
   URL pública de la plataforma funcionando antes del cierre de este sprint.
3. Dar identidad visual real a las 11 pantallas protegidas (paleta de marca, navegación por rol,
   cierre de sesión) — cumplido el 31/08/2026, verificado con `eslint`/`tsc --noEmit` limpios y
   confirmado visualmente por el docente en su propio navegador.
4. Entregar la documentación ágil completa que piden las instrucciones del proyecto (este documento,
   descripción del proyecto, arquitectura C4, sprint planning, herramientas) para el 31/08/2026.
5. Activar Row Level Security en las 6 tablas de Supabase para que la API REST pública que Supabase
   genera automáticamente (`anon`/`authenticated`) deje de exponer datos sin pasar por la
   autorización de la aplicación, sin afectar las consultas de Prisma — cumplido el 31/08/2026 con
   una migración lista para aplicar; queda pendiente que el docente la ejecute contra la base de
   datos real, único paso que no puede hacerse desde este entorno de trabajo.
