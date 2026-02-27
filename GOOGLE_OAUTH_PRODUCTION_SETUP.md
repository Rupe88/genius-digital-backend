# Google OAuth Production Setup – Fix redirect_uri_mismatch

## Error 400: redirect_uri_mismatch

This error occurs when the redirect URI your app sends to Google does **not** exactly match one of the URIs configured in Google Cloud Console.

The redirect URI for Google OAuth is always your **backend** callback URL, not the frontend.

---

## Step 1: Identify your backend URL

Your backend is where your API runs (e.g. DigitalOcean, Render, Railway). For example:
- `https://stingray-app-2-iy8as.ondigitalocean.app`
- or `https://goldfish-app-d9t4j.ondigitalocean.app`

The callback URL is: `https://YOUR_BACKEND_DOMAIN/api/auth/google/callback`

**No trailing slash.** Must use `https` in production.

---

## Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your **OAuth 2.0 Client ID** (Web application type)
5. Under **Authorized redirect URIs**, click **ADD URI** and add:

   ```
   https://YOUR_BACKEND_DOMAIN/api/auth/google/callback
   ```

   Example (DigitalOcean):
   ```
   https://stingray-app-2-iy8as.ondigitalocean.app/api/auth/google/callback
   ```

6. Under **Authorized JavaScript origins**, add your **frontend** URLs:

   ```
   https://sanskarvaastu.vercel.app
   https://www.sanskarvaastu.vercel.app
   ```

   Also keep any other origins you use (e.g. localhost for dev):
   ```
   http://localhost:3000
   ```

7. Click **Save**

---

## Step 3: Verify environment variables

### Backend (DigitalOcean / your hosting)

Set in your backend environment:

| Variable         | Value                                    |
|------------------|------------------------------------------|
| `FRONTEND_URL`   | `https://sanskarvaastu.vercel.app`       |
| `BACKEND_URL`    | `https://YOUR_BACKEND_DOMAIN`            |
| `GOOGLE_CLIENT_ID` | Your Client ID (from Google Console)  |
| `GOOGLE_CLIENT_SECRET` | Your Client Secret (from Google Console) |

### Frontend (Vercel)

Set in Vercel project environment:

| Variable              | Value                                    |
|-----------------------|------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_BACKEND_DOMAIN/api`        |

---

## Step 4: Common mistakes

1. **Wrong domain**: `redirect_uri` must point to the **backend**, e.g.  
   `https://stingray-app-2-iy8as.ondigitalocean.app/api/auth/google/callback`  
   Not: `https://sanskarvaastu.vercel.app/...` (unless your backend is hosted there).

2. **http vs https**: Production must use `https` only.

3. **Trailing slash**: Do not add `/` at the end of the redirect URI.

4. **Path**: The path must be exactly `/api/auth/google/callback`.

---

## Step 5: How to see the actual redirect_uri

Backend logs print it when Google OAuth runs:

```
Google OAuth: callback URL used for redirect_uri: https://...
```

Use this value in Google Cloud Console (Authorized redirect URIs).

---

## Quick checklist

- [ ] `https://YOUR_BACKEND_DOMAIN/api/auth/google/callback` added in **Authorized redirect URIs**
- [ ] `https://sanskarvaastu.vercel.app` added in **Authorized JavaScript origins**
- [ ] `FRONTEND_URL` set to `https://sanskarvaastu.vercel.app` on backend
- [ ] `NEXT_PUBLIC_API_URL` set to `https://YOUR_BACKEND_DOMAIN/api` on Vercel
- [ ] Redeployed backend and frontend after env changes
