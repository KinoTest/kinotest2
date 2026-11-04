-- AlterTable
ALTER TABLE "User" ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- Every existing account was created by verifying a magic link, so it is already confirmed.
UPDATE "User" SET "confirmedAt" = "createdAt";
