# Legacy Pre-Baseline Migrations

This directory contains the pre-baseline migration chain that existed before the accepted baseline migration repair.

These folders are preserved for historical reference only.

Operationally:

- they are not the authoritative fresh-build path anymore
- they should not be used as the canonical source for rebuilding new environments
- the authoritative migration path now lives in `prisma/migrations`

Any future staged rebuild or deployment-oriented schema validation should follow the repaired baseline path, not this archived chain.
