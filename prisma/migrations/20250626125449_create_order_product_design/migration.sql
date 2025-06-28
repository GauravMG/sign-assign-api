-- CreateTable
CREATE TABLE "OrderProductDesign" (
    "orderProductDesignId" SERIAL NOT NULL,
    "orderProductId" INTEGER NOT NULL,
    "dataJson" JSONB NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "OrderProductDesign_pkey" PRIMARY KEY ("orderProductDesignId")
);

-- AddForeignKey
ALTER TABLE "OrderProductDesign" ADD CONSTRAINT "OrderProductDesign_orderProductId_fkey" FOREIGN KEY ("orderProductId") REFERENCES "OrderProduct"("orderProductId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductDesign" ADD CONSTRAINT "OrderProductDesign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductDesign" ADD CONSTRAINT "OrderProductDesign_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductDesign" ADD CONSTRAINT "OrderProductDesign_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
