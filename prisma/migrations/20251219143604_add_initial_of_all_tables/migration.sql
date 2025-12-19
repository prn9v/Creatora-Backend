/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'CREATOR', 'PRO');

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "creditsLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "creditsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "profileImageUrl" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "styleSummary" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "platform" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sourceIdeaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "plan" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPost" ADD CONSTRAINT "PastPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_sourceIdeaId_fkey" FOREIGN KEY ("sourceIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
