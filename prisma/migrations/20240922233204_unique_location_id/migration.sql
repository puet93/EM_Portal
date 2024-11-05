/*
  Warnings:

  - A unique constraint covering the columns `[shopifyLocationId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vendor_shopifyLocationId_key" ON "Vendor"("shopifyLocationId");
