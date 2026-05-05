import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM todos
    ORDER BY completed ASC, created_at DESC
  `
  return Response.json(rows)
}

export async function POST(request: Request) {
  const sql = getDb()
  const { id, text, category, position } = await request.json()

  const rows = await sql`
    INSERT INTO todos (id, text, category, position)
    VALUES (${id}, ${text}, ${category}, ${position})
    RETURNING *
  `
  return Response.json(rows[0], { status: 201 })
}
