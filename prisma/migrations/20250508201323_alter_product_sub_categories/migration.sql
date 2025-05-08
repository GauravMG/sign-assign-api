/*
  Warnings:

  - Added the required column `description` to the `ProductSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `ProductSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortDescription` to the `ProductSubCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductSubCategory" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "shortDescription" TEXT NOT NULL;
