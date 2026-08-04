import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const sql = getDb()
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'private'

  const rows = await sql`
    SELECT * FROM todos
    WHERE view = ${view}
    ORDER BY completed ASC, position ASC, created_at DESC
  `
  return Response.json(rows)
}

export async function POST(request: Request) {
  const sql = getDb()
  const { id, text, category, view, position } = await request.json()

  const rows = await sql`
    INSERT INTO todos (id, text, category, view, position)
    VALUES (${id}, ${text}, ${category}, ${view || 'private'}, ${position})
    RETURNING *
  `
  return Response.json(rows[0], { status: 201 })
}
