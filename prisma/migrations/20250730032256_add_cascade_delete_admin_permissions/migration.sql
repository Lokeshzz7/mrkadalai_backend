-- DropForeignKey
ALTER TABLE "AdminPermission" DROP CONSTRAINT "AdminPermission_adminId_fkey";

-- DropForeignKey
ALTER TABLE "AdminPermission" DROP CONSTRAINT "AdminPermission_adminOutletId_fkey";

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_adminOutletId_fkey" FOREIGN KEY ("adminOutletId") REFERENCES "AdminOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
