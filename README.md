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

## Read later

The **Read later** section (`sections.kind = 'links'`) holds saved links instead of
Today / Soon / Someday. On save the server fetches the page's title and description in
the background, so the card shows the bare URL for a few seconds. Saving a URL that is
already there moves it back to the top as unread. Mark a link read (swipe right or ✓)
to archive it; read links stay searchable. Search (`/` or the magnifier) covers every
section: todo text, link titles, URLs and descriptions.

Ways to save a link:

- **In the app**: open Read later, press `+` (or `N`) and paste the URL.
- **Desktop browser**: drag the "Save to drift" bookmarklet from the empty Read later
  list to your bookmarks bar, or create a bookmark with this URL (replace the origin):

  ```
  javascript:(()=>{window.open('https://todo-app-xi-green.vercel.app/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'drift-save','width=380,height=240')})()
  ```

  It opens a small window that saves the page and closes itself.
- **iPhone share sheet**: needs `VOICE_TOKEN` set in Vercel (the same token the Siri
  voice Shortcut uses). In Shortcuts, create "Save to Drift":
  1. Shortcut details: turn on **Show in Share Sheet**, accepting **URLs** and **Text**.
  2. Add **Get Contents of URL**: URL `https://todo-app-xi-green.vercel.app/api/links/share`,
     Method **POST**, Header `Authorization: Bearer <VOICE_TOKEN>`, Request Body **JSON**
     with key `text` set to **Shortcut Input**.
  3. Add **Show Notification** with the result (e.g. "Saved to Read later: github.com").

  The endpoint takes the first URL it finds, so apps that share "Look at this https://…" work too.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Open quick add |
| `Cmd+K` | Open quick add |
| `/` | Search all sections |
| `Tab` | Cycle category (in quick add) |
| `Enter` | Submit todo |
| `Esc` | Close modal |

## Gestures (mobile)

- **Swipe right** on a todo to complete it
- **Swipe left** to delete
- **Tap text** to edit inline
