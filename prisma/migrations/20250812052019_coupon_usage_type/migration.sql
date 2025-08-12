-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "usageType" TEXT;

-- AlterTable
ALTER TABLE "CustomerDetails" ADD COLUMN     "orderCount" INTEGER NOT NULL DEFAULT 0;
