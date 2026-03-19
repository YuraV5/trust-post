/*
  Warnings:

  - The values [visible] on the enum `comment_statuses` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `moderation_status` on the `comments` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "comment_statuses_new" AS ENUM ('pending', 'processing', 'approved', 'rejected', 'failed', 'deleted');
ALTER TABLE "comments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "comments" ALTER COLUMN "status" TYPE "comment_statuses_new" USING ("status"::text::"comment_statuses_new");
ALTER TYPE "comment_statuses" RENAME TO "comment_statuses_old";
ALTER TYPE "comment_statuses_new" RENAME TO "comment_statuses";
DROP TYPE "comment_statuses_old";
ALTER TABLE "comments" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropIndex
DROP INDEX "comments_moderation_status_idx";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "moderation_status",
ALTER COLUMN "status" SET DEFAULT 'pending';

-- DropEnum
DROP TYPE "moderation_statuses";
