export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImageManager from "@/components/admin/ImageManager";

export const metadata = { title: "Images | Admin | Kingdom Companion" };

export default async function ImagesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login");
  }
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
        Image Library
      </h1>
      <ImageManager />
    </div>
  );
}
