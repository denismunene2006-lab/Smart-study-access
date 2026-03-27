# Embu Past Papers Hub

University of Embu Past Papers Hub is a lightweight web experience designed for students to discover, access, and manage past papers. The frontend is a clean, static site with multiple pages, centralized styling, and shared scripts. A backend can be connected later through the `server/` directory.

## Project Goals
- Provide a clear, mobile-first experience for students.
- Keep the frontend fast and simple to host.
- Allow easy expansion when a backend API is ready.

## Features
- Multi-page layout (home, auth, library, subscription, rewards, profile, admin).
- Shared styling and scripts for consistent UI and behavior.
- Ready for hosting as a static site.

## Pages
- `index.html` Home and product overview
- `auth.html` Sign up and login
- `library.html` Papers library view
- `subscription.html` Subscription and payment details
- `rewards.html` Rewards and referrals
- `profile.html` User profile and subscription status
- `admin.html` Admin dashboard and system overview

## Structure
- `/` Frontend pages (HTML files at repo root)
- `assets/css/` Stylesheets
- `assets/js/` JavaScript
- `server/` Backend services (optional / future)

## Run Locally
You can open `index.html` directly in a browser, or use a simple local server:

```powershell
python -m http.server 5500
```

Then visit `http://localhost:5500` in your browser.

## Deployment
The site is ready for static hosting. Deploy the repo root to your host of choice.  
For GitHub Pages, set the Pages source to the `/(root)` folder on the `main` branch.

## Notes
- Any backend integration should be developed inside `server/`.
- Keep shared UI logic in `assets/js/app.js` to avoid duplication.
