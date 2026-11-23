# Una plataforma de clases hecha por un profesor, para profesores

**Propuesta de presentación · Noviembre de 2026**
Fabio Andrés Aguirre — docente de Tecnología e Informática

---

## En una página

Es un **LMS**: una plataforma donde un docente publica su curso, sus estudiantes lo recorren lección
por lección, presentan sus trabajos y ven sus notas; y donde el docente ve, en una sola pantalla,
quién va bien y quién se está quedando atrás.

No nació de un estudio de mercado. Nació de un problema concreto de aula: el material repartido entre
el correo, los grupos de WhatsApp y las memorias USB; el estudiante que falta un día y no sabe qué se
perdió; y el profesor que se entera de quién no estudió **el día de la evaluación**, que es cuando ya
no se puede hacer nada.

**Qué la distingue de las alternativas:**

| | |
|---|---|
| **La hizo quien la usa** | Cada decisión salió de dar clase, no de una lista de funciones. Si algo sobra, se quita. |
| **Pensada para menores** | Es un colegio: eso cambia cómo se guardan los datos, quién ve qué y qué pasa cuando un niño olvida su contraseña. |
| **El ciclo completo** | Publicar, entregar, calificar y que la nota le llegue al estudiante. No la mitad del camino. |
| **Material que circula** | Un profesor puede tomar el curso de un colega y quedarse con su propia copia para adaptarla. Nadie construye dos veces lo mismo. |
| **Sin instalar nada** | Funciona en el navegador, en el computador del colegio o en el celular del estudiante. |

---

## 1. El problema, tal como se vive

Un docente de colegio dicta a varios grupos a la vez. Cada grupo va a su ritmo. El material se
entrega por el canal que haya a mano y, a las dos semanas, nadie recuerda qué se envió a quién.

De ahí salen cuatro problemas que cualquier profesor reconoce:

**No hay un lugar único.** El estudiante que faltó pregunta a un compañero, que le reenvía un archivo
que ya no es el último. El profesor repite la misma explicación cinco veces por chat.

**No hay forma de saber quién está estudiando.** Se puede saber quién entregó, pero no quién abrió el
material. La primera señal real llega con la evaluación, cuando ya es tarde para intervenir.

**Calificar y devolver cuesta más que corregir.** Recoger los trabajos, anotarlos en una hoja aparte,
devolver el comentario a cada uno. El comentario es lo que más ayuda al estudiante y es justo lo que
primero se cae por falta de tiempo.

**Lo que un profesor construye se queda en su computador.** Horas preparando una guía que un colega
del mismo colegio está preparando otra vez, en paralelo, sin saberlo.

---

## 2. Qué resuelve, rol por rol

### Para el estudiante — que sepa siempre dónde está

**Entra y lo primero que ve es lo que le pasó desde la última vez:** qué le vence pronto y no ha
entregado, qué le calificaron, qué material nuevo hay. Lo que vence aparece de primero, porque es lo
único sobre lo que puede actuar hoy.

**"Reanudar clase" lo lleva a la lección exacta donde se quedó**, no a la portada del curso. Suena a
detalle y no lo es: es la diferencia entre volver a una clase y tener que buscar por dónde iba.

**Recorre el curso de a una lección**, con el temario al lado y "Lección 4 de 12" a la vista. Un botón
—*Completar y continuar*— marca la lección y avanza. El curso deja de ser una página larga que se lee
como un artículo y pasa a sentirse como un camino.

**Presenta sus trabajos ahí mismo**, escribiendo o adjuntando un archivo —incluida una foto del
cuaderno, que es como entrega un estudiante de bachillerato de verdad—. **Responde evaluaciones que se
califican solas** y ve el resultado al instante. **Y tiene todas sus notas en un solo lugar**, en la
escala de 1 a 5 que entiende él y entiende su familia, con el comentario del profesor al lado.

### Para el docente — que recupere el tiempo

**Arma el curso por semanas**, y deja cerradas las que todavía no tocan. Publica video, texto con
formato, documentos, enlaces a recursos externos y bloques de código. Puede ocultar, reordenar y
editar sin borrar y volver a crear.

