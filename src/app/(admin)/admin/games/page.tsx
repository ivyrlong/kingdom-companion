export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GameImageManager from "@/components/admin/GameImageManager";

export const metadata = { title: "Game Images | Kingdom Companion" };

export default async function AdminGamesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Game Card Images
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Set the picture shown on each game&apos;s card. The{" "}
        <span className="font-medium">All ages</span> image is the default;
        upload an age-group image to override it for that audience. Players see
        the picture for their own age group, falling back to{" "}
        <span className="font-medium">All ages</span>.
      </p>
      <GameImageManager />
    </div>
  );
}
