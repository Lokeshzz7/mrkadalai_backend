/*
  Warnings:

  - The values [ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Outlet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AdminPermissionType" AS ENUM ('ORDER_MANAGEMENT', 'STAFF_MANAGEMENT', 'INVENTORY_MANAGEMENT', 'EXPENDITURE_MANAGEMENT', 'WALLET_MANAGEMENT', 'CUSTOMER_MANAGEMENT', 'TICKET_MANAGEMENT', 'NOTIFICATIONS_MANAGEMENT', 'PRODUCT_MANAGEMENT', 'APP_MANAGEMENT', 'REPORTS_ANALYTICS', 'SETTINGS', 'ONBOARDING', 'ADMIN_MANAGEMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'STAFF', 'SUPERADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOutlet" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,

    CONSTRAINT "AdminOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" SERIAL NOT NULL,
    "adminOutletId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "type" "AdminPermissionType" NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminOutlet_adminId_outletId_key" ON "AdminOutlet"("adminId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_name_key" ON "Outlet"("name");

-- AddForeignKey
ALTER TABLE "AdminOutlet" ADD CONSTRAINT "AdminOutlet_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOutlet" ADD CONSTRAINT "AdminOutlet_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_adminOutletId_fkey" FOREIGN KEY ("adminOutletId") REFERENCES "AdminOutlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
