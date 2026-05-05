# Drift — Todo

Quick todos with three lanes: **Today**, **Soon**, **Someday**.
PWA that syncs across devices via Vercel Postgres, with daily push notifications.

## Quick Start (local, no sync)

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). Todos are saved in localStorage.

## Full Setup (Vercel + Postgres)

### 1. Deploy to Vercel

```bash
npx vercel
```

### 2. Add Postgres

In the Vercel dashboard: **Storage > Create > Neon Postgres**. This sets `POSTGRES_URL` automatically.

### 3. Create tables

Open the Neon console (via Vercel Storage tab) and run the SQL from `setup.sql`.

### 4. Set up notifications (optional)

```bash
npx web-push generate-vapid-keys
```

Add these env vars in Vercel dashboard:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET` (any random string)

The daily reminder cron runs at 7:00 UTC (`vercel.json`).

### 5. Install on your phone

Open the deployed URL in Safari (iPhone), tap **Share > Add to Home Screen**.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Open quick add |
| `Cmd+K` | Open quick add |
| `Tab` | Cycle category (in quick add) |
| `Enter` | Submit todo |
| `Esc` | Close modal |

## Gestures (mobile)

- **Swipe right** on a todo to complete it
- **Swipe left** to delete
- **Tap text** to edit inline
