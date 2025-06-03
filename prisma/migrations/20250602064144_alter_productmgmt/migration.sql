/*
  Warnings:

  - The primary key for the `ProductBulkDiscount` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `productBulkDiscount` on the `ProductBulkDiscount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductBulkDiscount" DROP CONSTRAINT "ProductBulkDiscount_pkey",
DROP COLUMN "productBulkDiscount",
ADD COLUMN     "productBulkDiscountId" SERIAL NOT NULL,
ADD CONSTRAINT "ProductBulkDiscount_pkey" PRIMARY KEY ("productBulkDiscountId");
