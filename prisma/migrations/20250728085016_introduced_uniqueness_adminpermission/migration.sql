/*
  Warnings:

  - A unique constraint covering the columns `[adminOutletId,type]` on the table `AdminPermission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_adminOutletId_type_key" ON "AdminPermission"("adminOutletId", "type");
