# Guion para teleprompter — Presentación de la Plataforma LMS

> Cómo usar este documento: cada bloque tiene primero la acción en pantalla (🎬, no se lee en voz alta) y después el texto exacto a leer (🎤, en cursiva, entre comillas). Léelo tal cual, a tu ritmo natural — no tienes que ir rápido para que quepa en 5 minutos, los tiempos ya están pensados con pausas para hacer clic. Practica una vez en voz alta antes de grabar.

---

## BLOQUE 1 — Apertura (0:00 – 0:30)

🎬 Pantalla: `/login`, sin haber iniciado sesión todavía.

🎤 *"Hola, mi nombre es Fabio Andrés Aguirre y soy el docente y desarrollador de este proyecto: una plataforma educativa propia, tipo LMS, para publicar y organizar el contenido de mis clases de tecnología. En este video les voy a mostrar las funcionalidades que ya están construidas y funcionando, cómo se usan desde los distintos roles de la plataforma, y hacia dónde va el proyecto de aquí en adelante."*

---

## BLOQUE 2 — El problema y el objetivo (0:30 – 1:10)

🎬 Puedes quedarte en la pantalla de login o mostrar brevemente la página pública, mientras hablas.

🎤 *"El problema que quería resolver es simple: hoy el contenido de mis clases queda repartido entre correo, chats y discos compartidos, y no hay un lugar único donde un estudiante pueda ver en qué cursos está inscrito, su contenido y su avance, ni donde yo como docente pueda ver quién realmente está usando el material sin tener que preguntar uno por uno."*

🎤 *"Por eso construí esta plataforma: un espacio propio, simple, con tres roles bien definidos — Administrador, Tutor y Estudiante — y con trazabilidad real del progreso de cada estudiante, sin la complejidad ni el costo de un LMS institucional grande."*

---

## BLOQUE 3 — Mapa de roles (1:10 – 1:40)

🎬 Puedes mostrar una transición o quedarte en una pantalla neutra.

🎤 *"Antes de entrar a la demostración, les cuento rápido los tres roles principales. El Administrador da de alta a los tutores y supervisa los usuarios de la plataforma. El Tutor, que es mi rol principal como docente, crea los cursos, publica el contenido, lo organiza y hace seguimiento a los avances. Y el Estudiante consume ese contenido, ve su progreso y puede buscar cursos. También existe un rol de Super Administrador, pensado para cuando la plataforma tenga más de un docente — a eso vuelvo más adelante."*

---

## BLOQUE 4 — Demo como Tutor (1:40 – 2:50)

🎬 Inicia sesión como Tutor → entra a `/tutor/cursos` → abre el detalle de un curso ya armado con contenido y secciones.

🎤 *"Ahora les muestro la plataforma como Tutor, que es el rol que más uso. Aquí estoy dentro de uno de mis cursos."*

🎬 Señala el selector de estado del curso (Borrador/Publicado/Archivado).

🎤 *"Puedo cambiar el estado del curso — borrador, publicado o archivado — sin tener que volver a llenar el título, la descripción ni la imagen otra vez."*

🎬 Despliega y cierra una sección; señala la insignia de "Semana actual" y la de "No disponible".

🎤 *"El contenido del curso está organizado en secciones plegables, cada una con su propio estado. Puedo marcar cuál es la semana actual, y también puedo dejar una sección como no disponible mientras no esté lista, sin tener que borrar nada."*

🎬 Muestra brevemente los tres tipos de contenido ya publicados: video de YouTube, texto en Markdown, documento descargable.

🎤 *"Puedo publicar tres tipos de contenido: video de YouTube embebido, texto con formato, y documentos descargables como PDF o Word."*

🎬 Haz clic en el botón "Editar" de un contenido ya publicado.

🎤 *"Y algo que agregué hace poco: ahora puedo editar un contenido que ya publiqué —el título, la descripción, y el video, el texto o el documento en sí— sin tener que borrarlo y crearlo de nuevo desde cero."*

🎬 Muestra el listado de estudiantes inscritos y el formulario para asignar uno nuevo.

🎤 *"Por último, desde aquí también asigno qué estudiantes tienen acceso a cada curso, y puedo ver el listado de los que ya están inscritos."*

---

