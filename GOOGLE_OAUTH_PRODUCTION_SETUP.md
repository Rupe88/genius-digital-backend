# Google OAuth Production Setup Guide

## ✅ Changes Made

1. **Updated `.do/app.yaml`**:
   - Added `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
   - Set `FRONTEND_URL` to `https://vaastu-lms-dp.vercel.app`
   - Set `BACKEND_URL` to `https://goldfish-app-d9t4j.ondigitalocean.app`
   - Added `https://vaastu-lms-dp.vercel.app` to `CORS_ORIGINS`

2. **Improved `src/config/env.js`**:
   - Made `frontendUrl` fallback logic more robust to handle empty strings

## 🔧 Required Actions in DigitalOcean Dashboard

After deploying these changes, you **MUST** set the following environment variables in your DigitalOcean App Platform dashboard:

1. Go to your DigitalOcean App Platform dashboard
2. Navigate to your `vaastu-lms-backend` app
3. Go to **Settings** → **App-Level Environment Variables**
4. Set the following **SECRET** variables:

   ```
   GOOGLE_CLIENT_ID=13181422823-73r9r9qlgk9olp4pmd7itmm3flji2qsc.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   ```

   **Note**: These are already in your `.env` file. Copy them to DigitalOcean.

5. Verify that `FRONTEND_URL` is set to `https://vaastu-lms-dp.vercel.app` (should be auto-set from app.yaml, but verify)

## 🔐 Google Cloud Console Configuration

**CRITICAL**: You must update your Google OAuth redirect URI in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, ensure you have:
   ```
   https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/google/callback
   ```
6. Also keep the localhost one for development:
   ```
   http://localhost:4000/api/auth/google/callback
   ```
7. Click **Save**

## 🚀 Deployment Steps

1. **Commit and push the changes**:
   ```bash
   git add .do/app.yaml src/config/env.js
   git commit -m "Fix Google OAuth production configuration"
   git push origin main
   ```

2. **DigitalOcean will auto-deploy** (if `deploy_on_push: true` is set)

3. **After deployment, verify**:
   - Check that environment variables are set correctly in DigitalOcean dashboard
   - Test Google login on production: https://vaastu-lms-dp.vercel.app/login

## 🧪 Testing

After deployment:

1. Visit https://vaastu-lms-dp.vercel.app/login
2. Click "Continue with Google"
3. You should be redirected to Google sign-in
4. After signing in, you should be redirected back to the dashboard (not stuck on login page)

## ⚠️ Troubleshooting

If you still see "Google login is not configured":
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in DigitalOcean dashboard
- Check that the app has been redeployed after setting the variables
- Verify the redirect URI in Google Cloud Console matches exactly: `https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/google/callback`

If redirect goes to localhost:
- Verify `FRONTEND_URL` is set to `https://vaastu-lms-dp.vercel.app` in DigitalOcean
- Check that `NODE_ENV=production` is set (should be auto-set from app.yaml)
