/*
  Warnings:

  - Changed the type of `status` on the `WalletTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WalletTransType" AS ENUM ('RECHARGE', 'DEDUCT');

-- AlterTable
ALTER TABLE "WalletTransaction" DROP COLUMN "status",
ADD COLUMN     "status" "WalletTransType" NOT NULL;
