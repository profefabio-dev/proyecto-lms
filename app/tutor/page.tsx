import Link from "next/link";

export default function TutorPage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Panel de Tutor</h1>
      <div className="space-x-4">
        <Link href="/tutor/estudiantes" className="text-blue-600 underline">
          Gestionar estudiantes
        </Link>
        <Link href="/tutor/cursos" className="text-blue-600 underline">
          Gestionar cursos
        </Link>
      </div>
    </main>
  );
}