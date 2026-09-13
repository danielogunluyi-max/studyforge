-- AlterTable
ALTER TABLE "Screenshot" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'capture-studio';
ALTER TABLE "Screenshot" ADD COLUMN "sourceDevice" TEXT NOT NULL DEFAULT 'desktop';

-- CreateIndex
CREATE INDEX "Screenshot_userId_createdAt_idx" ON "Screenshot"("userId", "createdAt");
