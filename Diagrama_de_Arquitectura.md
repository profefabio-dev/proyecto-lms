# Diagrama de Arquitectura — Plataforma Educativa LMS

> Modelo C4 (Contexto y Contenedores, con un nivel adicional de Componentes principales), flujo de
> datos de los recorridos más representativos, modelo de datos de aislamiento multi-tenant, y stack
> tecnológico. Los diagramas usan sintaxis de flowchart de Mermaid en vez del tipo
> `C4Context`/`C4Container` nativo de Mermaid porque ese tipo todavía no renderiza de forma confiable
> en la vista de GitHub — esta versión sí se ve correctamente ahí y en cualquier visor de Markdown
> compatible con Mermaid. **Actualizado el 05/09/2026** para reflejar la épica Multi-docente (cerrada
> el 03/09/2026): antes se documentaba como "cambio previsto, aún no implementado" — ya está en
> producción.

## Nivel 1 — Diagrama de Contexto

Quién usa la plataforma y con qué sistemas externos habla.

```mermaid
flowchart TB
    SuperAdmin["👤 Super Administrador<br/>crea y supervisa espacios de docentes"]
    Admin["👤 Administrador<br/>gestiona tutores y usuarios de su espacio"]
    Tutor["👤 Tutor<br/>publica cursos y contenido en su espacio"]
    Estudiante["👤 Estudiante<br/>consume cursos y ve su progreso<br/>(cuenta única, cursos de uno o varios espacios)"]

    subgraph Sistema["Plataforma Educativa LMS"]
        LMS["Aplicación web Next.js<br/>(este proyecto)"]
    end

    Auth["Supabase Auth<br/>(sistema externo)"]
    DB["Supabase Postgres<br/>(sistema externo)"]
    Storage["Supabase Storage<br/>(sistema externo)"]
    YouTube["YouTube<br/>(sistema externo, embebido)"]

    SuperAdmin -->|"usa (HTTPS)"| LMS
    Admin -->|"usa (HTTPS)"| LMS
    Tutor -->|"usa (HTTPS)"| LMS
    Estudiante -->|"usa (HTTPS)"| LMS

    LMS -->|"autentica / gestiona cuentas"| Auth
    LMS -->|"lee y escribe datos vía Prisma"| DB
    LMS -->|"sube / descarga documentos (URLs firmadas)"| Storage
    LMS -->|"embebe reproductor de video"| YouTube
```

## Nivel 2 — Diagrama de Contenedores

Qué piezas desplegables componen la plataforma y cómo se relacionan.

```mermaid
flowchart TB
    Navegador["🌐 Navegador del usuario"]

    subgraph Vercel["Vercel (conectado — despliegue automático desde 31/08/2026)"]
        subgraph NextApp["Aplicación Next.js 16 (App Router)"]
            Middleware["Middleware<br/>refresca sesión, protege rutas sin sesión"]
            Pages["Server Components<br/>páginas por rol (/superadmin, /admin, /tutor, /estudiante)"]
            Actions["Server Actions<br/>lib/actions/*.ts"]
            PrismaClient["Cliente Prisma<br/>lib/prisma.ts"]
            SupabaseClients["Clientes Supabase<br/>lib/supabase/*.ts (browser, server, admin)"]
        end
    end

    subgraph GH["GitHub"]
        Repo["Repositorio (main)"]
        Actions_CI["GitHub Actions<br/>lint + tsc + tests + build"]
    end

    SupaAuth["Supabase Auth"]
    SupaDB["Supabase Postgres"]
    SupaStorage["Supabase Storage"]

    Navegador -->|"HTTPS"| Middleware
    Middleware --> Pages
    Pages -->|"formularios / botones"| Actions
    Pages --> PrismaClient
    Actions --> PrismaClient
    Pages --> SupabaseClients
    Actions --> SupabaseClients
    PrismaClient -->|"SQL (vía Prisma)"| SupaDB
    SupabaseClients -->|"login, alta/baja de usuarios, sesión"| SupaAuth
    SupabaseClients -->|"subir/descargar documentos"| SupaStorage

    Repo -->|"push / Pull Request"| Actions_CI
    Repo -->|"despliegue automático en cada push a main"| Vercel
```

## Nivel 3 — Componentes principales (dentro de la aplicación Next.js)

Cómo se organiza el código fuente por responsabilidad.

