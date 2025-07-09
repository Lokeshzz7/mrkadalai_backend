-- AlterTable
ALTER TABLE "CustomerDetails" ALTER COLUMN "yearOfStudy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Outlet" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;
