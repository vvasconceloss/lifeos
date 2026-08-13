# LifeOS — Disaster Recovery

> Result of **Phase 7 — CI/CD Hardening and Production**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).
> Lightweight by design — production-minded, not enterprise-grade.

## Objectives (RTO / RPO)

| Metric | Target |
|---|---|
| **RPO** (Recovery Point Objective) | ≤ 24 h — nightly backups; Neon also provides point-in-time restore |
| **RTO** (Recovery Time Objective) | ≤ 1 h — redeploy the API (Render) / re-restore the DB from the latest backup |

## Backup strategy

- **Database:** `pg_dump` nightly (gzip, kept 14 days) — see the cron example in
  [`OPS.md`](OPS.md#backups). Neon's managed Postgres also offers point-in-time restore.
- **Application/config:** everything is code in git; deploys are reproducible from `main`.

### Backup → restore (practically verified)

The full cycle was run against a disposable database with the real tooling:

```bash
# 1. Backup
docker exec lifeos-postgres pg_dump -U lifeos -d <db> | gzip > /backups/lifeos-$(date +%F).sql.gz

# 2. Destroy (simulated failure)
DROP DATABASE <db>;

# 3. Recreate + restore
CREATE DATABASE <db>;
gunzip -c /backups/lifeos-$(date +%F).sql.gz | psql -U lifeos -d <db>

# 4. Verify integrity — row counts match
SELECT (SELECT count(*) FROM "User") u, (SELECT count(*) FROM "Pillar") p,
       (SELECT count(*) FROM "Habit") h, (SELECT count(*) FROM "HabitCompletion") c;
```

**Result (2026, PostgreSQL 17):** before and after the backup → destroy → restore cycle the row
counts were identical (`1 user, 1 pillar, 1 habit, 1 completion`) and a sampled row
(`email` / `name`) matched — the restore preserved schema, data and referential integrity.

## Database failure

1. Confirm scope: `GET /v1/health/ready` → `503 { db: "error" }`.
2. Restore from the latest backup (see above) — or Neon point-in-time restore.
3. If the schema changed since the backup, run `pnpm --filter @lifeos/api migrate:deploy` **after**
   the restore (additive migrations are safe on restored data).
4. Verify `/v1/health/ready` → `200 { db: "ok" }` and spot-check a few records.

## Application failure

1. Confirm scope: the API returns 5xx or is unreachable while `/v1/health` is down.
2. **Rollback:** Render keeps previous deploys — use *Rollback to this deploy* (see
   [`DEPLOYMENT.md`](DEPLOYMENT.md#first-deploy--rollback-checklist)).
3. If the failure is data-related, restore the DB first (above).
4. Verify with the post-deploy smoke check (`/v1/health/ready` + `/v1/docs` reachable).

## Post-deploy verification

- Render runs migrations (`preDeployCommand`) and health-checks `/v1/health/ready` before/after
  deploy.
- A GitHub Actions workflow pings the production health endpoint after pushes to `main`
  (smoke check) and a keep-alive prevents the free instance from sleeping.

---

_More docs: [Documentation index](../README.md) · [Operations](OPS.md) · [Deployment](DEPLOYMENT.md) · [LifeOS README](../../README.md)_
