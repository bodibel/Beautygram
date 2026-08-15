-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishBlockedAt" TIMESTAMP(3),
ADD COLUMN     "publishBlockedReason" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubscriptionConfig" ADD COLUMN     "billingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: minden meglévő szalon publikáltnak számít.
-- A jelenlegi adatokban nincs inaktív szalon, ezért nincs kétértelmű eset arról,
-- hogy egy inaktív szalon előfizetés vagy fiók miatt lett-e az.
UPDATE "Salon"
SET "isPublished" = true,
    "publishedAt" = "createdAt"
WHERE "isActive" = true;

-- Backfill: előfizetési rekord pótlása azoknak a szalonoknak, amelyeknek nincs.
-- freeExpiresAt szándékosan NULL: az 1. fázisban semmi nem jár le.
INSERT INTO "Subscription" (
    "id", "salonId", "plan", "status", "billingCurrency",
    "freeStartedAt", "freeExpiresAt", "postWindowStart", "postCountInWindow",
    "cancelAtPeriodEnd", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text, s."id", 'FREE', 'ACTIVE', s."currency",
    NOW(), NULL, NOW(), 0,
    false, NOW(), NOW()
FROM "Salon" s
WHERE NOT EXISTS (SELECT 1 FROM "Subscription" sub WHERE sub."salonId" = s."id");

-- A konfigurációs singleton létrehozása, ha még nem létezik.
INSERT INTO "SubscriptionConfig" ("id", "billingEnabled", "updatedAt")
SELECT gen_random_uuid()::text, false, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionConfig");
