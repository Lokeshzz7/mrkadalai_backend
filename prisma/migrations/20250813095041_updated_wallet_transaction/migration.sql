-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "grossAmount" DOUBLE PRECISION,
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "serviceCharge" DOUBLE PRECISION;
