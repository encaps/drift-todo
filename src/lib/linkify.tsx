import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// "github.com/…" instead of a long URL inside a todo's text
function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return hostOf(url) + (u.pathname.length > 1 || u.search ? '/…' : '')
  } catch {
    return url
  }
}

// Splits text into plain parts and clickable links. Clicks on a link don't
// bubble, so tapping it doesn't also start editing the todo.
export function linkify(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) => {
    if (i % 2 === 0) return part
    // Trailing punctuation is usually the sentence, not the URL
    const url = part.replace(/[).,!?;:]+$/, '')
    const rest = part.slice(url.length)
    return (
      <span key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline decoration-muted/50 underline-offset-2 hover:decoration-foreground"
        >
          {shortUrl(url)}
        </a>
        {rest}
      </span>
    )
  })
}
