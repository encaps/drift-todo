import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM sections ORDER BY position ASC, created_at ASC
  `
  return Response.json(rows)
}

export async function POST(request: Request) {
  const sql = getDb()
  const { key, label, icon } = await request.json()

  if (!key || !label) {
    return Response.json({ error: 'key and label are required' }, { status: 400 })
  }

  // Get next position
  const [{ max }] = await sql`SELECT COALESCE(MAX(position), -1) AS max FROM sections`

  const rows = await sql`
    INSERT INTO sections (key, label, icon, position)
    VALUES (${key}, ${label}, ${icon || '📋'}, ${max + 1})
    RETURNING *
  `
  return Response.json(rows[0], { status: 201 })
}
