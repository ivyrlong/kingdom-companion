"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import EncyclopediaProvider from "@/components/encyclopedia/EncyclopediaProvider";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider>
      <EncyclopediaProvider>{children}</EncyclopediaProvider>
    </NextAuthSessionProvider>
  );
}
