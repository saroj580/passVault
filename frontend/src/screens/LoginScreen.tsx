import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import * as api from '../api'
import { getErrorMessage } from '../apiError'
import { Button, Card, ErrorMessage, Field, TextInput } from '../components/ui'

export default function LoginScreen() {
  const navigate = useNavigate()
  // RegisterScreen sends { registered: true } along when it navigates here
  const justRegistered = (useLocation().state as { registered?: boolean } | null)?.registered
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    setBusy(true)
    try {
      await api.login(username, password)
      // Step 6: keep the returned token in the auth context (memory only)
      navigate('/vault')
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card>
      <h1 className="mb-6 text-xl font-semibold">Unlock your vault</h1>
      {justRegistered && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created. You can log in now.
        </p>
      )}
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
            autoComplete="username"
          />
        </Field>
        <Field label="Master password">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Unlocking…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  )
}
