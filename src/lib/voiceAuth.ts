import { timingSafeEqual } from 'node:crypto'

// Bearer VOICE_TOKEN, used by the iOS Shortcuts (Siri voice add and the share sheet)
export function authorized(request: Request): boolean {
  const expected = process.env.VOICE_TOKEN
  if (!expected) return false
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
