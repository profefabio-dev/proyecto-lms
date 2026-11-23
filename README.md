# Plataforma LMS — Tecnología e Informática

Plataforma de clases construida por **Fabio Andrés Aguirre**, docente de Tecnología e Informática, para
sus propios grupos de bachillerato.

Un docente publica su curso por semanas; sus estudiantes lo recorren lección por lección, presentan
trabajos y responden evaluaciones; y el docente ve en una sola pantalla quién va bien y quién se está
quedando atrás. Varios docentes pueden convivir en la misma instalación, cada uno con su propio
espacio aislado, y compartir material entre ellos.

Es el **Proyecto Integrador 3**, y a la vez una herramienta en uso real.

---

## Qué hace

**Estudiante** — Panel con novedades (lo que vence, lo que le calificaron, material nuevo) · avance
por curso · "Reanudar clase" que entra directo a la lección pendiente · temario y reproductor de una
lección a la vez · entrega de actividades con texto y archivo · evaluaciones de opción múltiple
calificadas al instante · todas sus notas en escala 1.0–5.0 · rutas de aprendizaje · búsqueda.

**Tutor** — Cursos con secciones y estados · cinco tipos de contenido (video, texto en Markdown,
documento, enlace y código) · actividades evaluables con fecha límite · evaluaciones con límite de
intentos · panel de seguimiento y planilla de notas por curso · calificación con retroalimentación ·
rutas de aprendizaje · carga masiva de estudiantes desde Excel o PDF · compartir cursos y adoptar los
de otros docentes.

**Administrador / Super Administrador** — Alta y gestión de usuarios · restablecimiento de contraseñas
· desactivación de cuentas · creación y administración de espacios por docente.

## Stack

**Next.js 16** (App Router, Server Components y Server Actions) · **React 19** · **TypeScript** ·
**Prisma** sobre **PostgreSQL** (Supabase) · **Supabase Auth** y **Storage** · **Tailwind CSS v4** ·
**Vitest** · **GitHub Actions** · **Vercel**.

---

## Puesta en marcha

Requiere Node.js 20 o superior y un proyecto de Supabase.

```bash
npm install
```

Crea un archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

Aplica las migraciones y genera el cliente:

```bash
npx prisma migrate deploy
npx prisma generate
```

> **Usa `migrate deploy`, no `migrate dev`.** Una migración anterior activa el control de acceso sobre
> la tabla de migraciones de Prisma, lo que falla al reproducirse en la base de datos sombra que usa
> `migrate dev`. Contra la base real funciona sin problema.

En Supabase Storage hacen falta dos buckets: **`documentos`** (privado) e **`imagenes-cursos`**
(público).

```bash
npm run dev     # desarrollo en http://localhost:3000
npm test        # pruebas
npm run lint    # análisis estático
npm run build   # compilación de producción
```

### Datos de ejemplo

```bash
npx tsx scripts/cursos-de-tecnologia.ts            # muestra el estado, no modifica nada
npx tsx scripts/cursos-de-tecnologia.ts --crear    # siembra seis cursos y tres rutas
```

El borrado exige `--borrar --confirmar` por separado, porque se lleva entregas y notas. Nunca toca
cuentas de usuario.

---

## Documentación

La documentación ágil del proyecto vive en la raíz del repositorio:

| Documento | Qué contiene |
|---|---|
| [`Descripcion_del_Proyecto.md`](./Descripcion_del_Proyecto.md) | Contexto, problema, visión y alcance, stakeholders, riesgos y modelo de negocio previsto |
| [`Backlog.md`](./Backlog.md) | Product Backlog priorizado: historias con criterios de aceptación, MoSCoW y estimación |
| [`progress.md`](./progress.md) | Registro de avance sesión por sesión, con las decisiones y por qué se tomaron |
| [`Objetivos_SMART.md`](./Objetivos_SMART.md) | Objetivos por iteración |
| [`Sprint_Planning.md`](./Sprint_Planning.md) | Sprint goals, capacidad y Definition of Done |
| [`Diagrama_de_Arquitectura.md`](./Diagrama_de_Arquitectura.md) | Modelo C4, flujos de datos y stack |
| [`Herramientas_y_Metodologia.md`](./Herramientas_y_Metodologia.md) | Herramientas usadas y metodología |
| [`Checklist_Validacion_Manual.md`](./Checklist_Validacion_Manual.md) | Recorrido de validación en navegador |
| [`DESIGN.md`](./DESIGN.md) | Dirección de diseño: reglas, tokens y escala |
| [`Propuesta_Plataforma.md`](./Propuesta_Plataforma.md) | Presentación de la plataforma orientada a quien la va a usar |

`Backlog.md` y `progress.md` se mantienen sincronizados: el estado de una historia debe coincidir en
los dos, y se actualizan en el mismo commit.

## Seguridad

Decisiones que condicionan el código y conviene conocer antes de tocarlo:

- **La autorización se verifica en el servidor**, nunca ocultando controles en la interfaz.
- **Las respuestas correctas de una evaluación jamás viajan al navegador**: la consulta del estudiante
  selecciona solo el id y el texto de cada opción, y hay una prueba automática que lo verifica.
- **Una lección debe estar en la secuencia accesible del curso** para poder abrirse, no basta con que
  esté marcada como visible — es lo que impide entrar por URL a una sección cerrada.
- **Todas las tablas tienen Row Level Security activado**, para que no sean consultables desde
  internet con la clave pública.
- **Los archivos se sirven con enlaces firmados de corta duración** desde un bucket privado.
- **Los datos de estudiantes menores de edad nunca se suben al repositorio.** Los archivos con listas
  reales están en `.gitignore` y así deben quedarse: el repositorio es público.

## Pruebas

```bash
npm test
```

Más de 400 pruebas. Las que dependen de los enums generados por Prisma necesitan el cliente generado
(`npx prisma generate`) para correr.

---

## Licencia y uso

Proyecto académico y personal. Para usarlo en otra institución, escribir al autor.
