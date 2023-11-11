/*
  Warnings:

  - Changed the type of `material` on the `Tile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Tile" DROP COLUMN "material",
ADD COLUMN     "material" "Material" NOT NULL;
