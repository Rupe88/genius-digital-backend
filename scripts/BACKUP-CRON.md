# Daily database backup at 1 PM

The backend can run a local `pg_dump` backup using your `.env` (no password in code).

## One-time setup

1. **Install PostgreSQL client** (for `pg_dump`). **Supabase uses PostgreSQL 17** — your `pg_dump` must be version 17 or newer (same or newer than the server).
   - **Fedora:** `sudo dnf install postgresql17` (script will use `pg_dump17` if present)
   - **Ubuntu/Debian:** install client that matches your server, e.g. `sudo apt-get install postgresql-client-17`
   - **macOS:** `brew install libpq` (or `postgresql@17`) and ensure `pg_dump` on PATH is 17+

2. **Ensure `.env` has** `DATABASE_URL` or `DIRECT_URL` (Supabase connection string).

## Run backup manually

From the backend root:

```bash
cd /path/to/vaastu-backend
npm run db:backup
```

Backups are written to `vaastu-backend/backups/` as `backup-YYYY-MM-DD.dump`. The script keeps the last 7 days and deletes older files.

## Schedule every day at 1 PM (cron)

1. Open crontab:
   ```bash
   crontab -e
   ```

2. Add one line (replace `/path/to/vaastu-backend` with your actual backend path):
   ```cron
   0 13 * * * cd /path/to/vaastu-backend && /usr/bin/npm run db:backup >> /path/to/vaastu-backend/backups/backup.log 2>&1
   ```
   Or if you use a full path to node/npm:
   ```cron
   0 13 * * * cd /path/to/vaastu-backend && npm run db:backup >> /path/to/vaastu-backend/backups/backup.log 2>&1
   ```

3. Save and exit. Backups will run every day at 1:00 PM and be stored under `vaastu-backend/backups/`.

## Restore from a backup

```bash
pg_restore -d "YOUR_DATABASE_URL" vaastu-backend/backups/backup-2025-03-09.dump
```

Use a separate/test database URL when restoring so you don’t overwrite production by mistake.

## Troubleshooting

- **"server version mismatch" / "pg_dump version: 16.9"**  
  Supabase runs PostgreSQL 17. Install the PG 17 client so `pg_dump` is 17.x. On Fedora: `sudo dnf install postgresql17`. Then run `npm run db:backup` again (the script uses `pg_dump17` if available).
- **Override pg_dump path:** set `PG_DUMP_PATH` in `.env`, e.g. `PG_DUMP_PATH=/usr/bin/pg_dump17`.
