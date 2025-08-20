/*
  Warnings:

  - A unique constraint covering the columns `[deviceToken]` on the table `UserDeviceToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserDeviceToken_userId_deviceToken_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserDeviceToken_deviceToken_key" ON "UserDeviceToken"("deviceToken");
