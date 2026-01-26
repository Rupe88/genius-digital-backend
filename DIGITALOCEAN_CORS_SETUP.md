# How to Add Frontend URL to DigitalOcean Server

## Quick Steps to Fix CORS Issues

### Method 1: Via DigitalOcean Dashboard (Easiest)

1. **Go to DigitalOcean Dashboard**
   - Visit: https://cloud.digitalocean.com/apps
   - Click on your app: `vaastu-lms-backend` or `goldfish-app-d9t4j`

2. **Navigate to Settings**
   - Click on **Settings** tab
   - Scroll down to **App-Level Environment Variables** section

3. **Add/Update CORS_ORIGINS**
   - Look for `CORS_ORIGINS` variable
   - If it exists, click **Edit**
   - If it doesn't exist, click **Add Variable**
   - Set the value to:
     ```
     https://vaastulms.vercel.app,https://aacharyarajbabu.vercel.app,http://localhost:3000
     ```
   - Click **Save**

4. **Redeploy the App**
   - Go to **Deployments** tab
   - Click **Create Deployment** or wait for auto-deploy
   - The app will restart with new CORS settings

### Method 2: Via App Spec File (app.yaml)

If you're using Infrastructure as Code:

1. **Update `.do/app.yaml`**
   ```yaml
   - key: CORS_ORIGINS
     value: "https://vaastulms.vercel.app,https://aacharyarajbabu.vercel.app,http://localhost:3000"
   ```

2. **Commit and Push**
   ```bash
   git add .do/app.yaml
   git commit -m "Update CORS origins"
   git push
   ```

3. **DigitalOcean will auto-deploy** (if deploy_on_push is enabled)

## Current CORS Configuration

The backend code now supports:
- ✅ Exact origin matching
- ✅ All Vercel subdomains (`.vercel.app`)
- ✅ Localhost for development
- ✅ Better error logging

## Verify CORS is Working

After updating, test with:

```bash
# Test from browser console on https://vaastulms.vercel.app
fetch('https://goldfish-app-d9t4j.ondigitalocean.app/api/health', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## Troubleshooting

### If CORS still fails:

1. **Check Environment Variable**
   - Make sure `CORS_ORIGINS` is set correctly
   - No extra spaces or quotes
   - Comma-separated values

2. **Check App Logs**
   - Go to **Runtime Logs** in DigitalOcean
   - Look for CORS warning messages
   - Should see: `CORS blocked origin: ...` if origin is not allowed

3. **Verify Frontend URL**
   - Make sure you're using the exact URL (with/without trailing slash)
   - Check for typos: `vaastulms.vercel.app` vs `vaastulms.vercel.app`

4. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Environment Variables Reference

```bash
# Required for CORS
CORS_ORIGINS=https://vaastulms.vercel.app,https://aacharyarajbabu.vercel.app,http://localhost:3000

# Frontend URL (for redirects, emails, etc.)
FRONTEND_URL=https://vaastulms.vercel.app
```

## Notes

- Changes take effect after redeployment
- You can add multiple origins separated by commas
- The code now automatically allows all `.vercel.app` subdomains
- Localhost is included for local development
