/*
  Warnings:

  - You are about to drop the column `orderItemId` on the `FulfillmentLineItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderLineItemId]` on the table `FulfillmentLineItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderLineItemId` to the `FulfillmentLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FulfillmentLineItem" DROP CONSTRAINT "FulfillmentLineItem_orderItemId_fkey";

-- DropIndex
DROP INDEX "FulfillmentLineItem_orderItemId_key";

-- AlterTable
ALTER TABLE "FulfillmentLineItem" DROP COLUMN "orderItemId",
ADD COLUMN     "orderLineItemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentLineItem_orderLineItemId_key" ON "FulfillmentLineItem"("orderLineItemId");

-- AddForeignKey
ALTER TABLE "FulfillmentLineItem" ADD CONSTRAINT "FulfillmentLineItem_orderLineItemId_fkey" FOREIGN KEY ("orderLineItemId") REFERENCES "OrderLineItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
