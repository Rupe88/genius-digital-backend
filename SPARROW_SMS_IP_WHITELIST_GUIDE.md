# Sparrow SMS IP Whitelist Setup Guide

## Why IP Whitelisting is Required

Sparrow SMS requires your server's IP address to be whitelisted before you can send SMS via their API. Without whitelisting, you'll get a `403 Invalid IP Address` error.

## Step-by-Step Guide to Whitelist IP Address

### Step 1: Log in to Sparrow SMS Dashboard

1. Go to **https://web.sparrowsms.com/**
2. Log in with your credentials (e.g., `sahrajababu+1@gmail.com`)

### Step 2: Navigate to Settings/API Settings

IP whitelisting is typically found in one of these locations:

**Option A: Settings Menu**
1. Look for a **"Settings"** or **"Account Settings"** option in the left sidebar (may be at the bottom)
2. Click on **Settings**
3. Look for **"API Settings"**, **"Security"**, or **"IP Whitelist"** section

**Option B: API/Developer Section**
1. Look for an **"API"** or **"Developer"** menu item in the sidebar
2. Click on it
3. Find **"IP Whitelist"** or **"Allowed IPs"** section

**Option C: Help/Support**
1. Click on **"Help"** in the sidebar (the "i" icon)
2. Search for "IP whitelist" or "API IP"
3. Follow the documentation link

### Step 3: Add Your IP Addresses

Once you find the IP Whitelist section:

1. **For Development/Testing:**
   - Add: `103.98.130.100` (your current development server IP)

2. **For Production (DigitalOcean):**
   - You need to find your DigitalOcean app's **outbound IP address**
   - **How to find DigitalOcean app IP:**
     - Go to DigitalOcean App Platform dashboard
     - Select your `vaastu-lms-backend` app
     - Go to **Settings** → **Networking**
     - Look for **"Outbound IP"** or **"Static IP"**
     - Or check **Runtime Logs** - the IP that makes outbound requests
     - Alternatively, contact DigitalOcean support to get your app's static outbound IP
   - Add that IP address to Sparrow SMS whitelist

3. **Click "Add IP"** or **"Save"** button

### Step 4: Verify Whitelisting

1. After adding IPs, they should appear in a list
2. Make sure the status shows as **"Active"** or **"Enabled"**
3. Some platforms require you to **verify** or **confirm** the IP via email

### Step 5: Test SMS Sending

1. Try registering a new user on your app
2. Select **"Mobile number (SMS) only"** or **"Both email and mobile number (SMS)"**
3. Submit the registration form
4. Check if you receive the OTP via SMS
5. Check backend logs - you should see `[SMS]` success messages instead of `403 Invalid IP Address`

## Common Issues & Solutions

### Issue: Can't find IP Whitelist option
**Solution:**
- Contact Sparrow SMS support at support@sparrowsms.com
- Ask them: "How do I whitelist IP addresses for API access?"
- They may need to enable this feature for your account

### Issue: IP address keeps changing (Dynamic IP)
**Solution:**
- For production, use a **static IP** or **outbound IP** from your hosting provider
- DigitalOcean App Platform provides a static outbound IP (check Networking settings)
- For development, you may need to update the whitelist each time your IP changes

### Issue: Still getting "Invalid IP Address" after whitelisting
**Solutions:**
1. **Wait a few minutes** - IP whitelist changes may take 5-10 minutes to propagate
2. **Verify the exact IP** - Make sure you're using the correct outbound IP (not inbound)
3. **Check IP format** - Some systems require IP without spaces or extra characters
4. **Check account status** - Ensure your Sparrow SMS account is active and has credits
5. **Contact support** - If issue persists, contact Sparrow SMS support

## Finding Your Server's Outbound IP

### For DigitalOcean App Platform:
1. Log in to DigitalOcean dashboard
2. Go to **App Platform** → Your app
3. **Settings** → **Networking** → Look for **"Outbound IP"**
4. Or check **Runtime Logs** and look for the IP making external API calls

### For Local Development:
1. Visit **https://api.ipify.org** or **https://whatismyipaddress.com**
2. Your current public IP will be displayed
3. Add this IP to Sparrow SMS whitelist

### For Other Hosting Providers:
- **Heroku**: Check "Settings" → "Network" or use `curl ifconfig.me` in a dyno
- **AWS/EC2**: Check Elastic IP or instance public IP
- **Railway/Render**: Check networking settings or use `curl ifconfig.me` in logs

## Quick Test Command

To test if your IP is whitelisted, you can make a test API call:

```bash
curl -X POST "https://api.sparrowsms.com/v2/sms/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_TOKEN&from=YourBrand&to=98XXXXXXXX&text=Test"
```

If you get `403 Invalid IP Address`, your IP is not whitelisted yet.

## Support Contacts

- **Sparrow SMS Support**: support@sparrowsms.com
- **Sparrow SMS Dashboard**: https://web.sparrowsms.com/
- **DigitalOcean Support**: https://www.digitalocean.com/support/

## Notes

- IP whitelisting is a **security feature** to prevent unauthorized API access
- Changes may take **5-10 minutes** to take effect
- Always whitelist **both development and production** IPs
- Keep your IP list updated if you change hosting providers
