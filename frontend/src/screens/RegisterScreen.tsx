import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as api from '../api'
import { getErrorMessage } from '../apiError'
import { Button, Card, ErrorMessage, Field, TextInput } from '../components/ui'

export default function RegisterScreen() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    if (password !== confirm) {
      setError('The two passwords do not match')
      return
    }
    setError('')
    setBusy(true)
    try {
      await api.register(username, password)
      // Send the user to Login with a note that the account was created
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Create your vault</h1>
      <p className="mb-6 text-sm text-slate-600">
        There is no way to recover a forgotten master password. Write it down somewhere safe.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <Field label="Username">
          <TextInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_.\-]+"
            title="Letters, digits, _ . - only"
            autoComplete="username"
          />
        </Field>
        <Field label="Master password (at least 12 characters)">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Repeat master password">
          <TextInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  )
}
