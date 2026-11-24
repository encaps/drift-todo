import { getDb } from '@/lib/db'

// Searches every section, completed todos and read links included
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json([])

  // Every word has to match somewhere; % and _ are literal
  const words = q
    .split(/\s+/)
    .slice(0, 8)
    .map((w) => `%${w.replace(/[\\%_]/g, '\\$&')}%`)

  const sql = getDb()
  const rows = await sql`
    SELECT * FROM todos t
    WHERE NOT EXISTS (
      SELECT 1 FROM unnest(${words}::text[]) AS w(pattern)
      WHERE NOT (
        t.text ILIKE w.pattern OR
        COALESCE(t.url, '') ILIKE w.pattern OR
        COALESCE(t.description, '') ILIKE w.pattern
      )
    )
    ORDER BY t.completed ASC, t.created_at DESC
    LIMIT 50
  `
  return Response.json(rows)
}
