import { neon } from '@neondatabase/serverless'

export function getDb() {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error('POSTGRES_URL not set')
  return neon(url)
}
