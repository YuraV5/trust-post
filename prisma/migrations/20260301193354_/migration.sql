/*
  Warnings:

  - A unique constraint covering the columns `[post_id,status]` on the table `post_reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "post_reviews_post_id_status_idx";

-- DropIndex
DROP INDEX "post_reviews_status_idx";

-- CreateIndex
CREATE UNIQUE INDEX "post_reviews_post_id_status_key" ON "post_reviews"("post_id", "status");
