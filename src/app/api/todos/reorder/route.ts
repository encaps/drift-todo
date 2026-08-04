import { getDb } from '@/lib/db'

export async function PATCH(request: Request) {
  const sql = getDb()
  const { updates } = await request.json()

  if (!Array.isArray(updates) || updates.length === 0) {
    return Response.json({ error: 'updates must be a non-empty array' }, { status: 400 })
  }

  const valid = updates.filter(
    (u): u is { id: string; position: number } =>
      u && typeof u.id === 'string' && typeof u.position === 'number'
  )
  if (valid.length === 0) {
    return Response.json({ error: 'No valid updates' }, { status: 400 })
  }

  await sql.transaction((tx) =>
    valid.map((u) => tx`UPDATE todos SET position = ${u.position} WHERE id = ${u.id}`)
  )

  return Response.json({ ok: true })
}
