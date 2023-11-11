-- CreateEnum
CREATE TYPE "Material" AS ENUM ('CERAMIC', 'PORCELAIN');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('INCHES', 'MILLIMETERS', 'CENTIMETERS');

-- CreateTable
CREATE TABLE "Tile" (
    "id" SERIAL NOT NULL,
    "color" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "widthUnit" "UnitOfMeasure" NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "lengthUnit" "UnitOfMeasure" NOT NULL,
    "thickness" DOUBLE PRECISION NOT NULL,
    "thicknessUnit" "UnitOfMeasure" NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tile_productId_key" ON "Tile"("productId");

-- AddForeignKey
ALTER TABLE "Tile" ADD CONSTRAINT "Tile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RetailerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
