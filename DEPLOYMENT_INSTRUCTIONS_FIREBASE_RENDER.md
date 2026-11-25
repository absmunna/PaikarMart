# PaikarMart Web · 100% Free-Tier Production Deployment Guide
**Stack:** Vercel (Frontend) + Render Free (Backend) + Supabase Free (PostgreSQL & File Storage) + Firebase Spark Free Plan (Auth & Firestore)  
**Active Firebase Project ID:** `gen-lang-client-0609196204`

This guide documents how PaikarMart runs end-to-end with **zero billing cards required**, while keeping **AI Studio Preview** and **Vercel Production** working seamlessly side-by-side.

---

## 1. How Dual-Environment Compatibility Works (AI Studio Preview + Vercel)

| Layer | AI Studio Preview (`:3000`) | Vercel + Render Production |
| :--- | :--- | :--- |
| **Firebase Frontend Config** | Automatically loads `firebase-applet-config.json` (`projectId: gen-lang-client-0609196204`, `firestoreDatabaseId: ai-studio-appstudio-...`) | Checks `VITE_FIREBASE_*` env vars first; if unset, seamlessly falls back to `firebase-applet-config.json` |
| **Firestore Database ID** | Uses AI Studio named Firestore DB (`ai-studio-appstudio-...`) from `firebase-applet-config.json` | Set `VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)` in Vercel if using your Firebase Console's `(default)` database, or leave unset to share the same DB |
| **API Routing (`/api/*`)** | Express & Vite run together on port `3000` (same origin) | `vercel.json` rewrites `/api/(.*)` to Render backend, or set `VITE_API_BASE_URL` |
| **Asset Uploads (Avatars & KYC)** | Routed via `/api/auth/upload-asset` -> **Supabase Storage** (filename fallback when offline) | Routed via `/api/auth/upload-asset` -> **Supabase Free Storage** (`paikarmart-avatars` + private `paikarmart-kyc-docs`) |

---

## 2. Firebase Spark (Free) Plan Limitations & Implemented Alternatives

1. **Firebase Cloud Storage (Requires Blaze Billing on New Projects):**
   - **Alternative Implemented:** All profile avatar uploads (`<= 2 MB`) and KYC document uploads (`<= 6 MB` PDF/JPG/PNG/WebP) automatically upload via `POST /api/auth/upload-asset` (authenticated by Firebase ID Token) to **Supabase Free Storage (1 GB free, no card required)**:
     - `paikarmart-avatars`: Public read URLs for profile photos.
     - `paikarmart-kyc-docs`: **Private bucket** using 30-day signed HTTPS URLs so NID/Trade License scans are never publicly exposed.
   - *(Optional)* Only set `VITE_ENABLE_FIREBASE_STORAGE=true` if you later upgrade Firebase to Blaze.

2. **Firebase Admin SDK Without Service-Account Billing/IAM:**
   - **Alternative Implemented:** `apps/backend/middleware/requireFirebaseAuth.ts` verifies Firebase ID tokens using Google's public x509 certificates (`projectId: gen-lang-client-0609196204`) without requiring `GOOGLE_APPLICATION_CREDENTIALS` or GCP metadata lookups on Render.
   - `POST /api/auth/revoke-sessions` clears the server auth cache cleanly and skips IAM-only token revocation when running on Spark/Render without service account credentials.

3. **Firebase Phone OTP SMS Quota on Spark Plan:**
   - Firebase Spark limits real SMS OTP delivery (or requires Blaze billing in certain regions).
   - **Recommended Spark Setup:** Use **Google Sign-In** and **Email/Password** in production; for testing Phone OTP without billing, add numbers under **Firebase Console -> Authentication -> Sign-in method -> Phone -> Phone numbers for testing**.

4. **Render Free Tier Cold Starts & CORS:**
   - Render Free Web Services sleep after ~15 minutes of inactivity. Use the built-in health endpoint `GET /api/health` for uptime checks.
   - Ensure `CORS_ORIGINS` on Render includes your exact Vercel production URL (`https://your-app.vercel.app`) and custom domain (comma-separated).

