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

## Pendiente (en orden)

1. **Barrer los 86 usos de `duo-*`**, caso por caso: los de clasificación se van, los de celebración
   se quedan.
2. **Unificar los seis radios** en 12px.
3. **La capa "para niños", que es la siguiente pasada.** El docente lo pidió explícitamente y vale
   dejar escrito cómo NO se hace: no con más colores en la interfaz, que es justo lo que había. Se
   hace con **imágenes** (las portadas de curso y las ilustraciones de módulo llevan el color y la
   personalidad), con **momentos** (el confeti al completar y la racha, como premio y no como adorno
   permanente), y con **forma y voz** (esquinas algo más redondas, controles grandes, una tipografía
   de títulos con carácter, y textos escritos como se le habla a alguien de séptimo).
4. **La página pública (`app/page.tsx`) y el login** quedaron fuera de esta pasada a propósito: son
   piezas de presentación, no de uso diario, y ahí un degradado sí tiene sentido. Se revisan aparte.
