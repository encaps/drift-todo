import { getDb } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getDb()
  const body = await request.json()

  if ('label' in body) {
    await sql`UPDATE sections SET label = ${body.label} WHERE id = ${id}`
  }
  if ('icon' in body) {
    await sql`UPDATE sections SET icon = ${body.icon} WHERE id = ${id}`
  }
  if ('position' in body) {
    await sql`UPDATE sections SET position = ${body.position} WHERE id = ${id}`
  }

  const rows = await sql`SELECT * FROM sections WHERE id = ${id}`
  if (rows.length === 0) {
    return Response.json({ error: 'Section not found' }, { status: 404 })
  }
  return Response.json(rows[0])
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getDb()

  // Get the section being deleted
  const section = await sql`SELECT * FROM sections WHERE id = ${id}`
  if (section.length === 0) {
    return Response.json({ error: 'Section not found' }, { status: 404 })
  }

  // Get a fallback section (first one that isn't this one)
  const fallback = await sql`
    SELECT key FROM sections WHERE id != ${id} ORDER BY position ASC LIMIT 1
  `

  if (fallback.length > 0) {
    // Move orphaned todos to the fallback section
    await sql`
      UPDATE todos SET view = ${fallback[0].key} WHERE view = ${section[0].key}
    `
  }

  await sql`DELETE FROM sections WHERE id = ${id}`
  return Response.json({ ok: true })
}