---

## 3. Step-by-Step Deployment

### Step 1: Supabase Setup (Database + Free File Storage)
1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste the entire `/supabase/schema.sql`, and run it.
   - This creates all tables (including `notifications`), RLS policies, analytics schema, and the two free storage buckets (`paikarmart-avatars`, `paikarmart-kyc-docs`).
3. Copy your credentials from **Project Settings -> API**:
   - `Project URL` (`SUPABASE_URL` / `VITE_SUPABASE_URL`)
   - `anon public` key (`SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`)
   - `service_role` secret (`SUPABASE_SERVICE_ROLE_KEY` — backend/Render only, **never expose in frontend**)

### Step 2: Backend Deployment on Render (Free Web Service)
1. Connect your GitHub repo to [Render](https://dashboard.render.com) (using `render.yaml` or manual Web Service):
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/api/health`
2. Configure **Environment Variables** in Render:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `FIREBASE_PROJECT_ID=gen-lang-client-0609196204`
   - `SUPABASE_URL=https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY=your-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
   - `CORS_ORIGINS=https://your-app.vercel.app`
   - `GEMINI_API_KEY=...` *(optional, for AI features)*
   - `PAYMENT_WEBHOOK_SECRET=...` *(optional HMAC secret)*
   - `PAYMENT_SANDBOX_MODE=true` *(set `true` for bKash/Nagad/SSLCommerz sandbox testing; omit/false when using live merchant keys)*
   - `COURIER_WEBHOOK_SECRET=...` *(optional HMAC secret)*
3. Note your live Render URL (e.g., `https://paikarmart-backend.onrender.com`). If your Render service name differs, update the `/api/(.*)` destination URL inside `/vercel.json`.

### Step 3: Frontend Deployment on Vercel (Free Hobby Plan)
1. Import your GitHub repository into [Vercel](https://vercel.com/new) (leave Root Directory as `.`).
   - `vercel.json` automatically configures `npm run build:frontend`, output dir `apps/frontend/dist`, SPA fallback, COOP popup headers for Google Sign-In, and `/api/*` proxy rewrites.
2. Add **Environment Variables** in **Vercel -> Project Settings -> Environment Variables**:
   - **Required for Supabase Direct Features (Analytics/Catalog/Social fallback):**
     - `VITE_SUPABASE_URL=https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY=your-anon-key`
   - **Optional Firebase Overrides (leave blank to reuse `firebase-applet-config.json`, or set from `gen-lang-client-0609196204` Web App):**
     - `VITE_FIREBASE_API_KEY=...`
     - `VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0609196204.firebaseapp.com`
     - `VITE_FIREBASE_PROJECT_ID=gen-lang-client-0609196204`
     - `VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)` *(set `(default)` if Vercel should target Firebase Console's default Firestore instance instead of the AI Studio named instance)*
     - `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
     - `VITE_FIREBASE_APP_ID=...`
   - **Optional Direct Backend URL:** Leave `VITE_API_BASE_URL` blank to proxy cleanly via `vercel.json` (recommended to avoid CORS preflight overhead), or set `https://your-backend.onrender.com`.
3. Deploy via Git push or `npx vercel --prod`.

### Step 4: Firebase Console Final Checklist (`gen-lang-client-0609196204`)
1. Open [Firebase Console (`gen-lang-client-0609196204`)](https://console.firebase.google.com/project/gen-lang-client-0609196204/authentication/settings).
2. Under **Authentication -> Settings -> Authorized domains**, add your Vercel domain (`your-app.vercel.app`) and any custom domain so Google Sign-In works in production.
3. Under **Authentication -> Sign-in method**, confirm **Email/Password** and **Google** are enabled.
4. Deploy Firestore rules to your default/named database if editing locally:
   ```bash
   firebase use gen-lang-client-0609196204
   firebase deploy --only firestore:rules
   ```
5. Verify `/api/health` returns `"status": "ok"`, `"firebaseProject": "gen-lang-client-0609196204"`, and `"storageBackend": "Supabase Storage (Free Tier)"`.
