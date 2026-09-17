# Guion para el video de presentación — Plataforma LMS

> Duración objetivo: ~5 minutos. Pensado para grabarse con captura de pantalla + tu voz en off. Los tiempos son aproximados — ajústalos sobre la marcha, lo importante es no saltarte ninguna sección.

## Antes de grabar — checklist rápido

- Ten sesión iniciada en tres pestañas o ten a la mano las tres cuentas: Tutor (la tuya), un Estudiante de prueba, y si quieres mostrar multi-docente, también un Administrador.
- Ten un curso ya con contenido variado (video, texto, documento) y al menos dos secciones (una "Disponible" y una marcada como "Semana actual") para no perder tiempo creando todo en vivo.
- Cierra pestañas y notificaciones que no quieras que salgan en pantalla.
- Ensaya una vez sin grabar — 5 minutos se pasan rápido y es fácil quedarse corto de tiempo en la demo si te explayas mucho en la introducción.

---

## 0:00 – 0:30 — Apertura: quién eres y qué vas a mostrar

**Pantalla inicial recomendada:** la pantalla de login de la plataforma (`/login`), limpia, antes de iniciar sesión con ningún rol todavía. Es la puerta de entrada y deja claro desde el segundo 1 que es una aplicación real, con su propio dominio, no una maqueta.

**Qué decir:**
- Preséntate: nombre y que eres el docente/desarrollador del proyecto.
- Nombra el proyecto: una plataforma educativa tipo LMS (Learning Management System), propia, para publicar tus clases de tecnología.
- Una frase de qué vas a mostrar en el video: "les voy a mostrar las funcionalidades ya construidas, cómo se usan desde los distintos roles, y para dónde va el proyecto de acá en adelante".

**No olvides mencionar:** el nombre de la plataforma/URL si ya tiene un dominio propio en Vercel — refuerza que está desplegada de verdad, no corriendo solo en tu computador.

---

## 0:30 – 1:10 — El problema y el objetivo (contexto)

**Qué decir (basado en tu documento de descripción del proyecto):**
- El problema real: hoy el contenido de clase se reparte entre correo, chats y discos compartidos — no hay un lugar único donde el estudiante vea sus cursos y su avance, ni donde tú como docente puedas ver quién realmente está usando el material.
- La referencia de inspiración: sitios como areatecnologia.com para el contenido, y LMS institucionales (mencionas Canvas si quieres) para la experiencia de curso.
- El objetivo en una frase: una plataforma simple, propia, con roles definidos (Administrador, Tutor, Estudiante) y trazabilidad real del progreso — sin la complejidad ni el costo de un LMS institucional grande.

**Para qué se está desarrollando (no lo des por sobreentendido, dilo explícito):** es tu Proyecto Integrador 2, pero también es una herramienta que ya piensas usar en tus propias clases, y a futuro abrirla a otros docentes.

---

## 1:10 – 1:40 — Recorrido rápido de roles (mapa mental antes de la demo)

**Qué decir:** enumera los tres roles principales y qué hace cada uno en una frase, para que quien vea el video entienda el mapa antes de que empieces a hacer clic:
- **Administrador:** da de alta tutores y supervisa usuarios.
- **Tutor (docente):** crea cursos, publica contenido, organiza en secciones, ve avances.
- **Estudiante:** consume el contenido, ve su progreso, busca cursos.

Si quieres mencionar el rol de **Super Administrador** (multi-docente), es el momento de nombrarlo en una frase — lo retomas más adelante en "próximos pasos".

---

## 1:40 – 2:50 — Demo como Tutor (el bloque más largo, es tu rol principal)

**Pantalla:** inicia sesión como Tutor, entra a `/tutor/cursos` y abre el detalle de un curso ya armado.

**Qué mostrar y decir, en este orden:**
1. **Listado y detalle de curso:** entra al curso, muestra el título/descripción y el selector de estado (Borrador/Publicado/Archivado) — explica en una frase que puedes publicarlo cuando esté listo sin tener que volver a llenar el formulario completo.
2. **Secciones plegables:** abre y cierra una sección, señala la insignia de "Semana actual" y la de "No disponible" — explica que esto reemplaza una lista plana larga por bloques organizados, inspirado en LMS tipo Canvas.
3. **Publicar contenido:** muestra rápidamente los tres tipos (video de YouTube embebido, texto con formato Markdown, documento descargable) — no necesitas crear uno en vivo si ya tienes ejemplos, con mostrar que existen los tres botones y abrir uno ya publicado alcanza.
4. **Editar contenido ya publicado:** esta es una funcionalidad reciente y vale la pena resaltarla — abre el botón "Editar" de un contenido, muestra que puedes corregir título, descripción y el cuerpo (video/texto/documento) sin borrar y volver a crear.
5. **Asignar estudiantes y ver inscritos:** muestra el listado de estudiantes inscritos y el formulario para asignar uno nuevo.