```mermaid
flowchart TB
    subgraph app["app/ — rutas y páginas (Server Components)"]
        LoginPage["/login"]
        SuperAdminPages["/superadmin<br/>listado y gestión de espacios (US25/US27/US28), OP03"]
        AdminPages["/admin, /admin/usuarios, /admin/tutores"]
        TutorPages["/tutor, /tutor/cursos, /tutor/estudiantes"]
        EstudiantePages["/estudiante, /estudiante/cursos, /estudiante/buscar"]
        DashboardDispatch["/dashboard<br/>despachador único por rol"]
    end

    subgraph lib["lib/ — lógica de negocio"]
        LibActions["actions/*.ts<br/>Server Actions (mutaciones): create-tutor, create-student,<br/>create-espacio, reset-user-password, reset-espacio-admin-password..."]
        LibAuth["auth/generar-password-temporal.ts<br/>helper compartido (antes copiado en 6 archivos)"]
        LibSupabase["supabase/*.ts<br/>clientes: browser, server, admin, storage, sync-user"]
        LibPrisma["prisma.ts<br/>cliente Prisma singleton"]
        LibContentIcon["content-type-icon.ts<br/>ícono/color por tipo de contenido (compartido)"]
        LibPuras["course-progress.ts, course-status.ts,<br/>search.ts, admin-stats.ts, streak.ts<br/>(funciones puras, con pruebas unitarias)"]
    end

    subgraph componentes["components/ — UI reutilizable"]
        UIBase["ui/*.tsx<br/>Button, Card, Input, Label, Badge, Progress, Avatar (shadcn)"]
        AppShell["app-shell.tsx, breadcrumbs.tsx, logout-button.tsx<br/>menú lateral, navegación y sesión"]
        Formularios["*-form.tsx<br/>formularios conectados a Server Actions"]
        ContentUI["youtube-embed, markdown-content,<br/>document-content-list, mark-content-viewed-button,<br/>course-content-item, course-content-outline (US31)"]
    end

    Middleware["middleware.ts<br/>protección de rutas a nivel de edge"]

    app --> lib
    app --> componentes
    componentes --> LibActions
    LibActions --> LibAuth
    ContentUI --> LibContentIcon
    Middleware --> app
```

## Flujo de datos

### Inicio de sesión y despacho por rol

```mermaid
sequenceDiagram
    actor U as Usuario
    participant Login as LoginForm (cliente)
    participant Auth as Supabase Auth
    participant Dash as /dashboard (Server Component)
    participant DB as Postgres (vía Prisma)

    U->>Login: envía email + contraseña
    Login->>Auth: signInWithPassword()
    Auth-->>Login: sesión válida (o error)
    Login->>Dash: router.push("/dashboard")
    Dash->>Auth: getUser() (lee cookie de sesión)
    Dash->>DB: users.findUnique({ authId })
    DB-->>Dash: usuario (rol, estado, espacioId si aplica)
    alt estado distinto de ACTIVO
        Dash-->>U: redirect a /login?error=cuenta_desactivada
    else usuario activo
        Dash-->>U: redirect a /superadmin, /admin, /tutor o /estudiante según el rol
    end
```

### Un Estudiante marca un contenido como visto (US19)

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant Btn as MarkContentViewedButton (cliente)
    participant Action as marcarContenidoVisto (Server Action)
    participant DB as Postgres (vía Prisma)

    E->>Btn: clic en "Marcar como visto"
    Btn->>Action: formAction(contentId)
    Action->>DB: valida sesión, rol Estudiante,<br/>contenido visible e inscripción
    alt no autorizado o inválido
        Action-->>Btn: { success: false, error }
    else válido
        Action->>DB: contentViews.createMany({ skipDuplicates: true })
        Action->>Action: revalidatePath("/estudiante" y curso)
        Action-->>Btn: { success: true }
        Btn-->>E: insignia "✓ Visto"
    end
```

### Un Administrador/Tutor consulta sus Estudiantes disponibles (aislamiento por espacio, US24)

```mermaid
sequenceDiagram
    actor A as Administrador/Tutor
    participant Page as /tutor/estudiantes (Server Component)
    participant DB as Postgres (vía Prisma)

    A->>Page: GET /tutor/estudiantes
    Page->>DB: users.findUnique({ authId }) — usuario actual + su espacioId
    Page->>DB: users.findMany({ where: filtroUsuarioVisibleEnEspacio(espacioId, ESTUDIANTE) })
    Note over Page,DB: El filtro es por inscripción real (CourseUsers en un curso<br/>de este espacio) — nunca por un espacioId propio del<br/>Estudiante, porque no existe: es una cuenta global.
    DB-->>Page: Estudiantes con al menos una inscripción en este espacio
    Page-->>A: listado (nunca incluye Estudiantes sin relación con este espacio)
