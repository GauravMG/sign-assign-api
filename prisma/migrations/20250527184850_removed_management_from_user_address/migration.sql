/*
  Warnings:

  - You are about to drop the `UserAddressManagement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAddressManagement" DROP CONSTRAINT "UserAddressManagement_createdById_fkey";

-- DropForeignKey
ALTER TABLE "UserAddressManagement" DROP CONSTRAINT "UserAddressManagement_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "UserAddressManagement" DROP CONSTRAINT "UserAddressManagement_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "UserAddressManagement" DROP CONSTRAINT "UserAddressManagement_userId_fkey";

-- DropTable
DROP TABLE "UserAddressManagement";

-- CreateTable
CREATE TABLE "UserAddress" (
    "userAddressId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "postal" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefaultBillingAddress" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultShippingAddress" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("userAddressId")
);

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
