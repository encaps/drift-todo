'use client'

import { useState } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import type { Todo } from '@/lib/types'
import { hostOf } from '@/lib/linkify'
import { safeHref } from '@/lib/url'

interface LinkItemProps {
  link: Todo
  onRead: (id: string) => void
  onUnread: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
}

function savedOn(iso: string): string {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

// A saved link: swipe right toggles read, swipe left deletes (with the undo toast)
export default function LinkItem({ link, onRead, onUnread, onDelete, onEdit }: LinkItemProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(link.text)
  const url = link.url ?? link.text
  const href = safeHref(url) ?? undefined
  const host = hostOf(url)
  // Until the server has fetched the title, the text is the URL itself
  const hasTitle = link.text !== url

  const toggleRead = () => (link.completed ? onUnread(link.id) : onRead(link.id))

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80) toggleRead()
    else if (info.offset.x < -80) onDelete(link.id)
    setSwipeX(0)
  }

  const submitEdit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== link.text) onEdit(link.id, trimmed)
    else setEditText(link.text)
    setIsEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: swipeX > 0 ? 100 : swipeX < 0 ? -100 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative group"
    >
      {/* Swipe background indicators */}
      <div className="absolute inset-0 rounded-xl flex items-center justify-between px-4 pointer-events-none">
        <span className={`text-green-400 text-sm font-medium transition-opacity ${swipeX > 40 ? 'opacity-100' : 'opacity-0'}`}>
          {link.completed ? '↩ Unread' : '✓ Read'}
        </span>
        <span className={`text-red-400 text-sm font-medium transition-opacity ${swipeX < -40 ? 'opacity-100' : 'opacity-0'}`}>
          Delete ×
        </span>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDrag={(_, info) => setSwipeX(info.offset.x)}
        onDragEnd={handleDragEnd}
        style={{ x: 0 }}
        className={`
          relative bg-surface border border-surface-border rounded-xl px-4 py-3
          border-l-[3px] border-l-emerald-400 transition-shadow hover:shadow-lg
          ${link.completed ? 'opacity-60' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Site icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            className="mt-1 w-4 h-4 flex-shrink-0 rounded-sm"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={submitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitEdit()
                  if (e.key === 'Escape') {
                    setEditText(link.text)
                    setIsEditing(false)
                  }
                }}
                className="w-full bg-transparent outline-none text-sm text-foreground"
                autoFocus
              />
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                className={`block text-sm font-medium leading-snug break-words hover:underline
                  ${link.completed ? 'text-muted' : 'text-foreground'} ${hasTitle ? '' : 'break-all'}`}
              >
                {link.text}
              </a>
            )}
            {link.description && (
              <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{link.description}</p>
            )}
            <p className="mt-1.5 text-[11px] text-muted/80 font-mono truncate">
              {host} · {savedOn(link.created_at)}
            </p>
          </div>

          {/* Actions: visible on hover (desktop) and always tappable on touch */}
          <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={toggleRead}
              className="p-1 rounded-lg text-muted hover:text-green-400 transition-colors"
              aria-label={link.completed ? 'Mark as unread' : 'Mark as read'}
              title={link.completed ? 'Mark as unread' : 'Mark as read'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {link.completed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                )}
              </svg>
            </button>
            <button
              onClick={() => {
                setEditText(link.text)
                setIsEditing(true)
              }}
              className="p-1 rounded-lg text-muted hover:text-foreground transition-colors"
              aria-label="Edit title"
              title="Edit title"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 9 17l.464-3.536z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(link.id)}
              className="hidden sm:block p-1 rounded-lg text-muted hover:text-red-400 transition-colors"
              aria-label="Delete"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
