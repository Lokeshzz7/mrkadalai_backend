-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('NOT_DELIVERED', 'DELIVERED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "status" "OrderItemStatus" NOT NULL DEFAULT 'NOT_DELIVERED';
