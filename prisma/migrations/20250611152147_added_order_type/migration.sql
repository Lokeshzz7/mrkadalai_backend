/*
  Warnings:

  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MANUAL', 'APP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "type" "OrderType" NOT NULL;
