-- CreateTable
CREATE TABLE "TherapyAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,
    "amount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapyAssignment_contentItemId_idx" ON "TherapyAssignment"("contentItemId");

-- CreateIndex
CREATE INDEX "TherapyAssignment_assignedById_idx" ON "TherapyAssignment"("assignedById");

-- CreateIndex
CREATE UNIQUE INDEX "TherapyAssignment_userId_contentItemId_key" ON "TherapyAssignment"("userId", "contentItemId");

-- AddForeignKey
ALTER TABLE "TherapyAssignment" ADD CONSTRAINT "TherapyAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyAssignment" ADD CONSTRAINT "TherapyAssignment_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyAssignment" ADD CONSTRAINT "TherapyAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
