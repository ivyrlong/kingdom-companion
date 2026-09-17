-- Add richer optional fields to EncyclopediaEntry so it can hold the
-- per-tier Bible-character content shape without breaking existing
-- entries. Also add a 1:1 link to Sticker for the collectable art.

ALTER TABLE "EncyclopediaEntry"
  ADD COLUMN "era" TEXT,
  ADD COLUMN "timeline" JSONB,
  ADD COLUMN "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "contentByTier" JSONB,
  ADD COLUMN "stickerId" TEXT;

-- 1:1 link to Sticker. Nullable because most existing encyclopedia
-- entries won't have a linked sticker.
CREATE UNIQUE INDEX "EncyclopediaEntry_stickerId_key"
  ON "EncyclopediaEntry"("stickerId");

ALTER TABLE "EncyclopediaEntry"
  ADD CONSTRAINT "EncyclopediaEntry_stickerId_fkey"
    FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Category index for admin filtering.
CREATE INDEX "EncyclopediaEntry_category_idx"
  ON "EncyclopediaEntry"("category");
