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

In **App Platform** → your app → **Settings** → **Environment Variables**, set:

- `S3_ACCESS_KEY` (SECRET)
- `S3_SECRET_KEY` (SECRET)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` (can be set in `.do/app.yaml` or in dashboard)

Redeploy after adding the variables.

## Frontend

`next.config.ts` allows images from `s3-np1.datahub.com.np`. Product/admin pages treat S3 URLs like Cloudinary for `unoptimized` image loading.

## Rollback to Cloudinary

To revert to Cloudinary:

1. Restore `config.cloudinary` in `src/config/env.js`.
2. Restore `cloudinaryService.js` and point `cloudinaryUpload.js` back to it.
3. Re-add the `cloudinary` npm package and remove `@aws-sdk/client-s3` if unused.
