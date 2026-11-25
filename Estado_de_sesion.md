# Estado de sesión — dónde retomar

> Nota de continuidad para la próxima sesión de trabajo sobre el LMS. La fuente de verdad sobre el
> estado de cada historia es [`Backlog.md`](./Backlog.md) y [`progress.md`](./progress.md); este
> archivo solo dice **dónde quedamos y qué sigue**, y se reescribe al cerrar cada sesión.

Última sesión: **24 de noviembre de 2026.** Se cerró la épica de **compartir material entre
docentes**: US47 (un tutor adopta el curso de otro como copia propia), **US48** (el catálogo) y
**US49** (el piso de calidad para compartir, el sello de verificado y el retiro del catálogo). Antes
de eso se automatizaron las tres pruebas de seguridad del bloque D y se hizo una revisión general de
enlaces que encontró uno caído. El docente hizo los commits; **no alcanzó a probar nada en
navegador.**

---

## Lo primero: dónde está el repositorio

**La carpeta de trabajo real es `C:\Users\Usuario\Desktop\proyecto-lms`.** La copia de Dropbox quedó
abandonada desde agosto (Dropbox sincroniza mientras git escribe y bloquea `.git/index.lock`).
Confirmar con `git log --oneline -1` antes de tocar nada.

## Estado del repositorio al cerrar

- Último commit: `1015ef2` ("Ignora los PDF generados de la entrega"). **`main` está al día con
  `origin/main`** — el docente ya subió todo lo del 23 y 24/11.
- **Dos migraciones nuevas sin confirmar que estén aplicadas:**
  `20261123040000_add_curso_compartible` y `20261124040000_add_curso_verificado`. Siempre con
  `npx prisma migrate deploy` + `npx prisma generate`, nunca `migrate dev`.
- **Dos scripts quedaron sin seguimiento en git** (`scripts/listar-estudiantes.ts` y
  `scripts/borrar-carga-excel.ts`, de septiembre). **No llevan nombres embebidos** —consultan la base
  de datos—, así que subirlos es seguro; pero **no están en `.gitignore`**, así que conviene decidir:
  commit explícito o ignorarlos. Lo que no se puede es dejarlos ahí y usar `git add -A` alguna vez.
- **`estudiantes.txt`, `.codex/` y `scripts/borrar-listado-1.ts` están en `.gitignore`.** El último
  lleva embebidos los nombres completos de 229 estudiantes menores de edad y el repositorio es
  público: **nunca debe subirse.**

## Lo pendiente, en orden

1. **El recorrido de prueba, que es lo más atrasado.** `Checklist_Validacion_Manual.md` tiene dos
   bloques abiertos:
   - Del addendum del 20/11 faltan **B.7** (asociarse a una ruta como estudiante), **C.3** y **C.4**
     (la ruta desde el lado del tutor) y **E.1**. El bloque D ya no hace falta: quedó automatizado en
     15 pruebas. Para B.7, quitar antes al estudiante de uno de los cursos de la ruta, porque la
     siembra ya lo inscribe en todos y si no la prueba no demuestra nada.
   - El addendum del 24/11 (**bloques F y G**, diez pasos) cubre US47, US48 y US49, ninguna vista en
     navegador. **El montaje ya está hecho:** `npx tsx scripts/tutor-de-prueba.ts --crear` deja el
     segundo Tutor, el curso compartido sin sello, el curso sin compartir para el 404 y un
     estudiante con nota, e imprime las URLs de cada paso (`--borrar --confirmar` lo deshace). **Necesita dos cuentas de Tutor** —una comparte, la otra adopta— y la de Super
     Administrador para el bloque G. El paso que más importa es **F.10**: el 404 sobre un curso no
     compartido, lo único que impide que conocer un id baste para leer el curso de otro espacio.
   - **Diez historias construidas siguen marcadas "pendiente de validación en navegador real"** en
     `Backlog.md`. Al cerrar el recorrido hay que pasarlas a validadas con la fecha.
2. **Las dos piezas que faltan de US49**, reconocidas como deuda en `progress.md`: el botón para que
   un Tutor **reporte** un curso (es por seguridad, no por calidad — la plataforma es para menores) y
   el **contador de impacto** en el panel del Tutor ("tu curso lo usan 4 docentes y 112
   estudiantes"), que sale gratis de los datos que US47 ya guarda y es lo que más mueve a compartir.
3. **Seguir el rediseño donde quedó**, según `DESIGN.md`: unificar los seis radios en uno, y después
   la capa "para niños". **No se hace con más colores en la interfaz** —era lo que había y lo que la
   hacía ver amateur— sino con imágenes, momentos de premio y forma/voz.
4. **US42** (ver el curso como lo ve un estudiante) sigue propuesta sin construir; hay que
   reestimarla porque US43 cambió la pantalla que debe reflejar.
5. Replicar el patrón de ventana en `create-tutor-form.tsx` y `create-student-form.tsx`.
6. Propuestas viejas sin construir: US32 (grupos), US33 (perfil del tutor), US35 (documento de
   identidad).
7. **La biblioteca de contenido de la plataforma.** No es código: es el material propio o curado que
   sostiene la suscripción (ver el modelo de negocio en `Descripcion_del_Proyecto.md` y la lógica de
   los dos niveles en US49). Es lo que más tiempo va a tomar y nada de lo construido lo reemplaza.

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
- **El estado de una historia se cambia en el commit que la construye, no después.** US48 y US49
  quedaron construidas el 23 y el 24/11 y el backlog siguió diciendo "sin construir" hasta que se
  revisó a propósito. Es lo único que se desincronizó en todo el proyecto, y pasó por documentar al
  final en vez de al cerrar cada historia.
- **Una regex de auditoría escrita para código da falsos positivos en prosa española.** Buscar
  `\bTODO\b` sin distinguir mayúsculas en la revisión general marcó 35 coincidencias de la palabra
  "todo". Anclar las búsquedas de auditoría a sintaxis de código (`// TODO`, `FIXME:`), no a palabras.
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
