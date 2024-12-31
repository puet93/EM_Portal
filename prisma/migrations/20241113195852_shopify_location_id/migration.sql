-- AlterTable
ALTER TABLE "Fulfillment" ADD COLUMN     "shopifyLocationId" TEXT;

-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN     "shopifyLocationId" TEXT;
