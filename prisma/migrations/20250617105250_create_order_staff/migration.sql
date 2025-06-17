-- CreateTable
CREATE TABLE "OrderStaffMapping" (
    "orderStaffMappingId" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "OrderStaffMapping_pkey" PRIMARY KEY ("orderStaffMappingId")
);

-- CreateTable
CREATE TABLE "OrderStaffTask" (
    "orderStaffTaskId" SERIAL NOT NULL,
    "orderStaffMappingId" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "taskStatus" TEXT NOT NULL DEFAULT 'pending',
    "numberOfPeople" INTEGER,
    "remarksByStaff" TEXT,
    "remarksByAdmin" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,

    CONSTRAINT "OrderStaffTask_pkey" PRIMARY KEY ("orderStaffTaskId")
);

-- AddForeignKey
ALTER TABLE "OrderStaffMapping" ADD CONSTRAINT "OrderStaffMapping_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffMapping" ADD CONSTRAINT "OrderStaffMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffMapping" ADD CONSTRAINT "OrderStaffMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffMapping" ADD CONSTRAINT "OrderStaffMapping_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffMapping" ADD CONSTRAINT "OrderStaffMapping_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffTask" ADD CONSTRAINT "OrderStaffTask_orderStaffMappingId_fkey" FOREIGN KEY ("orderStaffMappingId") REFERENCES "OrderStaffMapping"("orderStaffMappingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffTask" ADD CONSTRAINT "OrderStaffTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffTask" ADD CONSTRAINT "OrderStaffTask_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStaffTask" ADD CONSTRAINT "OrderStaffTask_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
