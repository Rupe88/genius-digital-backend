---
description: Complete guide to the referral system
---

# Referral System - Complete Guide

## Overview
The referral system allows users to share courses and earn 10% commission on successful enrollments.

## How It Works

### 1. User Shares a Course
- User navigates to any course detail page
- Clicks "Share & Earn 10%" button
- System generates a unique referral code (Example: `REF12AB34CD`)
- User receives shareable links for:
  - Facebook
  - LinkedIn
  - Twitter
  - WhatsApp
  - Direct URL copy

### 2. Referral Link Structure
```
https://yoursite.com/courses/course-slug?ref=REF12AB34CD
```

### 3. Tracking Clicks
When someone clicks a referral link:
- Backend receives the `ref` query parameter
- Frontend calls `/api/referrals/track` (AJAX endpoint)
- Backend creates a `ReferralClick` record with:
  - IP address
  - User agent
  - Device info
  - Timestamp
  - Fraud detection flags
- Returns a `clickId` to frontend
- Frontend stores `clickId` in local state

### 4. Tracking Conversions
When a referred user enrolls in a course:
- Frontend passes `referralClickId` to payment API
- Backend calls `processReferralConversion()` with:
  - User ID (who enrolled)
  - Course ID
  - Enrollment ID
  - Click ID (from tracking)
- System creates a `ReferralConversion` record
- Commission is calculated (10% of course price)
- Status set to `PENDING`

### 5. Commission Payout
- Admin views all conversions in `/admin/referrals`
- Can filter by status: PENDING, PAID
- Can filter by fraud status
- Selects conversions to mark as PAID
- System updates status and sets `paidAt` timestamp

## File Structure

### Backend
```
src/
├── controllers/referralController.js    # API endpoints
├── services/referralService.js          # Business logic
├── routes/referralRoutes.js            # Route definitions
└── middleware/
    └── auth.js                          # Authentication
```

### Frontend
```
app/
├── dashboard/referrals/page.tsx         # User referral dashboard
└── courses/[id]/page.tsx                # Course detail (share button)

components/
├── referrals/
│   ├── ShareButton.tsx                  # Share & Earn button
│   ├── ReferralDashboard.tsx           # User dashboard
│   └── AdminReferralDashboard.tsx      # Admin dashboard

lib/api/referrals.ts                     # API client functions
```

## Database Schema

### ReferralLink
- `id` - UUID
- `referralCode` - Unique code (e.g., REF12AB34CD)
- `userId` - Who created the link
- `courseId` - Which course
- `isActive` - Can be deactivated
- `totalClicks` - Counter
- `totalConversions` - Counter

### ReferralClick
- `id` - UUID
- `referralLinkId` - Which link was clicked
- `ipAddress` - For fraud detection
- `userAgent` - Browser info
- `deviceInfo` - Device details
- `clickedById` - User ID (if logged in)
- `sessionId` - Browser session
- `isValid` - Fraud check result
- `clickedAt` - Timestamp

### ReferralConversion
- `id` - UUID
- `referralLinkId` - Source link
- `clickId` - Original click
- `convertedById` - Who enrolled
- `enrollmentId` - Enrollment record
- `courseId` - Which course
- `commissionAmount` - NPR amount
- `commissionRate` - Percentage (10)
- `status` - PENDING, PAID, CANCELLED
- `isFraudulent` - Fraud flag
- `paidAt` - When paid

## API Endpoints

### Public (No Auth Required)
- `GET /api/referrals/click/:referralCode` - Redirect tracking
- `POST /api/referrals/track` - AJAX click tracking

### Authenticated Users
- `GET /api/referrals/share/:courseId` - Generate sharing links
- `GET /api/referrals/stats` - User's referral statistics
- `GET /api/referrals/links` - User's referral links (paginated)
- `PATCH /api/referrals/links/:linkId/deactivate` - Deactivate link
- `PATCH /api/referrals/links/:linkId/reactivate` - Reactivate link

### Admin Only
- `GET /api/referrals/admin/analytics` - Overall analytics
- `GET /api/referrals/admin/conversions` - All conversions (paginated)
- `POST /api/referrals/admin/commissions/mark-paid` - Mark as paid

## Fraud Detection

### Click Validation
- **Self-referral**: User clicking their own link
- **IP spam**: >10 clicks from same IP in 5 minutes
- **Session spam**: >5 clicks from same session in 24 hours
- **Bot detection**: Suspicious user agents

### Conversion Validation
- **Self-conversion**: User enrolling through own link
- **Too fast**: Enrollment <1 minute after click
- **Multiple conversions**: Same click used twice

If fraud detected:
- Click/Conversion still created
- `isValid`/`isFraudulent` flag set
- Admin can review before payout

## Testing the System

### 1. Generate a Referral Link
```bash
# As authenticated user
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/referrals/share/COURSE_ID
```

### 2. Track a Click
```bash
# Public endpoint
curl -X POST http://localhost:4000/api/referrals/track \
  -H "Content-Type: application/json" \
  -d '{"referralCode": "REF12AB34CD"}'
```

### 3. Create Enrollment (with referral)
```bash
# During payment, pass referralClickId
curl -X POST http://localhost:4000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "...",
    "paymentMethod": "ESEWA",
    "referralClickId": "click-id-from-step-2"
  }'
```

### 4. Check Stats
```bash
# User stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/referrals/stats

# Admin analytics
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:4000/api/referrals/admin/analytics
```

## Common Issues & Solutions

### Issue: "Generating..." forever
**Cause**: User not authenticated or token expired
**Solution**: Check `isAuthenticated` in AuthContext

### Issue: Clicks not tracking
**Cause**: Missing `ref` query parameter
**Solution**: Verify URL format: `?ref=CODE`

### Issue: Conversions not recording
**Cause**: `referralClickId` not passed to payment
**Solution**: Ensure click tracking completes before enrollment

### Issue: Duplicate stats showing
**Cause**: Both page and component rendering stats
**Solution**: Fixed - only ReferralDashboard renders now

## Environment Variables
```env
FRONTEND_URL=https://yoursite.com
```

## Commission Calculation
```javascript
// 10% commission on course price
const commissionRate = 10.00;
const coursePrice = parseFloat(course.price);
const commissionAmount = (coursePrice * commissionRate) / 100;

// Example: NPR 1000 course = NPR 100 commission
```

## Admin Dashboard Features
- View total links, clicks, conversions
- Filter by status (PENDING/PAID)
- Filter by fraud status
- Bulk mark as PAID
- See commission amounts
- Track which users are top referrers

## User Dashboard Features
- View personal stats (clicks, conversions, earnings)
- See all generated links
- View per-course performance
- Activate/deactivate links
- Track pending vs paid earnings
