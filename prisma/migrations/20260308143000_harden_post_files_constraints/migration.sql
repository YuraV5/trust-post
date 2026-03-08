-- Enforce idempotent linking for files within a single post
CREATE UNIQUE INDEX "post_files_post_id_provider_storage_key_key"
ON "post_files"("post_id", "provider", "storage_key");

-- Enforce at most one main image per post (partial unique index)
CREATE UNIQUE INDEX "post_files_one_main_image_per_post_key"
ON "post_files"("post_id")
WHERE "main_image" = true;
