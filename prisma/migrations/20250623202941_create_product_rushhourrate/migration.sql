-- CreateTable
CREATE TABLE "ProductRushHourRate" (
    "productRushHourRateId" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductRushHourRate_pkey" PRIMARY KEY ("productRushHourRateId")
);

-- AddForeignKey
ALTER TABLE "ProductRushHourRate" ADD CONSTRAINT "ProductRushHourRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRushHourRate" ADD CONSTRAINT "ProductRushHourRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRushHourRate" ADD CONSTRAINT "ProductRushHourRate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRushHourRate" ADD CONSTRAINT "ProductRushHourRate_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
