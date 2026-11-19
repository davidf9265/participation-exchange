-- Traceability (spec section 7, options 1 and 2). Hand-written so the new NOT NULL
-- columns can be backfilled for existing rows before they are enforced.

-- Option 1: timestamps. DEFAULT CURRENT_TIMESTAMP fills existing rows on ADD COLUMN.
ALTER TABLE "Listing" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Participation"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Option 2: snapshot of the listing's terms. Added as nullable, backfilled from the
-- parent listing, then enforced.
ALTER TABLE "Participation"
  ADD COLUMN "yieldRate" DECIMAL(6,3),
  ADD COLUMN "termMonths" INTEGER;

UPDATE "Participation" AS p
SET "yieldRate" = l."yieldRate",
    "termMonths" = l."termMonths"
FROM "Listing" AS l
WHERE l."id" = p."listingId"
  AND (p."yieldRate" IS NULL OR p."termMonths" IS NULL);

ALTER TABLE "Participation"
  ALTER COLUMN "yieldRate" SET NOT NULL,
  ALTER COLUMN "termMonths" SET NOT NULL;
