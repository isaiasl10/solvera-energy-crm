# Deployment Instructions for Solvera Energy CRM

## If You Can Download Files from This Environment:

1. Download `solvera-crm-deploy.tar.gz`
2. Extract it on your computer
3. Skip to "Upload to GitHub" section below

---

## If You Cannot Download Files:

### Manual File Transfer via GitHub Web Interface:

Since you're in an online environment, you can upload files directly through GitHub's web interface. Here's what to do:

1. **Go to your GitHub repository:**
   - Navigate to https://github.com/isaiasl0/solvera-energy-crm

2. **For each file you want to update, do this:**
   - Click on the file in GitHub
   - Click the pencil icon (Edit)
   - Copy the content from this environment
   - Paste into GitHub
   - Commit the change

3. **Key files to update** (in order of importance):
   - `src/App.tsx`
   - `src/components/Login.tsx`
   - All files in `src/components/`
   - `package.json`
   - All config files (vite.config.ts, etc.)

### Or Use GitHub Desktop:

1. Download GitHub Desktop: https://desktop.github.com/
2. Clone your repository
3. Manually copy files from this environment to the cloned folder
4. Commit and push

---

## Alternative: Ask Your Environment for Help

**Screenshot this and look for:**
- Download button in toolbar
- Export project option
- File menu → Export/Download
- Settings → Export project

Most online IDEs have a way to download the entire project as a ZIP file.

---

### Security Improvements Included
This deployment includes major security and performance fixes:
- ✅ 20 missing database indexes added
- ✅ 27 RLS policies optimized for performance
- ✅ 10 database functions secured against SQL injection
- ✅ 7 policy consolidations for better performance

**See `SECURITY_FIXES.md` for complete details.**

**Action Required After Deployment:**
1. Enable "Leaked Password Protection" in Supabase Dashboard → Authentication → Policies
2. Change Auth connection strategy to percentage-based in Project Settings → Database

## Upload to GitHub (After Getting Files)

### Method 1: GitHub Web Interface
1. Go to https://github.com/isaiasl0/solvera-energy-crm
2. Click "Add file" → "Upload files"
3. Drag all project files
4. Commit: "Update CRM with latest changes"

### Method 2: Git Command Line
```bash
git clone https://github.com/isaiasl0/solvera-energy-crm.git
cd solvera-energy-crm
# Copy your files here
git add .
git commit -m "Update CRM"
git push origin main
```

---

## Environment Variables (IMPORTANT)

In Netlify Dashboard:
1. Go to: Site settings → Environment variables
2. Add these:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

---

## After Deployment

1. Netlify will automatically deploy (1-2 minutes)
2. Check deploy log - should show "Building..." not "No changes"
3. Visit your site to verify changes

---

## Troubleshooting

**Still says "No changes" on Netlify?**
- Verify files uploaded to GitHub
- Check you're on the `main` branch
- Try: Netlify → "Trigger deploy" → "Clear cache and deploy"

**Need the actual file contents?**
Let me know which specific files you need and I can show you the content to copy/paste directly into GitHub's web editor.
