/*
  Warnings:

  - Added the required column `productCategoryId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSubCategoryId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productCategoryId" INTEGER NOT NULL,
ADD COLUMN     "productSubCategoryId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("productCategoryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productSubCategoryId_fkey" FOREIGN KEY ("productSubCategoryId") REFERENCES "ProductSubCategory"("productSubCategoryId") ON DELETE CASCADE ON UPDATE CASCADE;
