-- AlterTable
ALTER TABLE "Fulfillment" ADD COLUMN     "shopifyLocationName" TEXT;

-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN     "shopifyLocationName" TEXT;
