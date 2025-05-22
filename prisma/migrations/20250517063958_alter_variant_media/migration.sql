/*
  Warnings:

  - Added the required column `sequenceNumber` to the `VariantMedia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VariantMedia" ADD COLUMN     "sequenceNumber" INTEGER NOT NULL;
