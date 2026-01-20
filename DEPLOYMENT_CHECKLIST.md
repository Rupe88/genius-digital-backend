# Production Deployment Checklist

## Changes Made for Referral System

### Backend Changes (Must be deployed to DigitalOcean)

1. **Updated `src/config/env.js`**
   - Changed `frontendUrl` to automatically use `https://aacharyarajbabu.vercel.app` in production
   - Added production URL to CORS origins

2. **Updated `src/controllers/referralController.js`**
   - Imported `config` module
   - Replaced all `process.env.FRONTEND_URL` with `config.frontendUrl`

3. **Updated `src/services/referralService.js`**
   - Added optional `courseSlug` parameter to avoid redundant DB queries

4. **Updated `src/routes/referralRoutes.js`**
   - Removed unnecessary `validate` middleware wrappers

5. **Fixed paginated response structure**
   - Updated `getReferralLinks` and `getReferralConversions` to nest data correctly

### Frontend Changes (Already deployed to Vercel)

1. **Fixed duplicate UI** in `/app/dashboard/referrals/page.tsx`
2. **Added authentication check** to `ShareButton.tsx`
3. **Added "Referrals" menu** to dashboard sidebar
4. **Fixed data structure handling** in `ReferralDashboard.tsx`

## Environment Variables Required

### For Backend (DigitalOcean)
```bash
NODE_ENV=production
FRONTEND_URL=https://aacharyarajbabu.vercel.app
CORS_ORIGINS=https://aacharyarajbabu.vercel.app,https://*.vercel.app
```

### For Frontend (Vercel) - Already configured
```bash
NEXT_PUBLIC_API_URL=https://goldfish-app-d9t4j.ondigitalocean.app/api
```

## Deployment Steps

### 1. Backend (DigitalOcean)
```bash
# Option A: If using PM2 or similar process manager
cd /path/to/backend
git pull origin main
npm install
pm2 restart vaastu-backend

# Option B: If using Docker
docker-compose down
docker-compose build
docker-compose up -d

# Option C: Redeploy on DigitalOcean App Platform
# Push changes to GitHub and redeploy via DigitalOcean dashboard
```

### 2. Verify Backend is Running
```bash
curl https://goldfish-app-d9t4j.ondigitalocean.app/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-20T..."
}
```

### 3. Test Referral Link Generation
```bash
# As authenticated user
curl -X GET \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://goldfish-app-d9t4j.ondigitalocean.app/api/referrals/share/COURSE_ID
```

Expected response:
```json
{
  "success": true,
  "data": {
    "course": {...},
    "referralCode": "REFABC123",
    "shareUrl": "https://aacharyarajbabu.vercel.app/courses/course-slug?ref=REFABC123",
    "facebookUrl": "...",
    "linkedinUrl": "...",
    "twitterUrl": "...",
    "whatsappUrl": "..."
  }
}
```

## Post-Deployment Verification

1. **Visit**: https://aacharyarajbabu.vercel.app
2. **Login** to your account
3. **Go to any course page**
4. **Click**: "Share & Earn 10%" button
5. **Verify**: Modal opens with referral link containing your production URL
6. **Check**: Link format is `https://aacharyarajbabu.vercel.app/courses/...?ref=...`
7. **Test**: Copy link and open in incognito window
8. **Verify**: Referral tracking works (check Dashboard → Referrals)

## Troubleshooting

### Issue: Still getting 404 on /api/referrals/share/:courseId
**Solution**: Backend not updated. Redeploy backend with latest code.

### Issue: Links still using localhost
**Solution**: Check `NODE_ENV=production` is set on backend

### Issue: CORS errors
**Solution**: Verify `CORS_ORIGINS` includes your production domain

### Issue: "Generating..." forever
**Solution**: Check browser console. If auth error, logout and login again.

## Files Changed (Git Commit Message)

```
fix: Configure production URLs for referral system

- Update env config to use production frontend URL
- Replace hardcoded localhost with config.frontendUrl
- Fix CORS origins for production deployment
- Optimize referral service to avoid redundant DB queries
- Fix paginated response structure
- Remove duplicate UI in referrals page
- Add referrals menu to dashboard sidebar

Backend changes require redeployment to DigitalOcean.
```
