'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { normalizeUrl, firstUrlIn } from '@/lib/url'

interface QuickAddProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (text: string, category: Category) => void
  defaultCategory: Category
  // On a links section the input takes a URL and there is no lane picker
  linksMode?: boolean
  onAddLink?: (url: string) => void
}

export default function QuickAdd({ isOpen, onClose, onAdd, defaultCategory, linksMode = false, onAddLink }: QuickAddProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>(defaultCategory)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory)
      setText('')
      // Small delay for animation
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [isOpen, defaultCategory])

  const linkUrl = linksMode ? (normalizeUrl(text) ?? firstUrlIn(text)) : null

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (linksMode) {
      if (!linkUrl) return
      onAddLink?.(linkUrl)
      onClose()
      return
    }
    onAdd(trimmed, category)
    setText('')
    inputRef.current?.focus()
  }

  const accentBorder: Record<Category, string> = {
    daily: 'focus-within:border-amber-400/50',
    soon: 'focus-within:border-blue-400/50',
    someday: 'focus-within:border-violet-400/50',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 glass z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed inset-x-4 top-[20vh] z-50 mx-auto max-w-lg"
          >
            <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className={`border-b border-surface-border ${accentBorder[category]} transition-colors`}>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                    if (e.key === 'Escape') onClose()
                    // Tab to cycle categories
                    if (e.key === 'Tab' && !linksMode) {
                      e.preventDefault()
                      const idx = CATEGORIES.findIndex((c) => c.key === category)
                      setCategory(CATEGORIES[(idx + 1) % CATEGORIES.length].key)
                    }
                  }}
                  placeholder={linksMode ? 'Paste a link…' : 'What needs to be done?'}
                  inputMode={linksMode ? 'url' : undefined}
                  className="w-full px-5 py-4 bg-transparent text-foreground text-lg
                             placeholder:text-muted outline-none"
                />
              </div>

              {/* Category picker + submit */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex gap-2">
                  {linksMode && (
                    <span className="text-xs text-muted py-1.5">
                      {text.trim() && !linkUrl ? 'Not a link yet' : '🔖 Saves to Read later'}
                    </span>
                  )}
                  {!linksMode && CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className={`
                        text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                        ${
                          category === cat.key
                            ? `${cat.bgColor} ${cat.color} border ${cat.borderColor} ring-1 ring-current/20`
                            : 'text-muted hover:text-foreground bg-transparent border border-surface-border'
                        }
                      `}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={linksMode ? !linkUrl : !text.trim()}
                  className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium
                             disabled:opacity-30 disabled:cursor-not-allowed
                             hover:opacity-90 active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>

              {/* Keyboard hints */}
              <div className="px-5 pb-3 flex gap-4 text-[10px] text-muted">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Enter</kbd> to add
                </span>
                {!linksMode && (
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Tab</kbd> switch category
                  </span>
                )}
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Esc</kbd> close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
