# PaikarMart Web · Production Deployment Guide (Vercel + Render + Supabase + Firebase Auth)

This document outlines the exact architecture and step-by-step deployment instructions to run **PaikarMart Web** with:
- **Frontend**: Vercel (Free Hobby Plan · Vite React SPA)
- **Backend**: Render Free Web Service (`paikarmart-backend`)
- **Database**: Supabase PostgreSQL (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- **Authentication & Security Rules**: Firebase Auth + Firestore Security Rules (`firestore.rules`)

---

## 1. Architecture & Services Sync Matrix

| Component | Target Platform | Configuration & Secret Keys Required |
| :--- | :--- | :--- |
| **Frontend UI (Vite SPA)** | **Vercel** | `vercel.json` (`npm run build:frontend` → `apps/frontend/dist`), `/api/*` rewrite to Render |
| **Backend API (Node.js Express)** | **Render Web Service** | `render.yaml`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PROJECT_ID`, `CORS_ORIGINS` |
| **Database & Persistence** | **Supabase PostgreSQL** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `supabase/schema.sql` |
| **Authentication & KYC** | **Firebase Auth & Firestore** | `firebase-applet-config.json`, `firebase.json` (Firestore/Storage rules only) |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Backend Deployment on Render
1. Connect your GitHub repository (`main` branch) to **Render** (or use `render.yaml`).
2. Set the build & start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
3. Configure Environment Variables on Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
   - `FIREBASE_PROJECT_ID`: Your Firebase Project ID
   - `CORS_ORIGINS`: `https://your-app.vercel.app` (your Vercel production & custom domains)
   - `GEMINI_API_KEY`: (Optional) For AI auditor / assistant features

### Step 2: Frontend Deployment on Vercel
1. Connect your GitHub repository to **Vercel** (root directory `.`), or deploy with the Vercel CLI:
   ```bash
   npx vercel --prod
   ```
2. Vercel automatically reads `vercel.json`:
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `apps/frontend/dist`
   - **Rewrites**: Proxies `/api/(.*)` to `https://paikarmart-backend.onrender.com/api/$1` and falls back SPA routes to `/index.html`.
   - **Headers**: Includes `Cross-Origin-Opener-Policy: same-origin-allow-popups` for Firebase Google Sign-In popups.
3. Configure Environment Variables in **Vercel Project Settings**:
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   - `VITE_API_BASE_URL` (leave empty to route `/api/*` via `vercel.json` proxy, or set `https://paikarmart-backend.onrender.com`)

### Step 3: Database & Auth Sync Verification
1. **Firebase Console Authorized Domains**: Add your `your-app.vercel.app` (and custom domain) under **Firebase Console → Authentication → Settings → Authorized domains** so Google Sign-In works in production.
2. **Firestore Rules Only (No Firebase Hosting)**:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. **Supabase SQL**: Ensure tables in `supabase/schema.sql` (`profiles`, `vendor_memberships`, `stores`, `orders`, `saved_addresses`, etc.) are active on Supabase.
4. **End-to-End Test**:
   - Sign in with Google or Email/Password on your Vercel URL.
   - Verify `useFirebaseSupabaseSync` fetches/provisions the user profile via `/api/auth/profile`.
   - Test profile updates, cart persistence across reloads, and checkout flows.
