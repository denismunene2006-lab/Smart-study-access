# Embu Past Papers API

## Stack
- Express on Render
- MongoDB Atlas (or another MongoDB deployment)
- M-Pesa STK Push for payments
- Persistent disk on Render for uploaded PDFs

## Local setup
1. `cd server`
2. Copy `server/.env.example` to `server/.env`
3. Update `MONGODB_URI`, `JWT_SECRET`, and the `MPESA_*` values
4. Install dependencies:
   - `npm install`
5. Check readiness:
   - `npm run check:ready`
6. Start the API:
   - `npm run dev`

## Health checks
- `GET /api/health/live` is the Render health check endpoint.
- `GET /api/health` returns detailed readiness for MongoDB, storage, and M-Pesa.
- `GET /api/health/ready` returns `200` when the core backend is ready and `503` otherwise.
- Set `STRICT_STARTUP=true` if you want startup to fail when MongoDB is unavailable.

## Render notes
- Set the service root directory to `server`.
- Use `npm install` as the build command.
- Use `npm start` as the start command.
- Attach a persistent disk and mount it at the same path you place in `STORAGE_ROOT`.
- Point the Render health check path to `/api/health/live`.

## M-Pesa
- Configure the Daraja callback URL as:
  - `/api/subscriptions/mpesa/callback`
- If `MPESA_CALLBACK_URL` is empty on Render, the app can infer it from `RENDER_EXTERNAL_HOSTNAME`.

## Storage
- Uploaded PDFs are stored under `storage/uploads`.
- Approved PDFs are moved to `storage/papers`.
- Rejected uploads are deleted from storage to keep the disk clean.
