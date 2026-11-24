'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Target of the desktop bookmarklet: /save?url=…&title=…
// Saves the link and closes the popup it was opened in.
export default function SavePage() {
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url') ?? ''
    const title = params.get('title') ?? ''

    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        setStatus('saved')
        setMessage(title || url)
        // window.close only works for windows a script opened, i.e. the popup
        setTimeout(() => window.close(), 1200)
      })
      .catch((err: Error) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-surface border border-surface-border rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">{status === 'saving' ? '…' : status === 'saved' ? '🔖' : '⚠️'}</p>
        <p className="text-sm font-medium text-foreground">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved to Read later'}
          {status === 'error' && 'Could not save'}
        </p>
        {message && <p className="mt-1 text-xs text-muted break-words line-clamp-3">{message}</p>}
        {status !== 'saving' && (
          <Link href="/" className="mt-4 inline-block text-xs text-muted hover:text-foreground underline">
            Open drift
          </Link>
        )}
      </div>
    </main>
  )
}
