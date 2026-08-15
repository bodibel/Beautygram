-- Az eredeti backfill (20260815104301) a WHERE "isActive" = true feltétellel futott,
-- ami a tulajdonosi publikálási szándékot tévesen a fiókszintű állapothoz kötötte.
-- Egy akkor éppen inaktív fiókú szolgáltató szalonja így véglegesen publikálatlan maradt volna.
--
-- A feltétel szándékosan a createdAt-ra szűr: a migráció után létrehozott szalonok
-- publikálási állapotát a createSalon és a publishSalon/unpublishSalon kezeli,
-- azokat ez a pótlás nem írhatja felül.
UPDATE "Salon"
SET "isPublished" = true,
    "publishedAt" = "createdAt"
WHERE "publishedAt" IS NULL
  AND "createdAt" < TIMESTAMP '2026-08-15 10:43:01';
