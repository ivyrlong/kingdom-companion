/**
 * Smoke-test the WOL import lib against a real article.
 *
 * Runs the importer once with a known-good docId (a Learn From the Bible
 * lesson, "Jesus Is Arrested") and once with the /wol/pc/ navigation URL
 * the user pasted — the second call should throw the friendly
 * "use the /wol/d/ URL" error.
 *
 * Run with:
 *   node --import tsx --env-file=.env scripts/test-wol-import.mjs
 */

const { importFromWolUrl } = await import("../src/lib/wol-import.ts");

async function runCase(label, input) {
  console.log("\n" + "=".repeat(72));
  console.log(`CASE: ${label}`);
  console.log(`INPUT: ${input}`);
  console.log("=".repeat(72));
  try {
    const pack = await importFromWolUrl(input);
    console.log(JSON.stringify(pack, null, 2));
  } catch (err) {
    console.log(`THROWN: ${err.message}`);
  }
}

await runCase(
  "Working docId (Learn From the Bible lesson 88)",
  "1102016098",
);

await runCase(
  "User's /wol/pc/ URL — should throw the friendly error",
  "http://wol.jw.org/en/wol/pc/r1/lp-e/202026164/12/0",
);

// Bonus: confirm a real Watchtower study article parses too.
await runCase(
  "Real Watchtower study article (Accept Jehovah's Forgiveness)",
  "https://wol.jw.org/wol/d/r1/lp-e/2025522",
);
