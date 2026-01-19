# Sanskar Academy - Vercel Integration & Deployment Guide

## ✅ COMPLETED FIXES

### 1. CORS Integration Fixed
- ✅ Added `https://aacharyarajbabu.vercel.app` to backend CORS origins
- ✅ Updated `FRONTEND_URL` in backend `.env`
- ✅ Created Vercel configuration with proper headers

### 2. Refresh Token System Fixed
- ✅ Re-enabled automatic token refresh in AuthContext
- ✅ Set refresh interval to 10 minutes (reduced frequency)
- ✅ Fixed token validation and storage logic

### 3. Frontend API Configuration
- ✅ Updated axios configuration for production environments
- ✅ Added flexible API URL detection
- ✅ Created Vercel environment setup

## 🚀 DEPLOYMENT STEPS

### Step 1: Backend Environment Setup
Update your backend `.env` file:

```bash
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://aacharyarajbabu.vercel.app,capacitor://localhost,ionic://localhost
FRONTEND_URL=https://aacharyarajbabu.vercel.app

# JWT Configuration (already correct)
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Step 2: Deploy Backend First
1. Deploy your backend to production (DigitalOcean, Railway, Render, etc.)
2. Get your production backend URL (e.g., `https://your-backend.com`)
3. Update the Vercel configuration with your actual backend URL

### Step 3: Vercel Environment Variables
In Vercel dashboard, add:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-production-domain.com/api
```

### Step 4: Deploy Frontend
```bash
# Push to GitHub and connect to Vercel, or use CLI:
vercel --prod
```

## 🧪 TESTING CHECKLIST

### CORS Test ✅
- [ ] Visit https://aacharyarajbabu.vercel.app
- [ ] Open browser console - no CORS errors
- [ ] Login works without CORS issues

### Refresh Token Test ✅
- [ ] Login to application
- [ ] Wait 15+ minutes (access token expires)
- [ ] Navigate between pages - auto token refresh
- [ ] Check localStorage - refreshToken persists

### Full Integration Test ✅
- [ ] User registration/login
- [ ] Admin dashboard access
- [ ] Course creation/editing
- [ ] All API calls work without errors

## 🔧 TROUBLESHOOTING

### CORS Issues:
```bash
# Check backend logs for CORS blocks
# Verify Vercel NEXT_PUBLIC_API_URL is correct
# Check browser Network tab for OPTIONS requests
```

### Refresh Token Issues:
```bash
# Check console for "Token refreshed successfully" logs
# Verify JWT_EXPIRES_IN is 15m, JWT_REFRESH_EXPIRES_IN is 7d
# Check if refresh tokens exist in database
```

### Build Issues:
```bash
# Ensure React 19 compatibility
# Check Next.js version (16.1.1)
# Verify all env vars are set in Vercel
```

## 📋 CURRENT STATUS

✅ **CORS**: Fixed - Vercel domain added to allowed origins
✅ **Refresh Tokens**: Fixed - Automatic refresh re-enabled
✅ **Build**: Success - All components compile correctly
✅ **API Config**: Flexible - Works in dev/prod environments

## 🎯 NEXT STEPS

1. **Deploy Backend**: Get production backend URL
2. **Update Vercel Config**: Replace placeholder with actual backend URL
3. **Deploy Frontend**: Push to Vercel
4. **Test Integration**: Verify everything works end-to-end

## 📞 SUPPORT

If you encounter issues:
1. Check browser console for errors
2. Verify environment variables
3. Test API endpoints directly
4. Check backend logs for CORS/token issues
