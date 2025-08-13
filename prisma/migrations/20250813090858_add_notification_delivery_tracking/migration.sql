-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" SERIAL NOT NULL,
    "scheduledNotificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationDelivery_scheduledNotificationId_status_idx" ON "NotificationDelivery"("scheduledNotificationId", "status");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_status_idx" ON "NotificationDelivery"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_scheduledNotificationId_userId_deviceT_key" ON "NotificationDelivery"("scheduledNotificationId", "userId", "deviceToken");

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_scheduledNotificationId_fkey" FOREIGN KEY ("scheduledNotificationId") REFERENCES "ScheduledNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