```

## Modelo de datos de aislamiento multi-tenant (épica Multi-docente, en producción desde el 03/09/2026)

**Cambio central:** se agregó la entidad `Espacios` (un espacio = un docente/institución) como raíz de
aislamiento — pero **solo para los roles Administrador y Tutor**, no para Estudiante. Un Estudiante
sigue siendo una única cuenta global (igual que en el MVP), y su relación con uno o varios espacios
queda dada por sus inscripciones (`CourseUsers`) a cursos de Tutores de esos espacios, no por un
`espacioId` propio.

```mermaid
erDiagram
    ESPACIOS ||--o{ USERS : "contiene (solo Administrador/Tutor)"
    USERS ||--o{ COURSES : "tutorId (si es Tutor)"
    USERS ||--o{ COURSEUSERS : "inscripción (si es Estudiante)"
    COURSES ||--o{ COURSEUSERS : "inscritos"
    ESPACIOS {
        string id PK
        string nombre
        string estado "ACTIVO / INACTIVO"
    }
    USERS {
        string id PK
        string espacioId FK "NULL si rol = SUPERADMIN o ESTUDIANTE"
        string rol "SUPERADMIN / ADMINISTRADOR / TUTOR / ESTUDIANTE"
    }
    COURSES {
        string id PK
        string tutorId FK
    }
    COURSEUSERS {
        string courseId FK
        string userId FK "Estudiante"
    }
```

**Puntos clave de la migración (US24, `Backlog.md`):**

- `espacioId` en `Users` es **obligatorio solo para `ADMINISTRADOR` y `TUTOR`**; `SUPERADMIN` y
  `ESTUDIANTE` no lo tienen. `SUPERADMIN` opera sobre todos los espacios, pero solo para
  crearlos/listarlos/desactivarlos (US25, US27, US28) y para restablecer la contraseña de su
  Administrador principal (OP03) — nunca para leer datos internos de un espacio ajeno (cursos,
  contenido, progreso de estudiantes).
- El espacio de Fabio Aguirre se creó como registro por defecto en la misma migración que agregó la
  columna `espacioId`, y todos sus `Users` con rol `ADMINISTRADOR`/`TUTOR` (más sus `Courses`) se
  asociaron a él automáticamente, sin ninguna acción manual de su parte ni pérdida de datos. Los
  `Users` con rol `ESTUDIANTE` no necesitaron ningún cambio.
- Las consultas de Admin/Tutor (listado de tutores, de usuarios administrables, de cursos,
  dashboards) agregan `espacioId` a su `where`. El listado de Estudiantes que ve un Administrador/Tutor
  se filtra distinto: por inscripción real en un curso de ese espacio (`filtroUsuarioVisibleEnEspacio`
  en `lib/actions/`), nunca por un `espacioId` propio del Estudiante, que no existe — esto es
  intencional, no un descuido: confirmado explícitamente durante la revisión de código del 05/09/2026.
- Las páginas de Estudiante (`/estudiante`, `/estudiante/buscar`, dashboard de progreso) **no
  necesitaron ningún cambio**: ya filtraban todo por `inscritos: { some: { userId } }` (ver
  `app/estudiante/buscar/page.tsx`), que sigue siendo correcto sin importar de cuántos espacios
  distintos vengan esos cursos — confirmado en producción con Estudiantes reales inscritos en cursos
  de más de un espacio.
- Validado en navegador real: la sesión de un Administrador del espacio de prueba "Castellano" en
  `/admin/usuarios` el 02/09/2026 confirmó que solo ve su propia cuenta, ningún usuario de otros
  espacios; y pruebas unitarias dedicadas confirman que un Administrador/Tutor no puede leer ni
  escribir datos de otro espacio aunque conozca su ID directamente.

## Stack tecnológico

| Capa | Tecnología | Rol en el proyecto |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Server Components para lectura, Server Actions para escritura — sin API REST/GraphQL separada |
| Estilos / UI | Tailwind CSS v4, shadcn/ui (`base-vega`), lucide-react | Sistema de diseño con tokens de color (`app/globals.css`) y componentes reutilizables (`components/ui/*`); paleta de acentos adicional "estilo Duolingo" (verde/azul/naranja/dorado) usada en el panel del Estudiante desde el rediseño del 04/09/2026 |
| Animación / gamificación | `canvas-confetti` | Confeti al completar un curso por primera vez, en el panel del Estudiante (rediseño del 04/09/2026) |
| Validación | Zod | Valida los datos de entrada de cada Server Action antes de tocar la base de datos |
| Datos | PostgreSQL (Supabase), Prisma ORM | Prisma define el esquema (`prisma/schema.prisma`) y genera el cliente tipado; las migraciones versionan cada cambio de esquema, incluida la de `Espacios`/`SUPERADMIN` de la épica Multi-docente |
| Autenticación | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | Login, sesión, y alta/baja de usuarios vía Admin API (`service_role`, solo en servidor) |
| Almacenamiento de archivos | Supabase Storage | Bucket privado `documentos`, con URLs de descarga firmadas y de corta duración |
| Pruebas | Vitest | Pruebas unitarias de Server Actions, funciones puras y páginas (mockeando Prisma/Supabase) |
| Calidad de código | ESLint 9, TypeScript (`tsc --noEmit`) | Corridos en cada Pull Request vía CI; desde el 05/09/2026 se suma una revisión periódica de duplicación de código (ver `Herramientas_y_Metodologia.md`) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) | Lint + revisión de tipos + pruebas + build en cada Pull Request y push a `main` |
| Despliegue | Vercel | **Conectado desde el 31/08/2026** — despliegue automático desde `main`, con previews por Pull Request |
| Control de versiones | Git + GitHub | Un commit por historia/cambio, con mensajes descriptivos; ver `Herramientas_y_Metodologia.md` |
