# Fix: Course Not Available for Sharing

## Problem
Getting error: `"Course not found or not available for sharing"`

## Root Cause
Courses in your production database have status other than `PUBLISHED`. 
Only courses with status `PUBLISHED` can be shared via referral links.

## Solution Options

### Option 1: Publish All Courses (RECOMMENDED)

Run this script on your production server:

```bash
cd /path/to/vaastu-backend
node scripts/publish-courses.js
```

This will:
- Find all unpublished courses
- Set their status to `PUBLISHED`
- Allow them to be shared via referrals

### Option 2: Publish Specific Courses via Admin Panel

1. Login to admin panel: `https://aacharyarajbabu.vercel.app/admin`
2. Go to **Courses**
3. For each course you want to be shareable:
   - Click **Edit**
   - Change **Status** to `PUBLISHED`
   - Click **Save**

### Option 3: Direct Database Update (Quick Fix)

Connect to your production database and run:

```sql
UPDATE "Course" 
SET status = 'PUBLISHED' 
WHERE status != 'PUBLISHED';
```

**Or** for specific course:

```sql
UPDATE "Course" 
SET status = 'PUBLISHED' 
WHERE id = '2c4ec62f-769e-459e-84c8-a5282367522c';
```

## Verification

After publishing courses, test the share feature:

1. Go to any course page
2. Click "Share & Earn 10%"
3. Should see modal with referral links
4. Links should start with: `https://aacharyarajbabu.vercel.app/courses/...?ref=...`

## Development vs Production Behavior

**Development Mode (`NODE_ENV=development`)**:
- ✅ Can share courses with any status (DRAFT, PUBLISHED, ARCHIVED)
- Used for testing

**Production Mode (`NODE_ENV=production`)**:
- ⚠️  Can ONLY share courses with status `PUBLISHED`
- Protects against sharing incomplete courses

## Course Status Values

Your database can have courses with these statuses:
- `DRAFT` - Course is being created
- `PUBLISHED` - Course is live and shareable ✅
- `ARCHIVED` - Course is no longer active
- `ONGOING` - Course is in progress (custom status)

## Checking Course Status

To see status of all courses in production:

```sql
SELECT id, title, slug, status, "createdAt" 
FROM "Course" 
ORDER BY "createdAt" DESC;
```

## Common Issues

### Issue: Course shows in frontend but can't be shared
**Cause**: Course status is not `PUBLISHED`
**Fix**: Update course status using one of the options above

### Issue: Share button loads forever
**Cause**: Backend not deployed with latest code
**Fix**: Redeploy backend to DigitalOcean

### Issue: Links still use localhost
**Cause**: Backend not restarted or `NODE_ENV` not set
**Fix**: 
```bash
export NODE_ENV=production
pm2 restart vaastu-backend
```

## Backend Logs

Check backend logs to see what's happening:

```bash
# If using PM2
pm2 logs vaastu-backend

# You should see lines like:
# Course lookup for xxx-xxx: { id: '...', status: 'PUBLISHED', ... }
# Generating sharing links for user yyy and course xxx
```

If you see:
```
Course xxx has status: DRAFT, expected PUBLISHED
```

Then you need to publish that course.

## Script Usage

The `scripts/publish-courses.js` script is safe to run multiple times.
It will:
1. Show you which courses will be published
2. Update their status to PUBLISHED
3. Confirm the update
4. Not affect already published courses

```bash
# Dry run - see what would change
node scripts/publish-courses.js

# The script is safe - it only changes status field
```
