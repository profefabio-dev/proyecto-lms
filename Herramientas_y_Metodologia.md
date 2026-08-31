# Herramientas y Metodología — Plataforma Educativa LMS

> Las instrucciones del Proyecto Integrador 2 sugieren un conjunto de herramientas por categoría.
> Este documento dice cuáles se usaron realmente en este proyecto y por qué, en vez de repetir la
> lista de sugerencias sin más.

## Metodología

El proyecto se trabajó con un **Scrum adaptado a un equipo de una sola persona** (el docente Fabio
Andrés Aguirre, asistido por Claude de Anthropic como herramienta de generación de código bajo su
dirección y revisión): sprints con objetivo propio (ver `Sprint_Planning.md`), un backlog priorizado
con MoSCoW y estimado con Planning Poker en escala Fibonacci (`Backlog.md`), y una Definition of Done
aplicada sin excepciones a cada historia. La diferencia frente a un Scrum de equipo completo es que
no hay ceremonias síncronas entre personas (daily, retro en grupo) — se reemplazan por una disciplina
de documentación escrita: cada cambio actualiza `Backlog.md` y `progress.md` en el mismo commit, lo
que cumple la misma función de transparencia y trazabilidad que esas ceremonias buscan en un equipo
más grande.

## Herramientas por categoría

| Categoría | Sugeridas por las instrucciones | Usadas en este proyecto | Por qué |
|---|---|---|---|
| Gestión de proyecto | Trello, Jira, Linear | `Backlog.md` + `progress.md` (Markdown versionado en Git) + este Proyecto de Claude | Con un equipo de una sola persona, un board separado añade sincronización manual entre dos fuentes de verdad sin aportar valor real; el backlog vive junto al código, se revisa en el mismo Pull Request y no puede desincronizarse silenciosamente |
| Documentación | Notion, Confluence, GitHub Wiki | Markdown en el repositorio (`Descripcion_del_Proyecto.md`, `Objetivos_SMART.md`, `Diagrama_de_Arquitectura.md`, `Sprint_Planning.md`, este archivo) + Proyecto de Claude como espacio compartido | Misma razón: la documentación versiona junto al código y se puede revisar en el historial de Git como cualquier otro cambio |
| Diagramas | Excalidraw, Draw.io, Miro | Mermaid embebido directamente en `Diagrama_de_Arquitectura.md` | Un diagrama como texto se versiona, se revisa en el diff de un Pull Request, y renderiza automáticamente en GitHub — una herramienta visual externa dejaría el diagrama como una imagen desactualizable sin abrir otra app |
| Control de versiones | Git + GitHub/GitLab | Git + GitHub (`github.com/profefabio-dev/proyecto-lms`) | Tal como se sugiere; un commit por historia o cambio, con mensajes descriptivos, nunca `git add -A` para evitar subir archivos sensibles por accidente |
| CI/CD | GitHub Actions, GitLab CI, Jenkins | GitHub Actions (`.github/workflows/ci.yml`) | El repositorio ya vive en GitHub, así que Actions no agrega una integración externa nueva; corre lint, revisión de tipos, pruebas unitarias y build en cada Pull Request |
| Despliegue (no listada explícitamente arriba, pero parte de la Fase 5 de `Guia_de_implementacion.md`) | — | Vercel (pendiente de conectar) | Integración nativa con Next.js y con GitHub — cada Pull Request obtiene un preview desplegado automáticamente |

## Herramientas técnicas del producto (no de gestión del proyecto)

Estas no están en la lista de "Herramientas Recomendadas" del enunciado porque son decisiones de
stack del producto, no de proceso — se documentan en detalle en `Diagrama_de_Arquitectura.md`
("Stack tecnológico"): Next.js 16, TypeScript, Prisma, PostgreSQL/Supabase, Tailwind CSS v4,
shadcn/ui, Zod, Vitest.

## Pruebas y calidad

- **Pruebas unitarias:** Vitest, mockeando Prisma y Supabase — se escriben en el mismo Pull Request
  que la funcionalidad, nunca después (mandato explícito del docente en `Guia_de_implementacion.md`,
  Fase 4).
- **Verificación de tipos:** `npx tsc --noEmit`, comparado antes/después de cada cambio con
  `git stash -u` para distinguir errores genuinos de artefactos ya conocidos del entorno de
  desarrollo (ver nota en `Descripcion_del_Proyecto.md`, sección "Restricciones").
- **Lint:** ESLint 9 con la configuración de `eslint-config-next`.
- **Verificación manual:** en navegador real, sobre la máquina del docente, antes de marcar cualquier
  historia como `Validado: Sí` en `progress.md` — es la única verificación que puede agruparse y
  posponerse sin bloquear el avance a la siguiente historia.
