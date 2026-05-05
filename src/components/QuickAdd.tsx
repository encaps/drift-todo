'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface QuickAddProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (text: string, category: Category) => void
  defaultCategory: Category
}

export default function QuickAdd({ isOpen, onClose, onAdd, defaultCategory }: QuickAddProps) {
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

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
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
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const idx = CATEGORIES.findIndex((c) => c.key === category)
                      setCategory(CATEGORIES[(idx + 1) % CATEGORIES.length].key)
                    }
                  }}
                  placeholder="What needs to be done?"
                  className="w-full px-5 py-4 bg-transparent text-foreground text-lg
                             placeholder:text-muted outline-none"
                />
              </div>

              {/* Category picker + submit */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex gap-2">
                  {CATEGORIES.map((cat) => (
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
                  disabled={!text.trim()}
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
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 font-mono">Tab</kbd> switch category
                </span>
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
