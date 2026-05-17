-- Convert ImageAsset.category (single enum) to ImageAsset.categories (enum array)

-- 1. Add the new array column with a safe default
ALTER TABLE "ImageAsset" ADD COLUMN "categories" "ImageCategory"[] NOT NULL DEFAULT '{}';

-- 2. Backfill from the existing single-category column
UPDATE "ImageAsset" SET "categories" = ARRAY["category"]::"ImageCategory"[];

-- 3. Drop the old index and column
DROP INDEX IF EXISTS "ImageAsset_category_idx";
ALTER TABLE "ImageAsset" DROP COLUMN "category";
