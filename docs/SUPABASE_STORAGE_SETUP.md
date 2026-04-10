# Supabase Storage (thumbnails, videos, documents)

The backend uploads files with the **service role** key. Never expose that key to the browser.

## Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** secret (Settings → API). Server-only. |
| `SUPABASE_STORAGE_BUCKET` | Bucket name (default: `lms-media`) |

## Dashboard setup

1. **Storage** → **New bucket** → name it `lms-media` (or match `SUPABASE_STORAGE_BUCKET`).
2. For public thumbnails and direct `getPublicUrl` links: set the bucket to **public**, or add policies so authenticated users can read.
3. For private buckets, the API uses **signed URLs** and server-side streaming with the service role.

## Legacy S3 URLs

Old rows that still point at S3/DataHub URLs are not rewritten automatically. Re-upload media or migrate URLs separately.
