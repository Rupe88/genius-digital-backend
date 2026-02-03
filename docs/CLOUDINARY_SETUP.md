# Cloudinary setup for image uploads

Event images, product images, testimonials, gallery, and other file uploads use Cloudinary. Configure it once and all uploads work.

## 1. Get credentials

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier is enough).
2. In the Dashboard, open **Account** / **API Keys** (or **Settings** > **Access keys**).
3. Copy:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click "Reveal" if hidden)

## 2. Configure backend

In your backend root, copy the example env and edit `.env`:

```bash
cp env.example .env
```

Add or update in `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- No quotes needed.
- If the API secret ends with `%` and uploads fail, remove the trailing `%` or re-copy the secret from the dashboard.
- Restart the backend after changing `.env`.

## 3. Verify

Start the backend. You should see in the console:

- `Cloudinary configured successfully` and Cloud name / API key hint when credentials are set.
- `Cloudinary credentials not configured` when any of the three vars are missing.

Then use admin features that upload images (e.g. Create Event with an image at `/admin/events/new`). If Cloudinary is configured, the image is uploaded and the stored URL is used.

## 4. Optional: folder per feature

The backend uses a default folder (`lms/images`). You can pass a different folder in the upload request body (e.g. `folder: 'lms/events'`) if your client sends it; otherwise the default is used.
