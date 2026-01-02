/*
  Warnings:

  - You are about to drop the column `embedding` on the `PastPost` table. All the data in the column will be lost.
  - Changed the type of `tone` on the `BrandProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `PastPost` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('PROFESSIONAL', 'CASUAL', 'INSPIRING', 'EDUCATIONAL');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'BLOG', 'EMAIL', 'THREAD');

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN     "avgSentenceLength" DOUBLE PRECISION,
ADD COLUMN     "commonPhrases" JSONB,
ADD COLUMN     "emotionalTone" TEXT,
ADD COLUMN     "formalityScore" DOUBLE PRECISION,
ADD COLUMN     "humorUsage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storytellingStyle" TEXT,
ADD COLUMN     "topicPreferences" JSONB,
ADD COLUMN     "vocabularyComplexity" TEXT,
DROP COLUMN "tone",
ADD COLUMN     "tone" "Tone" NOT NULL;

-- AlterTable
ALTER TABLE "PastPost" DROP COLUMN "embedding",
ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "author" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "username" TEXT,
    "followers" INTEGER,
    "engagement" DOUBLE PRECISION,
    "postFrequency" TEXT,
    "metadata" JSONB,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSynced" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_key" ON "SocialAccount"("userId", "platform");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
