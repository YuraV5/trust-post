-- Add boolean soft-delete marker for chat messages
ALTER TABLE "messages"
ADD COLUMN "is_delete" BOOLEAN NOT NULL DEFAULT false;

-- Speed up cleanup scans by soft-delete flag
CREATE INDEX "messages_is_delete_idx" ON "messages"("is_delete");
