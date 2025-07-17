-- CreateTable
CREATE TABLE "CouponTag" (
    "couponTagId" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "referenceType" "TemplateTagReference" NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "CouponTag_pkey" PRIMARY KEY ("couponTagId")
);

-- AddForeignKey
ALTER TABLE "CouponTag" ADD CONSTRAINT "CouponTag_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("couponId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTag" ADD CONSTRAINT "CouponTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTag" ADD CONSTRAINT "CouponTag_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTag" ADD CONSTRAINT "CouponTag_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
