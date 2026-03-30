import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-teal-50 to-sky-50 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Kingdom <span className="text-teal-600 dark:text-teal-400">Companion</span>
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
          Fun Bible-themed games for the whole family. Learn scriptures, explore
          Bible stories, and grow in knowledge — one game at a time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-lg transition"
          >
            Get Started
          </Link>
          <Link
            href="/games"
            className="px-8 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl text-lg border border-zinc-200 dark:border-zinc-700 transition"
          >
            Browse Games
          </Link>
        </div>
      </div>
    </div>
  );
}
