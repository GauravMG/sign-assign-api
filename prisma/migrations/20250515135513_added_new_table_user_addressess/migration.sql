-- CreateTable
CREATE TABLE "UserAddressManagement" (
    "userAddressManagementId" SERIAL NOT NULL,
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

    CONSTRAINT "UserAddressManagement_pkey" PRIMARY KEY ("userAddressManagementId")
);

-- AddForeignKey
ALTER TABLE "UserAddressManagement" ADD CONSTRAINT "UserAddressManagement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddressManagement" ADD CONSTRAINT "UserAddressManagement_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddressManagement" ADD CONSTRAINT "UserAddressManagement_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddressManagement" ADD CONSTRAINT "UserAddressManagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
