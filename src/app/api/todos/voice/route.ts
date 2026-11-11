import { timingSafeEqual } from 'node:crypto'
import { getDb } from '@/lib/db'
import type { Category } from '@/lib/types'

// Called by the "Drift" iOS Shortcut: Siri dictates a sentence and posts it here.
// A leading lane word and/or section name routes the todo, in either order:
//   "Today call the plumber"       -> Today, Private
//   "Groceries oat milk"           -> Today, Groceries
//   "Work someday refactor sync"   -> Someday, Work

const LANE_WORDS: Record<string, Category> = {
  today: 'daily',
  soon: 'soon',
  later: 'someday',
  someday: 'someday',
}
const DEFAULT_LANE: Category = 'daily'
const DEFAULT_VIEW = 'private'
const LANE_LABELS: Record<Category, string> = { daily: 'Today', soon: 'Soon', someday: 'Someday' }

function authorized(request: Request): boolean {
  const expected = process.env.VOICE_TOKEN
  if (!expected) return false
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

export async function POST(request: Request) {
  if (!authorized(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const raw = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!raw) {
    return new Response('Nothing to add', { status: 400 })
  }

  const sql = getDb()
  const sections = (await sql`SELECT key, label FROM sections`) as { key: string; label: string }[]
  const sectionByWord = new Map<string, { key: string; label: string }>()
  for (const s of sections) {
    sectionByWord.set(normalize(s.key), s)
    sectionByWord.set(normalize(s.label), s)
  }

  // Siri capitalises the first word and ends with a period: "Groceries: oat milk."
  const words = raw.replace(/[.!]+$/, '').split(/\s+/)
  let lane: Category | null = null
  let section: { key: string; label: string } | null = null
  while (words.length > 1) {
    const word = normalize(words[0])
    if (!lane && LANE_WORDS[word]) lane = LANE_WORDS[word]
    else if (!section && sectionByWord.has(word)) section = sectionByWord.get(word)!
    else break
    words.shift()
  }

  const rest = words.join(' ').replace(/^[:,\-\s]+/, '')
  const text = rest.charAt(0).toUpperCase() + rest.slice(1)
  const category = lane ?? DEFAULT_LANE
  const view = section?.key ?? DEFAULT_VIEW
  const viewLabel = section?.label ?? sections.find((s) => s.key === view)?.label ?? view

  // Lists sort by position ascending; new todos go on top, as in the app
  await sql`
    INSERT INTO todos (text, category, view, position)
    SELECT ${text}, ${category}, ${view}, COALESCE(MIN(position), 0) - 1
    FROM todos
    WHERE category = ${category} AND view = ${view} AND completed = false
  `

  // Plain text so the Shortcut can show it in a notification as-is
  return new Response(`${text} → ${viewLabel} · ${LANE_LABELS[category]}`, {
    status: 201,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
