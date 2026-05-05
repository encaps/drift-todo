'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import type { Todo, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface TodoItemProps {
  todo: Todo
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, category: Category) => void
  onEdit: (id: string, text: string) => void
}

export default function TodoItem({
  todo,
  onComplete,
  onUncomplete,
  onDelete,
  onMove,
  onEdit,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const [showActions, setShowActions] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const categoryMeta = CATEGORIES.find((c) => c.key === todo.category)!
  const otherCategories = CATEGORIES.filter((c) => c.key !== todo.category)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80) {
      if (todo.completed) {
        onUncomplete(todo.id)
      } else {
        onComplete(todo.id)
      }
    } else if (info.offset.x < -80) {
      onDelete(todo.id)
    }
    setSwipeX(0)
  }

  const handleSubmitEdit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed)
    } else {
      setEditText(todo.text)
    }
    setIsEditing(false)
  }

  const accentMap: Record<Category, string> = {
    daily: 'border-l-amber-400',
    soon: 'border-l-blue-400',
    someday: 'border-l-violet-400',
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
        <div
          className={`flex items-center gap-2 transition-opacity ${swipeX > 40 ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-green-400 text-sm font-medium">
            {todo.completed ? '↩ Undo' : '✓ Done'}
          </span>
        </div>
        <div
          className={`flex items-center gap-2 transition-opacity ${swipeX < -40 ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-red-400 text-sm font-medium">Delete ×</span>
        </div>
      </div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDrag={(_, info) => setSwipeX(info.offset.x)}
        onDragEnd={handleDragEnd}
        className={`
          relative bg-surface border border-surface-border rounded-xl px-4 py-3
          border-l-[3px] ${accentMap[todo.category]}
          cursor-grab active:cursor-grabbing
          transition-shadow hover:shadow-lg
          ${todo.completed ? 'opacity-60' : ''}
        `}
        style={{
          x: 0,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => (todo.completed ? onUncomplete(todo.id) : onComplete(todo.id))}
            className={`
              mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2
              flex items-center justify-center transition-all duration-200
              ${
                todo.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-zinc-400 dark:border-zinc-600 hover:border-green-400'
              }
            `}
            aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {todo.completed && (
              <svg
                className="w-3 h-3 text-white check-animate"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
          </button>

          {/* Text */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSubmitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitEdit()
                  if (e.key === 'Escape') {
                    setEditText(todo.text)
                    setIsEditing(false)
                  }
                }}
                className="w-full bg-transparent outline-none text-foreground"
                autoFocus
              />
            ) : (
              <p
                onClick={() => {
                  if (!todo.completed) {
                    setIsEditing(true)
                    setTimeout(() => inputRef.current?.focus(), 10)
                  }
                }}
                className={`
                  text-sm leading-relaxed break-words
                  ${todo.completed ? 'line-through text-muted' : 'text-foreground'}
                `}
              >
                {todo.text}
              </p>
            )}
          </div>

          {/* Actions button */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100
                       focus:opacity-100 transition-opacity text-muted hover:text-foreground"
            aria-label="Actions"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Actions dropdown */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-border">
                {/* Move to other categories */}
                {otherCategories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      onMove(todo.id, cat.key)
                      setShowActions(false)
                    }}
                    className={`
                      text-xs px-3 py-1.5 rounded-lg font-medium
                      ${cat.bgColor} ${cat.color} border ${cat.borderColor}
                      hover:brightness-110 transition-all
                    `}
                  >
                    {cat.icon} Move to {cat.label}
                  </button>
                ))}

                {/* Delete */}
                <button
                  onClick={() => {
                    onDelete(todo.id)
                    setShowActions(false)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium
                             bg-red-500/10 text-red-400 border border-red-500/20
                             hover:brightness-110 transition-all ml-auto"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
