import { authorized } from '@/lib/voiceAuth'
import { firstUrlIn, normalizeUrl, saveLink, NoLinksSectionError } from '@/lib/links'

// Called by the "Save to Drift" iOS share-sheet Shortcut. Accepts { url } or
// { text } (some apps share "Look at this https://…" instead of a URL).
export async function POST(request: Request) {
  if (!authorized(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const url =
    (typeof body?.url === 'string' && (normalizeUrl(body.url) ?? firstUrlIn(body.url))) ||
    (typeof body?.text === 'string' && (normalizeUrl(body.text) ?? firstUrlIn(body.text))) ||
    null
  if (!url) {
    return new Response('No link found', { status: 400 })
  }

  try {
    await saveLink({ url, title: typeof body.title === 'string' ? body.title : null })
  } catch (err) {
    if (err instanceof NoLinksSectionError) return new Response(err.message, { status: 409 })
    throw err
  }

  // Plain text so the Shortcut can show it in a notification as-is
  return new Response(`Saved to Read later: ${new URL(url).hostname.replace(/^www\./, '')}`, {
    status: 201,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
