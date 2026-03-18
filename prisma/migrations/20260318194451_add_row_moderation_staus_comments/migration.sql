/*
  Warnings:

  - The values [VISIBLE,DELETED] on the enum `comment_statuses` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "moderators" AS ENUM ('local', 'agent');

-- CreateEnum
CREATE TYPE "moderation_statuses" AS ENUM ('pending', 'processing', 'failed', 'done');

-- AlterEnum
BEGIN;
CREATE TYPE "comment_statuses_new" AS ENUM ('rejected', 'visible', 'deleted');
ALTER TABLE "comments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "comments" ALTER COLUMN "status" TYPE "comment_statuses_new" USING ("status"::text::"comment_statuses_new");
ALTER TYPE "comment_statuses" RENAME TO "comment_statuses_old";
ALTER TYPE "comment_statuses_new" RENAME TO "comment_statuses";
DROP TYPE "comment_statuses_old";
ALTER TABLE "comments" ALTER COLUMN "status" SET DEFAULT 'visible';
COMMIT;

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "moderated_at" TIMESTAMP(3),
ADD COLUMN     "moderation_provider" TEXT,
ADD COLUMN     "moderation_reason" TEXT,
ADD COLUMN     "moderation_score" DOUBLE PRECISION,
ADD COLUMN     "moderation_status" "moderation_statuses" NOT NULL DEFAULT 'pending',
ADD COLUMN     "moderator_type" "moderators",
ALTER COLUMN "status" SET DEFAULT 'visible';

-- CreateIndex
CREATE INDEX "comments_status_idx" ON "comments"("status");

-- CreateIndex
CREATE INDEX "comments_moderator_type_idx" ON "comments"("moderator_type");

-- CreateIndex
CREATE INDEX "comments_moderation_status_idx" ON "comments"("moderation_status");
