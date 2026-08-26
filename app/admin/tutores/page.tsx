import { prisma } from "@/lib/prisma";
import { CreateTutorForm } from "@/components/create-tutor-form";

export default async function TutoresPage() {
  const tutores = await prisma.users.findMany({
    where: { rol: "TUTOR" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Gestión de Tutores</h1>

      <CreateTutorForm />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Tutores registrados</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tutores.map((tutor) => (
              <tr key={tutor.id} className="border-b">
                <td className="py-2">{tutor.nombre} {tutor.apellido}</td>
                <td className="py-2">{tutor.email}</td>
                <td className="py-2">{tutor.estado}</td>
              </tr>
            ))}
            {tutores.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted-foreground">
                  Todavía no hay tutores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}