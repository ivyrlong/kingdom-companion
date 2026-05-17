"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-coral-600 dark:text-coral-400"
        >
          Kingdom Companion
        </Link>

        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <>
              <Link
                href="/games"
                className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-coral-600 dark:hover:text-coral-400 transition"
              >
                Games
              </Link>
              {(["LITTLE_ONES", "FAMILY"].includes(
                (session.user as { ageGroup?: string }).ageGroup ?? "",
              )) && (
                <Link
                  href="/encyclopedia"
                  className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-coral-600 dark:hover:text-coral-400 transition"
                >
                  Book
                </Link>
              )}
              <Link
                href="/profile"
                className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-coral-600 dark:hover:text-coral-400 transition"
              >
                Profile
              </Link>
              {(session.user as { role?: string }).role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-coral-600 dark:hover:text-coral-400 transition"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-coral-600 dark:hover:text-coral-400 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm bg-coral-600 hover:bg-coral-700 text-white px-4 py-2 rounded-lg transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
