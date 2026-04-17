/*
  Warnings:

  - You are about to drop the column `is_deleted` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the `message_files` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "message_types" AS ENUM ('text', 'file', 'mixed', 'system');

-- CreateEnum
CREATE TYPE "message_statuses" AS ENUM ('sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "chat_file_types" AS ENUM ('image', 'video', 'doc');

-- DropForeignKey
ALTER TABLE "message_files" DROP CONSTRAINT "message_files_message_id_fkey";

-- DropIndex
DROP INDEX "messages_chat_id_is_deleted_created_at_idx";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "is_deleted",
DROP COLUMN "updated_at",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "status" "message_statuses" NOT NULL DEFAULT 'sent',
ADD COLUMN     "type" "message_types" NOT NULL DEFAULT 'text',
ALTER COLUMN "content" DROP NOT NULL;

-- DropTable
DROP TABLE "message_files";

-- CreateTable
CREATE TABLE "chat_files" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_type" "chat_file_types" NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "provider" "file_providers" NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_files_message_id_idx" ON "chat_files"("message_id");

-- CreateIndex
CREATE INDEX "chat_files_provider_idx" ON "chat_files"("provider");

-- CreateIndex
CREATE INDEX "chat_files_created_at_idx" ON "chat_files"("created_at");

-- CreateIndex
CREATE INDEX "messages_deleted_at_idx" ON "messages"("deleted_at");

-- AddForeignKey
ALTER TABLE "chat_files" ADD CONSTRAINT "chat_files_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
