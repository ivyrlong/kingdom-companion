export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SceneManager from "@/components/admin/SceneManager";

export const metadata = { title: "Scenes | Admin | Kingdom Companion" };

export default async function ScenesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login");
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Scenes
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Wide 2:1 backdrops for the Paradise Builder. Kids pick a scene, then
        drag stickers onto it. Filename convention: <code>scene-lakeside.png</code>.
      </p>
      <SceneManager />
    </div>
  );
}
