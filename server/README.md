# Embu Past Papers API

## Prerequisites
- Node.js 18+
- PostgreSQL
- psql available in PATH

## Setup
1. cd server
2. Copy env file and update values:
   - cp .env.example .env
3. Create database and run schema:
   - psql $DATABASE_URL -f db/schema.sql
4. Install dependencies:
   - npm install
5. Start the API:
   - npm run dev

## Frontend
The frontend expects the API at http://localhost:4000/api by default.
If you need a different base URL, set it in localStorage under key "uepp_api_base".

Serve the frontend with a local static server to avoid file:// restrictions.

## M-Pesa
Fill the MPESA_* variables in .env and configure the callback URL to:
  /api/subscriptions/mpesa/callback

The API uses mpesa-node to initiate STK Push requests.

## Notes
- Uploads are stored in server/storage/uploads and moved to server/storage/papers after approval.
- Rewards are applied when an upload is approved or when referrals reach 3 signups.

## Admin
Promote a user to admin in Postgres:
  UPDATE users SET role = 'admin' WHERE email = 'you@embuni.ac.ke';
