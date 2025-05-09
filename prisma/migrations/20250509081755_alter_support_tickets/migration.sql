/*
  Warnings:

  - You are about to drop the column `message` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SupportTicket` table. All the data in the column will be lost.
  - Added the required column `description` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "message",
DROP COLUMN "userId",
ADD COLUMN     "description" TEXT NOT NULL;
