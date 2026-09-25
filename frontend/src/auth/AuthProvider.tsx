// Owns the login session: starts it, refreshes it while you are active,
// and ends it on logout, after 15 idle minutes, or when the backend says 401.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api'
import type { TokenOut } from '../types'
import { AuthContext } from './AuthContext'
import type { LogoutReason } from './AuthContext'

const CHECK_EVERY_MS = 15 * 1000 // how often we look at the clock
const REFRESH_BEFORE_MS = 2 * 60 * 1000 // refresh when less than 2 min are left
const IDLE_LIMIT_MS = 15 * 60 * 1000 // lock after 15 min without a click or key

export default function AuthProvider({ children }: { children: ReactNode }) {
  // When the current token expires (ms since 1970); null = logged out.
  // The token itself is kept inside api.ts, not in React state.
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null)
  // useRef: values that change without re-rendering the screen
  const lastActivity = useRef(0) // set properly at login
  const refreshing = useRef(false)

  const startSession = useCallback((token: TokenOut) => {
    api.setAccessToken(token.access_token)
    setExpiresAt(Date.parse(token.expires_at))
  }, [])

  const endSession = useCallback((reason: LogoutReason) => {
    api.setAccessToken(null)
    setExpiresAt(null)
    setLogoutReason(reason)
    // <RequireAuth> notices isLoggedIn = false and shows the Login screen
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      startSession(await api.login(username, password))
      lastActivity.current = Date.now()
      setLogoutReason(null)
    },
    [startSession],
  )

  const logout = useCallback(
    async (reason: LogoutReason = 'loggedOut') => {
      try {
        await api.logout() // the backend deletes the encryption key
      } catch {
        // backend down or key already gone: we are logged out either way
      }
      endSession(reason)
    },
    [endSession],
  )

  // Any 401 on a logged-in request ends the session
  useEffect(() => {
    api.onUnauthorized(() => endSession('expired'))
  }, [endSession])

  // Remember the time of the last click or key press anywhere in the window
  useEffect(() => {
    const markActive = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', markActive)
    window.addEventListener('keydown', markActive)
    return () => {
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
    }
  }, [])

  // While logged in, check the clock every 15 seconds
  useEffect(() => {
    if (expiresAt === null) return
    const timer = setInterval(() => {
      const now = Date.now()
      if (now >= expiresAt) {
        // e.g. the computer was asleep: the token is already dead
        endSession('expired')
      } else if (now - lastActivity.current >= IDLE_LIMIT_MS) {
        void logout('idle')
      } else if (expiresAt - now < REFRESH_BEFORE_MS && !refreshing.current) {
        // Active and almost expired: swap for a fresh 15-minute token
        refreshing.current = true
        api
          .refresh()
          .then(startSession)
          .catch(() => {
            // a 401 already ended the session through onUnauthorized
          })
          .finally(() => {
            refreshing.current = false
          })
      }
    }, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [expiresAt, endSession, logout, startSession])

  const value = useMemo(
    () => ({ isLoggedIn: expiresAt !== null, logoutReason, login, logout }),
    [expiresAt, logoutReason, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
