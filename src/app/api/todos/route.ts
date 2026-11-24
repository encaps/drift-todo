import { getDb } from '@/lib/db'
import { normalizeUrl } from '@/lib/url'

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
  const { id, text, category, view, position, url, description } = await request.json()

  // Rendered as an href on the link card, so only http(s) URLs get in
  const safeUrl = url == null ? null : normalizeUrl(String(url))
  if (url != null && !safeUrl) {
    return Response.json({ error: 'Not a valid http(s) URL' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO todos (id, text, category, view, position, url, description)
    VALUES (${id}, ${text}, ${category}, ${view || 'private'}, ${position}, ${safeUrl}, ${description ?? null})
    RETURNING *
  `
  return Response.json(rows[0], { status: 201 })
}
