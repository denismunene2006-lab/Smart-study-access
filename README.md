# Embu Past Papers Hub

University of Embu Past Papers Hub is a multi-page web app for browsing protected past papers, managing subscriptions, rewarding referrals, and reviewing uploads.

## Live preview
The current frontend preview is available at:
`https://denismunene2006-lab.github.io/Smart-study-access/`

## Deployment target
- Frontend: Vercel static deployment from the repo root
- Backend + Auth + Storage: Supabase
- Payments: M-Pesa Daraja STK Push via API in `server/`

## Pages
- `index.html` Home and product overview
- `auth.html` Sign up and login
- `library.html` Papers library view
- `subscription.html` Subscription and payment details
- `rewards.html` Rewards and referrals
- `profile.html` User profile and subscription status
- `admin.html` Admin dashboard and system overview

## Structure
- `/` Frontend pages and static assets
- `assets/css/` Shared stylesheets
- `assets/js/` Shared JavaScript
- `scripts/` Frontend build tooling
- `server/` Backend API and integrations

## Frontend on Vercel
1. Import this repository into Vercel.
2. Set the build command to `npm run build` if Vercel does not detect it automatically.
3. Set the output directory to `dist` if needed.
4. Add the `FRONTEND_API_BASE` environment variable with your API base URL.
  Example: `https://your-api-service.example.com/api`

The build script writes that value into `dist/assets/js/runtime-config.js`, so the deployed frontend talks to your hosted API.

## Backend + Supabase
1. In Supabase, run `server/supabase-schema.sql` in the SQL editor.
2. Create two Storage buckets: `papers` and `uploads`.
3. Configure environment variables in `server/.env` from `server/.env.example`.
4. Deploy the `server/` API to your preferred Node host (Render, Railway, Fly.io, etc).
5. Use `/api/health/live` as your liveness check path.

## Local development
- Frontend: serve the repo root with a static server
  Example: `python -m http.server 5500`
- Backend:
  - `cd server`
  - `Copy-Item .env.example .env`
  - `npm install`
  - `npm run check:ready`
  - `npm run dev`

## Notes
- Shared UI logic lives in `assets/js/app.js`.
- `server/.env` is for local development only and should not be committed.
