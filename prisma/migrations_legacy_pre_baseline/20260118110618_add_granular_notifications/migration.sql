/*
  Warnings:

  - You are about to drop the column `emailNotifications` on the `Salon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Salon" DROP COLUMN "emailNotifications",
ADD COLUMN     "notifyMonthlyStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyNewMessage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPostComment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPostLike" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyWeeklyStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showEmailOnProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showPhoneOnProfile" BOOLEAN NOT NULL DEFAULT true;
