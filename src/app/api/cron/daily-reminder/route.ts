import { getDb } from '@/lib/db'
import webpush from 'web-push'

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY

  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  let sql
  try {
    sql = getDb()
  } catch {
    return Response.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Get daily todos count
  const countResult = await sql`
    SELECT COUNT(*) as count FROM todos
    WHERE category = 'daily' AND completed = false
  `
  const count = parseInt(countResult[0].count, 10)

  if (count === 0) {
    return Response.json({ message: 'No daily todos, skipping notification' })
  }

  // Set up web-push
  webpush.setVapidDetails('mailto:hello@drift.app', vapidPublic, vapidPrivate)

  // Get all push subscriptions
  const subscriptions = await sql`SELECT * FROM push_subscriptions`

  if (subscriptions.length === 0) {
    return Response.json({ message: 'No subscriptions' })
  }

  const payload = JSON.stringify({
    title: `\u2600\uFE0F ${count} daily todo${count > 1 ? 's' : ''}`,
    body: 'Start your day \u2014 check your Drift todos',
    url: '/',
  })

  // Send to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
        },
        payload
      )
    )
  )

  // Clean up expired subscriptions
  const expired = results
    .map((r, i) => (r.status === 'rejected' ? subscriptions[i].endpoint : null))
    .filter(Boolean)

  if (expired.length > 0) {
    for (const endpoint of expired) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
    }
  }

  return Response.json({
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: expired.length,
  })
}
