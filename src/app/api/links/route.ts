import { normalizeUrl, saveLink, NoLinksSectionError } from '@/lib/links'

// In-app add and the /save page (bookmarklet). Same open access as /api/todos.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? normalizeUrl(body.url) : null
  if (!url) {
    return Response.json({ error: 'Not a valid http(s) URL' }, { status: 400 })
  }

  try {
    const row = await saveLink({
      url,
      title: typeof body.title === 'string' ? body.title : null,
      id: typeof body.id === 'string' ? body.id : undefined,
      view: typeof body.view === 'string' ? body.view : undefined,
    })
    return Response.json(row, { status: 201 })
  } catch (err) {
    if (err instanceof NoLinksSectionError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    throw err
  }
}
