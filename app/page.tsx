import { redirect } from "next/navigation";

// La raíz ya no tiene contenido propio (antes era la plantilla de ejemplo de
// Next.js). `/dashboard` es el despachador único: manda a cada usuario a su
// panel según su rol, y el middleware envía a `/login` a quien no tenga sesión.
export default function Home() {
  redirect("/dashboard");
}