**Ve el curso completo en una pantalla.** Cada estudiante con su avance real, sus entregas y su
promedio, **ordenados por quien va más atrasado**, que es a quien hay que mirar primero.

**Y tiene la planilla de notas completa**: una columna por actividad y por evaluación, una fila por
estudiante. De un vistazo sabe quién no entregó qué. Un guion es que no entregó; un color de aviso es
que la entrega está esperando *al profesor*; un número es la nota puesta. Desde el título de cada
columna entra directo a calificar.

**Califica con nota y comentario, y eso le llega al estudiante** a sus novedades. El círculo se cierra
dentro de la plataforma.

**Encadena cursos en rutas de aprendizaje**: varios cursos en orden, con un solo porcentaje de avance
de principio a fin. Un mismo curso puede estar en varias rutas.

**Carga sus listas de estudiantes desde el archivo del colegio** —el Excel o el PDF que ya entrega la
secretaría— en vez de crear las cuentas una por una, revisando antes en pantalla lo que se va a crear.

### Para la institución — control sin fricción

**Cada docente tiene su propio espacio**, con sus cursos y sus estudiantes, aislado del de los demás.
Un administrador da de alta docentes y gestiona usuarios; un rol por encima crea los espacios.

**Un estudiante es una sola cuenta**, aunque tenga clase con tres profesores distintos. No se le pide
registrarse de nuevo por cada uno.

**Y un estudiante que se retira no se borra: se desactiva.** Pierde el acceso de inmediato y su
historial queda intacto. Un colegio necesita las dos cosas a la vez.

---

## 3. Lo que un colegio debería preguntar antes de decir que sí

### ¿Qué pasa con los datos de menores de edad?

Es la pregunta correcta y aquí se tomó en serio desde el principio.

**El acceso se verifica en el servidor, no en el navegador.** Ocultar un botón no impide que alguien
reenvíe la petición a mano; por eso cada operación comprueba de nuevo quién la pide y si tiene
derecho. Un estudiante no puede abrir una lección de una semana que el profesor dejó cerrada, ni
entrando por la dirección directa.

**Las respuestas de un examen nunca llegan al navegador.** Lo fácil sería mandar las preguntas con sus
respuestas y comparar allí; entonces bastaría con abrir el código fuente de la página para ver el
examen resuelto. La calificación se hace en el servidor y al navegador solo viajan los textos de las
opciones. **Hay una prueba automática que verifica justamente eso en cada cambio**, para que si
alguien toca esa consulta dentro de seis meses, el sistema avise solo.

**Los archivos no son públicos.** Los documentos y las entregas se guardan en almacenamiento privado y
se sirven con enlaces temporales que caducan. Un enlace copiado no sirve mañana.

**Y las tablas no son consultables desde internet.** Todas tienen activado el control de acceso a
nivel de base de datos, de modo que no se pueden leer con la clave pública de la aplicación.

### ¿Y si un niño olvida su contraseña, que pasará siempre?

El docente o el administrador la restablecen y la plataforma genera una nueva, que se muestra una sola
vez. Nadie —ni el administrador— puede *ver* la contraseña de un estudiante, porque no se guarda en
texto legible. Restablecerla es la única vía posible, y así es como debe ser.

### ¿Se cae? ¿Quién la mantiene?

Está desplegada en servicios de nube profesionales, con copias de seguridad gestionadas. **Cada cambio
pasa por una batería de más de cuatrocientas pruebas automáticas** antes de llegar a producción: si
algo se rompe, no llega al aula. El sistema se actualiza sin que nadie tenga que instalar nada.

---

## 4. Con qué está construida

Tecnología actual y de uso extendido, elegida para que la plataforma siga siendo mantenible dentro de
cinco años:

