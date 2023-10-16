/*
  Warnings:

  - A unique constraint covering the columns `[gid]` on the table `Sample` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "gid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sample_gid_key" ON "Sample"("gid");
