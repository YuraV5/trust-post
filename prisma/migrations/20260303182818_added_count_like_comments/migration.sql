-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "total_likes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "post_reviews" ADD COLUMN     "total_comments" INTEGER NOT NULL DEFAULT 0;
