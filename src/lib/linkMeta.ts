import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export interface LinkMeta {
  title: string | null
  description: string | null
}

const MAX_BYTES = 512 * 1024
const MAX_REDIRECTS = 3
// Some sites (and their bot walls) only serve real <head> tags to a browser
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

function clean(s: string | undefined | null, max: number): string | null {
  if (!s) return null
  const text = decodeEntities(s).replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

// Attribute order varies (<meta content=".." property="..">), so find each
// <meta> tag first and read its attributes separately
function metaContent(html: string, names: string[]): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (!key || !names.includes(key)) continue
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1]
    if (content?.trim()) return content
  }
  return null
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  let bytes = 0
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    html += decoder.decode(value, { stream: true })
    // Everything we need is in <head>
    if (/<\/head>/i.test(html)) break
  }
  reader.cancel().catch(() => {})
  return html
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast and reserved
  )
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateV4(ip)
  const v6 = ip.toLowerCase()
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateV4(mapped[1])
  return (
    v6 === '::' || v6 === '::1' ||
    v6.startsWith('fc') || v6.startsWith('fd') || // unique local
    /^fe[89ab]/.test(v6) || // link-local
    v6.startsWith('ff') // multicast
  )
}

// The save endpoints are open, so without this anyone could make the server
// fetch internal addresses and read back their <title>. Only public http(s)
// hosts on the default ports get fetched. (A DNS answer that changes between
// this check and the fetch is not covered; there is nothing worth reaching
// behind a Vercel function to justify pinning the connection.)
async function isPublicUrl(url: URL): Promise<boolean> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.port && url.port !== '80' && url.port !== '443') return false
  if (url.username || url.password) return false
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  return addresses.length > 0 && !addresses.some(isPrivateAddress)
}

// Follows redirects by hand so every hop is checked
async function fetchPublic(start: string): Promise<Response | null> {
  let url = new URL(start)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicUrl(url))) return null
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      res.body?.cancel().catch(() => {})
      url = new URL(location, url)
      continue
    }
    return res
  }
  return null
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  try {
    const res = await fetchPublic(url)
    if (!res || !res.ok || !(res.headers.get('content-type') ?? '').includes('html')) {
      return { title: null, description: null }
    }
    const html = await readCapped(res)
    const title =
      metaContent(html, ['og:title', 'twitter:title']) ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    const description = metaContent(html, ['og:description', 'twitter:description', 'description'])
    return { title: clean(title, 300), description: clean(description, 1000) }
  } catch {
    return { title: null, description: null }
  }
}
