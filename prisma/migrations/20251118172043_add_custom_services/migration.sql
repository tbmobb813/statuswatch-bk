-- AlterTable
ALTER TABLE "services" ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "userId" TEXT,
ADD COLUMN "checkInterval" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "expectedStatusCode" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN "responseTimeThreshold" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN "checkType" TEXT NOT NULL DEFAULT 'http';

-- CreateIndex
CREATE INDEX "services_userId_idx" ON "services"("userId");

-- CreateIndex
CREATE INDEX "services_isCustom_idx" ON "services"("isCustom");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
