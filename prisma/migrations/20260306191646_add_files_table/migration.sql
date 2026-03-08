-- CreateEnum
CREATE TYPE "file_providers" AS ENUM ('local', 'cloudinary');

-- CreateEnum
CREATE TYPE "FileFolder" AS ENUM ('post_document', 'avatar', 'chat_file');

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "post_id" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "provider" "file_providers" NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "folder" "FileFolder" NOT NULL,
    "metadata" JSON,
    "original_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_post_id_idx" ON "files"("post_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_id_idx" ON "files"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "files_provider_idx" ON "files"("provider");

-- CreateIndex
CREATE INDEX "files_folder_idx" ON "files"("folder");

-- CreateIndex
CREATE INDEX "files_post_id_folder_idx" ON "files"("post_id", "folder");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
