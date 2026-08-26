# Progress — Plataforma Educativa LMS (Docente Fabio Andrés Aguirre)

> Este archivo se sincroniza 1:1 con [`Backlog.md`](./Backlog.md): mismo ID de historia, mismo orden. Cada fila se actualiza cuando cambia el estado real de la implementación — no antes. Al marcar una historia como `Hecho` aquí, su `Estado` en `Backlog.md` debe actualizarse en el mismo commit.

Última actualización: 2026-08-26 — US21 implementada y probada: `lib/supabase/sync-user.ts` crea el usuario en Supabase Auth y su registro vinculado en `Users` (por `authId`), con reversión automática (borra el usuario de Auth) si falla el guardado en la base de datos. Verificado manualmente con un script (`scripts/test-sync-user.ts`) contra Supabase real, y con 3 pruebas unitarias automatizadas (`lib/supabase/sync-user.test.ts`, mockeando Supabase Auth y Prisma) — las 3 pasan. Pendiente: conectar esta función a un formulario/Server Action real para US02 y US06, y revisión por pares/docente antes de marcarla como validada.

Leyenda:
- **Implementado:** No iniciado / En progreso / Sí
- **Pruebas unitarias:** No / Parcial / Sí (indicar archivo(s) de test)
- **Pruebas pasan:** N/A / No / Sí
- **Validado:** No / Sí (revisión por pares + criterios de aceptación verificados)

| ID | Sprint | Implementado | Pruebas unitarias | Pruebas pasan | Validado | Patrón/Práctica aplicada | Notas |
|----|--------|---------------|--------------------|-----------------|----------|---------------------------|-------|
| US01 | 1 | No iniciado | No | N/A | No | — | Login Admin vía Supabase Auth. Modelo de datos ya migrado (tabla `users` lista) |
| US02 | 2 | No iniciado | No | N/A | No | — | Depende de US21 |
| US03 | 2 | No iniciado | No | N/A | No | — | |
| US04 | 4 | No iniciado | No | N/A | No | — | |
| US05 | 1 | No iniciado | No | N/A | No | — | Login Tutor. Modelo de datos ya migrado |
| US06 | 2 | No iniciado | No | N/A | No | — | Depende de US21 |
| US07 | 2 | No iniciado | No | N/A | No | — | |
| US08 | 3 | No iniciado | No | N/A | No | — | |
| US09 | 3 | No iniciado | No | N/A | No | — | |
| US10 | 3 | No iniciado | No | N/A | No | — | |
| US11 | 2 | No iniciado | No | N/A | No | — | |
| US12 | 4 | No iniciado | No | N/A | No | — | |
| US13 | 1 | No iniciado | No | N/A | No | — | Login Estudiante. Modelo de datos ya migrado |
| US14 | 4 | No iniciado | No | N/A | No | — | |
| US15 | 3 | No iniciado | No | N/A | No | — | |
| US16 | 3 | No iniciado | No | N/A | No | — | |
| US17 | 5 | No iniciado | No | N/A | No | — | |
| US18 | 4 | No iniciado | No | N/A | No | — | |
| US19 | 4 | No iniciado | No | N/A | No | — | |
| US20 | 5 | No iniciado | No | N/A | No | — | Depende de US23 |
| **US21** | 1 | Sí | Sí (`lib/supabase/sync-user.test.ts`, 3 casos) | Sí | No (pendiente revisión por pares/docente) | Patrón de compensación (saga): si falla el guardado en la base de datos, se revierte el alta en Supabase Auth | Función `createSyncedUser` en `lib/supabase/sync-user.ts`. Verificada manualmente contra Supabase real y con pruebas unitarias mockeadas. Falta conectarla a los formularios de US02/US06 |
| **US22** | 2 | No iniciado | No | N/A | No | — | Sync de email en edición de usuario |
| **US23** | 5 | No iniciado | No | N/A | No | — | Revocación de acceso al desactivar |

## Cobertura de pruebas (resumen)

- Historias con pruebas implementadas: 1 / 23 (US21)
- Historias con pruebas pasando: 1 / 23 (US21)
- Historias validadas: 0 / 23

## Próxima actualización

Este resumen se debe recalcular en cada actualización de fila. Cuando se conecte el repositorio del proyecto, agregar aquí el enlace al pipeline de CI/CD (GitHub Actions) para que la columna "Pruebas pasan" refleje el resultado del último run automático en vez de una verificación manual.
