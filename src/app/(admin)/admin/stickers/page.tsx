export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StickerManager from "@/components/admin/StickerManager";

export const metadata = { title: "Stickers | Admin | Kingdom Companion" };

export default async function StickersPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login");
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Stickers
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Drop sticker PNGs to add them to the Paradise Builder library. The
        filename convention (<code>sticker-people-blonde-mother.png</code>) auto-fills
        every field including character linking.
      </p>
      <StickerManager />
    </div>
  );
}
