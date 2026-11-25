# Checklist de validación manual pendiente — Plataforma Educativa LMS

> Lista única para probar de una vez las historias que ya están implementadas y con pruebas
> unitarias pasando, pero que todavía no tienen `Validado: Sí` en [`progress.md`](./progress.md) —
> tal como pidió el docente, en vez de detener el avance para verificar cada una por separado.
> Cubre **12 historias**: US01, US02, US05, US06, US07, US09, US11, US12, US13, US18, US21, US22.
> Las otras 11 (US03, US04, US08, US10, US14, US15, US16, US17, US19, US20, US23) ya están
> validadas — no aparecen aquí.

> **Nota de estado (05/09/2026):** este checklist se ejecutó por completo el 2026-08-31, sin fallos —
> las 23 historias del MVP quedaron `Validado: Sí` ese mismo día (ver `progress.md`). Se conserva aquí
> tal cual, como registro histórico del recorrido que se siguió, no como una lista todavía pendiente
> de ejecutar. La épica Multi-docente (US24-US28, cerrada el 02-03/09/2026) se validó por un camino
> distinto — en navegador real contra datos de producción, historia por historia — documentado
> directamente en `progress.md` y en `Backlog.md`, sin un checklist unificado como este porque cada
> historia se probó en el momento en que se construyó. **Único punto sin confirmación explícita
> registrada: OP01** (Administrador/Tutor restablece la contraseña de un usuario que la olvidó) quedó
> implementada y en `Backlog.md` figura "Hecho (pendiente confirmación visual del docente)", pero no
> se encontró un registro posterior de esa confirmación — si el docente ya la probó y no quedó
> anotada, basta con una línea en `progress.md` confirmándolo; si no, es la única validación manual
> real que sigue abierta en todo el proyecto.

## Cómo usar esta lista

Está ordenada como **un solo recorrido continuo** (Admin → Tutor nuevo → Estudiante nuevo), no
historia por historia, para no tener que iniciar y cerrar sesión más veces de las necesarias. Cada
paso indica qué historia(s) confirma y qué debe verse en pantalla. Al terminar, marca cada fila de
la tabla de `progress.md` como `Validado: Sí` con la fecha de hoy y anota cualquier hallazgo en un
mensaje aparte para que se corrija antes de cerrar el Sprint 6.

**Antes de empezar:** asegúrate de tener a mano una cuenta de Administrador real (la que ya usas) y
ten listo un PDF o Word corto cualquiera para la prueba de subida de documentos.

## Parte 1 — Administrador

- [ ] **1.1 (US01 — login de Administrador).** Cierra sesión si tienes una activa y entra a
      `/login` con las credenciales de tu cuenta de Administrador. Debe redirigir a `/admin` sin
      errores. Prueba también un dato incorrecto (contraseña equivocada): debe mostrar un error
      genérico, sin decir si falló el email o la contraseña.
- [ ] **1.2 (US18 — dashboard de Admin).** En `/admin`, confirma que las cinco tarjetas de
      indicadores (Administradores, Tutores, Estudiantes, Cursos activos, Contenidos totales)
      muestran números que coinciden con lo que sabes que existe hoy en el sistema.
- [ ] **1.3 (US02 + US21 — Admin crea un Tutor, con alta automática en Auth).** Ve a
      "Gestionar tutores" y crea un tutor nuevo con un email real al que tengas acceso (o uno de
      prueba). **Anota la contraseña temporal que te muestra la pantalla** — la necesitas en la
      Parte 2. Confirma que el tutor aparece de inmediato en el listado.
- [ ] **1.4 (US22 — edición de email sincronizada con Auth).** En "Ver todos los usuarios",
      edita el email de cualquier usuario existente (puede ser el tutor que acabas de crear) a una
      variación del mismo email (ej. agregar `+prueba` antes de la arroba). Confirma que el cambio
      se ve reflejado en la tabla sin error.

