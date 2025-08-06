-- CreateTable
CREATE TABLE "OutletAvailability" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nonAvailableSlots" JSON NOT NULL,

    CONSTRAINT "OutletAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutletAvailability_date_key" ON "OutletAvailability"("date");

-- CreateIndex
CREATE INDEX "OutletAvailability_outletId_date_idx" ON "OutletAvailability"("outletId", "date");

-- AddForeignKey
ALTER TABLE "OutletAvailability" ADD CONSTRAINT "OutletAvailability_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
