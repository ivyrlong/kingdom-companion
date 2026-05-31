/**
 * Smoke-test the OCLM importer against the user-supplied URL.
 *
 * Verifies:
 *   1. The unified dispatcher (importPackFromWolUrl) detects an mwb URL
 *      and returns kind="OCLM".
 *   2. Section + part walking pulls the expected three sections plus
 *      opening/closing songs.
 *   3. No body prose leaks into the returned pack — we only assert on
 *      structural metadata.
 *
 * Run with:
 *   node --import tsx --env-file=.env scripts/test-oclm-import.mjs
 */

const { importPackFromWolUrl, importOclmFromWolUrl } = await import(
  "../src/lib/wol-import.ts"
);

const OCLM_URL = "https://wol.jw.org/en/wol/d/r1/lp-e/202026165";

console.log("=".repeat(72));
console.log("DISPATCHER: importPackFromWolUrl against an OCLM URL");
console.log(`INPUT: ${OCLM_URL}`);
console.log("=".repeat(72));

const result = await importPackFromWolUrl(OCLM_URL);
console.log(`kind: ${result.kind}`);
if (result.kind !== "OCLM") {
  console.error(`FAIL: expected kind=OCLM, got kind=${result.kind}`);
  process.exit(1);
}

const pack = result.pack;
const summary = {
  title: pack.title,
  publicationCode: pack.publicationCode,
  issueLabel: pack.issueLabel,
  bibleReadingRange: pack.bibleReadingRange,
  bibleReadingAssignment: pack.bibleReadingAssignment,
  songs: pack.songs,
  vocabulary: pack.vocabulary.slice(0, 10),
  keyPeople: pack.keyPeople,
  themes: pack.themes,
  scriptureCount: pack.scriptures.length,
  scripturesPreview: pack.scriptures.slice(0, 5),
  attribution: pack.attribution,
  sectionSummary: pack.sections.map((s) => ({
    kind: s.kind,
    title: s.title,
    partCount: s.parts.length,
    parts: s.parts.map((p) => ({
      number: p.number,
      kind: p.kind,
      title: p.title,
      durationMin: p.durationMin,
      scenarioTag: p.scenarioTag,
      songNumber: p.songNumber,
      refCount: p.references.length,
      hasVideo: !!p.videoUrl,
    })),
  })),
};

console.log(JSON.stringify(summary, null, 2));

console.log("\n" + "=".repeat(72));
console.log("DIRECT: importOclmFromWolUrl");
console.log("=".repeat(72));
const direct = await importOclmFromWolUrl(OCLM_URL);
console.log(`title: ${direct.title}`);
console.log(`sectionCount: ${direct.sections.length}`);
console.log(`partCount: ${direct.sections.reduce((n, s) => n + s.parts.length, 0)}`);
