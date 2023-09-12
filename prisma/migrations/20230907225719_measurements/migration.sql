-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "name" TEXT NOT NULL,
    "singular" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "unitOfMeasureName" TEXT NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_singular_key" ON "UnitOfMeasure"("singular");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_abbreviation_key" ON "UnitOfMeasure"("abbreviation");

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_unitOfMeasureName_fkey" FOREIGN KEY ("unitOfMeasureName") REFERENCES "UnitOfMeasure"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
