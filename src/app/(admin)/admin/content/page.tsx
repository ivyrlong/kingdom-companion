export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContentIngestion from "@/components/admin/ContentIngestion";

export const metadata = { title: "Content Manager | Kingdom Companion" };

export default async function ContentPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Content Manager
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Paste article text to auto-extract game content, then review and publish.
      </p>
      <ContentIngestion />
    </div>
  );
}
