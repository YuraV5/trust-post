-- AlterTable
ALTER TABLE "post_files" ADD COLUMN     "main_image" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "post_files_post_id_main_image_idx" ON "post_files"("post_id", "main_image");
