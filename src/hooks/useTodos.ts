'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Todo, Category } from '@/lib/types'

const STORAGE_KEY = 'drift-todos'
const POLL_INTERVAL = 5000 // 5s polling for cross-device sync
const UNDO_WINDOW = 5000 // how long a swipe-delete can be undone before it hits the DB

function loadLocal(): Todo[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocal(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function useTodos(view: string) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'local' | 'postgres'>('local')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPositionsRef = useRef<Map<string, number>>(new Map())
  const reorderPendingRef = useRef(false)
  // A delete is hidden locally first and only sent to the API after
  // UNDO_WINDOW — one accidental swipe used to be an unrecoverable hard delete
  const [pendingDelete, setPendingDelete] = useState<Todo | null>(null)
  const pendingDeleteRef = useRef<{ todo: Todo; timer: ReturnType<typeof setTimeout> } | null>(null)

  // Determine mode and load initial data — re-run when view changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const refresh = async () => {
      // Skip while a reorder is waiting to be persisted, otherwise the poll
      // would snap items back to their old positions
      if (reorderPendingRef.current) return
      const fresh = await apiFetch<Todo[]>(`/api/todos?view=${view}`)
      if (!cancelled && fresh && !reorderPendingRef.current) {
        // The server still has a todo whose delete is waiting on the undo
        // window — keep it hidden so it doesn't flicker back
        const hidden = pendingDeleteRef.current?.todo.id
        setTodos(hidden ? fresh.filter((t) => t.id !== hidden) : fresh)
      }
    }

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    // Only poll while the tab is visible — a hidden tab polling Neon keeps
    // the compute awake 24/7 and burns through the CU-hour allowance
    const startPolling = () => {
      if (pollRef.current || document.visibilityState !== 'visible') return
      pollRef.current = setInterval(refresh, POLL_INTERVAL)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }

    async function init() {
      // Try to load from API first
      const data = await apiFetch<Todo[]>(`/api/todos?view=${view}`)
      if (!cancelled && data) {
        setMode('postgres')
        setTodos(data)
        setLoading(false)

        // Poll for cross-device sync, but only while visible
        startPolling()
        document.addEventListener('visibilitychange', onVisibilityChange)
      } else if (!cancelled) {
        // Fall back to localStorage
        setMode('local')
        setTodos(loadLocal().filter((t) => t.view === view))
        setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [view])

  // Persist to localStorage when in local mode
  useEffect(() => {
    if (mode === 'local' && !loading) {
      saveLocal(todos)
    }
  }, [todos, mode, loading])

  const addTodo = useCallback(
    async (text: string, category: Category) => {
      // Lists sort by position ascending — new todos go on top
      const minPos = todos
        .filter((t) => t.category === category && !t.completed)
        .reduce((min, t) => Math.min(min, t.position), 0)

      const todo: Todo = {
        id: crypto.randomUUID(),
        text: text.trim(),
        category,
        view,
        completed: false,
        position: minPos - 1,
        created_at: new Date().toISOString(),
        completed_at: null,
      }

      // Optimistic update
      setTodos((prev) => [todo, ...prev])

      if (mode === 'postgres') {
        await apiFetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(todo),
        })
      }
    },
    [todos, mode, view]
  )

  const completeTodo = useCallback(
    async (id: string) => {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: true, completed_at: new Date().toISOString() } : t
        )
      )

      if (mode === 'postgres') {
        await apiFetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        })
      }
    },
    [mode]
  )

  const uncompleteTodo = useCallback(
    async (id: string) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: false, completed_at: null } : t))
      )

      if (mode === 'postgres') {
        await apiFetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: false }),
        })
      }
    },
    [mode]
  )

  // Send the pending delete to the API now. keepalive lets the request
  // survive a tab close or navigation when called from pagehide.
  const commitPendingDelete = useCallback(() => {
    const pending = pendingDeleteRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeleteRef.current = null
    setPendingDelete(null)
    if (mode === 'postgres') {
      fetch(`/api/todos/${pending.todo.id}`, { method: 'DELETE', keepalive: true }).catch(() => {})
    }
  }, [mode])

  const deleteTodo = useCallback(
    (id: string) => {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return

      // Only one undo at a time — a second delete commits the first
      commitPendingDelete()

      setTodos((prev) => prev.filter((t) => t.id !== id))

      const timer = setTimeout(commitPendingDelete, UNDO_WINDOW)
      pendingDeleteRef.current = { todo, timer }
      setPendingDelete(todo)
    },
    [todos, commitPendingDelete]
  )

  const undoDelete = useCallback(() => {
    const pending = pendingDeleteRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeleteRef.current = null
    setPendingDelete(null)
    // The user may have switched section while the toast was up; the todo
    // then belongs to a list we're not showing and the next poll covers it
    if (pending.todo.view === view) {
      setTodos((prev) => (prev.some((t) => t.id === pending.todo.id) ? prev : [...prev, pending.todo]))
    }
  }, [view])

  // Don't lose a pending delete when the tab closes or the page reloads
  useEffect(() => {
    window.addEventListener('pagehide', commitPendingDelete)
    return () => window.removeEventListener('pagehide', commitPendingDelete)
  }, [commitPendingDelete])

  const moveTodo = useCallback(
    async (id: string, category: Category) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)))

      if (mode === 'postgres') {
        await apiFetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category }),
        })
      }
    },
    [mode]
  )

  const editTodo = useCallback(
    async (id: string, text: string) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))

      if (mode === 'postgres') {
        await apiFetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      }
    },
    [mode]
  )

  const reorderTodos = useCallback(
    (orderedIds: string[]) => {
      const positions = new Map(orderedIds.map((id, index) => [id, index]))

      setTodos((prev) =>
        prev.map((t) => {
          const pos = positions.get(t.id)
          return pos !== undefined && pos !== t.position ? { ...t, position: pos } : t
        })
      )

      if (mode !== 'postgres') return

      // Reorder fires on every item swap while dragging — debounce the persist
      reorderPendingRef.current = true
      positions.forEach((position, id) => pendingPositionsRef.current.set(id, position))

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current)
      reorderTimerRef.current = setTimeout(async () => {
        const updates = Array.from(pendingPositionsRef.current, ([id, position]) => ({
          id,
          position,
        }))
        pendingPositionsRef.current.clear()
        await apiFetch('/api/todos/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        })
        reorderPendingRef.current = false
      }, 600)
    },
    [mode]
  )

  const clearCompleted = useCallback(async () => {
    setTodos((prev) => prev.filter((t) => !t.completed))

    if (mode === 'postgres') {
      await apiFetch(`/api/todos/completed?view=${view}`, { method: 'DELETE' })
    }
  }, [mode, view])

  return {
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
  }
}
