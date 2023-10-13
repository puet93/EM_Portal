-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "materialNo" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "finish" TEXT,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sample_materialNo_key" ON "Sample"("materialNo");
