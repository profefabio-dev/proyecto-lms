import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">Panel de Administrador</h1>
      <div className="flex flex-col gap-1">
        <Link href="/admin/tutores" className="inline-block text-blue-600 underline">
          Gestionar tutores
        </Link>
        <Link href="/admin/usuarios" className="inline-block text-blue-600 underline">
          Ver todos los usuarios
        </Link>
      </div>
    </main>
  );
}