## Parte 2 — Tutor (con la cuenta creada en 1.3)

- [ ] **2.1 (US05 — login de Tutor).** Cierra sesión y entra con el email del tutor nuevo y la
      contraseña temporal anotada en 1.3. Debe redirigir a `/tutor` sin errores.
- [ ] **2.2 (US18 — dashboard de Tutor).** En `/tutor`, confirma que las tres tarjetas ("Mis
      cursos", "Estudiantes inscritos", "Contenidos publicados") aparecen en cero (es una cuenta
      nueva, sin nada creado todavía).
- [ ] **2.3 (US06 + US21 — Tutor crea un Estudiante, con alta automática en Auth).** Ve a
      "Gestionar estudiantes" y crea un estudiante nuevo. **Anota también su contraseña
      temporal** — la necesitas en la Parte 3.
- [ ] **2.4 (US07 — Tutor crea un curso).** Ve a "Mis cursos" y crea un curso con título,
      descripción y una URL de imagen (puede ser cualquier URL de imagen pública). Confirma que
      aparece en la grilla de tarjetas con su miniatura.
- [ ] **2.5 (US09 — Tutor sube un documento).** Entra al curso recién creado y publica un
      contenido de tipo documento, adjuntando el PDF/Word que tenías listo. Confirma que aparece
      en la lista de contenido del curso con opción de previsualizar o descargar.
- [ ] **2.6 (US11 — Tutor asigna estudiantes).** En el mismo curso, en "Asignar estudiantes",
      selecciona al estudiante creado en 2.3 y confírmalo. Debe pasar a la lista de "Estudiantes
      inscritos".
- [ ] **2.7 (US12 — Tutor reordena y oculta contenido).** Si el curso tiene más de un contenido,
      prueba las flechas ↑/↓ para reordenarlos. Con al menos uno, prueba "Ocultar" y confirma que
      se marca con la insignia "Oculto"; vuelve a mostrarlo con "Mostrar" antes de seguir (si
      queda oculto, el Estudiante de la Parte 3 no podrá verlo en el paso 3.2).

## Parte 3 — Estudiante (con la cuenta creada en 2.3)

- [ ] **3.1 (US13 — login de Estudiante).** Cierra sesión y entra con el email del estudiante
      nuevo y la contraseña temporal anotada en 2.3. Debe redirigir a `/estudiante` sin errores.
- [ ] **3.2 (cierre del recorrido).** Confirma que el curso creado en 2.4 aparece en "Mis cursos"
      con su miniatura, en 0% de progreso, y que al entrar se ve el documento publicado en 2.5
      (con su botón "Marcar como visto" — ya validado en una ronda anterior, no hace falta
      reprobarlo aquí).

## Al terminar

1. En `progress.md`, cambia la columna **Validado** a `**Sí** (verificado manualmente en
   navegador real el <fecha>: <qué se probó>)` en las filas de US01, US02, US05, US06, US07, US09,
   US11, US12, US13, US18, US21 y US22.
2. Si algún paso no se comportó como se describe aquí, anótalo aparte (captura de pantalla si
   puedes) en vez de marcarlo como validado — es una historia para corregir antes de cerrar el
   Sprint 6, no un defecto en esta lista.
3. Con las 23 historias en `Validado: Sí`, el Sprint 6 queda cerrado del lado de "cola de
   validación pendiente" (ver `Sprint_Planning.md`) — solo faltarían Vercel y confirmar el primer
   run verde de GitHub Actions, ambas acciones que dependen de tus propias cuentas.

---

## Addendum (05/09/2026, cerrado el 07/09/2026) — OP01

A diferencia de las 23 historias de arriba y de las 5 de la épica Multi-docente (todas con su
confirmación explícita registrada en `progress.md`/`Backlog.md`), **OP01 no tenía un registro de
confirmación visual del docente**, pese a estar implementada y en uso indirecto (OP02 y OP03 reusan la
misma función `resetSyncedUserPassword`, y esos sí estaban confirmados).

