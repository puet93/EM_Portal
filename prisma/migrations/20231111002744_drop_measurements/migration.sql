/*
  Warnings:

  - You are about to drop the column `measurementId` on the `VendorProduct` table. All the data in the column will be lost.
  - You are about to drop the `Measurement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnitOfMeasure` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Measurement" DROP CONSTRAINT "Measurement_unitOfMeasureName_fkey";

-- DropForeignKey
ALTER TABLE "VendorProduct" DROP CONSTRAINT "VendorProduct_measurementId_fkey";

-- AlterTable
ALTER TABLE "VendorProduct" DROP COLUMN "measurementId";

-- DropTable
DROP TABLE "Measurement";

-- DropTable
DROP TABLE "UnitOfMeasure";
