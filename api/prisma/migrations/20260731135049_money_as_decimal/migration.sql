/*
  Warnings:

  - You are about to alter the column `principalAmount` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `remainingAmount` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `yieldRate` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(6,3)`.
  - You are about to alter the column `amount` on the `Participation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.

*/
-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "principalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "yieldRate" SET DATA TYPE DECIMAL(6,3);

-- AlterTable
ALTER TABLE "Participation" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);
