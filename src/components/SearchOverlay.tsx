'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Section, Todo } from '@/lib/types'
import { hostOf } from '@/lib/linkify'
import { safeHref } from '@/lib/url'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  sections: Section[]
  onOpenSection: (key: string) => void
}

// Searches every section: todos by text, links by title, URL and description
export default function SearchOverlay({ isOpen, onClose, sections, onOpenSection }: SearchOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <SearchPanel key="search" onClose={onClose} sections={sections} onOpenSection={onOpenSection} />
      )}
    </AnimatePresence>
  )
}

// Mounted only while open, so every open starts with an empty query
function SearchPanel({ onClose, sections, onOpenSection }: Omit<SearchOverlayProps, 'isOpen'>) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Todo[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const q = query.trim()
  const results = q.length >= 2 ? found : []

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (q.length < 2) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (res.ok) setFound(await res.json())
      } catch {
        // aborted by the next keystroke, or offline
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [q])

  const sectionOf = (key: string) => sections.find((s) => s.key === key)

  const openResult = (item: Todo) => {
    const href = safeHref(item.url)
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      onOpenSection(item.view)
      onClose()
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/40 glass z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-lg"
      >
        <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
          <div className="flex items-center gap-3 px-5 border-b border-surface-border">
            <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearching(e.target.value.trim().length >= 2)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
                if (e.key === 'Enter' && results[0]) openResult(results[0])
              }}
              placeholder="Search todos and links…"
              className="flex-1 py-4 bg-transparent text-foreground text-lg placeholder:text-muted outline-none"
            />
          </div>

          <div className="overflow-y-auto">
            {results.map((item) => {
              const section = sectionOf(item.view)
              return (
                <button
                  key={item.id}
                  onClick={() => openResult(item)}
                  className="w-full text-left px-5 py-3 border-b border-surface-border/50 last:border-0
                             hover:bg-background/60 transition-colors"
                >
                  <p className={`text-sm leading-snug break-words ${item.completed ? 'text-muted' : 'text-foreground'}`}>
                    {item.text}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted line-clamp-1">{item.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted/80 font-mono truncate">
                    {section ? `${section.icon} ${section.label}` : item.view}
                    {item.url && ` · ${hostOf(item.url)}`}
                    {item.completed && (item.url ? ' · read' : ' · done')}
                  </p>
                </button>
              )
            })}

            {q.length >= 2 && !searching && results.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted">Nothing found</p>
            )}
          </div>

          <div className="px-5 py-2 flex gap-4 text-[10px] text-muted border-t border-surface-border">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Enter</kbd> open first
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Esc</kbd> close
            </span>
          </div>
        </div>
      </motion.div>
    </>
  )
}
