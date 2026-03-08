/*
  Warnings:

  - A unique constraint covering the columns `[post_id]` on the table `chats` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "chat_types" ADD VALUE 'post';

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "post_id" INTEGER;

-- CreateIndex
CREATE INDEX "chats_title_idx" ON "chats"("title");

-- CreateIndex
CREATE INDEX "chats_post_id_idx" ON "chats"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "chats_post_id_key" ON "chats"("post_id");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
