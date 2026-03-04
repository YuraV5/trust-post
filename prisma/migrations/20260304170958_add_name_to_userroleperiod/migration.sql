/*
  Warnings:

  - Added the required column `name` to the `user_role_periods` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_role_periods" ADD COLUMN     "name" VARCHAR(128) NOT NULL;
