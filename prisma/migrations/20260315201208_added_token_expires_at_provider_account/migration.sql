-- AlterEnum
ALTER TYPE "auth_providers" ADD VALUE 'github';

-- DropForeignKey
ALTER TABLE "user_role_periods" DROP CONSTRAINT "user_role_periods_user_id_fkey";

-- AlterTable
ALTER TABLE "provider_accounts" ADD COLUMN     "token_expires_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "user_role_periods" ADD CONSTRAINT "user_role_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
