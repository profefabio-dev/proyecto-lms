# Checklist de validación manual pendiente — Plataforma Educativa LMS

> Lista única para probar de una vez las historias que ya están implementadas y con pruebas
> unitarias pasando, pero que todavía no tienen `Validado: Sí` en [`progress.md`](./progress.md) —
> tal como pidió el docente, en vez de detener el avance para verificar cada una por separado.
> Cubre **12 historias**: US01, US02, US05, US06, US07, US09, US11, US12, US13, US18, US21, US22.
> Las otras 11 (US03, US04, US08, US10, US14, US15, US16, US17, US19, US20, US23) ya están
> validadas — no aparecen aquí.

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
