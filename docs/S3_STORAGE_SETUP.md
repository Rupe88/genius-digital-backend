# S3-Compatible Storage (Kailesh Cloud / DataHub) Setup

Images, videos, and documents are stored in **Kailesh Cloud S3** (DataHub S3-compatible API) instead of Cloudinary.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3 API endpoint | `https://s3-np1.datahub.com.np` |
| `S3_REGION` | Region | `us-east-1` |
| `S3_BUCKET` | Bucket name | `vaastu-lms` |
| `S3_ACCESS_KEY` | Access key | (from Kailesh/DataHub) |
| `S3_SECRET_KEY` | Secret key | (from Kailesh/DataHub) |
| `S3_PUBLIC_URL` | Optional: custom base URL for files (e.g. CDN) | Leave unset to use `{endpoint}/{bucket}` |

## Public URL Format

Stored files are accessed at:

```
https://s3-np1.datahub.com.np/vaastu-lms/{folder}/{filename}
```

Example: `https://s3-np1.datahub.com.np/vaastu-lms/lms/images/img-abc123.jpg`

## Bucket Permissions

For uploaded files to be viewable in the app and frontend:

1. In **Kailesh Cloud / DataHub** console, open bucket **vaastu-lms**.
2. Ensure the bucket (or objects) allows **public read** access if you want images/videos to load without signed URLs.
   - Option A: Set a **bucket policy** to allow public `GetObject` for the bucket.
   - Option B: Use a **CDN** in front and set `S3_PUBLIC_URL` to the CDN base URL.

If you keep the bucket private, you would need to implement **signed URLs** in the backend (not included in this setup).

## Production (DigitalOcean)

**If these are not set in production, course thumbnails and videos will not load** (image/video proxy will return "Image not available").

In **App Platform** → your app → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|--------|--------|
| `S3_ACCESS_KEY` | Your DataHub access key | Mark as **Encrypted** (SECRET) |
| `S3_SECRET_KEY` | Your DataHub secret key | Mark as **Encrypted** (SECRET) |
| `S3_ENDPOINT` | `https://s3-np1.datahub.com.np` or `s3-np1.datahub.com.np` | Optional; default is https |
| `S3_REGION` | `us-east-1` | Optional |
| `S3_BUCKET` | `vaastu-lms` | Optional if you use this bucket name |

Redeploy the app after saving. Then test a course page; thumbnails and video streams should load via the backend proxy.

### Troubleshooting: "SignatureDoesNotMatch"

If logs show `The request signature we calculated does not match the signature you provided`:

1. **Secret key must be exact** – In DigitalOcean, set `S3_SECRET_KEY` as an **Encrypted** variable and paste the full secret with no leading/trailing spaces. Do not wrap the value in quotes.
2. **Special characters** – If the secret contains `=` or `/`, some dashboards can truncate or alter it. Paste the entire string; if it still fails, create a new access key in DataHub and set the new secret.
3. **Access key** – Ensure `S3_ACCESS_KEY` matches the key that belongs to the secret (no spaces, correct case).
4. **Redeploy** – After changing env vars, redeploy the app so the new values are loaded.

## Frontend

`next.config.ts` allows images from `s3-np1.datahub.com.np`. Product/admin pages treat S3 URLs like Cloudinary for `unoptimized` image loading.

## Rollback to Cloudinary

To revert to Cloudinary:

1. Restore `config.cloudinary` in `src/config/env.js`.
2. Restore `cloudinaryService.js` and point `cloudinaryUpload.js` back to it.
3. Re-add the `cloudinary` npm package and remove `@aws-sdk/client-s3` if unused.
