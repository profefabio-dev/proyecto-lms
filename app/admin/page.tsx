import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Panel de Administrador</h1>
      <Link href="/admin/tutores" className="mt-4 inline-block text-blue-600 underline">
        Gestionar tutores
      </Link>
    </main>
  );
}