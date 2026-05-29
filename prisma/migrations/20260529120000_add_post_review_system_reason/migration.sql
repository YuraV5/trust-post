-- Add explicit system reason for automatic post review reassignment flows
CREATE TYPE "post_review_system_reasons" AS ENUM ('moderator_role_changed');

ALTER TABLE "post_reviews"
ADD COLUMN "system_reason" "post_review_system_reasons";
