import { getDb } from '@/lib/db'

export async function DELETE() {
  const sql = getDb()
  await sql`DELETE FROM todos WHERE completed = true`
  return Response.json({ ok: true })
}
