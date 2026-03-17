/*
  Warnings:

  - The primary key for the `comment_likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `comment_likes` table. All the data in the column will be lost.
  - The primary key for the `post_likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `post_likes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "comment_likes_comment_id_idx";

-- DropIndex
DROP INDEX "comment_likes_comment_id_user_id_key";

-- DropIndex
DROP INDEX "comment_likes_user_id_idx";

-- DropIndex
DROP INDEX "messages_chat_id_idx";

-- DropIndex
DROP INDEX "messages_sender_id_idx";

-- DropIndex
DROP INDEX "post_likes_post_id_idx";

-- DropIndex
DROP INDEX "post_likes_post_id_user_id_key";

-- DropIndex
DROP INDEX "post_likes_user_id_idx";

-- DropIndex
DROP INDEX "posts_created_at_idx";

-- DropIndex
DROP INDEX "users_created_at_idx";

-- DropIndex
DROP INDEX "users_role_idx";

-- AlterTable
ALTER TABLE "comment_likes" DROP CONSTRAINT "comment_likes_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id", "user_id");

-- AlterTable
ALTER TABLE "post_likes" DROP CONSTRAINT "post_likes_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id");

-- CreateIndex
CREATE INDEX "chats_type_created_at_idx" ON "chats"("type", "created_at");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "comments_author_id_created_at_idx" ON "comments"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages"("chat_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_status_idx" ON "payment_attempts"("payment_id", "status");

-- CreateIndex
CREATE INDEX "payment_attempts_provider_created_at_idx" ON "payment_attempts"("provider", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_post_id_status_idx" ON "payments"("post_id", "status");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_status_created_at_idx" ON "posts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_status_target_date_idx" ON "posts"("status", "target_date");

-- CreateIndex
CREATE INDEX "private_chats_user2_id_user1_id_idx" ON "private_chats"("user2_id", "user1_id");

-- CreateIndex
CREATE INDEX "provider_accounts_provider_user_id_idx" ON "provider_accounts"("provider", "user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "user_role_periods_user_id_start_date_idx" ON "user_role_periods"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "user_role_periods_role_end_date_idx" ON "user_role_periods"("role", "end_date");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");
