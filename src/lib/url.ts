// Shared by the server routes and the client (Quick Add), so no server imports here

// Returns the URL in canonical form, or null if it isn't an http(s) URL.
// A bare "example.com/page" gets https:// in front.
export function normalizeUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw || /\s/.test(raw)) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

// Shared text from some apps is "Look at this https://…"
export function firstUrlIn(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  return match ? normalizeUrl(match[0].replace(/[).,!?;:]+$/, '')) : null
}

// For rendering: rows written before validation, or by other clients, must
// never turn into a javascript: link
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}
