-- Reconciliation: listings whose denormalized remainingAmount does not match
-- principalAmount - sum(participations.amount). Expected result: zero rows.
--
-- Run from the repo root with:
--   docker compose exec -T db psql -U marketplace -d marketplace < api/prisma/reconcile.sql

SELECT
  l.id,
  l.reference,
  l."principalAmount",
  l."remainingAmount",
  COALESCE(SUM(p.amount), 0)                             AS "sold",
  l."principalAmount" - COALESCE(SUM(p.amount), 0)       AS "expectedRemaining"
FROM "Listing" l
LEFT JOIN "Participation" p ON p."listingId" = l.id
GROUP BY l.id
HAVING l."remainingAmount" <> l."principalAmount" - COALESCE(SUM(p.amount), 0)
ORDER BY l.reference;
