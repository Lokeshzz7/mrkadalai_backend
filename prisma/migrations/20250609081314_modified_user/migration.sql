/*
  Warnings:

  - You are about to drop the column `phone` on the `CustomerDetails` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `StaffDetails` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `StaffDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerDetails" DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "StaffDetails" DROP COLUMN "fullName",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