| Capa | Herramienta | Por qué |
|---|---|---|
| Aplicación | **Next.js · React · TypeScript** | El estándar de la web moderna. Casi todo corre en el servidor: los permisos se verifican donde el usuario no los puede tocar. |
| Datos | **PostgreSQL** (en Supabase), vía **Prisma** | Base de datos relacional probada; el acceso escrito de forma que los errores se detectan al compilar, no en clase. |
| Identidad y archivos | **Supabase Auth · Storage** | Autenticación gestionada y almacenamiento privado con enlaces temporales. |
| Interfaz | **Tailwind CSS** | Interfaz consistente, en tema oscuro, que funciona igual en el computador del salón y en un celular. |
| Calidad | **Vitest · ESLint · GitHub Actions** | Más de 400 pruebas automáticas en cada cambio, antes de publicar. |
| Publicación | **Vercel** | Despliegue automático; sin servidores que administrar en el colegio. |

**Lo que de verdad importa de esta lista** no son los nombres, es una decisión: las comprobaciones de
seguridad viven en el servidor. Un sistema que decide los permisos en el navegador es un sistema que
confía en el navegador, y en un colegio el navegador lo controla un adolescente con tiempo libre.

---

## 5. En qué estado está hoy

No es una maqueta ni un prototipo. **Está construida, desplegada y en uso.**

- **49 historias de usuario** construidas, con su documentación de criterios de aceptación.
- **Más de 400 pruebas automáticas** corriendo en cada cambio.
- **Seis cursos de tecnología** completos sembrados, con lecciones, actividades, evaluaciones y rutas.
- **El ciclo completo funcionando**: publicar → recorrer → entregar → calificar → que la nota llegue.

**Y lo que falta, dicho con claridad:** la plataforma está probada con un docente y sus grupos. El
segundo docente real todavía no se ha dado de alta —la base técnica está construida y validada con un
espacio de prueba, pero una cosa es validarla y otra es que la use alguien que no soy yo—. Es
exactamente el siguiente paso.

---

## 6. Hacia dónde va

**A corto plazo — que el material circule.** Ya está construido el catálogo donde un docente comparte
un curso suyo y otro puede tomarlo y quedarse con su propia copia para adaptarla a su grupo. El
original no se toca y el autor queda acreditado en cada copia, también ante los estudiantes. Falta
rodarlo con docentes reales.

**A mediano plazo — una biblioteca que valga la pena.** La apuesta es que la plataforma se sostenga
por la calidad de sus insumos: que a un profesor le resulte más fácil quedarse que armar todo por su
cuenta. Eso significa material propio, curado, no solo lo que cada uno suba. Es trabajo de contenido
antes que de programación, y es lo que más tiempo toma.

**Con un criterio ya tomado sobre la calidad:** no habrá una cola de aprobación previa que frene a
nadie. Habrá un piso automático —un curso no se puede compartir si no tiene un mínimo de material—,
señales que orienten —cuántos docentes usan cada curso—, un sello para lo revisado, y la posibilidad
de retirar algo del catálogo en un clic. Lo último no es por calidad, es por seguridad: son menores de
edad, y eso no puede esperar a que alguien vacíe una cola de revisión.

**Más adelante.** Grupos como entidad propia para matricular por curso completo; perfil público del
docente; y el tema claro, para las aulas con luz fuerte o proyector.

---

## 7. Por qué esta y no otra

Hay plataformas más grandes. Esta tiene tres cosas que no se compran con tamaño:

**La construyó quien la usa.** Cada corrección salió de usarla dando clase. El progreso del estudiante
se marca manualmente, por ejemplo, porque en la primera versión bastaba con abrir la página para que
todo contara como visto — y un dato que miente es peor que no tener el dato. Eso no se descubre en una
reunión de requisitos; se descubre dando clase.

**Está pensada para esta edad.** Entregar con una foto del cuaderno, las notas en escala de 1 a 5,
restablecer contraseñas sin drama, un estudiante que se retira sin perder su historial. Decisiones
pequeñas que solo toma quien tiene el problema delante.

**Y no cobra por complejidad.** Un profesor no debería necesitar una capacitación para publicar una
clase.

---

*Documento preparado en noviembre de 2026. El detalle técnico completo —backlog priorizado, diagramas
de arquitectura, planificación de sprints y registro de avance— está disponible en el repositorio del
proyecto.*
