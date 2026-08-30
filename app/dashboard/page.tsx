import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuario = await prisma.users.findUnique({
    where: { authId: user.id },
  });

  if (!usuario) {
    // El usuario existe en Auth pero no en la tabla Users — caso de
    // inconsistencia que no debería pasar si US21 funciona bien,
    // pero lo manejamos explícitamente en vez de dejar que truene.
    redirect("/login?error=usuario_no_encontrado");
  }

  // US20: un usuario desactivado no puede iniciar sesión. El bloqueo real
  // ocurre en Supabase Auth (`ban_duration`, ver US23 en
  // `lib/supabase/sync-user.ts`), pero esa API no puede invalidar un
  // access token que ya se emitió antes de que expire por sí solo — así
  // que este chequeo es la segunda capa: como todo login pasa por este
  // despachador único, basta con validar aquí en vez de repetirlo en cada
  // página protegida.
  if (usuario.estado !== "ACTIVO") {
    redirect("/login?error=cuenta_desactivada");
  }

  switch (usuario.rol) {
    case "ADMINISTRADOR":
      redirect("/admin");
    case "TUTOR":
      redirect("/tutor");
    case "ESTUDIANTE":
      redirect("/estudiante");
  }
}