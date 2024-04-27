/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_name_key" ON "Order"("name");
