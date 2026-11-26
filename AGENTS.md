<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas del proyecto — LMS del docente Fabio Andrés Aguirre

> Escritas el 26/11/2026. El motivo es concreto: al revisar el rediseño de ese día aparecieron **dos
> errores que ya se habían cometido y documentado dos veces cada uno**, y no existía ningún archivo
> donde quien escribe código los pudiera leer antes de empezar. Estaban solo en `progress.md`, que
> tiene mil líneas. Esto es la versión corta.

## Lo que rompe el CI y ya pasó tres veces

1. **Un `Map` cuyo valor llega a JSX va tipado.** `new Map(x.map(c => [c.id, c.titulo]))` infiere
   `Map<any, unknown>` cuando `x` viene de un `Promise.all` con respaldo, y `unknown` no es un
   `ReactNode`: `tsc` lo rechaza. Escribir `new Map<string, string>(...)` y anotar el parámetro del
   `map`. (Pasó el 19/11, el 22/11 y el 25/11.)
2. **Nunca `setState` dentro de un `useEffect`.** `eslint` lo marca
   (`react-hooks/set-state-in-effect`) y rompe `npm run lint`. Si hace falta que algo pase una sola
   vez, la guarda va fuera de React (`sessionStorage`, una referencia), no en estado. (Pasó el
   15/09, el 19/11 y el 25/11.)

## Base de datos

3. **`npx prisma migrate dev` está roto** desde el 12/11 (la migración `20261112200000` activa RLS
   sobre `_prisma_migrations` y falla en la base sombra). Usar siempre
   **`npx prisma migrate deploy` + `npx prisma generate`**, o `npm run verificar`, que hace las dos y
   después tipos, lint y pruebas.
4. **Toda tabla nueva lleva `ENABLE ROW LEVEL SECURITY`** en la misma migración que la crea.
5. **Las columnas se escriben en camelCase** (`espacioId`, `createdAt`, `espacioOrigenId`); los
   modelos se mapean a tablas en snake_case con `@@map`.

## Seguridad, que acá no es teórica

6. **La plataforma es para menores de edad y el repositorio es público.** Nunca confirmar
   `estudiantes.txt`, `.codex/` ni `scripts/borrar-listado-1.ts` (este último lleva embebidos los
   nombres completos de 229 estudiantes). Están en `.gitignore`: dejarlos ahí.
7. **Nunca `git add -A` ni `git add -u`** — siempre rutas explícitas. El checkout de Windows está en
   CRLF sin `.gitattributes` y aparecen decenas de archivos como modificados sin haber cambiado.
8. **`OpcionesQuiz.esCorrecta` no viaja al navegador.** La calificación se hace en el servidor.
9. **Ocultar un control no es una restricción.** Toda regla de acceso se comprueba en la acción del
   servidor, aunque la interfaz ya no ofrezca la opción.
10. **El alcance por espacio se respeta** (`lib/espacio-scope.ts`): un Tutor solo ve e inscribe
    estudiantes de su propio espacio. La única pantalla que cruza espacios a propósito es el
    catálogo de cursos compartidos, y solo muestra lo que su autor marcó como compartible.

## Al tocar código que ya existe

11. **No borrar comentarios que expliquen un permiso, un alcance por espacio o una decisión de
    diseño.** Ya pasó en un rediseño anterior y hubo que reponerlos uno por uno.
12. **`app/estudiante/cursos/[courseId]/page.test.ts` fija la consulta exacta de esa página** y avisa
    cada vez que cambia (cinco veces hasta hoy). Si falla, lo que hay que revisar es si la consulta
    nueva sigue trayendo lo que la pantalla necesita — no silenciar la prueba.
13. **El diseño está decidido en `DESIGN.md`**, que es la decisión y no una descripción: cuando una
    pantalla no coincide con lo que dice ese archivo, lo que está mal es la pantalla. Si hace falta
    cambiar una regla, se cambia el archivo a propósito y se deja escrito por qué.

## Documentación

14. **`Backlog.md` y `progress.md` se sincronizan 1:1** y el estado de una historia se cambia **en el
    commit que la construye**, no después.
15. **Una historia = un commit**, con mensaje descriptivo. El docente hace `add`/`commit`/`push` él
    mismo.
16. **Responder siempre en español** (pedido del docente, 07/09/2026).

