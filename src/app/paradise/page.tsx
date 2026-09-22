export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ParadiseList from "@/components/paradise/ParadiseList";

export const metadata = { title: "Paradise Builder | Kingdom Companion" };

export default async function ParadisePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Paradise Builder
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Pick a scene, drag your favourite friends, animals, and things onto it,
          and imagine what paradise will look like.
        </p>
      </div>
      <ParadiseList />
    </div>
  );
}
