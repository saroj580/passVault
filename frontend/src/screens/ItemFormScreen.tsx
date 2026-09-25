// One screen for both "Add item" (#/vault/new) and "Edit item" (#/vault/:id/edit)
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import * as api from '../api'
import { getErrorMessage } from '../apiError'
import { Button, Card, ErrorMessage, Field, Select, TextArea, TextInput } from '../components/ui'
import { CATEGORIES } from '../types'
import type { Category, GeneratorOptions, ItemIn } from '../types'

const EMPTY_ITEM: ItemIn = { site: '', username: '', url: null, category: 'Other', password: '', notes: null }

export default function ItemFormScreen() {
  const { id } = useParams()
  const isEdit = id !== undefined // no :id in the URL means "Add"
  const navigate = useNavigate()

  const [form, setForm] = useState<ItemIn>(EMPTY_ITEM)
  const [loading, setLoading] = useState(isEdit)
  const [showPassword, setShowPassword] = useState(false)
  const [options, setOptions] = useState<GeneratorOptions>({ length: 20, uppercase: true, digits: true, symbols: true })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // In edit mode, load the item once and fill the form with it
  useEffect(() => {
    if (!isEdit) return
    let ignore = false
    api
      .getItem(Number(id))
      .then(({ site, username, url, category, password, notes }) => {
        if (ignore) return
        setForm({ site, username, url, category, password, notes })
        setLoading(false)
      })
      .catch((err) => {
        if (ignore) return
        setError(getErrorMessage(err))
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [id, isEdit])

  // Change one field of the form, keep the others
  function update<K extends keyof ItemIn>(key: K, value: ItemIn[K]) {
    setForm((old) => ({ ...old, [key]: value }))
  }

  async function handleGenerate() {
    try {
      update('password', await api.generatePassword(options))
      setShowPassword(true)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSave() {
    setError('')
    setBusy(true)
    // Empty boxes are sent as null, like the backend expects
    const data: ItemIn = { ...form, url: form.url || null, notes: form.notes || null }
    try {
      const saved = isEdit ? await api.updateItem(Number(id), data) : await api.createItem(data)
      navigate(`/vault/${saved.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <Card>
      <h1 className="mb-6 text-xl font-semibold">{isEdit ? 'Edit item' : 'Add item'}</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
      >
        <Field label="Site name">
          <TextInput value={form.site} onChange={(e) => update('site', e.target.value)} required maxLength={200} />
        </Field>
        <Field label="Username or email">
          <TextInput value={form.username} onChange={(e) => update('username', e.target.value)} maxLength={200} />
        </Field>
        <Field label="URL (optional)">
          <TextInput
            type="url"
            placeholder="https://…"
            value={form.url ?? ''}
            onChange={(e) => update('url', e.target.value)}
            pattern="https?://.+"
            title="Must start with http:// or https://"
          />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => update('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>

        <Field label="Password">
          <div className="flex gap-2">
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              className="font-mono"
              autoComplete="off"
            />
            <Button variant="secondary" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          </div>
        </Field>

        {/* Password generator options */}
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="block text-sm">
            Length: <span className="font-medium">{options.length}</span>
            <input
              type="range"
              min={8}
              max={128}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
              className="mt-1 block w-full"
            />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['uppercase', 'digits', 'symbols'] as const).map((key) => (
              <label key={key} className="flex items-center gap-1 capitalize">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                />
                {key}
              </label>
            ))}
          </div>
          <Button variant="secondary" onClick={() => void handleGenerate()}>
            Generate password
          </Button>
        </div>

        <Field label="Notes (optional)">
          <TextArea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} maxLength={10000} />
        </Field>

        <ErrorMessage message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(isEdit ? `/vault/${id}` : '/vault')}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
