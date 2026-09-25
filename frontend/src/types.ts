// The shapes of the JSON the backend sends and receives.
// Mirrors backend/app/schemas.py: when one changes, change the other.

export const CATEGORIES = ['Personal', 'Work', 'Banking', 'Social', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

export interface UserOut {
  id: number
  username: string
  created_at: string
}

export interface TokenOut {
  access_token: string
  token_type: string
  expires_at: string
}

// One row of the vault list: no password, no notes
export interface ItemSummary {
  id: number
  site: string
  username: string
  url: string | null
  category: Category
}

// One full item, with password and notes decrypted
export interface ItemOut extends ItemSummary {
  password: string
  notes: string | null
  created_at: string
  updated_at: string
}

// What we send to create (POST) or replace (PUT) an item
export interface ItemIn {
  site: string
  username: string
  url: string | null
  category: Category
  password: string
  notes: string | null
}

export interface GeneratorOptions {
  length: number
  uppercase: boolean
  digits: boolean
  symbols: boolean
}
