/*
  Warnings:

  - Added the required column `shortDescription` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "shortDescription" TEXT NOT NULL;
