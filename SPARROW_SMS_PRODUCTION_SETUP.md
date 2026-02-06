# Sparrow SMS Production Setup Guide

## ✅ Changes Made

1. **Updated `.do/app.yaml`**:
   - Added `SPARROW_SMS_TOKEN` environment variable (as SECRET)

## 🔧 Required Actions in DigitalOcean Dashboard

After deploying these changes, you **MUST** set the Sparrow SMS token in your DigitalOcean App Platform dashboard:

1. Go to your DigitalOcean App Platform dashboard
2. Navigate to your `vaastu-lms-backend` app
3. Go to **Settings** → **App-Level Environment Variables**
4. Add a new **SECRET** variable:

   ```
   SPARROW_SMS_TOKEN=v2_BaASx11Yjvo2MYcqOCDoCwEZmgL.EMTB
   ```

   **Note**: This is the token from your `.env` file. Copy it to DigitalOcean.

5. (Optional) If you have an NTA-approved sender ID, you can also add:
   ```
   SPARROW_SMS_FROM=YourBrand
   ```

## 🔐 Sparrow SMS IP Whitelist

**CRITICAL**: You must whitelist your production server IP in Sparrow SMS:

1. Go to [Sparrow SMS Dashboard](https://web.sparrowsms.com/)
2. Navigate to **Settings** → **IP Whitelist** or **API Settings**
3. Add your DigitalOcean app IP address (check your DigitalOcean app's outbound IP or contact support)
4. Also whitelist your development IP if testing locally: `103.98.130.100`

## 🚀 Deployment Steps

1. **Commit and push the changes**:
   ```bash
   git add .do/app.yaml
   git commit -m "Add Sparrow SMS configuration for production"
   git push origin main
   ```

2. **DigitalOcean will auto-deploy** (if `deploy_on_push: true` is set)

3. **After deployment, set the environment variable** in DigitalOcean dashboard (see above)

4. **Verify SMS is available**:
   - Visit your production frontend: https://vaastu-lms-dp.vercel.app/register
   - The "Send OTP verification code to" dropdown should show:
     - Email only
     - Mobile number (SMS) only
     - Both email and mobile number (SMS)

## 🧪 Testing

After deployment and setting the token:

1. Visit https://vaastu-lms-dp.vercel.app/register
2. Fill in registration form with a valid Nepal mobile number (e.g. 98XXXXXXXX)
3. Select "Mobile number (SMS) only" or "Both email and mobile number (SMS)"
4. Submit registration
5. You should receive OTP via SMS (if IP is whitelisted) or email (if SMS fails)

## ⚠️ Troubleshooting

If SMS options don't show in production:
- Verify `SPARROW_SMS_TOKEN` is set in DigitalOcean dashboard (as SECRET)
- Check that the app has been redeployed after setting the variable
- Verify the token value matches your `.env` file

If SMS fails with "Invalid IP Address":
- Check Sparrow SMS dashboard → IP Whitelist
- Add your DigitalOcean app's outbound IP address
- The backend will automatically fall back to email if SMS fails

If SMS sends but OTP doesn't arrive:
- Check Sparrow SMS dashboard for delivery status
- Verify phone number format (10 digits, starts with 98)
- Check SMS balance/credits in Sparrow dashboard
