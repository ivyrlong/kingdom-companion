export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DailyTextForm from "@/components/admin/DailyTextForm";

export const metadata = { title: "Daily Text | Kingdom Companion" };

export default async function DailyTextPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Daily Text
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Enter today&apos;s Daily Text scripture and comment. Games will be
        auto-generated from the content.
      </p>
      <DailyTextForm />
    </div>
  );
}
