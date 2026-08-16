-- AlterTable
ALTER TABLE "SubscriptionConfig" ADD COLUMN     "billingEnabledAt" TIMESTAMP(3),
ADD COLUMN     "freeSalonSlots" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "freeSlotTrialDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 30;
