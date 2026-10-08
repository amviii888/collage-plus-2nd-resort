# 🍃 Next.js Classroom Portal

**Release Version:** `v0.1.4` — GitHub Repository Sync Trigger.

A premium, atmospheric classroom management portal built with **Next.js 15+** and **Tailwind CSS**, featuring an immersive, high-contrast obsidian-and-amber visual canvas.

---

## ⚡ Core Architecture: "One-Way Smart Push"

To maximize client performance, ensure absolute privacy, and operate with zero redundant reads, this application implements a **One-Way Smart Push** database synchronization model:

1. **State-Label Local Master**:
   - The primary source of truth resides in the user's browser `localStorage`.
   - All records (Students, Plans, Transactions, Attendance) have an offline-first `synced` flag.
   - Any modifications are instantly written locally and tagged with `synced: false`.
2. **Zero-Read Smart Uploads**:
   - Instead of reading remote documents from Firestore to detect changes (which drains read quota), the application queries local state to push **only** modified (`synced: false`) elements and locally deleted IDs.
3. **Event-Driven Execution**:
   - Automatic sync-push executes 8 seconds after app boot, instantly on network recovery, and via an 18-second debounced buffer after user interaction.

---

## 🚀 Easy Vercel Deployment Guide

Deploying to **Vercel** is extremely simple because Vercel natively supports Next.js with zero custom configurations, adapters, or compatibility workarounds.

### Option A: Push-to-Deploy via GitHub (Recommended)

1. **Create a GitHub Repository**:
   - Push your project code to a private or public GitHub repository.
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in.
   - Click **Add New** -> **Project**.
   - Import your GitHub repository.
3. **Configure Settings**:
   - **Framework Preset**: Vercel automatically detects **Next.js**.
   - **Build Command**: Leave as default (`npm run build`).
   - **Output Directory**: Leave as default (`.next`).
4. **Environment Variables**:
   - Under the **Environment Variables** section, paste any environment variables from your `.env.local` (such as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `GEMINI_API_KEY`).
5. **Deploy**:
   - Click **Deploy**. Your app is now live with global edge caching and automatic SSL!

---

### Option B: Deploying with Vercel CLI

If you prefer to deploy directly from your local terminal:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```
2. **Log In**:
   ```bash
   vercel login
   ```
3. **Deploy**:
   Run the following command inside your project root folder:
   ```bash
   vercel
   ```
4. **Deploy to Production**:
   Once you're satisfied with the preview deployment, push to production with:
   ```bash
   vercel --prod
   ```

---

## ⚙️ Smart Build Control (`ignore-build.sh`)

By default, the project contains an automatic build-ignore filter (`ignore-build.sh`) to save your Vercel build minutes:
* Vercel will **only** run a build if your commit message contains `[build]` or `[deploy]` (e.g., `git commit -m "Added analytics [build]"`).
* **To build on every single commit automatically**: 
  Simply go to **Vercel Dashboard -> Project Settings -> Git**, find **Ignored Build Step**, and set it to **"None"** (or clear the override command field).

