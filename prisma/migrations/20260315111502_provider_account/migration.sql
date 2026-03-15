-- CreateEnum
CREATE TYPE "auth_providers" AS ENUM ('google');

-- CreateTable
CREATE TABLE "provider_accounts" (
    "id" TEXT NOT NULL,
    "provider" "auth_providers" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_data" JSON,
    "access_token" VARCHAR(512),
    "refresh_token" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_accounts_user_id_idx" ON "provider_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_accounts_provider_provider_id_key" ON "provider_accounts"("provider", "provider_id");

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
