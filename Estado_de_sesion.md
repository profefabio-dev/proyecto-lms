# Estado de sesión — dónde retomar

> Nota de continuidad para la próxima sesión de trabajo sobre el LMS. La fuente de verdad sobre el
> estado de cada historia es [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md); este
> archivo solo dice **dónde quedamos y qué sigue**, y se reescribe al cerrar cada sesión.

Última sesión: **22 de noviembre de 2026.** Se sembraron tres cursos de tecnología de verdad en lugar
de los de prueba (**OP10**), se arreglaron los videos de YouTube —que estaban todos mal— y de ahí
salió **OP11**: la planilla de notas del curso, las novedades del Estudiante y la opción de quitar un
archivo de una entrega. Al final se agregaron tres cursos más con rutas que se cruzan, para poder
ensayar rutas de aprendizaje.

---

## Lo primero: dónde está el repositorio

**La carpeta de trabajo real es `C:\Users\Usuario\Desktop\proyecto-lms`.** La copia de Dropbox quedó
abandonada desde agosto (Dropbox sincroniza mientras git escribe y bloquea `.git/index.lock`).
Confirmar con `git log --oneline -1` antes de tocar nada.

## Estado del repositorio al cerrar

- Último commit **en GitHub** confirmado: `c9afe19` (21/11). Sobre él se le dejaron al docente los
  comandos para los commits del 21/11 (OP08, OP09, documentación) y del 22/11 (OP10 y OP11).
  **Confirmar cuáles corrió** antes de seguir.
- **Hay dos migraciones nuevas sin confirmar que estén aplicadas:**
  `20261121040000_add_intentos_maximos_quiz` y `20261122040000_add_created_at_contents`. Siempre con
  `npx prisma migrate deploy` + `npx prisma generate`, nunca `migrate dev`.
- **`estudiantes.txt`, `.codex/` y `scripts/borrar-listado-1.ts` están en `.gitignore`.** El último
  lleva embebidos los nombres completos de 229 estudiantes menores de edad y el repositorio es
  público: **nunca debe subirse.**

## Lo pendiente, en orden

1. **US47 — el docente pidió revisarla mañana.** Está definida en `Backlog.md`: un tutor toma
   recursos de otro, los usa en sus rutas como **administrador y no creador**, y los adapta para su
   uso. Hay **cuatro preguntas abiertas** anotadas ahí que hay que resolver con él antes de estimar
   (cómo se descubre el material de otros, quién autoriza compartir, qué pasa si el original cambia
   después, y si se acredita al autor). La historia está planteada como **copia al adoptar**, no como
   edición compartida — ese punto conviene explicárselo antes de que decida.
2. **Terminar el recorrido de prueba.** Lo validado y lo que falta está en
   `Checklist_Validacion_Manual.md`. Al cerrar hoy faltan: **B.7** (asociarse a una ruta como
   estudiante), **C.3** y **C.4** (la ruta desde el lado del tutor), **todo el bloque D** de
   seguridad y **E.1**. Para el bloque D está `scripts/urls-de-prueba.ts`, que imprime las URLs
   exactas. Para B.7, quitar antes al estudiante de uno de los cursos de la ruta, porque la siembra
   ya lo inscribe en todos y si no la prueba no demuestra nada.
3. **Seguir el rediseño donde quedó**, según `DESIGN.md`: unificar los seis radios en uno, y después
   la capa "para niños". **No se hace con más colores en la interfaz** —era lo que había y lo que la
   hacía ver amateur— sino con imágenes, momentos de premio y forma/voz.
4. **US42** (ver el curso como lo ve un estudiante) sigue propuesta sin construir; hay que
   reestimarla porque US43 cambió la pantalla que debe reflejar.
5. Replicar el patrón de ventana en `create-tutor-form.tsx` y `create-student-form.tsx`.
6. Propuestas viejas sin construir: US32 (grupos), US33 (perfil del tutor), US35 (documento de
   identidad).

## Lo que se aprendió estos días

