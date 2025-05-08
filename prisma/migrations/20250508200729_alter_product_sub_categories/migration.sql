/*
  Warnings:

  - You are about to drop the column `description` on the `ProductSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `ProductSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `ProductSubCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductSubCategory" DROP COLUMN "description",
DROP COLUMN "image",
DROP COLUMN "shortDescription";
