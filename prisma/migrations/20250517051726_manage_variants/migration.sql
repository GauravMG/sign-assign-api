/*
  Warnings:

  - You are about to drop the column `dataType` on the `Attribute` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the `ProductAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductMedia` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `type` to the `Attribute` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'boolean', 'select', 'multi_select', 'dimension');

-- DropForeignKey
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_updatedById_fkey";

-- AlterTable
ALTER TABLE "Attribute" DROP COLUMN "dataType",
ADD COLUMN     "options" TEXT,
ADD COLUMN     "type" "AttributeType" NOT NULL,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "sku",
ADD COLUMN     "name" TEXT;

-- DropTable
DROP TABLE "ProductAttribute";

-- DropTable
DROP TABLE "ProductMedia";

-- CreateTable
CREATE TABLE "VariantMedia" (
    "variantMediaId" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "VariantMedia_pkey" PRIMARY KEY ("variantMediaId")
);

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("variantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
