/*
  Warnings:

  - A unique constraint covering the columns `[outletId,date]` on the table `OutletAvailability` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OutletAvailability_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "OutletAvailability_outletId_date_key" ON "OutletAvailability"("outletId", "date");
