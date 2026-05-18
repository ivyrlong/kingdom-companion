export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EncyclopediaManager from "@/components/admin/EncyclopediaManager";

export const metadata = { title: "Encyclopedia | Kingdom Companion" };

export default async function AdminEncyclopediaPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Encyclopedia
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Curate the words and pictures Little Ones can collect across games.
      </p>
      <EncyclopediaManager />
    </div>
  );
}
