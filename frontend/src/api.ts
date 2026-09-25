// The typed client for the FastAPI backend. Screens import only from here:
//   import * as api from '../api'
import { ApiError } from './apiError'
import type { GeneratorOptions, ItemIn, ItemOut, ItemSummary, TokenOut, UserOut } from './types'

const API_URL = 'http://127.0.0.1:5055'

// The JWT lives in this variable only (memory). Never localStorage:
// it disappears when the window closes or the page reloads.
let accessToken: string | null = null
let handleUnauthorized = () => {}

export function setAccessToken(token: string | null) {
  accessToken = token
}

// The auth context registers what to do when a logged-in request gets 401
export function onUnauthorized(handler: () => void) {
  handleUnauthorized = handler
}

type RequestOptions = {
  json?: unknown // sent as a JSON body
  form?: URLSearchParams // sent as form fields (only login uses this)
  query?: Record<string, string | number | boolean>
  skipUnauthorizedHandler?: boolean
}

// FastAPI errors look like {"detail": "text"} or, for 422,
// {"detail": [{"loc": ["body", "password"], "msg": "..."}, ...]}
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((d: { loc?: unknown[]; msg: string }) => `${String(d.loc?.at(-1) ?? 'input')}: ${d.msg}`)
        .join('; ')
    }
  } catch {
    // body was not JSON; fall through
  }
  return `Request failed (${res.status})`
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let body: BodyInit | undefined
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  } else if (options.form) {
    body = options.form // fetch sets the form Content-Type by itself
  }

  const url = new URL(API_URL + path)
  for (const [name, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(name, String(value))
  }

  let res: Response
  try {
    res = await fetch(url, { method, headers, body })
  } catch {
    // fetch only throws when there is no answer at all
    throw new ApiError(0, 'Cannot reach the PassVault backend. Is it running?')
  }

  // 401 on a logged-in request = token expired, logged out, or server restarted.
  // (A 401 from the login form just means a wrong password: no token yet.)
  if (res.status === 401 && accessToken && !options.skipUnauthorizedHandler) {
    handleUnauthorized()
  }
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------- auth ----------

export function register(username: string, password: string): Promise<UserOut> {
  return request('POST', '/auth/register', { json: { username, password } })
}

export function login(username: string, password: string): Promise<TokenOut> {
  return request('POST', '/auth/login', { form: new URLSearchParams({ username, password }) })
}

export function refresh(): Promise<TokenOut> {
  return request('POST', '/auth/refresh')
}

export function logout(): Promise<void> {
  // If the key is already gone we are logged out anyway: no redirect needed
  return request('POST', '/auth/logout', { skipUnauthorizedHandler: true })
}

// ---------- vault items ----------

export function listItems(q = ''): Promise<ItemSummary[]> {
  return request('GET', '/items', { query: q ? { q } : {} })
}

export function getItem(id: number): Promise<ItemOut> {
  return request('GET', `/items/${id}`)
}

export function createItem(data: ItemIn): Promise<ItemOut> {
  return request('POST', '/items', { json: data })
}

export function updateItem(id: number, data: ItemIn): Promise<ItemOut> {
  return request('PUT', `/items/${id}`, { json: data })
}

export async function generatePassword(options: GeneratorOptions): Promise<string> {
  const result = await request<{ password: string }>('GET', '/generate-password', { query: { ...options } })
  return result.password
}
