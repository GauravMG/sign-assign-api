/*
  Warnings:

  - You are about to drop the column `link` on the `ProductMedia` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `ProductReviewMedia` table. All the data in the column will be lost.
  - Added the required column `mediaUrl` to the `ProductMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ProductMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `ProductMedia` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `mediaType` on the `ProductMedia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `mediaUrl` to the `ProductReviewMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ProductReviewMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `ProductReviewMedia` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `mediaType` on the `ProductReviewMedia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ProductMedia" DROP COLUMN "link",
ADD COLUMN     "mediaUrl" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL,
DROP COLUMN "mediaType",
ADD COLUMN     "mediaType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductReviewMedia" DROP COLUMN "link",
ADD COLUMN     "mediaUrl" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL,
DROP COLUMN "mediaType",
ADD COLUMN     "mediaType" TEXT NOT NULL;
