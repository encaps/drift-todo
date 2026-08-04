import { getDb } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getDb()
  const body = await request.json()

  // Build dynamic update from provided fields
  const allowedFields = ['text', 'category', 'view', 'completed', 'completed_at', 'position']
  const updates = Object.entries(body).filter(([key]) => allowedFields.includes(key))

  if (updates.length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // For simplicity, handle the most common update patterns directly
  if ('completed' in body) {
    const rows = await sql`
      UPDATE todos
      SET completed = ${body.completed},
          completed_at = ${body.completed ? new Date().toISOString() : null}
      WHERE id = ${id}
      RETURNING *
    `
    return Response.json(rows[0])
  }

  if ('text' in body) {
    const rows = await sql`
      UPDATE todos SET text = ${body.text} WHERE id = ${id} RETURNING *
    `
    return Response.json(rows[0])
  }

  if ('category' in body) {
    const rows = await sql`
      UPDATE todos SET category = ${body.category} WHERE id = ${id} RETURNING *
    `
    return Response.json(rows[0])
  }

  if ('position' in body) {
    const rows = await sql`
      UPDATE todos SET position = ${body.position} WHERE id = ${id} RETURNING *
    `
    return Response.json(rows[0])
  }

  return Response.json({ error: 'Unsupported update' }, { status: 400 })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getDb()
  await sql`DELETE FROM todos WHERE id = ${id}`
  return Response.json({ ok: true })
}