- [x] Como Administrador, restablece la contraseña de un Tutor o Estudiante cualquiera desde su
      pantalla de gestión de usuarios. Confirma que se muestra una contraseña nueva una sola vez en
      pantalla, y que ese usuario puede iniciar sesión con ella. **Confirmado el 07/09/2026** en
      `/admin/usuarios`: el docente restableció la contraseña de un Tutor y de un Estudiante.
- [x] Como Tutor, restablece la contraseña de uno de sus Estudiantes (no debe poder hacerlo con un
      Tutor u otro Administrador — confirmar que esa opción ni aparece). **Confirmado por revisión de
      código** de `lib/actions/reset-user-password.ts` el 05/09/2026 (misma función que ya se probó en
      producción para el caso Administrador, con pruebas unitarias dedicadas a esta restricción de rol).

**OP01 queda `Hecho` y confirmada — ver `progress.md` y la fila de OP01 en `Backlog.md`. No queda
ninguna validación manual abierta en el proyecto.**

---

## Addendum (20/11/2026) — Épicas Evaluación y calificación (US36-US41) y El curso como recorrido (US43-US46)

Diez historias implementadas entre el 19 y el 20/11/2026 que **todavía no se han probado en navegador
real**. Esta es la lista para hacerlo de una sola pasada, en orden: cada paso deja sembrado lo que
necesita el siguiente.

**Antes de empezar**, en `C:\Users\Usuario\Desktop\proyecto-lms`:

```
npx prisma migrate deploy
npx prisma generate
npm run dev
```

(`migrate deploy`, nunca `migrate dev` — está roto en este proyecto desde el 12/11/2026, ver
`progress.md`.) Opcionalmente, para no crear todo a mano:
`npx tsx scripts/seed-curso-demo.ts --con-datos`.

> **Estado al 21/11/2026 — primera pasada hecha.** El docente recorrió los pasos A.1 a A.5 (menos
> publicar la ruta, que sí hizo) y B.1, B.2, B.3, B.4, B.6 y la primera mitad de B.8. **Falta:** B.5
> (entregar la actividad), B.7 (asociarse a la ruta), todo el bloque C (calificar, seguimiento,
> ruta), todo el bloque D (seguridad) y E.1. De esa pasada salieron seis correcciones, agrupadas
> como **OP08** en `Backlog.md` — entre ellas el límite de intentos por evaluación, que agrega una
> migración más por aplicar antes de seguir probando.

### Como Tutor

- [ ] **A.1** En un curso tuyo, crea una **actividad** con puntaje y fecha límite (US36). Debe
      aparecer en la lista de actividades del curso.
- [ ] **A.2** Crea una **evaluación**, cárgale 3 preguntas y publícala (US40). Comprueba que **no te
      deja publicarla sin preguntas**.
- [ ] **A.3** Publica un **enlace** a un sitio externo y un bloque de **código** con su lenguaje
      (US45). En el curso, el enlace debe mostrar el dominio y abrirse en otra pestaña; el código,
      en monoespaciado y con su sangría.
- [ ] **A.4** Edita el enlace y el código recién creados (cambia el título y la dirección / el
      código). Debe guardarse sin pedirte ningún archivo.
- [ ] **A.5** En **Rutas** (menú lateral), crea una ruta y agrégale 2 o 3 cursos (US44). Comprueba
      que **no te deja publicarla vacía**, y publícala cuando ya tenga cursos.

### Como Estudiante (otra sesión o ventana privada)

- [ ] **B.1** Entra a un curso. Debe verse el **temario** (no todo el contenido desplegado) con la
      tarjeta de "Comenzar el curso" o "Continuar donde quedaste" (US43).
- [ ] **B.2** Abre una lección. Debe verse **una sola** lección, el temario al lado, "Lección N de M"
      y el botón "Completar y continuar".
