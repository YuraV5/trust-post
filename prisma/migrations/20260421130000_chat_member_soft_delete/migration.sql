-- Add per-user soft-delete state for chats
ALTER TABLE "chat_members"
ADD COLUMN "is_delete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "chat_members_is_delete_idx" ON "chat_members"("is_delete");
CREATE INDEX "chat_members_deleted_at_idx" ON "chat_members"("deleted_at");
