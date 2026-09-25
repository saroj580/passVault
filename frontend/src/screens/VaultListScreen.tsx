import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as api from '../api'
import { getErrorMessage } from '../apiError'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorMessage, TextInput } from '../components/ui'
import type { ItemSummary } from '../types'

export default function VaultListScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<ItemSummary[] | null>(null) // null = still loading
  const [error, setError] = useState('')

  useEffect(() => {
    // "ignore" stops an old, slow answer from overwriting a newer one
    let ignore = false
    // Search 300 ms after the last keystroke, not on every key (the first load is instant)
    const timer = setTimeout(
      () => {
        api
          .listItems(query)
          .then((result) => {
            if (ignore) return
            setItems(result)
            setError('')
          })
          .catch((err) => {
            if (!ignore) setError(getErrorMessage(err))
          })
      },
      query ? 300 : 0,
    )
    // Runs when query changes again (or the screen closes): cancel this search
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query])

  // RequireAuth moves us to the Login screen once we are logged out
  const { logout } = useAuth()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">My vault</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/vault/new')}>+ Add item</Button>
          <Button variant="secondary" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </div>

      <TextInput
        type="search"
        placeholder="Search site, username, URL or category…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <ErrorMessage message={error} />

      {items === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">{query ? 'No items match your search.' : 'Your vault is empty.'}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/vault/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div>
                  <div className="font-medium">{item.site}</div>
                  <div className="text-sm text-slate-500">{item.username}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
