export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import VocabularyManager from "@/components/admin/VocabularyManager";

export const metadata = { title: "Vocabulary Catalog | Kingdom Companion" };

export default async function VocabularyPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }
  return <VocabularyManager />;
}
