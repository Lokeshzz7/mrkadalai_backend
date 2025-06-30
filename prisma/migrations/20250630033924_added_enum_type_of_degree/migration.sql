-- CreateEnum
CREATE TYPE "typeOfDegree" AS ENUM ('UG', 'PG');

-- AlterTable
ALTER TABLE "CustomerDetails" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "degree" "typeOfDegree";
