-- CreateIndex
CREATE INDEX "users_is_email_verified_created_at_idx" ON "users"("is_email_verified", "created_at");
