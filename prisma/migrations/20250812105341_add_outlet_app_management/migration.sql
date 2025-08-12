-- CreateEnum
CREATE TYPE "OutletAppFeature" AS ENUM ('APP', 'UPI', 'LIVE_COUNTER', 'COUPONS');

-- CreateTable
CREATE TABLE "OutletAppManagement" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "feature" "OutletAppFeature" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OutletAppManagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutletAppManagement_outletId_feature_idx" ON "OutletAppManagement"("outletId", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "OutletAppManagement_outletId_feature_key" ON "OutletAppManagement"("outletId", "feature");

-- AddForeignKey
ALTER TABLE "OutletAppManagement" ADD CONSTRAINT "OutletAppManagement_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
