import Link from "next/link";

export const metadata = {
  title: "About | Kingdom Companion",
  description:
    "Kingdom Companion is a family Bible-study companion built by an active Jehovah's Witness sister for her own children.",
};

// Placeholder for the maker's name — edit this once and it flows through
// the whole page. Left as a constant so it's easy to swap without hunting.
const MAKER_NAME = "[Your Name]";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-8 text-zinc-800 dark:text-zinc-200">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-coral-600 dark:text-coral-400 uppercase tracking-wide">
          About this app
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          Hello!
        </h1>
      </header>

      <section className="space-y-4 text-base leading-relaxed">
        <p>
          <strong>Kingdom Companion</strong> helps children, teens, and families
          engage more deeply with the weekly meetings and grow closer to Jehovah —
          through Bible games, meeting‑prep and follow‑along activities, and a
          personal Bible dictionary they build over time. I hope your family
          enjoys using it and finds it helpful!
        </p>

        <p>
          This app is designed and maintained by an active Jehovah&apos;s Witness
          sister based in the United States. I have been in the Truth for 43
          years and I&apos;m a mother of four. Kingdom Companion grew out of the
          study aids and activity pages I was pulling together for my own
          children each week — some created from scratch with the help of AI
          coding tools, others inspired by the many JW‑based children&apos;s
          workbooks I&apos;ve come across and enjoyed over the years. I wanted
          them all in one place, tied to each meeting, and easy to hand to a
          child on a phone or tablet.
        </p>

        <p>
          I&apos;m sharing this in the same spirit those workbooks were shared
          with me — with love for our young ones and a desire to make the
          meetings and personal Bible study richer and more engaging for them.
          If you recognize a familiar format, that&apos;s the point: good ideas
          travel, and I&apos;m grateful to everyone whose work has encouraged
          mine.
        </p>

        <p className="italic text-zinc-600 dark:text-zinc-400">
          Kind regards,
          <br />
          Kingdom Companion — {MAKER_NAME}
        </p>
      </section>

      {/* ── Please Note ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <span aria-hidden>ⓘ</span>
          Please Note
        </h2>

        <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            All ideas, activities, and opinions in this app are my own and do
            not necessarily reflect the views of{" "}
            <a
              href="https://www.jw.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              jw.org
            </a>{" "}
            or the Watch Tower Bible and Tract Society.
          </p>

          <p>
            <strong>
              This is not an official app of Jehovah&apos;s Witnesses.
            </strong>{" "}
            It is not affiliated with jw.org, the Watch Tower Bible and Tract
            Society, or any branch office or congregation. While I am an active
            Jehovah&apos;s Witness, Kingdom Companion is a personal project and
            does not represent an official program of Jehovah&apos;s Witnesses.
          </p>

          <p>
            The app does not replace any official program, publication, or
            meeting, and it does not contain &ldquo;spiritual food.&rdquo; Kid‑
            friendly summaries, family discussion questions, and Bible
            activities are supplementary study aids meant to encourage families
            to open the <em>New World Translation</em> and the current published
            material together. All doctrine and scriptural understanding should
            be drawn from the Governing Body and the Watch Tower Society&apos;s
            published works — not from this app.
          </p>

          <p>
            Scripture references throughout the app link out to{" "}
            <a
              href="https://wol.jw.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              wol.jw.org
            </a>
            , where you can read verses in the <em>New World Translation</em>.
            Bible text is never reprinted inside the app — every citation opens
            the trusted source in a new tab.
          </p>

          <p>
            Some study helpers (such as weekly kid‑level summaries and family
            discussion questions) are generated with the help of AI as a
            starting point and reviewed before being made available. They are
            conversation starters between parents and children, not doctrine.
            Please always cross‑check against the Bible and current
            publications, and use them at your own discretion for your
            family&apos;s spiritual routine.
          </p>

          <p>
            The app collects only what it needs to run — your login, your
            children&apos;s age‑group profiles, notes you type, and your
            progress inside the app (games played, words collected in the Bible
            dictionary, meetings attended). Nothing is shared, sold, or shown to
            advertisers. Personal notes typed on a specific device stay on that
            device unless you sign in and choose to save them.
          </p>

          <p>
            All illustrations of children and Bible characters in this app are
            original creations. Kingdom Companion does not use{" "}
            <em>Caleb and Sophia</em> or other characters that are the property
            of the Watch Tower Society.
          </p>
        </div>
      </section>

      {/* ── Home nudge ─────────────────────────────────────────────── */}
      <div className="pt-2 flex flex-wrap gap-3">
        <Link
          href="/"
          className="text-sm bg-coral-600 hover:bg-coral-700 text-white px-4 py-2 rounded-lg transition"
        >
          Back to Kingdom Companion
        </Link>
        <Link
          href="/games"
          className="text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg transition"
        >
          Explore games
        </Link>
      </div>
    </div>
  );
}
