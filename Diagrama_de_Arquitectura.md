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
        TutorPages["/tutor, /tutor/cursos, /tutor/estudiantes,<br/>/tutor/rutas (US44)"]
        EstudiantePages["/estudiante, /estudiante/cursos,<br/>/estudiante/cursos/[courseId]/lecciones (US43),<br/>/estudiante/rutas (US44), /estudiante/notas (US46),<br/>/estudiante/buscar"]
        DashboardDispatch["/dashboard<br/>despachador único por rol"]
    end

    subgraph lib["lib/ — lógica de negocio"]
        LibActions["actions/*.ts<br/>Server Actions (mutaciones): create-tutor, create-student,<br/>create-espacio, reset-user-password, reset-espacio-admin-password..."]
        LibAuth["auth/generar-password-temporal.ts<br/>helper compartido (antes copiado en 6 archivos)"]
        LibSupabase["supabase/*.ts<br/>clientes: browser, server, admin, storage, sync-user"]
        LibPrisma["prisma.ts<br/>cliente Prisma singleton"]
        LibContentIcon["content-type-icon.ts<br/>ícono/color por tipo de contenido (compartido)"]
        LibPuras["course-progress.ts, course-status.ts,<br/>course-lessons.ts (US43), route-progress.ts (US44),<br/>grades.ts (US46), code-content.ts (US45),<br/>search.ts, admin-stats.ts, streak.ts<br/>(funciones puras, con pruebas unitarias)"]
    end

    subgraph componentes["components/ — UI reutilizable"]
        UIBase["ui/*.tsx<br/>Button, Card, Input, Label, Badge, Progress, Avatar (shadcn)"]
        AppShell["app-shell.tsx, breadcrumbs.tsx, logout-button.tsx<br/>menú lateral, navegación y sesión"]
        Formularios["*-form.tsx<br/>formularios conectados a Server Actions"]
        ContentUI["content-body (cuerpo por tipo, US45),<br/>youtube-embed, markdown-content, document-content-list,<br/>lesson-row, lesson-curriculum, complete-lesson-button (US43)"]
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

### Un Estudiante completa una lección y pasa a la siguiente (US19 + US43)

> Reemplaza al flujo original de US19 ("Marcar como visto" sobre la página larga del curso): desde el
> 20/11/2026 el curso se recorre lección por lección y el mismo botón marca y avanza.
>
> Lo importante del diagrama está en el paso resaltado: **la lección destino la calcula el servidor**.
> Si viniera en el formulario, bastaría editarla para saltar a una lección de una sección que el Tutor
> no ha habilitado. Por eso `completarLeccion` reconstruye la secuencia accesible del curso con el
> mismo módulo que usan el temario y el reproductor (`lib/course-lessons.ts`) antes de redirigir.

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant Btn as CompleteLessonButton (cliente)
    participant Action as completarLeccion (Server Action)
    participant DB as Postgres (vía Prisma)

    E->>Btn: clic en "Completar y continuar"
    Btn->>Action: formAction(contentId)
    Action->>DB: valida sesión, rol Estudiante,<br/>contenido visible e inscripción
    alt no autorizado o inválido
        Action-->>Btn: { success: false, error }
        Btn-->>E: mensaje de error
    else válido
        Action->>DB: contentViews.createMany({ skipDuplicates: true })
        Action->>DB: contents + secciones del curso
        Action->>Action: filtrarContenidosAccesibles → ordenarLecciones<br/>→ ubicarLeccion = ¿cuál sigue?
        Note over Action: El destino NUNCA viene del formulario:<br/>así no se puede saltar por URL a una<br/>lección de una sección cerrada (US30).
        Action->>Action: revalidatePath("/estudiante" y curso)
        Action-->>E: redirect a la lección siguiente<br/>(o al temario, si era la última)
    end
```

### Un Estudiante se asocia a una ruta de aprendizaje (US44)

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant Btn as JoinRutaForm (cliente)
    participant Action as asociarseARuta (Server Action)
    participant DB as Postgres (vía Prisma)

    E->>Btn: clic en "Asociarme a esta ruta"
    Btn->>Action: formAction(rutaId)
    Action->>DB: valida sesión, rol Estudiante,<br/>matrícula activa y ruta PUBLICADA
    Action->>DB: rutaUsuarios.upsert (idempotente)
    Action->>DB: courseUsers.createMany(cursos PUBLICADOS,<br/>skipDuplicates)
    Note over Action,DB: El acceso al contenido sigue decidiéndose por<br/>CourseUsers, igual que cuando el Tutor asigna a<br/>mano (US26): la ruta no crea una segunda vía de<br/>permisos. skipDuplicates conserva inscripciones<br/>previas, con su avance, entregas y notas.
    Action-->>E: la ruta pasa a "Mis rutas" con su avance<br/>y sus cursos aparecen en "Mis cursos"
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

## Modelo de datos de las rutas de aprendizaje (US44, 20/11/2026)

```mermaid
erDiagram
    USERS ||--o{ RUTAS : "tutorId (si es Tutor)"
    RUTAS ||--o{ RUTACURSOS : "pasos del camino"
    COURSES ||--o{ RUTACURSOS : "puede estar en varias rutas"
    RUTAS ||--o{ RUTAUSUARIOS : "estudiantes asociados"
    USERS ||--o{ RUTAUSUARIOS : "rutas que recorre (si es Estudiante)"
    RUTAS ||--|| COURSEUSERS : "asociarse crea las inscripciones"
    RUTAS {
        string id PK
        string tutorId FK
        string estado "BORRADOR / PUBLICADA"
    }
    RUTACURSOS {
        string rutaId FK
        string courseId FK
        int orden "posición en el camino"
    }
    RUTAUSUARIOS {
        string rutaId FK
        string userId FK "Estudiante"
    }
```

**Puntos clave:**

- **`RutaCursos` es una tabla intermedia y no un `rutaId` en `Courses`:** un mismo curso puede servir
  en varias rutas (un curso de fundamentos aparece tanto en la ruta de programación como en la de
  robótica) y el `orden` pertenece a la relación, no al curso.
- **`RutaUsuarios` no otorga acceso al contenido; `CourseUsers` sí.** Asociarse a una ruta crea las
  filas de `CourseUsers` de sus cursos publicados, así que todo el control de acceso ya escrito (US11,
  US30, actividades, quizzes) sigue valiendo sin cambiarle una línea. Las dos tablas conviven con
  papeles distintos: una registra el camino, la otra el permiso.
- **El avance de la ruta no se guarda:** se calcula al vuelo cruzando `ContentViews` con las lecciones
  accesibles de sus cursos (`lib/route-progress.ts`), igual que el avance de un curso desde US19. No
  hay ningún porcentaje almacenado que pueda quedar desactualizado cuando el Tutor publique una
  lección nueva.
- **Las tres tablas nacen con Row Level Security activado** en la misma migración que las crea —
  `ruta_usuarios` relaciona cuentas de menores de edad con lo que están estudiando.

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
