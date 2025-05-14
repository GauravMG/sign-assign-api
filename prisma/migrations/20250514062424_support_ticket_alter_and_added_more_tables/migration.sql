/*
  Warnings:

  - You are about to drop the `Feature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Material` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Option` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductFeatureMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductSizeMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Size` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductFeatureMapping" DROP CONSTRAINT "ProductFeatureMapping_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductFeatureMapping" DROP CONSTRAINT "ProductFeatureMapping_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductFeatureMapping" DROP CONSTRAINT "ProductFeatureMapping_featureId_fkey";

-- DropForeignKey
ALTER TABLE "ProductFeatureMapping" DROP CONSTRAINT "ProductFeatureMapping_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductFeatureMapping" DROP CONSTRAINT "ProductFeatureMapping_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductSizeMapping" DROP CONSTRAINT "ProductSizeMapping_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductSizeMapping" DROP CONSTRAINT "ProductSizeMapping_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductSizeMapping" DROP CONSTRAINT "ProductSizeMapping_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductSizeMapping" DROP CONSTRAINT "ProductSizeMapping_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductSizeMapping" DROP CONSTRAINT "ProductSizeMapping_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_updatedById_fkey";

-- DropTable
DROP TABLE "Feature";

-- DropTable
DROP TABLE "Material";

-- DropTable
DROP TABLE "Option";

-- DropTable
DROP TABLE "ProductFeatureMapping";

-- DropTable
DROP TABLE "ProductSizeMapping";

-- DropTable
DROP TABLE "Size";

-- CreateTable
CREATE TABLE "Attribute" (
    "attributeId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("attributeId")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "productAttributeId" SERIAL NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("productAttributeId")
);

-- CreateTable
CREATE TABLE "Variant" (
    "variantId" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sku" TEXT,
    "price" TEXT,
    "stockQuantity" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("variantId")
);

-- CreateTable
CREATE TABLE "VariantAttribute" (
    "variantAttributeId" SERIAL NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "VariantAttribute_pkey" PRIMARY KEY ("variantAttributeId")
);

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("attributeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("attributeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("variantId") ON DELETE CASCADE ON UPDATE CASCADE;
