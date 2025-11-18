-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- Note: You should update existing users with proper passwords after running this migration
-- The default empty password will prevent login until proper passwords are set
