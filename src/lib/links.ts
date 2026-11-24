import { after } from 'next/server'
import { getDb } from '@/lib/db'
import { fetchLinkMeta } from '@/lib/linkMeta'
import type { Todo } from '@/lib/types'

export { normalizeUrl, firstUrlIn } from '@/lib/url'

export class NoLinksSectionError extends Error {}

/**
 * Saves a link to the first "links" section. Saving a URL that is already
 * there moves it back to the top as unread instead of adding a duplicate.
 * The page title and description are fetched after the response is sent, so
 * capture returns at once and the app's poll picks the title up a few
 * seconds later.
 */
export async function saveLink({
  url,
  title,
  id,
  view,
}: {
  url: string
  title?: string | null
  id?: string
  view?: string
}): Promise<Todo> {
  const sql = getDb()

  let sectionKey = view
  if (!sectionKey) {
    const [section] = await sql`
      SELECT key FROM sections WHERE kind = 'links' ORDER BY position ASC, created_at ASC LIMIT 1
    `
    if (!section) throw new NoLinksSectionError('No Read later section')
    sectionKey = section.key as string
  }

  const givenTitle = title?.trim() || null

  const [top] = await sql`
    SELECT COALESCE(MIN(position), 0) - 1 AS pos FROM todos
    WHERE view = ${sectionKey} AND completed = false
  `
  const position = top.pos as number

  const [existing] = await sql`
    SELECT id FROM todos WHERE url = ${url} AND view = ${sectionKey} LIMIT 1
  `

  let row: Todo
  if (existing) {
    const rows = await sql`
      UPDATE todos
      SET completed = false, completed_at = null, position = ${position},
          text = COALESCE(${givenTitle}, text)
      WHERE id = ${existing.id}
      RETURNING *
    `
    row = rows[0] as Todo
  } else {
    const rows = await sql`
      INSERT INTO todos (id, text, category, view, position, url)
      VALUES (COALESCE(${id ?? null}::uuid, gen_random_uuid()), ${givenTitle ?? url}, 'someday', ${sectionKey}, ${position}, ${url})
      RETURNING *
    `
    row = rows[0] as Todo
  }

  after(async () => {
    const meta = await fetchLinkMeta(url)
    if (!meta.title && !meta.description) return
    // Only replace the title while it is still the bare URL, so a title from the
    // bookmarklet or one the user edited is kept
    await sql`
      UPDATE todos
      SET text = CASE WHEN text = ${url} AND ${meta.title}::text IS NOT NULL THEN ${meta.title} ELSE text END,
          description = COALESCE(${meta.description}, description)
      WHERE id = ${row.id}
    `
  })

  return row
}
