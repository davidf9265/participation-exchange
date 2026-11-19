-- AlterTable
-- Added as nullable first so existing rows can be backfilled before NOT NULL.
ALTER TABLE "Participation" ADD COLUMN "idempotencyKey" TEXT;

-- Backfill existing participations (seed data, legacy rows). 'legacy:' prefix
-- keeps them distinguishable from client-generated UUID keys.
UPDATE "Participation" SET "idempotencyKey" = 'legacy:' || "id" WHERE "idempotencyKey" IS NULL;

ALTER TABLE "Participation" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Participation_listingId_idx" ON "Participation"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_buyerCuId_idempotencyKey_key" ON "Participation"("buyerCuId", "idempotencyKey");

-- Last-resort guard: a listing can never be oversold, even if application code fails.
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_remainingAmount_check" CHECK ("remainingAmount" >= 0);
