// A pretend backend for Step 5. It has the same function names, arguments
// and return types as the real API client we write in Step 6, so the
// screens will not need to change. Data lives in memory until page reload.
import { ApiError } from './apiError'
import type { GeneratorOptions, ItemIn, ItemOut, ItemSummary, TokenOut, UserOut } from './types'

// Every call waits a bit, so we can see loading states like with a real server
function wait(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const now = new Date().toISOString()

const users = [{ id: 1, username: 'alice', password: 'testpassword123', created_at: now }]

const items: ItemOut[] = [
  { id: 1, site: 'GitHub', username: 'alice@example.com', url: 'https://github.com', category: 'Work', password: 'fake-Gh!2026-pass', notes: '2FA codes are on my phone', created_at: now, updated_at: now },
  { id: 2, site: 'My Bank', username: 'alice123', url: 'https://bank.example.com', category: 'Banking', password: 'fake-B4nk#pass', notes: null, created_at: now, updated_at: now },
  { id: 3, site: 'Gmail', username: 'alice@gmail.com', url: 'https://mail.google.com', category: 'Personal', password: 'fake-M@il-9876', notes: null, created_at: now, updated_at: now },
  { id: 4, site: 'Twitter', username: '@alice', url: null, category: 'Social', password: 'fake-Tw33t!', notes: 'Old account', created_at: now, updated_at: now },
  { id: 5, site: 'Wi-Fi router', username: 'admin', url: 'http://192.168.1.1', category: 'Other', password: 'fake-R0uter$', notes: 'Sticker under the router', created_at: now, updated_at: now },
]

function toSummary({ id, site, username, url, category }: ItemOut): ItemSummary {
  return { id, site, username, url, category }
}

function findItem(id: number): ItemOut {
  const item = items.find((i) => i.id === id)
  if (!item) throw new ApiError(404, 'Item not found')
  return item
}

export async function register(username: string, password: string): Promise<UserOut> {
  await wait()
  const name = username.toLowerCase()
  if (users.some((u) => u.username === name)) throw new ApiError(409, 'Username already taken')
  if (password.length < 12) throw new ApiError(422, 'Password must be at least 12 characters')
  const user = { id: users.length + 1, username: name, password, created_at: new Date().toISOString() }
  users.push(user)
  return { id: user.id, username: user.username, created_at: user.created_at }
}

export async function login(username: string, password: string): Promise<TokenOut> {
  await wait()
  const user = users.find((u) => u.username === username.toLowerCase())
  if (!user || user.password !== password) throw new ApiError(401, 'Wrong username or password')
  const expires = new Date(Date.now() + 15 * 60 * 1000)
  return { access_token: 'fake-token', token_type: 'bearer', expires_at: expires.toISOString() }
}

export async function logout(): Promise<void> {
  await wait()
}

export async function listItems(q = ''): Promise<ItemSummary[]> {
  await wait()
  const needle = q.trim().toLowerCase()
  return items
    .filter((i) =>
      [i.site, i.username, i.url ?? '', i.category].some((text) => text.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.site.localeCompare(b.site))
    .map(toSummary)
}

export async function getItem(id: number): Promise<ItemOut> {
  await wait()
  return { ...findItem(id) }
}

export async function createItem(data: ItemIn): Promise<ItemOut> {
  await wait()
  const time = new Date().toISOString()
  const item: ItemOut = { ...data, id: Math.max(0, ...items.map((i) => i.id)) + 1, created_at: time, updated_at: time }
  items.push(item)
  return { ...item }
}

export async function updateItem(id: number, data: ItemIn): Promise<ItemOut> {
  await wait()
  const item = findItem(id)
  Object.assign(item, data, { updated_at: new Date().toISOString() })
  return { ...item }
}

const POOLS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
}

function randomIndex(max: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max
}

// Same rules as the backend: lowercase always, one of each chosen type
export async function generatePassword(options: GeneratorOptions): Promise<string> {
  await wait(100)
  const pools = [POOLS.lower]
  if (options.uppercase) pools.push(POOLS.upper)
  if (options.digits) pools.push(POOLS.digits)
  if (options.symbols) pools.push(POOLS.symbols)

  const alphabet = pools.join('')
  const chars = pools.map((pool) => pool[randomIndex(pool.length)])
  while (chars.length < options.length) chars.push(alphabet[randomIndex(alphabet.length)])
  // Shuffle (Fisher-Yates) so the guaranteed characters are not always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
