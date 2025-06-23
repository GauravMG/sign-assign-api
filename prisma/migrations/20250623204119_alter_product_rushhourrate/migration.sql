/*
  Warnings:

  - You are about to drop the column `amount` on the `ProductRushHourRate` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ProductRushHourRate` table. All the data in the column will be lost.
  - Added the required column `dataJson` to the `ProductRushHourRate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductRushHourRate" DROP COLUMN "amount",
DROP COLUMN "quantity",
ADD COLUMN     "dataJson" JSONB NOT NULL;
