-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "allowBookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