- [ ] **B.3** Pulsa "Completar y continuar" varias veces seguidas: debe ir avanzando lección por
      lección, marcando cada una en verde, y al terminar la última volver al temario con el 100 %.
- [ ] **B.4** Vuelve a "Mis cursos" y pulsa **"Reanudar clase"**: debe entrar directo a la lección
      pendiente, no a la portada del curso.
- [ ] **B.5** Entrega la actividad de A.1 (texto, archivo o los dos) (US37).
- [ ] **B.6** Responde la evaluación de A.2 y comprueba que el resultado sale al instante (US41).
- [ ] **B.7** En **Rutas**, asóciate a la ruta de A.5 (US44). Sus cursos deben aparecer enseguida en
      "Mis cursos", y la ruta debe mostrar su avance y un botón que lleve a la lección exacta.
- [ ] **B.8** Entra a **Mis notas** (US46). Debe estar el resultado de la evaluación de B.6; la
      actividad aparecerá cuando la califiques en C.1.

### De vuelta como Tutor

- [ ] **C.1** Califica la entrega de B.5 con nota y comentario (US38). Comprueba que ves también la
      lista de **quienes no han entregado**.
- [ ] **C.2** Entra a **Seguimiento** del curso (US39): el estudiante debe aparecer con su avance,
      su entrega y su promedio.
- [ ] **C.3** En la ruta de A.5, comprueba que el estudiante aparece en "Quién está recorriendo la
      ruta" con su porcentaje.
- [ ] **C.4** Agrega **un curso publicado más** a esa ruta. Como el estudiante ya estaba asociado,
      debe quedar inscrito en ese curso automáticamente (compruébalo desde su sesión).

### Pruebas de seguridad — **ya no hace falta hacerlas a mano (23/11/2026)**

> Las tres quedaron fijadas en **15 pruebas automatizadas** que corren en cada push
> (`app/estudiante/cursos/[courseId]/lecciones/[contenidoId]/page.test.ts`,
> `app/estudiante/cursos/[courseId]/quizzes/[quizId]/page.test.ts`,
> `app/estudiante/rutas/[rutaId]/page.test.ts`), **más un caso que esta lista no contemplaba**: una
> lección `visible` dentro de una sección cerrada, que una comprobación ingenua dejaría pasar. Se
> conservan abajo como registro de qué se protege; hacerlas a mano es opcional.


- [ ] **D.1** Como Estudiante, copia la URL de una lección de una sección que el Tutor tenga en **No
      disponible** y entra directo: debe dar 404, no mostrar la lección.
- [ ] **D.2** En la página de una evaluación, abre el código fuente (Ctrl+U) y busca la palabra
      `esCorrecta`: **no debe aparecer**. Si apareciera, la hoja de respuestas estaría publicada.
- [ ] **D.3** Como Estudiante, intenta entrar a `/estudiante/rutas/<id>` de una ruta en **borrador**:
      debe dar 404.

### Como Estudiante, de nuevo

- [ ] **E.1** Vuelve a **Mis notas**: ahora deben estar las dos calificaciones, con el comentario del
      profesor y el promedio general en escala 1.0–5.0.

**Al terminar**, anota en `progress.md` qué pasó con cada punto y actualiza el `Estado` de US36-US41 y
US43-US46 en `Backlog.md` (de "Pendiente de validación en navegador real" a validado, con la fecha).

## Addendum (24/11/2026) — Compartir material entre docentes (US47-US49)

