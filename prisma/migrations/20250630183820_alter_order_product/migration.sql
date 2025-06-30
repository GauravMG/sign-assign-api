-- AlterTable
ALTER TABLE "OrderProduct" ADD COLUMN     "design" JSONB,
ADD COLUMN     "templateId" INTEGER;

-- AddForeignKey
ALTER TABLE "OrderProduct" ADD CONSTRAINT "OrderProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("templateId") ON DELETE SET NULL ON UPDATE CASCADE;
