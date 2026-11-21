import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
