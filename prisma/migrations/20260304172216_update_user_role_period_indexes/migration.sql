-- CreateIndex
CREATE INDEX "user_role_periods_user_id_end_date_idx" ON "user_role_periods"("user_id", "end_date");
