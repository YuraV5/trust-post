/*
  Warnings:

  - You are about to drop the `files` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_post_id_fkey";

-- DropTable
DROP TABLE "files";

-- DropEnum
DROP TYPE "FileFolder";

-- CreateTable
CREATE TABLE "post_files" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "post_id" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "provider" "file_providers" NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "metadata" JSON,
    "original_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_files_post_id_idx" ON "post_files"("post_id");

-- CreateIndex
CREATE INDEX "post_files_uploaded_by_id_idx" ON "post_files"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "post_files_provider_idx" ON "post_files"("provider");

-- CreateIndex
CREATE INDEX "post_files_created_at_idx" ON "post_files"("created_at");

-- AddForeignKey
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
