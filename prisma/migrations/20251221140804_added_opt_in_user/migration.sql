-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtp" TEXT,
ADD COLUMN     "reset_otp_expires_at" TIMESTAMP(3);
