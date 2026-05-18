'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Section } from '@/lib/types'

const ICON_OPTIONS = ['📋', '💼', '🏠', '🛒', '🎯', '💡', '📚', '🏋️', '🎨', '🌱', '🔧', '❤️', '🎵', '✈️', '🍕', '💰']

interface SectionManagerProps {
  isOpen: boolean
  onClose: () => void
  sections: Section[]
  onAdd: (label: string, icon: string) => Promise<Section>
  onUpdate: (id: string, updates: Partial<Pick<Section, 'label' | 'icon'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function SectionManager({
  isOpen,
  onClose,
  sections,
  onAdd,
  onUpdate,
  onDelete,
}: SectionManagerProps) {
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('📋')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAdd = async () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    await onAdd(trimmed, newIcon)
    setNewLabel('')
    setNewIcon('📋')
  }

  const startEdit = (section: Section) => {
    setEditingId(section.id)
    setEditLabel(section.label)
    setEditIcon(section.icon)
    setShowIconPicker(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim()) return
    await onUpdate(editingId, { label: editLabel.trim(), icon: editIcon })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await onDelete(id)
    setConfirmDeleteId(null)
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
            className="fixed inset-x-4 top-[15vh] z-50 mx-auto max-w-md"
          >
            <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                <h2 className="text-sm font-semibold text-foreground">Manage Sections</h2>
                <button
                  onClick={onClose}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Section list */}
              <div className="px-5 py-3 space-y-2 max-h-[40vh] overflow-y-auto">
                {sections.map((section) => (
                  <div key={section.id}>
                    {editingId === section.id ? (
                      /* Edit mode */
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-surface-border">
                        <div className="relative">
                          <button
                            onClick={() => setShowIconPicker(showIconPicker === section.id ? null : section.id)}
                            className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
                          >
                            {editIcon}
                          </button>
                          {showIconPicker === section.id && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-surface border border-surface-border rounded-xl shadow-xl z-10 grid grid-cols-8 gap-1 w-[220px]">
                              {ICON_OPTIONS.map((icon) => (
                                <button
                                  key={icon}
                                  onClick={() => {
                                    setEditIcon(icon)
                                    setShowIconPicker(null)
                                  }}
                                  className={`w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-background transition-colors
                                    ${editIcon === icon ? 'ring-1 ring-foreground/30 bg-background' : ''}`}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 bg-transparent text-sm text-foreground outline-none"
                          autoFocus
                        />
                        <button
                          onClick={saveEdit}
                          className="text-xs text-foreground bg-foreground/10 px-2 py-1 rounded-lg hover:bg-foreground/20 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-muted px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-background/50 group transition-colors">
                        <span className="text-lg w-8 text-center">{section.icon}</span>
                        <span className="flex-1 text-sm text-foreground">{section.label}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(section)}
                            className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                          >
                            Edit
                          </button>
                          {sections.length > 1 && (
                            <>
                              {confirmDeleteId === section.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(section.id)}
                                    className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-xs text-muted px-1.5 py-0.5"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(section.id)}
                                  className="text-xs text-muted hover:text-red-400 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new section */}
              <div className="px-5 py-3 border-t border-surface-border">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
                      className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background transition-colors"
                    >
                      {newIcon}
                    </button>
                    {showIconPicker === 'new' && (
                      <div className="absolute bottom-full left-0 mb-1 p-2 bg-surface border border-surface-border rounded-xl shadow-xl z-10 grid grid-cols-8 gap-1 w-[220px]">
                        {ICON_OPTIONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => {
                              setNewIcon(icon)
                              setShowIconPicker(null)
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-background transition-colors
                              ${newIcon === icon ? 'ring-1 ring-foreground/30 bg-background' : ''}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd()
                    }}
                    placeholder="New section name..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newLabel.trim()}
                    className="text-xs font-medium bg-foreground text-background px-3 py-1.5 rounded-lg
                               disabled:opacity-30 disabled:cursor-not-allowed
                               hover:opacity-90 active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
