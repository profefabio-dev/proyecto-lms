# Dirección de diseño — Plataforma Educativa LMS (Docente Fabio Andrés Aguirre)

> Escrito el 21/11/2026, después de que el docente comparara la plataforma con Platzi y dijera que
> todavía no se veía "fresco, moderno y profesional". Este archivo es la **decisión de diseño**, no una
> descripción de lo que hay: cuando una pantalla no coincida con lo que dice acá, lo que está mal es la
> pantalla. Vive junto al resto de la documentación ágil (`Backlog.md`, `progress.md`,
> `Diagrama_de_Arquitectura.md`).

## El diagnóstico que lo origina

La plataforma no se veía amateur por una decisión mala, sino porque **convivían tres sistemas visuales
distintos**, cada uno correcto por separado:

1. La gamificación "estilo Duolingo" (04/09/2026): cuatro colores de acento vivos y botones 3D.
2. El menú lateral oscuro "estilo Canvas" (08/09/2026).
3. El rediseño de Antigravity (noviembre): tarjetas con degradado en cada cabecera.

Medido en el código del 21/11/2026, antes de esta pasada: **86 usos** de los cuatro colores `duo-*`
encima del índigo de marca y del verde de éxito (seis acentos compitiendo), **13 archivos** con
degradados, y **seis radios distintos** mezclados (`rounded-md`, `lg`, `xl`, `2xl`, `3xl`, `full`).
Nada se veía emparentado con nada.

La referencia que trajo el docente (Platzi) no se ve profesional por tener más diseño, sino por tener
menos: un solo acento, fondo casi neutro, sin degradados ni sombras, dos niveles de tipografía y mucho
aire. El color lo ponen las portadas de los cursos, no la interfaz.

## Las cinco reglas

1. **Un solo color de acento: el índigo.** Se conserva el que ya era el color primario de la
   plataforma — continuidad para quienes ya la usan, y distancia deliberada del verde de Platzi. Los
   cuatro colores `duo-*` dejan de usarse para clasificar; sobreviven solo como colores de
   celebración (racha, confeti) y de ilustración.
2. **Lo que se debe distinguir se distingue por luminosidad, no por tono.** Una lección completada
   queda apagada con su visto bueno; la siguiente, destacada con el acento. Además de verse más
   ordenado, funciona para alguien daltónico (el proyecto es para estudiantes de 10 a 18 años, donde
   un daltónico por aula es lo normal).
3. **El tipo de contenido lo dice el ícono, no el color.** Video, lectura, documento, enlace y código
   comparten chip; cambia el ícono. Antes eran cuatro colores peleando con el acento.
4. **Una sola decoración por elemento.** Borde *o* fondo distinto *o* sombra — nunca las tres encima
   de la misma tarjeta, y ningún degradado en la interfaz. En fondo oscuro la separación entre
   superficies la hace la diferencia de tono; las sombras no se ven.
5. **Dos niveles de tipografía y mucho aire.** Un título grande y todo lo demás pequeño y apagado,
   con etiquetas en mayúscula pequeña. 40 px entre secciones.

## Base: oscuro

Elegida por el docente el 21/11/2026 viendo las dos versiones de la misma pantalla lado a lado.

**Lo que se ganó:** el contenido resalta y la plataforma se siente de producto, no de plantilla.
**Lo que cuesta, y queda anotado:** se lee peor con luz fuerte encima o en proyector, que es una
situación real en un aula de colegio, y los pantallazos para la entrega impresa quedan pesados. Si eso
llega a molestar, el camino no es volver atrás sino terminar el tema claro y dejar que el estudiante
elija — los dos juegos de tokens ya existen.

Los tokens oscuros vivían en `app/globals.css` bajo `.dark` desde agosto **y nunca se aplicaron**:
ningún elemento llevaba esa clase. `app/layout.tsx` ahora se la pone al `<html>`, y por eso el cambio
se propaga a toda la plataforma sin tocar un solo componente.

| Token | Papel |
|---|---|
| `--sidebar` | Más oscuro que el fondo. Mantiene el menú como franja aparte ahora que todo es oscuro. |
| `--background` | Casi negro, apenas azulado. El lienzo. |
| `--card` | Un escalón más claro. Toda superficie elevada. |
| `--border` | Apenas visible. Separa sin dibujar. |
| `--primary` | Índigo, subido de luminosidad respecto al tema claro para alcanzar contraste de texto. |
| `--muted-foreground` | Texto secundario. Todo lo que no es el dato principal. |

## Escala

- **Tipografía:** título de pantalla 34px/700 · título de sección 21px/700 · título de fila 15.5px/600
  · cuerpo 15px · meta y etiquetas 11.5–13px, en `--muted-foreground`, las etiquetas en mayúscula con
  `letter-spacing: 0.05em`. Nada entre medio: si hace falta un tamaño nuevo, casi siempre el problema
  es la jerarquía, no la escala.
- **Espacio:** 40px entre secciones · 24px dentro de una tarjeta · 10px entre filas de una lista.
- **Radio:** 12px (`rounded-2xl`, el más usado hoy) para todo, y `rounded-full` solo para píldoras y
  avatares. Los demás radios se van retirando.
- **Altura mínima de un control táctil:** 44px, como ya exige la variante `touch:` desde el 12/11.

## Implementado (25/11/2026) — Rediseño integral: Platzi + Canvas LMS

> Esta sección la escribió Antigravity el 25/11/2026, junto con el rediseño que describe. Se
> conserva tal cual quedó; lo que viene después de ella es la revisión del 26/11: qué se midió, qué
> se arregló y qué contradice las reglas de arriba.

