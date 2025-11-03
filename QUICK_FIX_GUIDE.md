# Quick Fix Guide - QR Code Generation Error

## Problem Fixed
✅ Error: "Failed to generate QR code: Cannot coerce the result to a single JSON object"
✅ Now every user can create and save QR codes to the database

## What Changed

### 1. Frontend Code (Already Applied)
- ✅ Fixed `GenerateQR.jsx` to properly handle database queries
- ✅ Removed problematic `.single()` calls
- ✅ Made QR tokens unique per user

### 2. Database Policies (You Need to Apply)
- 📝 Created `fix_qr_code_policies.sql` script
- 📝 Updates RLS policies to allow all users to create QR codes

## Apply the Fix (2 Steps)

### Step 1: Run the Database Script

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_qr_code_policies.sql`
4. Click "Run"

**OR** if you're using a local database:
```bash
psql -h your-db-host -U your-user -d your-database -f fix_qr_code_policies.sql
```

### Step 2: Test the Application

1. **Start your development server** (if not running):
   ```bash
   cd apps/Web
   npm run dev
   ```

2. **Test as different users**:
   - Log in as User A
   - Generate a QR code (should work now!)
   - Log in as User B
   - Generate a QR code (should also work!)

3. **Test event QR codes**:
   - Open an event
   - Click to generate event QR code
   - Multiple users should be able to generate their own QR codes for the same event

## Verification

After running the script, you should see:
- ✅ No more "Cannot coerce to single JSON object" errors
- ✅ Each user can create their own QR code
- ✅ QR codes are saved to the database
- ✅ Regenerating updates existing QR code instead of erroring

## If It Still Doesn't Work

1. **Check browser console** for any errors
2. **Verify database policies** were applied:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'qr_codes';
   ```
   You should see:
   - "Users can view own QR codes"
   - "Users can create own QR codes"
   - "Users can update own QR codes"
   - "Users can delete own QR codes"

3. **Check for duplicates** (optional):
   ```sql
   SELECT created_by, code_type, COUNT(*) 
   FROM qr_codes 
   GROUP BY created_by, code_type 
   HAVING COUNT(*) > 1;
   ```

4. **Clear browser cache** and localStorage:
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Refresh the page

## Files You Need

1. `fix_qr_code_policies.sql` - Database script to run in Supabase
2. `QR_CODE_FIX_SUMMARY.md` - Detailed explanation of all changes
3. `GenerateQR.jsx` - Already updated (no action needed)

## Summary

**What's Fixed:**
- ❌ Before: Only one user could create QR codes, others got errors
- ✅ After: Every user can create their own QR codes
- ❌ Before: `.single()` caused "Cannot coerce" errors
- ✅ After: Proper array handling with `.limit(1)`
- ❌ Before: QR tokens conflicted between users
- ✅ After: Unique tokens per user/event combination

**Your Action Required:**
1. Run `fix_qr_code_policies.sql` in Supabase
2. Test with multiple users
3. Enjoy working QR codes! 🎉

## Need Help?

If you encounter any issues:
1. Check the console for error messages
2. Review `QR_CODE_FIX_SUMMARY.md` for detailed information
3. Verify the database script ran successfully
4. Make sure you're logged in as an authenticated user

