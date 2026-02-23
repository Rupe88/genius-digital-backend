# Fix: "Column courses.promoVideos does not exist" – Step by Step

Follow these steps in order.

---

## Step 1: Add the missing column to your database

Choose **one** of these two ways.

### Option A – Run the script (recommended)

1. Open a terminal.
2. Go to the backend folder:
   ```bash
   cd /home/rupesh/dp/lms/vaastu-backend
   ```
   (If your project is somewhere else, use that path instead.)

3. Make sure your `.env` in this folder has the **production** `DATABASE_URL` (the same one used by your live app on DigitalOcean/Supabase).

4. Run:
   ```bash
   node scripts/add-promo-videos-column.js
   ```

5. You should see:
   ```text
   SUCCESS: Column "promoVideos" added to table "courses" (or already existed).
   ```
   If you see an error, use Option B below instead.

---

### Option B – Run SQL in Supabase (or your DB console)

1. Log in to **Supabase**: https://supabase.com/dashboard  
2. Open the **project** that your production app uses (same as in `DATABASE_URL`).
3. In the left sidebar, click **SQL Editor**.
4. Click **New query**.
5. Paste this exactly:
   ```sql
   ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "promoVideos" JSONB;
   ```
6. Click **Run** (or press Ctrl+Enter).
7. You should see “Success. No rows returned.” That’s correct.

---

## Step 2: Restart your backend (local)

If you run the backend on your computer:

1. Stop the server (Ctrl+C in the terminal where it’s running).
2. Start it again:
   ```bash
   cd /home/rupesh/dp/lms/vaastu-backend
   npm run start
   ```
   Or, if you use dev:
   ```bash
   npm run dev
   ```

---

## Step 3: Redeploy backend in production (DigitalOcean / hosting)

So that the **live** app uses the updated database:

1. Push your latest code (including the migration/script and schema) to GitHub/GitLab:
   ```bash
   git add .
   git commit -m "Add promoVideos column migration and fix script"
   git push origin main
   ```
2. In **DigitalOcean App Platform** (or your host):
   - Open your **backend** app.
   - Trigger a **redeploy** (e.g. “Deploy” or “Redeploy”).
3. Wait until the deploy finishes and the app is running.

**Important:** The column must already exist in the **production** database (Step 1).  
If production uses the **same** Supabase project as your `.env`, then Option A or B in Step 1 already fixed production.  
If production uses a **different** database, run Option B (SQL) in **that** project’s SQL Editor.

---

## Step 4: Check that courses show again

1. Open your **production** site (e.g. https://sanskarvastu.com).
2. Log in as admin if needed.
3. Go to **Courses** (or the page that lists courses).
4. You should see your courses again. If the list was empty only because of the error, it will show data now.

---

## Step 5: If the list is still empty

Then the table might really be empty in the DB you’re using:

1. **Confirm which DB production uses**  
   In DigitalOcean (or your host), open the backend app → **Settings** / **Environment Variables** and check `DATABASE_URL`. Note the host/project.

2. **Check the same DB in Supabase**  
   - In Supabase, open that project → **Table Editor** → **courses**.  
   - See if there are any rows.  
   - If there are rows but the app still shows nothing, clear cache, try another browser or incognito, and check the browser Network tab for API errors.

3. **If the table is empty and you had data before**  
   - Restore from a **Supabase backup** (Supabase Dashboard → Project Settings → Backups), or  
   - Restore from your own backup if you have one.

---

## Quick checklist

- [ ] Step 1: Ran script **or** ran the SQL in the correct database.
- [ ] Step 2: Restarted backend locally (if you run it locally).
- [ ] Step 3: Pushed code and redeployed backend in production.
- [ ] Step 4: Checked production site – courses page loads without error.
- [ ] Step 5 (only if still empty): Checked correct DB and backups.

---

## One-line summary

**Add the column (script or SQL) → restart/redeploy backend → check the courses page.**
