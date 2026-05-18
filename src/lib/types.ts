export type Category = 'daily' | 'soon' | 'someday'

export interface Section {
  id: string
  key: string
  label: string
  icon: string
  position: number
  created_at: string
}

export interface Todo {
  id: string
  text: string
  category: Category
  view: string
  completed: boolean
  position: number
  created_at: string
  completed_at: string | null
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'default-work', key: 'work', label: 'Work', icon: '💼', position: 0, created_at: '' },
  { id: 'default-private', key: 'private', label: 'Private', icon: '🏠', position: 1, created_at: '' },
  { id: 'default-groceries', key: 'groceries', label: 'Groceries', icon: '🛒', position: 2, created_at: '' },
]

export const CATEGORIES: { key: Category; label: string; color: string; bgColor: string; borderColor: string; icon: string }[] = [
  {
    key: 'daily',
    label: 'Today',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: '☀️',
  },
  {
    key: 'soon',
    label: 'Soon',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: '📌',
  },
  {
    key: 'someday',
    label: 'Someday',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    icon: '💭',
  },
]
