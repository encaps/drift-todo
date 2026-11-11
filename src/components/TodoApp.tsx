'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useTodos } from '@/hooks/useTodos'
import { useSections } from '@/hooks/useSections'
import { CATEGORIES, type Category } from '@/lib/types'
import TodoItem from './TodoItem'
import QuickAdd from './QuickAdd'
import SectionManager from './SectionManager'

export default function TodoApp() {
  const { sections, loading: sectionsLoading, addSection, updateSection, deleteSection, moveSection } = useSections()

  const [activeView, setActiveView] = useState<string>(() => {
    if (typeof window === 'undefined') return 'private'
    return localStorage.getItem('drift-view') || 'private'
  })

  // If the stored view doesn't exist in sections, fall back to the first section
  useEffect(() => {
    if (!sectionsLoading && sections.length > 0) {
      const exists = sections.some((s) => s.key === activeView)
      if (!exists) {
        setActiveView(sections[0].key)
        localStorage.setItem('drift-view', sections[0].key)
      }
    }
  }, [sections, sectionsLoading, activeView])

  const {
    todos,
    loading,
    mode,
    addTodo,
    completeTodo,
    uncompleteTodo,
    deleteTodo,
    pendingDelete,
    undoDelete,
    moveTodo,
    editTodo,
    reorderTodos,
    clearCompleted,
  } = useTodos(activeView)

  const [activeTab, setActiveTab] = useState<Category>('daily')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [notificationBanner, setNotificationBanner] = useState(false)

  // Persist active view
  const switchView = (v: string) => {
    setActiveView(v)
    localStorage.setItem('drift-view', v)
  }

  // Theme init
  useEffect(() => {
    const stored = localStorage.getItem('drift-theme')
    const prefersDark = stored ? stored === 'dark' : true
    setIsDark(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('drift-theme', next ? 'dark' : 'light')
  }

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const t = setTimeout(() => setNotificationBanner(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  // Keyboard shortcut: N to open quick add, Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const enableNotifications = useCallback(async () => {
    setNotificationBanner(false)
    if (!('Notification' in window)) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    try {
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    } catch (err) {
      console.error('Push subscription failed:', err)
    }
  }, [])

  // Counts
  const counts = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.key] = todos.filter((t) => t.category === cat.key && !t.completed).length
      return acc
    },
    {} as Record<Category, number>
  )
  const completedCount = todos.filter((t) => t.completed).length

  const glowMap: Record<Category, string> = {
    daily: 'glow-amber',
    soon: 'glow-blue',
    someday: 'glow-violet',
  }

  const tabIndicatorColor: Record<Category, string> = {
    daily: 'bg-amber-400',
    soon: 'bg-blue-400',
    someday: 'bg-violet-400',
  }

  // Loading skeleton
  if (loading || sectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl font-light text-muted"
        >
          drift
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 glass border-b border-surface-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">drift</h1>

            {/* View switcher — dynamic sections */}
            <div className="flex gap-0.5 p-0.5 bg-surface rounded-lg border border-surface-border">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => switchView(s.key)}
                  className={`
                    relative px-2.5 py-1 rounded-md text-xs font-medium transition-all
                    ${activeView === s.key
                      ? 'text-foreground'
                      : 'text-muted hover:text-foreground'}
                  `}
                >
                  {activeView === s.key && (
                    <motion.div
                      layoutId="activeView"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{s.icon} {s.label}</span>
                </button>
              ))}

              {/* Manage sections button */}
              <button
                onClick={() => setSectionManagerOpen(true)}
                className="relative px-1.5 py-1 rounded-md text-xs text-muted hover:text-foreground transition-all"
                aria-label="Manage sections"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <span className="text-xs text-muted font-mono">
              {mode === 'postgres' ? '● synced' : '○ local'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add todo — desktop only; mobile uses the FAB */}
            <button
              onClick={() => setQuickAddOpen(true)}
              className="hidden lg:flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl
                         bg-foreground text-background text-xs font-medium
                         hover:opacity-90 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
              <kbd className="px-1 py-0.5 rounded bg-background/20 font-mono text-[10px] text-background/70">
                N
              </kbd>
            </button>

            {/* Clear completed */}
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-muted hover:text-foreground px-2 py-1 rounded-lg
                           hover:bg-surface transition-colors"
              >
                Clear {completedCount} done
              </button>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-surface transition-colors text-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile tab navigation */}
        <div className="lg:hidden px-4 pb-2">
          <div className="flex gap-1 p-1 bg-surface rounded-xl border border-surface-border">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`
                  flex-1 relative py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${activeTab === cat.key ? 'text-foreground' : 'text-muted'}
                `}
              >
                {activeTab === cat.key && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-lg ${tabIndicatorColor[cat.key]}/10 border border-current/10`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {cat.icon} {cat.label}
                  {counts[cat.key] > 0 && (
                    <span className="ml-1.5 text-xs text-muted">{counts[cat.key]}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* Desktop: three columns */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <Column
              key={cat.key}
              category={cat.key}
              todos={todos}
              counts={counts}
              showCompleted={showCompleted}
              glowClass={glowMap[cat.key]}
              onComplete={completeTodo}
              onUncomplete={uncompleteTodo}
              onDelete={deleteTodo}
              onMove={moveTodo}
              onEdit={editTodo}
              onReorder={reorderTodos}
            />
          ))}
        </div>

        {/* Mobile: single column for active tab */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <Column
                category={activeTab}
                todos={todos}
                counts={counts}
                showCompleted={showCompleted}
                glowClass={glowMap[activeTab]}
                onComplete={completeTodo}
                onUncomplete={uncompleteTodo}
                onDelete={deleteTodo}
                onMove={moveTodo}
                onEdit={editTodo}
                onReorder={reorderTodos}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Show completed toggle */}
        {completedCount > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {showCompleted ? 'Hide' : 'Show'} {completedCount} completed
            </button>
          </div>
        )}
      </main>

      {/* FAB - Quick Add (mobile; desktop has the header button) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setQuickAddOpen(true)}
        className={`
          lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl
          bg-foreground text-background shadow-xl
          flex items-center justify-center
          safe-bottom
          hover:shadow-2xl transition-shadow
        `}
        aria-label="Add todo"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      {/* Quick Add Modal */}
      <QuickAdd
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={(text, category) => {
          addTodo(text, category)
        }}
        defaultCategory={activeTab}
      />

      {/* Section Manager Modal */}
      <SectionManager
        isOpen={sectionManagerOpen}
        onClose={() => setSectionManagerOpen(false)}
        sections={sections}
        onAdd={addSection}
        onUpdate={updateSection}
        onDelete={deleteSection}
        onMove={moveSection}
      />

      {/* Undo toast — the todo is only hidden until this disappears */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            key={pendingDelete.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 lg:bottom-6 left-4 right-4 z-40 mx-auto max-w-md"
          >
            <div className="bg-surface border border-surface-border rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground truncate">
                Deleted <span className="text-muted">&ldquo;{pendingDelete.text}&rdquo;</span>
              </p>
              <button
                onClick={undoDelete}
                className="text-xs font-medium bg-foreground text-background px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification permission banner */}
      <AnimatePresence>
        {notificationBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-30 mx-auto max-w-md"
          >
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xl flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Daily reminders</p>
                <p className="text-xs text-muted">Get notified about your daily todos each morning</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNotificationBanner(false)}
                  className="text-xs text-muted px-2 py-1"
                >
                  Later
                </button>
                <button
                  onClick={enableNotifications}
                  className="text-xs font-medium bg-foreground text-background px-3 py-1.5 rounded-lg"
                >
                  Enable
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// Column component
function Column({
  category,
  todos,
  counts,
  showCompleted,
  glowClass,
  onComplete,
  onUncomplete,
  onDelete,
  onMove,
  onEdit,
  onReorder,
}: {
  category: Category
  todos: ReturnType<typeof useTodos>['todos']
  counts: Record<Category, number>
  showCompleted: boolean
  glowClass: string
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, category: Category) => void
  onEdit: (id: string, text: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const cat = CATEGORIES.find((c) => c.key === category)!
  const activeTodos = todos
    .filter((t) => t.category === category && !t.completed)
    .sort(
      (a, b) =>
        a.position - b.position ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  const completedTodos = todos
    .filter((t) => t.category === category && t.completed)
    .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())

  return (
    <div>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{cat.icon}</span>
        <h2 className={`font-semibold ${cat.color}`}>{cat.label}</h2>
        <span className="text-xs text-muted font-mono">{counts[category]}</span>
      </div>

      {/* Todo list */}
      <div className={`space-y-2 rounded-2xl ${glowClass}`}>
        <Reorder.Group
          as="div"
          axis="y"
          values={activeTodos}
          onReorder={(newOrder) => onReorder(newOrder.map((t) => t.id))}
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {activeTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                reorderable
                onComplete={onComplete}
                onUncomplete={onUncomplete}
                onDelete={onDelete}
                onMove={onMove}
                onEdit={onEdit}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {activeTodos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <p className="text-muted text-sm">
              {category === 'daily' && 'Nothing for today. Enjoy!'}
              {category === 'soon' && 'Nothing coming up.'}
              {category === 'someday' && 'Plant some seeds here.'}
            </p>
          </motion.div>
        )}

        {/* Completed items */}
        {showCompleted && completedTodos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-border/50">
            <p className="text-xs text-muted mb-2">Completed</p>
            <AnimatePresence mode="popLayout">
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onComplete={onComplete}
                  onUncomplete={onUncomplete}
                  onDelete={onDelete}
                  onMove={onMove}
                  onEdit={onEdit}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper: convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}
