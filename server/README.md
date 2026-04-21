# Embu Past Papers API

## Stack
- Express API for Daraja, moderation, and paper streaming
- Supabase Auth + Postgres + Storage
- M-Pesa STK Push for payments

## Local setup
1. `cd server`
2. Copy `server/.env.example` to `server/.env`
3. Update `SUPABASE_*` and `MPESA_*` values
4. Run the SQL in `server/supabase-schema.sql` in Supabase SQL Editor
5. Create Supabase Storage buckets: `papers` and `uploads`
4. Install dependencies:
   - `npm install`
5. Check readiness:
   - `npm run check:ready`
6. Start the API:
   - `npm run dev`

## Health checks
- `GET /api/health/live` is the liveness endpoint.
- `GET /api/health` returns detailed readiness for Supabase, storage buckets, and M-Pesa.
- `GET /api/health/ready` returns `200` when the core backend is ready and `503` otherwise.
- Set `STRICT_STARTUP=true` if you want startup to fail when Supabase is unavailable.

## Hosting notes
- Set the service root directory to `server`.
- Use `npm install` as the build command.
- Use `npm start` as the start command.
- Set `API_BASE_URL` so callback URLs can be inferred when needed.
- Point your host health check path to `/api/health/live`.

## M-Pesa
- Configure the Daraja callback URL as:
  - `/api/subscriptions/mpesa/callback`
- If `MPESA_CALLBACK_URL` is empty, the app can infer it from `API_BASE_URL`.

## Storage
- Uploaded PDFs are stored in Supabase bucket `uploads`.
- Approved PDFs are copied into Supabase bucket `papers`.
- Rejected uploads are deleted from the `uploads` bucket.
