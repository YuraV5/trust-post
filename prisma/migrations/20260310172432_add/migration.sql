-- CreateEnum
CREATE TYPE "payment_statuses" AS ENUM ('pending', 'success', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "payment_providers" AS ENUM ('wayforpay');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "currencies" NOT NULL DEFAULT 'uah',
    "status" "payment_statuses" NOT NULL DEFAULT 'pending',
    "provider" "payment_providers" NOT NULL,
    "provider_payment_id" TEXT,
    "reference_payment_id" VARCHAR(255) NOT NULL,
    "donor_email" TEXT,
    "donor_name" TEXT,
    "message" TEXT,
    "provider_payload" JSONB,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_post_id_idx" ON "payments"("post_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_reference_payment_id_idx" ON "payments"("reference_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
