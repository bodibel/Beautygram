# Prisma Migration Authority

The migration folder in this directory is the authoritative fresh-build path for GlowySpot.

Current operational rule:

- fresh databases should be created from the authoritative baseline path in `prisma/migrations`
- the pre-baseline migration chain is preserved only for historical reference
- staged database rebuild is a later separate step and is not performed by repository changes alone

Do not treat archived legacy migrations as the canonical source for fresh environments.
