-- CreateEnum
CREATE TYPE "UserActionType" AS ENUM ('like', 'comment', 'share');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "specification" TEXT;

-- CreateTable
CREATE TABLE "ProductFAQ" (
    "productFAQId" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductFAQ_pkey" PRIMARY KEY ("productFAQId")
);

-- CreateTable
CREATE TABLE "ProductFAQUserAction" (
    "productFAQUserActionId" SERIAL NOT NULL,
    "productFAQId" INTEGER NOT NULL,
    "userActionType" "UserActionType" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductFAQUserAction_pkey" PRIMARY KEY ("productFAQUserActionId")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "productReviewId" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("productReviewId")
);

-- CreateTable
CREATE TABLE "ProductReviewMedia" (
    "productReviewMediaId" SERIAL NOT NULL,
    "productReviewId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "link" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductReviewMedia_pkey" PRIMARY KEY ("productReviewMediaId")
);

-- CreateTable
CREATE TABLE "ProductReviewUserAction" (
    "productReviewUserActionId" SERIAL NOT NULL,
    "productReviewId" INTEGER NOT NULL,
    "userActionType" "UserActionType" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "ProductReviewUserAction_pkey" PRIMARY KEY ("productReviewUserActionId")
);

-- AddForeignKey
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQUserAction" ADD CONSTRAINT "ProductFAQUserAction_productFAQId_fkey" FOREIGN KEY ("productFAQId") REFERENCES "ProductFAQ"("productFAQId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQUserAction" ADD CONSTRAINT "ProductFAQUserAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQUserAction" ADD CONSTRAINT "ProductFAQUserAction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFAQUserAction" ADD CONSTRAINT "ProductFAQUserAction_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewMedia" ADD CONSTRAINT "ProductReviewMedia_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("productReviewId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewMedia" ADD CONSTRAINT "ProductReviewMedia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewMedia" ADD CONSTRAINT "ProductReviewMedia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewMedia" ADD CONSTRAINT "ProductReviewMedia_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewUserAction" ADD CONSTRAINT "ProductReviewUserAction_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("productReviewId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewUserAction" ADD CONSTRAINT "ProductReviewUserAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewUserAction" ADD CONSTRAINT "ProductReviewUserAction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewUserAction" ADD CONSTRAINT "ProductReviewUserAction_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
