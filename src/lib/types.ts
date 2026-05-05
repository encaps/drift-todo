export type Category = 'daily' | 'soon' | 'someday'

export type View = 'work' | 'private'

export interface Todo {
  id: string
  text: string
  category: Category
  view: View
  completed: boolean
  position: number
  created_at: string
  completed_at: string | null
}

export const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'work', label: 'Work', icon: '💼' },
  { key: 'private', label: 'Private', icon: '🏠' },
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
