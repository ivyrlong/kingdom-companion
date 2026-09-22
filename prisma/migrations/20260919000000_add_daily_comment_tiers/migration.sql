-- Age-tiered Daily Text comments.
--
-- Replaces the two-tier (comment / simplifiedComment) split with a
-- single JSON column holding all four audience tiers:
--
--   { littleOnes: { summary },
--     youth:      { summary },
--     adult:      { summary },
--     family:     { summary, discussionQuestion } }
--
-- `comment` and `simplifiedComment` are deliberately left in place as
-- legacy mirrors so existing rows keep rendering and any reader that
-- hasn't moved to commentByTier yet still shows text.

ALTER TABLE "ContentPack"
  ADD COLUMN "commentByTier" JSONB;

-- Backfill the two tiers we can infer from existing daily-text rows.
-- Youth and Family are left absent rather than guessed — the resolver
-- falls back through adult, and a re-import fills them properly.
UPDATE "ContentPack"
SET "commentByTier" = jsonb_strip_nulls(
      jsonb_build_object(
        'littleOnes',
          CASE WHEN "simplifiedComment" IS NOT NULL
                AND btrim("simplifiedComment") <> ''
               THEN jsonb_build_object('summary', "simplifiedComment")
               ELSE NULL END,
        'adult',
          CASE WHEN "comment" IS NOT NULL
                AND btrim("comment") <> ''
               THEN jsonb_build_object('summary', "comment")
               ELSE NULL END
      )
    )
WHERE "source" = 'DAILY_TEXT'
  AND ("comment" IS NOT NULL OR "simplifiedComment" IS NOT NULL);

-- Rows where both columns were blank end up as '{}' — normalise those
-- back to NULL so the resolver's "no tiered content" path is clean.
UPDATE "ContentPack"
SET "commentByTier" = NULL
WHERE "commentByTier" = '{}'::jsonb;