A pedido del docente, se realizó una modernización completa de la interfaz con foco en estudiantes jóvenes (10 a 18 años), tomando los mejores patrones de **Platzi** (agilidad, enfoque en seguir aprendiendo y dinamismo) y **Canvas LMS** (estructura clara, agenda de tareas pendientes y navegación predecible):

1. **Dashboard de Estudiante (`/estudiante`):**
   - **Layout en 2 Columnas:** Columna principal (70%) dedicada al contenido y cursos activos; columna lateral derecha (30%) con la agenda académica del estudiante.
   - **Tarjeta "Continuar donde lo dejaste" (Platzi):** Ya no muestra un curso abstracto; identifica la lección específica pendiente con su número, título, ícono de formato (Video ▶️, Lectura 📄, Código 💻), porcentaje y botón de acción directa.
   - **Columna Lateral "Por Hacer / Tu Agenda" (Canvas To-Do):** Widget de entregas pendientes ordenadas por urgencia (*"Vence hoy"*, *"Vence mañana"*, *"Vence en X días"*), avisos recientes del docente con extracto, y notas recientes con retroalimentación textual.
   - **Catálogo de Mis Cursos:** Pestañas de filtrado (*Todos*, *En curso*, *Completados*) y buscador reactivo en vivo.

2. **Landing Page Pública (`/`):**
   - **Hero Moderno:** Orientado a proyectos prácticos STEAM, con píldoras de tecnologías (`⚡ React & Web`, `🤖 Robótica`, `💡 Algoritmos`, `🗄️ SQL`).
   - **Tarjeta Interactiva:** Simulación del panel estudiantil con progreso curricular, racha de 5 días e insignias.
   - **Trayectoria Formativa:** 3 pasos visuales (*Lógica ➔ Código ➔ Robótica*).
   - **Catálogo Interactivo (`LandingCoursesCatalog`):** Chips de categorías por píldoras, buscador instantáneo por tema y tarjetas con gradientes modernos.

3. **Temario del Curso (`/estudiante/cursos/[courseId]`):**
   - **Módulos / Semanas en Acordeones Plegables (Canvas Modules):** La semana actual viene desplegada por defecto; botones de *"Expandir todos"* y *"Colapsar todos"*; badge de lecciones completadas por módulo.

4. **Reproductor de Lecciones (`/estudiante/cursos/[courseId]/lecciones/[contenidoId]`):**
   - **Modo Enfoque / Modo Cine (Platzi):** Botón para ocultar/mostrar el temario lateral en un clic, centrando el video o texto a pantalla completa.
   - **Barra Inferior Flotante Sticky (Dock de Navegación):** Barra fija inferior con efecto glassmorphic (`backdrop-blur`) para marcar como completada y avanzar en cualquier momento del scroll.
   - **Celebración 100%:** Ráfaga de confeti animado (`canvas-confetti`) y banner de felicitación al completar el curso.

## Medido el 26/11/2026, después del rediseño

Al agregar la sección de arriba **se borró la lista de pendientes que este archivo traía**: los seis
radios por unificar, el barrido de los `duo-*` y la capa "para niños". Ninguno de los tres se hizo,
así que vuelven abajo, con la medición de hoy al lado de la del 21/11:

| Qué | 21/11/2026 | 26/11/2026 |
|---|---|---|
| Usos de los cuatro colores `duo-*` | 86 | **45** |
| Archivos con degradado | 13 | **7** |
| Radios distintos en uso | 6 | **6** (115 `2xl`, 83 `xl`, 60 `md`, 45 `full`, 32 `lg`, 23 `3xl`) |

**Los `duo-*` bajaron casi a la mitad sin que nadie hiciera el barrido**: el rediseño reescribió
pantallas enteras y se los llevó de paso. Los radios siguen igual que el 21/11.

Y hay dos cosas que **contradicen las reglas de este archivo**. Conviene resolverlas a conciencia en
vez de dejar que convivan, porque convivir es exactamente el problema que originó OP09:

- **La regla 4 dice "ningún degradado en la interfaz"** y el rediseño agrega degradados en siete
  archivos: la portada pública, el login, el panel del Estudiante, el quiz, las tarjetas de curso y
  el catálogo de la portada — que la propia descripción de arriba llama *"tarjetas con gradientes
  modernos"*.
- **La regla 1 reserva el color para el acento y el logro**, y la portada nueva usa **emoji de
  color** como clasificador de tema (React, Robótica, Algoritmos, SQL). Son nueve emoji en cinco
  archivos, en un proyecto que hasta ahora usaba iconos de `lucide-react` en todas las pantallas.
  Clasificar por emoji cumple la misma función que cumplían los colores `duo-*` que OP09 retiró.

**No se corrigió ninguna de las dos, porque no son un error de código sino una decisión de diseño
que le toca al docente.** Y hay un argumento razonable a favor de los degradados: la portada pública
y el login **quedaron fuera de OP09 a propósito** —son escaparate, no interfaz de trabajo— y ahí un
degradado vende. Si eso es lo que se quiere, la salida correcta es **acotar la regla 4 a las
pantallas internas y escribirlo acá**, no dejar que el archivo diga una cosa y la pantalla otra. Lo
que sí queda abierto de verdad es el panel del Estudiante y el quiz, que son pantallas de trabajo
diario.

## Pendiente (en orden)

1. **Acotar o confirmar la regla 4** a la vista de los degradados nuevos, y decidir lo mismo sobre
   los emoji de la portada. Es una decisión del docente, no una corrección.
2. **Unificar los seis radios en 12px**, dejando `rounded-full` solo para píldoras y avatares.
3. **Terminar el retiro de los `duo-*`** en los 45 usos que quedan.
4. **La capa "para niños"** que el docente pidió — que **no** se hace con más colores en la interfaz
   (eso era justo lo que había antes de OP09), sino con imágenes, momentos de premio y forma/voz.
