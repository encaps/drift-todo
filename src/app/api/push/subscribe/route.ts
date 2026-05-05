import { getDb } from '@/lib/db'

export async function POST(request: Request) {
  let sql
  try {
    sql = getDb()
  } catch {
    return Response.json({ error: 'Database not configured' }, { status: 500 })
  }

  const subscription = await request.json()

  await sql`
    INSERT INTO push_subscriptions (endpoint, keys, auth)
    VALUES (${subscription.endpoint}, ${JSON.stringify(subscription.keys)}, ${subscription.keys?.auth})
    ON CONFLICT (endpoint) DO UPDATE SET keys = ${JSON.stringify(subscription.keys)}
  `

  return Response.json({ ok: true })
}
