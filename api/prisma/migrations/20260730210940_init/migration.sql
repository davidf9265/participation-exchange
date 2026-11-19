-- CreateEnum
CREATE TYPE "RiskGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('OPEN', 'FUNDED');

-- CreateTable
CREATE TABLE "CreditUnion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "charterNumber" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "CreditUnion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sellerCuId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "yieldRate" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "riskGrade" "RiskGrade" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'OPEN',
    "originatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerCuId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditUnion_charterNumber_key" ON "CreditUnion"("charterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_reference_key" ON "Listing"("reference");

-- CreateIndex
CREATE INDEX "Listing_riskGrade_idx" ON "Listing"("riskGrade");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Participation_buyerCuId_idx" ON "Participation"("buyerCuId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerCuId_fkey" FOREIGN KEY ("sellerCuId") REFERENCES "CreditUnion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_buyerCuId_fkey" FOREIGN KEY ("buyerCuId") REFERENCES "CreditUnion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
