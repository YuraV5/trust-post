-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'blocked', 'archived', 'completed');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "Currencies" AS ENUM ('uah');

-- DropIndex
DROP INDEX "sessions_refresh_token_hash_idx";

-- CreateTable
CREATE TABLE "user_role_periods" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "user_roles" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currencies" NOT NULL DEFAULT 'uah',
    "reference_payment_id" VARCHAR(255) NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "status_reason" TEXT,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reviews" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "reviewed_by_id" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'pending',
    "review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_periods_user_id_idx" ON "user_role_periods"("user_id");

-- CreateIndex
CREATE INDEX "user_role_periods_role_idx" ON "user_role_periods"("role");

-- CreateIndex
CREATE INDEX "user_role_periods_end_date_idx" ON "user_role_periods"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "posts_reference_payment_id_key" ON "posts"("reference_payment_id");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_reference_payment_id_idx" ON "posts"("reference_payment_id");

-- CreateIndex
CREATE INDEX "post_reviews_post_id_idx" ON "post_reviews"("post_id");

-- CreateIndex
CREATE INDEX "post_reviews_status_idx" ON "post_reviews"("status");

-- CreateIndex
CREATE INDEX "post_reviews_reviewed_by_id_idx" ON "post_reviews"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "post_reviews_created_at_idx" ON "post_reviews"("created_at");

-- CreateIndex
CREATE INDEX "post_reviews_post_id_status_idx" ON "post_reviews"("post_id", "status");

-- CreateIndex
CREATE INDEX "sessions_device_id_idx" ON "sessions"("device_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "user_role_periods" ADD CONSTRAINT "user_role_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reviews" ADD CONSTRAINT "post_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reviews" ADD CONSTRAINT "post_reviews_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