> Tres historias construidas el 23 y el 24/11/2026, **ninguna probada en navegador**. Necesitan
> **dos cuentas de Tutor** — una comparte y la otra adopta — y esa es la razón por la que quedaron
> fuera del recorrido anterior. El bloque G necesita además la cuenta de Super Administrador.
>
> **Antes de empezar, monta el ensayo de una sola vez (25/11/2026):**
>
> ```
> npx tsx scripts/tutor-de-prueba.ts --crear
> ```
>
> Deja listo el segundo Tutor con su contraseña, un curso completo **ya compartido y sin el sello**
> de verificado (ponerlo es G.2), un segundo curso publicado **sin compartir** para el 404 de F.10, y
> un estudiante con una lección vista, una entrega calificada y un intento de evaluación — sin ese
> rastro, F.7 no probaría nada. Al terminar imprime las URLs exactas de cada paso. No toca tus
> cursos, tus estudiantes ni tus notas, y `--borrar --confirmar` deshace solo lo que creó,
> **conservando las copias que hayas adoptado**.

### Como Tutor A (el autor)

- [ ] **F.1** Abre un curso **recién creado y casi vacío** e intenta compartirlo. **No debe dejarte**,
      y el mensaje debe decir exactamente qué falta —"te faltan 2 lecciones más publicadas", "una
      actividad o una evaluación", la portada, la descripción— no un "no se puede" seco (US49).
- [ ] **F.2** Abre uno de los cursos de ejemplo, que sí tiene material, y compártelo. Debe aceptarlo
      sin más preguntas.
- [ ] **F.3** Oculta una lección de ese curso y pulsa **dejar de compartir**. Debe dejarte, aunque el
      curso ya no cumpla los requisitos: se comprueban al activar, nunca al desactivar.

### Como Tutor B (el que adopta)

- [ ] **F.4** Entra a **Catálogo** (menú lateral). Debe aparecer el curso de F.2 con su autor, su
      portada y cuántas lecciones, actividades y evaluaciones trae. **Tus propios cursos no deben
      aparecer** (US48).
- [ ] **F.5** Busca por una palabra que esté en el título o la descripción: debe filtrar, y "Limpiar"
      debe devolver la lista completa.
- [ ] **F.6** Abre la ficha y pulsa **adoptar**. Debe llevarte a **tu copia**, en estado **Borrador**,
      con el crédito "Adaptado de un curso de &lt;autor&gt;" (US47).
- [ ] **F.7** Revisa la copia: deben estar las secciones, lecciones, documentos, actividades y
      evaluaciones. **No debe haber ni un estudiante, ni una entrega, ni una nota** del Tutor A, y las
      actividades deben estar **sin fecha límite**.
- [ ] **F.8** Cambia un título dentro de tu copia y comprueba, desde la sesión del Tutor A, que **su
      curso original no cambió**.
- [ ] **F.9** Vuelve al catálogo: ese curso debe salir como "Ya lo tomaste" y como "1 docente lo usa",
      y la ficha debe ofrecerte **abrir tu copia** en vez de adoptarlo otra vez.

### Prueba de seguridad (la que más importa de esta épica)

- [ ] **F.10** Como Tutor B, copia el id de un curso del Tutor A que **no** esté compartido y entra a
      `/tutor/catalogo/<ese-id>`: **debe dar 404**. Es la única pantalla del proyecto que lee un curso
      de otro espacio, y lo único que la sostiene es esa comprobación.

### Como Super Administrador

- [ ] **G.1** Entra a la ficha del curso de F.2. Deben aparecer los controles de administración de la
      plataforma (US49).
- [ ] **G.2** Márcalo como **verificado**. En el catálogo debe salir con el sello y **de primero**; el
      filtro "Solo verificados" debe mostrarlo y dejar el resto fuera.
- [ ] **G.3** **Retíralo del catálogo.** Debe pedirte confirmación, desaparecer del catálogo y
      **perder el sello en la misma operación**. Comprueba desde la sesión del Tutor A que su curso,
      sus estudiantes y sus notas **siguen intactos**, y que puede volver a compartirlo.

**Al terminar**, pasa el `Estado` de US47, US48 y US49 en `Backlog.md` de "Pendiente de validación en
navegador real" a validado con la fecha, y anota en `progress.md` qué pasó con cada punto.
