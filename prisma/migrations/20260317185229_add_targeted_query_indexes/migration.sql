-- CreateIndex
CREATE INDEX "chats_updated_at_idx" ON "chats"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_chat_id_is_deleted_created_at_idx" ON "messages"("chat_id", "is_deleted", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_status_expired_at_idx" ON "payments"("status", "expired_at");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_role_periods_user_id_end_date_start_date_idx" ON "user_role_periods"("user_id", "end_date", "start_date" DESC);
