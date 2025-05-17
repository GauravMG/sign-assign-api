-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "isFilterable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VariantAttribute" ADD COLUMN     "additionalPrice" TEXT,
ADD COLUMN     "mediaUrl" TEXT;
