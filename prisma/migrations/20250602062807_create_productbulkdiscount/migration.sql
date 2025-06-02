-- CreateTable
CREATE TABLE "ProductBulkDiscount" (
    "productBulkDiscount" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "dataJson" JSONB NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductBulkDiscount_pkey" PRIMARY KEY ("productBulkDiscount")
);

-- AddForeignKey
ALTER TABLE "ProductBulkDiscount" ADD CONSTRAINT "ProductBulkDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBulkDiscount" ADD CONSTRAINT "ProductBulkDiscount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBulkDiscount" ADD CONSTRAINT "ProductBulkDiscount_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBulkDiscount" ADD CONSTRAINT "ProductBulkDiscount_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
