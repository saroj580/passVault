import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import * as api from '../api'
import { getErrorMessage } from '../apiError'
import { Button, Card, ErrorMessage } from '../components/ui'
import type { ItemOut } from '../types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm break-all">{children}</dd>
    </div>
  )
}

export default function ItemDetailScreen() {
  const { id } = useParams() // the ":id" part of the URL #/vault/:id
  const navigate = useNavigate()
  const [item, setItem] = useState<ItemOut | null>(null)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let ignore = false
    api
      .getItem(Number(id))
      .then((result) => {
        if (!ignore) setItem(result)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err))
      })
    return () => {
      ignore = true
    }
  }, [id])

  async function copyPassword() {
    if (!item) return
    await navigator.clipboard.writeText(item.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const backLink = (
    <Link to="/vault" className="text-sm text-indigo-600 hover:underline">
      ← Back to vault
    </Link>
  )

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <ErrorMessage message={error} />
      </div>
    )
  }
  if (!item) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-4">
      {backLink}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{item.site}</h1>
          <Button variant="secondary" onClick={() => navigate(`/vault/${item.id}/edit`)}>
            Edit
          </Button>
        </div>
        <dl className="divide-y divide-slate-100">
          <Row label="Username">{item.username || '—'}</Row>
          <Row label="URL">
            {item.url ? (
              // noopener noreferrer: the opened site cannot reach back into our app
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                {item.url}
              </a>
            ) : (
              '—'
            )}
          </Row>
          <Row label="Category">{item.category}</Row>
          <Row label="Password">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{showPassword ? item.password : '••••••••••••'}</span>
              <Button variant="secondary" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </Button>
              <Button variant="secondary" onClick={() => void copyPassword()}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </Row>
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{item.notes || '—'}</span>
          </Row>
          <Row label="Last changed">{new Date(item.updated_at).toLocaleString()}</Row>
        </dl>
      </Card>
    </div>
  )
}
