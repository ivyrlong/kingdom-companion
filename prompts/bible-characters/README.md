# Bible Characters

One JSON file per Bible character, generated from the extraction prompt
at the top of `card-image-prompts.md` / handed by an AI tool from the
reference source.

## Filename

Match the `slug` field inside the JSON:

- `moses.json`
- `ruth.json`
- `john-the-baptizer.json` (multi-token slugs kebab-case)

## Shape

Each file is one JSON object as described in the extraction prompt.
Three tiers of language content (`littleOnes` / `youth` / `adult`) share
the same factual `timeline` and `locations`. No file has an
`ageAppropriate` gate — every character is available to every viewer;
the app picks the tier that matches the reader's age.

## What ingests them

Nothing yet — awaiting the `BibleCharacter` Prisma model + a seed
script that walks this folder and upserts one row per file. Expected
shape:

```
model BibleCharacter {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  era           String
  timeline      Json                     // [{ when, event }, ...]
  locations     String[]
  contentByTier Json                     // { littleOnes, youth, adult }
  portraitPath  String?                  // set when the matching Bible sticker is uploaded
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

At which point Who Am I? and Theocratic Trivia rewire to pull clues +
questions from `contentByTier[viewerAgeGroup]` instead of the current
hard-coded arrays.

## Copyright note

These files paraphrase facts from a reference source. Never store the
source PDF here — only paraphrased, derivative content. If a file
starts to read too close to source phrasing, rewrite that section
before committing.
