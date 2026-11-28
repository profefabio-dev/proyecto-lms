import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// US56, capa A (28/11/2026): la tipografia del cuerpo de una leccion.
// Source Serif 4 es variable y trae italica de verdad (`em` en una leccion
// se usa, y una italica sintetica se nota). Se carga aqui y se usa SOLO en
// el cuerpo de las lecciones a traves de `--font-lectura`; el resto de la
// plataforma sigue con Inter y Geist, sin cambios. Si el docente prefiere
// otra combinacion, se cambia esta declaracion y nada mas.
const serifLectura = Source_Serif_4({
  variable: "--font-serif-lectura",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Plataforma Educativa — Fabio Andrés Aguirre",
  description:
    "Plataforma educativa de tecnología del docente Fabio Andrés Aguirre: cursos, rutas de aprendizaje y seguimiento de progreso.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      // OP09 (21/11/2026): la plataforma pasa a tema oscuro. Los tokens de
      // `.dark` ya existían en `app/globals.css` desde el pase de diseño de
      // agosto, pero nada le ponía esa clase al documento: estaban escritos
      // y muertos. Esta línea es la que los activa, y por eso el cambio se
      // propaga a todas las pantallas sin tocar ningún componente.
      className={cn(
        "dark",
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        serifLectura.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
