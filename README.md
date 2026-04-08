# Roth Conversion Advisor — Deployment Guide

## What you have

A production-ready Next.js 14 app with:
- Secure server-side API proxy (your Anthropic key never reaches the browser)
- Persistent session storage with auto-save
- Full tax engine, conversion schedule, SS optimizer, and AI advisor
- Mobile-first design optimized for 50+ users

---

## Step 1 — Install prerequisites (one-time)

You need Node.js 18+ and Git. Check if you have them:

```bash
node --version   # needs to say v18 or higher
git --version
```

If not installed:
- **Node.js**: download from https://nodejs.org (choose "LTS")
- **Git**: download from https://git-scm.com

---

## Step 2 — Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Sign in (or create a free account)
3. Click **API Keys** in the left sidebar
4. Click **Create Key** — name it "roth-advisor"
5. Copy the key (starts with `sk-ant-...`) — you only see it once!

---

## Step 3 — Set up the project locally

```bash
# Navigate into the project folder
cd roth-advisor

# Install all dependencies
npm install

# Create your local environment file
cp .env.example .env.local
```

Now open `.env.local` in any text editor and replace the placeholder:

```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Save the file.

---

## Step 4 — Test it locally

```bash
npm run dev
```

Open your browser to **http://localhost:3000**

You should see the Roth Advisor welcome screen. Click through all 5 steps and test the AI chat. If the chat responds — everything is working.

To stop the server: press `Ctrl + C`

---

## Step 5 — Push to GitHub

GitHub is where Vercel will pull your code from.

1. Go to https://github.com and sign in (or create a free account)
2. Click the **+** button → **New repository**
3. Name it `roth-advisor`
4. Leave it **Private** (recommended — keeps your code safe)
5. Click **Create repository**
6. GitHub will show you commands. Run them in your terminal:

```bash
git init
git add .
git commit -m "Initial production build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/roth-advisor.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

> ⚠️ The `.gitignore` file already excludes `.env.local` — your API key will NOT be uploaded to GitHub.

---

## Step 6 — Deploy to Vercel (free hosting)

Vercel is the company that makes Next.js — it's the best place to host it.

1. Go to https://vercel.com and sign in with your GitHub account
2. Click **Add New Project**
3. Find `roth-advisor` in your repository list and click **Import**
4. Vercel will auto-detect Next.js — don't change any settings
5. **Before clicking Deploy**, scroll to **Environment Variables**:
   - Click **Add**
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste your key (`sk-ant-...`)
   - Click **Add**
6. Click **Deploy**

Vercel will build and deploy in about 60 seconds.

You'll get a live URL like: `https://roth-advisor-yourname.vercel.app`

---

## Step 7 — Set a custom domain (optional but recommended)

If you want `www.rothadvisor.com` instead of the Vercel URL:

1. Buy a domain at Namecheap, GoDaddy, or Google Domains (~$12/year)
2. In Vercel: go to your project → **Settings** → **Domains**
3. Add your domain and follow the DNS instructions Vercel gives you
4. Takes 5–30 minutes to go live

---

## Step 8 — Future updates

Every time you change the code and want to update the live site:

```bash
git add .
git commit -m "Description of what changed"
git push
```

Vercel automatically detects the push and redeploys in ~60 seconds. Zero downtime.

---

## Troubleshooting

**"Module not found" errors during npm install**
```bash
rm -rf node_modules package-lock.json
npm install
```

**AI chat returns an error**
- Check that `ANTHROPIC_API_KEY` is set correctly in `.env.local`
- Make sure there are no spaces around the `=` sign
- Verify the key at https://console.anthropic.com

**Vercel deployment fails**
- Check the build logs in Vercel dashboard for the specific error
- Most common cause: TypeScript type errors — run `npm run build` locally first to catch them

**Session data not saving between visits**
- Sessions use localStorage — they're tied to the browser and device
- This is by design for v1 — no login required
- To add cross-device sync later, integrate Supabase (see ROADMAP below)

---

## ROADMAP — What to build after launch

### Week 2: Cross-device sessions (Supabase)
Replace localStorage with a Supabase database. Users get a simple session link they can bookmark. No login required — just a UUID in the URL. Cost: free tier handles thousands of users.

### Week 3: PDF export
Generate a printable PDF summary of the full analysis — conversion schedule, SS recommendation, balance projection. Users bring this to their financial advisor.

### Week 4: Email capture + advisor share
Optional email field at the end. Sends a "share with my advisor" summary email. Builds your user list for announcements.

### Month 2: Analytics
Add Vercel Analytics (free, privacy-friendly, no cookies). See which steps users drop off on, which tabs get used, how long sessions last. Tells you what to improve.

### Month 2: Auth + cross-device sync
Add Clerk or Supabase Auth for optional account creation. Users who sign up get their sessions synced across all devices. Keep it optional — don't gate the core experience.

---

## File structure reference

```
roth-advisor/
├── src/app/
│   ├── api/chat/route.ts      ← Secure API proxy (API key lives here, server-side)
│   ├── lib/
│   │   ├── engine.ts          ← Tax math, analysis engine, all types
│   │   ├── sessions.ts        ← Session CRUD, localStorage, migration
│   │   └── prompt.ts          ← AI system prompt builder
│   ├── components/
│   │   ├── RothAdvisor.tsx    ← Main shell: routing, save bar, progress stepper
│   │   ├── WelcomeScreen.tsx  ← Session picker / resume screen
│   │   └── pages/
│   │       ├── PageAbout.tsx  ← Steps 1–4 (all intake forms)
│   │       └── PageResults.tsx← Step 5: all 6 result tabs + AI chat
│   ├── globals.css            ← All styles (design system tokens + components)
│   ├── layout.tsx             ← HTML shell + metadata
│   └── page.tsx               ← Entry point
├── .env.example               ← Template — copy to .env.local
├── .gitignore                 ← Excludes .env.local and node_modules
├── next.config.js
├── package.json
└── tsconfig.json
```
