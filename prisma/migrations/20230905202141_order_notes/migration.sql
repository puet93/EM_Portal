/*
  Warnings:

  - You are about to drop the column `notes` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "notes";

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
