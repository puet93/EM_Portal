-- AlterTable
ALTER TABLE "VendorProduct" ADD COLUMN     "sampleMaterialNo" TEXT;

-- AddForeignKey
ALTER TABLE "VendorProduct" ADD CONSTRAINT "VendorProduct_sampleMaterialNo_fkey" FOREIGN KEY ("sampleMaterialNo") REFERENCES "Sample"("materialNo") ON DELETE SET NULL ON UPDATE CASCADE;
