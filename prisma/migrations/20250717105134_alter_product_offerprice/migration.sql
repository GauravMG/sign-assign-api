/*
  Warnings:

  - The `offerPrice` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "offerPriceType" "DiscountType",
DROP COLUMN "offerPrice",
ADD COLUMN     "offerPrice" DOUBLE PRECISION;
