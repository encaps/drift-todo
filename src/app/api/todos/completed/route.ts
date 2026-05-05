import { getDb } from '@/lib/db'

export async function DELETE(request: Request) {
  const sql = getDb()
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view) {
    await sql`DELETE FROM todos WHERE completed = true AND view = ${view}`
  } else {
    await sql`DELETE FROM todos WHERE completed = true`
  }
  return Response.json({ ok: true })
}
