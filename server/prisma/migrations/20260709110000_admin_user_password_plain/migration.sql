-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "passwordPlain" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