- **Un enlace externo no se escribe de memoria: se comprueba antes de entregarlo.** Los seis videos
  de YouTube del primer script se pusieron de memoria y estaban todos mal — dos no existían y tres
  eran de otro tema en inglés. El docente se topó con "Este video es privado" al abrir la
  plataforma. Se comprueban con la API de YouTube (`playability_status`, `is_private`, idioma y que
  el título corresponda al tema).
- **Cambiar un script de siembra no cambia los datos ya sembrados.** Al corregir los enlaces hubo
  que decirlo explícitamente y hacer un script aparte (`scripts/corregir-videos.ts`) que arregla lo
  guardado sin borrar cursos, progreso ni notas. Vale para cualquier corrección de datos.
- **Cuando el docente reporta algo de una pantalla, mirar primero si la función ya existe y no se
  encuentra.** Pasó dos veces seguidas: "Asignar estudiantes" en OP08 y "no veo las calificaciones"
  en OP11. Las dos existían; el problema era dónde estaban.
- **`npx prisma migrate dev` está roto desde el 12/11.** La migración `20261112200000` termina con
  `ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY`, que falla al reproducirse en
  la base de datos sombra (P3006/P1014). **Usar siempre `migrate deploy` + `generate`.**
- **La prueba que fija la consulta exacta de la página del estudiante avisa siempre.** Volvió a
  romperse el 22/11 al agregar las consultas de novedades — es la cuarta vez. **Revisarla en cada
  cambio de esa consulta.**
- **Cuando TypeScript pierde el tipo al pasar datos de Prisma a una función genérica** (pasa en el
  clon porque el cliente no está generado), pasarle los parámetros de tipo explícitos. Volvió a
  pasar con `construirPlanilla`.
- **Verificación sin tocar su máquina:** clon del repo público en la nube, `npm install`, comparar
  `tsc --noEmit` contra la base antes/después, más `eslint`. Ruido conocido que NO es error: `has no
  exported member 'Rol'/'EstadoUsuario'/'TipoContenido'`, `implicitly has an 'any' type` y `Cannot
  find module 'xlsx'`, todos por no poder generar el cliente de Prisma (`binaries.prisma.sh`
  bloqueado). Por lo mismo, **las pruebas que dependen de esos enums solo corren en la máquina del
  docente** — en el clon fallan ~188 de 394, y eso es lo esperado.

## Convenciones de trabajo (acumuladas, siguen vigentes)

- **Una historia/cambio = un commit**, con mensaje descriptivo.
- **Nunca `git add -A` ni `git add -u`** — siempre rutas explícitas; el checkout de Windows está en
  CRLF sin `.gitattributes` y aparecen decenas de archivos como "modified" que no cambiaron. Las
  rutas con corchetes van entre comillas en PowerShell.
- **El docente hace el `git add`/`commit`/`push` él mismo** desde su terminal.
- **Los documentos ágiles viven en tres lugares** (repo local, GitHub y este Proyecto de Claude) y
  deben quedar idénticos. Verificar los tres.
- **Nunca correr `npm`/`node`/`vitest`/`tsx` vía el puente** a su computador: binarios de la VM Linux
  contra Windows.
- **El puente no borra archivos por defecto** — hace falta `device_request_delete_permission`.
- **Después de instalar una dependencia nueva:** avisarle que corra `npm install`.
- **Si dice que "no ve" un archivo nuevo:** sugerir reiniciar `npm run dev` antes de sospechar de la
  transferencia.
- **Si rechaza un resultado visual sin ser específico:** preguntar qué se sintió básico y pedir una
  referencia concreta, e investigarla antes de rehacer nada. Si señala algo concreto, iterar directo.
- **Si comparte capturas de otro LMS:** tomarlas como referencia de nivel, nunca para replicar.
- **Responder siempre en español** (pedido explícito del 07/09/2026).

## Limitaciones del entorno de nube

- Sin red hacia `supabase.co`, `binaries.prisma.sh`, `cdn.sheetjs.com`, `fonts.googleapis.com` ni
  `youtube.com` (para comprobar videos se usa la API de YouTube vía Firecrawl/Alexandria, que sí
  llega).
- **`git push` no funciona desde la sesión**; el push lo hace el docente.
- El acceso a la API de GitHub desde la sesión está deshabilitado: para ver el estado de un run de CI,
  pedirle la captura o que lo mire él.
