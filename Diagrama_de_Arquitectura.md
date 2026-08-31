# Diagrama de Arquitectura — Plataforma Educativa LMS

> Modelo C4 (Contexto y Contenedores, con un nivel adicional de Componentes principales), flujo de
> datos de los dos recorridos más representativos, y stack tecnológico. Los diagramas usan sintaxis
> de flowchart de Mermaid en vez del tipo `C4Context`/`C4Container` nativo de Mermaid porque ese tipo
> todavía no renderiza de forma confiable en la vista de GitHub — esta versión sí se ve correctamente
> ahí y en cualquier visor de Markdown compatible con Mermaid.

## Nivel 1 — Diagrama de Contexto

Quién usa la plataforma y con qué sistemas externos habla.

```mermaid
flowchart TB
    Admin["👤 Administrador<br/>gestiona tutores y usuarios"]
    Tutor["👤 Tutor<br/>publica cursos y contenido"]
    Estudiante["👤 Estudiante<br/>consume cursos y ve su progreso"]

    subgraph Sistema["Plataforma Educativa LMS"]
        LMS["Aplicación web Next.js<br/>(este proyecto)"]
    end

    Auth["Supabase Auth<br/>(sistema externo)"]
    DB["Supabase Postgres<br/>(sistema externo)"]
    Storage["Supabase Storage<br/>(sistema externo)"]
    YouTube["YouTube<br/>(sistema externo, embebido)"]

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

    subgraph Vercel["Vercel (despliegue — pendiente de conectar)"]
        subgraph NextApp["Aplicación Next.js 16 (App Router)"]
            Middleware["Middleware<br/>refresca sesión, protege rutas sin sesión"]
            Pages["Server Components<br/>páginas por rol (/admin, /tutor, /estudiante)"]
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
    Repo -.->|"despliegue automático (pendiente)"| Vercel
```

## Nivel 3 — Componentes principales (dentro de la aplicación Next.js)

Cómo se organiza el código fuente por responsabilidad.

```mermaid
flowchart TB
    subgraph app["app/ — rutas y páginas (Server Components)"]
        LoginPage["/login"]
        AdminPages["/admin, /admin/usuarios, /admin/tutores"]
        TutorPages["/tutor, /tutor/cursos, /tutor/estudiantes"]
        EstudiantePages["/estudiante, /estudiante/cursos, /estudiante/buscar"]
        DashboardDispatch["/dashboard<br/>despachador único por rol"]
    end

    subgraph lib["lib/ — lógica de negocio"]
        LibActions["actions/*.ts<br/>Server Actions (mutaciones)"]
        LibSupabase["supabase/*.ts<br/>clientes: browser, server, admin, storage, sync-user"]
        LibPrisma["prisma.ts<br/>cliente Prisma singleton"]
        LibPuras["course-progress.ts, course-status.ts,<br/>search.ts, admin-stats.ts<br/>(funciones puras, con pruebas unitarias)"]
    end

    subgraph componentes["components/ — UI reutilizable"]
        UIBase["ui/*.tsx<br/>Button, Card, Input, Label, Badge (shadcn)"]
        SiteHeader["site-header.tsx, logout-button.tsx<br/>navegación y sesión"]
        Formularios["*-form.tsx<br/>formularios conectados a Server Actions"]
        ContentUI["youtube-embed, markdown-content,<br/>document-content-list, mark-content-viewed-button"]
    end

    Middleware["middleware.ts<br/>protección de rutas a nivel de edge"]

    app --> lib
    app --> componentes
    componentes --> LibActions
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
    DB-->>Dash: usuario (rol, estado)
    alt estado distinto de ACTIVO
        Dash-->>U: redirect a /login?error=cuenta_desactivada
    else usuario activo
        Dash-->>U: redirect a /admin, /tutor o /estudiante según el rol
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

## Stack tecnológico

| Capa | Tecnología | Rol en el proyecto |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Server Components para lectura, Server Actions para escritura — sin API REST/GraphQL separada |
| Estilos / UI | Tailwind CSS v4, shadcn/ui (`base-vega`), lucide-react | Sistema de diseño con tokens de color (`app/globals.css`) y componentes reutilizables (`components/ui/*`) |
| Validación | Zod | Valida los datos de entrada de cada Server Action antes de tocar la base de datos |
| Datos | PostgreSQL (Supabase), Prisma ORM | Prisma define el esquema (`prisma/schema.prisma`) y genera el cliente tipado; las migraciones versionan cada cambio de esquema |
| Autenticación | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | Login, sesión, y alta/baja de usuarios vía Admin API (`service_role`, solo en servidor) |
| Almacenamiento de archivos | Supabase Storage | Bucket privado `documentos`, con URLs de descarga firmadas y de corta duración |
| Pruebas | Vitest | Pruebas unitarias de Server Actions, funciones puras y páginas (mockeando Prisma/Supabase) |
| Calidad de código | ESLint 9, TypeScript (`tsc --noEmit`) | Corridos en cada Pull Request vía CI |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) | Lint + revisión de tipos + pruebas + build en cada Pull Request y push a `main` |
| Despliegue | Vercel (pendiente de conectar) | Despliegue automático desde `main`, con previews por Pull Request |
| Control de versiones | Git + GitHub | Un commit por historia/cambio, con mensajes descriptivos; ver `Herramientas_y_Metodologia.md` |
