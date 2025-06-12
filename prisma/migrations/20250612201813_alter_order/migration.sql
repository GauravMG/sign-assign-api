/*
  Warnings:

  - Added the required column `shippingAddressDetails` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingAddressId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingAddressDetails" JSONB NOT NULL,
ADD COLUMN     "shippingAddressId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "UserAddress"("userAddressId") ON DELETE NO ACTION ON UPDATE CASCADE;
