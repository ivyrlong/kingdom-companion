export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ParadiseCanvas from "@/components/paradise/ParadiseCanvas";

export const metadata = { title: "Paradise Builder | Kingdom Companion" };

export default async function ParadisePageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const page = await prisma.paradisePage.findFirst({
    where: { id, userId },
    include: {
      scene: { select: { id: true, slug: true, name: true, path: true } },
    },
  });
  if (!page) notFound();

  return (
    <ParadiseCanvas
      pageId={page.id}
      initialName={page.name}
      scene={page.scene}
      initialPlacements={Array.isArray(page.placements) ? page.placements : []}
    />
  );
}