## BLOQUE 5 — Demo como Estudiante (2:50 – 3:40)

🎬 Cambia de sesión a una cuenta de Estudiante → entra a "Mis cursos".

🎤 *"Ahora les muestro la misma plataforma desde el lado del Estudiante. Aquí veo el listado de los cursos en los que estoy inscrito, con mi porcentaje de avance en cada uno."*

🎬 Entra a un curso; muestra que la sección "no disponible" no aparece y la semana actual está abierta por defecto.

🎤 *"Al entrar a un curso, las secciones que el tutor marcó como no disponibles simplemente no aparecen, y la semana actual se abre expandida automáticamente, para que el estudiante sepa por dónde empezar."*

🎬 Reproduce un video o abre un documento; haz clic en "Marcar como visto".

🎤 *"Puedo ver el video, leer el contenido o descargar el documento, y cuando termino, marco el contenido como visto. Esa acción es manual, a propósito, para que el progreso refleje un consumo real y no solo que abrí la página."*

🎬 (Opcional, si el tiempo alcanza) Muestra la búsqueda de cursos o contenido.

🎤 *"También puedo buscar cursos o contenido por palabra clave. Y algo importante: mi cuenta de estudiante es única — si en el futuro tomo cursos de otro docente en esta misma plataforma, no necesito crear una cuenta nueva."*

---

## BLOQUE 6 — Administrador y Super Administrador (3:40 – 4:00)

🎬 Puedes mostrar brevemente `/admin/usuarios` o simplemente hablar sobre una pantalla neutra.

🎤 *"También existe un rol de Administrador, que da de alta tutores y gestiona usuarios — incluyendo restablecer contraseñas, algo útil porque muchos de mis estudiantes son menores y olvidan su clave con facilidad. Y ya está construida la base de un rol Super Administrador, que permitiría administrar varios espacios de distintos docentes dentro de la misma plataforma. Vuelvo sobre esto en un momento."*

---

## BLOQUE 7 — Metodología y dificultades técnicas (4:00 – 4:30)

🎬 Pantalla neutra, o si quieres, el tablero de GitHub/backlog.

🎤 *"Todo este desarrollo lo llevé con metodología ágil: un backlog priorizado con historias de usuario y criterios de aceptación, organizado en sprints con objetivos medibles, y cada cambio pasa por integración continua —pruebas automatizadas y revisión de código— antes de desplegarse."*

🎤 *"En el camino tuve retos técnicos reales. Uno de los más importantes fue sincronizar cada usuario nuevo con el sistema de autenticación de forma segura: si algo falla a mitad de camino, no puede quedar un usuario a medio crear, que exista en la base de datos pero no pueda iniciar sesión. Otro fue diseñar el aislamiento de datos entre distintos docentes sin duplicar las cuentas de los estudiantes, que sí deben ser compartidas."*

---

## BLOQUE 8 — Hacia dónde va el proyecto (4:30 – 4:55)

🎤 *"De cara a lo que sigue, ya tengo construida y validada la base técnica para que varios docentes tengan su propio espacio dentro de la plataforma; el siguiente paso es darle acceso a un segundo docente real. También quiero poder cargar el listado de estudiantes directamente desde el archivo de Excel o PDF que ya entrega el colegio, en vez de crear cada cuenta una por una. Y a futuro, sumar calificaciones numéricas de actividades evaluables, además del seguimiento de avance que ya existe hoy."*

---

## BLOQUE 9 — Cierre (4:55 – 5:00)

🎤 *"Muchas gracias por su atención. Este es el estado actual del proyecto: un producto mínimo viable completo y ya en uso real, con una hoja de ruta clara para seguir creciendo."*

---

## Notas finales

- Las frases están escritas para sonar naturales al leerlas en voz alta — si alguna te resulta incómoda con tu forma de hablar, cámbiala por tus propias palabras, pero conserva la idea de cada una: no te saltes ningún bloque completo.
- Si te quedas corto de tiempo, el bloque más recortable es el 6 (Administrador/Super Administrador) — puedes resumirlo en una sola frase.
- Si te sobra tiempo, es buen lugar para extender el Bloque 4 (Tutor) mostrando la creación de una sección o de un contenido nuevo en vivo, en vez de solo uno ya existente.
