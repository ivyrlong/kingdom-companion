export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadEncyclopediaBundle } from "@/lib/encyclopedia-data";
import MyEncyclopedia from "@/components/encyclopedia/MyEncyclopedia";

export const metadata = { title: "My Encyclopedia | Kingdom Companion" };

export default async function EncyclopediaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userAgeGroup =
    (session.user as { ageGroup?: string }).ageGroup || "FAMILY";

  const bundle = await loadEncyclopediaBundle(session.user.id, userAgeGroup);

  if (!bundle) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          My Encyclopedia
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Nothing here yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        {bundle.caps.name}
      </h1>
      <MyEncyclopedia items={bundle.items} caps={bundle.caps} />
    </div>
  );
}
