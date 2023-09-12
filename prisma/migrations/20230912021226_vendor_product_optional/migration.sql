-- DropForeignKey
ALTER TABLE "RetailerProduct" DROP CONSTRAINT "RetailerProduct_vendorProductId_fkey";

-- AlterTable
ALTER TABLE "RetailerProduct" ALTER COLUMN "vendorProductId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_vendorProductId_fkey" FOREIGN KEY ("vendorProductId") REFERENCES "VendorProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
