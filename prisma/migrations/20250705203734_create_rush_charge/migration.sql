-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('flat', 'percentage');

-- CreateTable
CREATE TABLE "RushHourRate" (
    "rushHourRateId" SERIAL NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION,
    "chargeType" "ChargeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "RushHourRate_pkey" PRIMARY KEY ("rushHourRateId")
);

-- AddForeignKey
ALTER TABLE "RushHourRate" ADD CONSTRAINT "RushHourRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushHourRate" ADD CONSTRAINT "RushHourRate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushHourRate" ADD CONSTRAINT "RushHourRate_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
