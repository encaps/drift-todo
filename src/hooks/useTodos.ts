'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Todo, Category, View } from '@/lib/types'

const STORAGE_KEY = 'drift-todos'
const POLL_INTERVAL = 5000 // 5s polling for cross-device sync

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

export function useTodos(view: View) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'local' | 'postgres'>('local')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Determine mode and load initial data — re-run when view changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function init() {
      // Try to load from API first
      const data = await apiFetch<Todo[]>(`/api/todos?view=${view}`)
      if (!cancelled && data) {
        setMode('postgres')
        setTodos(data)
        setLoading(false)

        // Start polling for cross-device sync
        pollRef.current = setInterval(async () => {
          const fresh = await apiFetch<Todo[]>(`/api/todos?view=${view}`)
          if (fresh) setTodos(fresh)
        }, POLL_INTERVAL)
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
      if (pollRef.current) clearInterval(pollRef.current)
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
      const maxPos = todos
        .filter((t) => t.category === category && !t.completed)
        .reduce((max, t) => Math.max(max, t.position), -1)

      const todo: Todo = {
        id: crypto.randomUUID(),
        text: text.trim(),
        category,
        view,
        completed: false,
        position: maxPos + 1,
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

  const deleteTodo = useCallback(
    async (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id))

      if (mode === 'postgres') {
        await apiFetch(`/api/todos/${id}`, { method: 'DELETE' })
      }
    },
    [mode]
  )

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
    moveTodo,
    editTodo,
    clearCompleted,
  }
}
