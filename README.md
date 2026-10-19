# Salaria Makeovers

Website for Salaria Makeovers - a professional & certified makeup artist and hairstylist brand. Full-stack: a React site with a hidden admin panel, backed by a real Express + SQLite server, so bookings and content edits persist for good instead of disappearing when a browser tab closes.

## Features

- Public site: hero, services, portfolio, testimonials, stats, and a multi-step booking form (with UPI advance-payment flow)
- Hidden admin panel (4-corner tap gesture, no visible admin link on the live site) to manage bookings, site content, services, portfolio, testimonials, stats, and tags
- 10-minute inactivity auto-logout and a server-side login lockout after repeated failed attempts
- Real persistence: every booking and every content edit is written to a SQLite file on the server, not browser storage

## Tech Stack

- **Frontend:** React (Create React App)
- **Backend:** Node.js, Express
- **Database:** SQLite (`better-sqlite3`)
- **Auth:** Bearer-token sessions (server-side, 24h expiry)

## Setup

### 1. Backend

```bash
cd server
npm install
npm start
```

Runs on `http://localhost:4000`. Creates `server/salaria.db` on first run (gitignored - not checked in).

### 2. Frontend (development)

```bash
npm install
npm start
```

Runs on `http://localhost:3000` and proxies `/api/*` requests to the backend on port 4000 (see the `"proxy"` field in `package.json`).

### 3. Production

```bash
npm run build
cd server && npm start
```

The backend serves the built frontend directly from `build/` on the same origin as the API, so there's nothing else to configure or deploy separately - one process, one port (4000).

## Admin Access

Tap the four corners of the screen in order - top-left, top-right, bottom-left, bottom-right - to open the login screen. Default password: `salaria2026` (change it from Security settings after first login).

## Project Structure

```
├── src/App.jsx          # Entire frontend (site + admin) - single-file React app
├── server/
│   ├── index.js          # Express API + static file serving
│   └── package.json
└── public/               # Static assets, manifest
```

## Notes

- The admin API (`/api/admin/*`) is token-gated; only `/api/site` (public content) and `/api/bookings` (submit a booking) are open to anonymous visitors.
- Admin credentials and bookings are never sent to anonymous site visitors - the public endpoint returns a filtered view of the state.
