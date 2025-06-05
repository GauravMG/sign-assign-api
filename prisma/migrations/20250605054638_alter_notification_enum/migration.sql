/*
  Warnings:

  - Changed the type of `service` on the `NotificationService` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `serviceType` on the `NotificationService` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationServices" AS ENUM ('mailjet', 'google', 'tiara', 'twilio');

-- CreateEnum
CREATE TYPE "NotificationTypes" AS ENUM ('email', 'sms');

-- AlterTable
ALTER TABLE "NotificationService" DROP COLUMN "service",
ADD COLUMN     "service" "NotificationServices" NOT NULL,
DROP COLUMN "serviceType",
ADD COLUMN     "serviceType" "NotificationTypes" NOT NULL;
