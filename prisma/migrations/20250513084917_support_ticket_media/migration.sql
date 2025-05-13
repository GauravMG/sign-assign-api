/*
  Warnings:

  - You are about to drop the `ProductFAQ` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductFAQ" DROP CONSTRAINT "ProductFAQ_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductFAQ" DROP CONSTRAINT "ProductFAQ_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductFAQ" DROP CONSTRAINT "ProductFAQ_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductFAQ" DROP CONSTRAINT "ProductFAQ_updatedById_fkey";

-- DropTable
DROP TABLE "ProductFAQ";

-- CreateTable
CREATE TABLE "SupportTicketMedia" (
    "supportTicketMediaId" SERIAL NOT NULL,
    "supportTicketId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "SupportTicketMedia_pkey" PRIMARY KEY ("supportTicketMediaId")
);

-- AddForeignKey
ALTER TABLE "SupportTicketMedia" ADD CONSTRAINT "SupportTicketMedia_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("supportTicketId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMedia" ADD CONSTRAINT "SupportTicketMedia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMedia" ADD CONSTRAINT "SupportTicketMedia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMedia" ADD CONSTRAINT "SupportTicketMedia_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
