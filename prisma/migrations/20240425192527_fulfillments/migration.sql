-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NEW', 'PROCESSING', 'COMPLETE', 'CANCELLED', 'ERROR');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'ERROR';

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentLineItem" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,

    CONSTRAINT "FulfillmentLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingInfo" (
    "number" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,

    CONSTRAINT "TrackingInfo_pkey" PRIMARY KEY ("number")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_name_key" ON "Fulfillment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentLineItem_orderItemId_key" ON "FulfillmentLineItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingInfo_number_key" ON "TrackingInfo"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingInfo_fulfillmentId_key" ON "TrackingInfo"("fulfillmentId");

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentLineItem" ADD CONSTRAINT "FulfillmentLineItem_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentLineItem" ADD CONSTRAINT "FulfillmentLineItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingInfo" ADD CONSTRAINT "TrackingInfo_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
