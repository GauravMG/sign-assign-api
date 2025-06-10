/*
  Warnings:

  - The `orderStatus` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "amountDetails" DROP NOT NULL,
DROP COLUMN "orderStatus",
ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL DEFAULT 'pending';
