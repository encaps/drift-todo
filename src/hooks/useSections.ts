'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Section } from '@/lib/types'
import { DEFAULT_SECTIONS } from '@/lib/types'

const STORAGE_KEY = 'drift-sections'

function loadLocal(): Section[] {
  if (typeof window === 'undefined') return DEFAULT_SECTIONS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_SECTIONS
  } catch {
    return DEFAULT_SECTIONS
  }
}

function saveLocal(sections: Section[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections))
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

export function useSections() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'local' | 'postgres'>('local')

  useEffect(() => {
    let cancelled = false

    async function init() {
      const data = await apiFetch<Section[]>('/api/sections')
      if (!cancelled && data && data.length > 0) {
        setMode('postgres')
        setSections(data)
      } else if (!cancelled) {
        setMode('local')
        setSections(loadLocal())
      }
      if (!cancelled) setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (mode === 'local' && !loading) {
      saveLocal(sections)
    }
  }, [sections, mode, loading])

  const addSection = useCallback(
    async (label: string, icon: string) => {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const maxPos = sections.reduce((max, s) => Math.max(max, s.position), -1)

      const section: Section = {
        id: crypto.randomUUID(),
        key,
        label,
        icon: icon || '📋',
        position: maxPos + 1,
        created_at: new Date().toISOString(),
      }

      setSections((prev) => [...prev, section])

      if (mode === 'postgres') {
        const created = await apiFetch<Section>('/api/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, label, icon: icon || '📋' }),
        })
        if (created) {
          // Update with server-generated ID
          setSections((prev) => prev.map((s) => (s.key === key ? created : s)))
        }
      }

      return section
    },
    [sections, mode]
  )

  const updateSection = useCallback(
    async (id: string, updates: Partial<Pick<Section, 'label' | 'icon'>>) => {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))

      if (mode === 'postgres') {
        await apiFetch(`/api/sections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      }
    },
    [mode]
  )

  const deleteSection = useCallback(
    async (id: string) => {
      const section = sections.find((s) => s.id === id)
      if (!section) return

      setSections((prev) => prev.filter((s) => s.id !== id))

      if (mode === 'postgres') {
        await apiFetch(`/api/sections/${id}`, { method: 'DELETE' })
      }
    },
    [sections, mode]
  )

  return {
    sections,
    loading,
    addSection,
    updateSection,
    deleteSection,
  }
}