**No olvides decir:** que el orden y la visibilidad de cada contenido y sección se pueden ajustar manualmente (flechas de mover, ocultar/mostrar) — es control fino para ti como docente.

---

## 2:50 – 3:40 — Demo como Estudiante

**Pantalla:** cambia de sesión (o pestaña) a una cuenta de Estudiante, entra a "Mis cursos".

**Qué mostrar y decir:**
- El listado de cursos en los que está inscrito, con su indicador de progreso por curso.
- Entra a un curso: muestra cómo las secciones "No disponibles" no aparecen, y la semana actual se abre expandida por defecto.
- Reproduce un video embebido o abre un documento, y marca un contenido como "visto" — señala que el progreso se actualiza con esa acción manual (no automática al solo abrir la página, para que sea un dato real de consumo).
- Si el tiempo alcanza, muestra la búsqueda de cursos/contenido por palabra clave.

**No olvides mencionar:** que la cuenta de Estudiante es única y compartida — un mismo estudiante puede tener cursos de más de un docente sin crear una cuenta nueva por cada uno. Esto conecta directo con lo que vas a contar de multi-docente más adelante.

---

## 3:40 – 4:00 — Vistazo breve a Administrador / Super Administrador (opcional, si el tiempo alcanza)

**Qué decir en 15-20 segundos:** que existe un rol Administrador para dar de alta tutores y gestionar usuarios (incluyendo restablecer contraseñas — útil porque muchos estudiantes son menores y olvidan su clave), y que ya existe la base de un rol Super Administrador para administrar varios "espacios" de distintos docentes en la misma plataforma. No profundices en la demo aquí — es más para nombrarlo, lo desarrollas en "próximos pasos".

---

## 4:00 – 4:30 — Metodología y dificultades técnicas

**Qué decir sobre metodología (rápido, una frase por punto):**
- Trabajaste con backlog priorizado (MoSCoW), historias de usuario con criterios de aceptación, y sprints cerrados con objetivos SMART verificables.
- Cada entrega pasa por CI (lint, chequeo de tipos, pruebas automatizadas) antes de llegar a producción, y el despliegue a Vercel es automático en cada cambio.

**Dificultades técnicas reales que puedes contar (elige 1-2, no las cuentes todas o se alarga demasiado):**
- Sincronizar cada usuario nuevo con el sistema de autenticación (Supabase Auth) de forma transaccional — si algo falla a mitad de camino, no debe quedar un usuario "fantasma" que existe en la base de datos pero no puede iniciar sesión.
- Diseñar el aislamiento de datos entre docentes (multi-tenant) sin duplicar las cuentas de estudiantes, que sí deben ser compartidas entre espacios.
- Ajustes de rendimiento reales detectados al usar la plataforma (por ejemplo, una acción que se sentía lenta porque hacía más consultas a la base de datos de las necesarias) — muestra que no solo construyes, también mides y corriges.

---

## 4:30 – 4:55 — Próximas funcionalidades y posibilidades a corto plazo

**Qué decir (esto es lo que un evaluador quiere escuchar: que el proyecto tiene rumbo claro, no que ya "se acabó"):**
- **Multi-docente real:** la base técnica para que varios profesores tengan su propio espacio ya está construida y validada; el siguiente paso es dar de alta al segundo docente real, no solo un espacio de prueba.
- **Carga masiva de estudiantes:** importar el listado de estudiantes directamente desde el archivo Excel o PDF que ya entrega el colegio, en vez de crear cada cuenta una por una.
- **Calificaciones de actividades evaluables:** hoy el seguimiento es de progreso/avance, no de notas numéricas — es un paso natural siguiente si se quiere usar la plataforma para evaluar formalmente.
- Si quieres cerrar con una visión más amplia: mencionar que la meta de fondo es que cualquier docente pueda programar sus propios cursos sin depender de ti para configurarlos.

---

## 4:55 – 5:00 — Cierre

**Qué decir:** una frase de cierre corta agradeciendo, y reafirmando el estado real del proyecto: MVP completo, funcionalidades ya validadas en uso real, y una hoja de ruta clara para lo que sigue. Evita alargarte — un cierre de una sola frase se siente más profesional que repetir todo lo ya dicho.

---

## Resumen de lo que NO debes olvidar decir en algún punto del video

- Para quién y por qué se construyó (contexto real, no solo "es un proyecto de universidad").
- Los tres roles y qué hace cada uno.
- Al menos una funcionalidad reciente (edición de contenido o secciones) para mostrar que el proyecto sigue evolucionando, no que quedó congelado en el MVP inicial.
- Que hay metodología ágil real detrás (backlog, sprints, CI/CD) — es justo lo que pide la rúbrica del curso.
- Al menos una dificultad técnica real y cómo la resolviste — muestra criterio, no solo ejecución.
- Hacia dónde va el proyecto (multi-docente, carga masiva, calificaciones).
