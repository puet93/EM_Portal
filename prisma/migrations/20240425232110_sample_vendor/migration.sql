-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "vendorId" TEXT;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
