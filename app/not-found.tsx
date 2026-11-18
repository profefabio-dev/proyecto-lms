import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      icon={SearchX}
      titulo="No encontramos esta página"
      descripcion="Puede que el enlace esté mal escrito, que el curso ya no exista o que no tengas acceso a él."
    >
      <Link href="/dashboard" className={buttonVariants()}>
        Volver al inicio
      </Link>
    </StatusScreen>
  );
}
