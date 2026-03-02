/*
  Warnings:

  - The `status` column on the `post_reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "post_review_statuses" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "post_reviews" DROP COLUMN "status",
ADD COLUMN     "status" "post_review_statuses" NOT NULL DEFAULT 'pending';

-- DropEnum
DROP TYPE "VersionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "post_reviews_post_id_status_key" ON "post_reviews"("post_id", "status");
