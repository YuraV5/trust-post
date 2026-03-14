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
    "reference_payment_id" VARCHAR(255) NOT NULL,
    "last_attempt_id" VARCHAR(255),
    "confirmed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider" "payment_providers" NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "status" "payment_statuses" NOT NULL DEFAULT 'pending',
    "provider_response" JSON,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_post_id_idx" ON "payments"("post_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_last_attempt_id_idx" ON "payments"("last_attempt_id");

-- CreateIndex
CREATE INDEX "payments_reference_payment_id_idx" ON "payments"("reference_payment_id");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_idx" ON "payment_attempts"("payment_id");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_created_at_idx" ON "payment_attempts"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_attempts_provider_idx" ON "payment_attempts"("provider");

-- CreateIndex
CREATE INDEX "payment_attempts_provider_payment_id_idx" ON "payment_attempts"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_provider_payment_id_key" ON "payment_attempts"("provider", "provider_payment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_last_attempt_id_fkey" FOREIGN KEY ("last_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
