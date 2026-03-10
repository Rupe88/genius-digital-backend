/**
 * Database backup script for Supabase (PostgreSQL).
 * Uses DATABASE_URL or DIRECT_URL from .env. Saves compressed dumps to backend/backups/
 * Schedule daily at 1 PM with cron: 0 13 * * * cd /path/to/vaastu-backend && npm run db:backup
 */
import { spawn } from 'child_process';
import { mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

function which(cmd) {
  try {
    const path = execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim();
    return path || null;
  } catch {
    return null;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const backupDir = join(rootDir, 'backups');

// Load .env from backend root (same as server)
dotenv.config({ path: join(rootDir, '.env') });

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith('postgres')) {
  console.error('Missing or invalid DIRECT_URL/DATABASE_URL in .env');
  process.exit(1);
}

if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const date = new Date().toISOString().slice(0, 10);
const filename = `backup-${date}.dump`;
const filepath = join(backupDir, filename);

// Supabase uses PostgreSQL 17; pg_dump must be same or newer. Prefer pg_dump17 if present.
const pgDump = process.env.PG_DUMP_PATH || which('pg_dump17') || 'pg_dump';

const child = spawn(pgDump, [dbUrl, '-Fc', '-f', filepath], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Backup saved:', filepath);
    // Keep only last 7 days of backups
    try {
      const files = readdirSync(backupDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.dump'))
        .map((f) => ({ name: f, path: join(backupDir, f) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const keep = 7;
      if (files.length > keep) {
        for (let i = 0; i < files.length - keep; i++) {
          unlinkSync(files[i].path);
          console.log('Removed old backup:', files[i].name);
        }
      }
    } catch (e) {
      // ignore cleanup errors
    }
  } else {
    console.error('pg_dump exited with code', code);
    process.exit(code || 1);
  }
});

child.on('error', (err) => {
  console.error('Failed to run pg_dump:', err.message);
  console.error('Ensure PostgreSQL client is installed. Supabase uses PG 17; on Fedora run: sudo dnf install postgresql17');
  process.exit(1);
});
