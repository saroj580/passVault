// The shared "am I logged in?" state, readable from any component with useAuth().
import { createContext, useContext } from 'react'

// Why the last session ended; the Login screen shows a matching message
export type LogoutReason = 'loggedOut' | 'expired' | 'idle'

export interface AuthState {
  isLoggedIn: boolean
  logoutReason: LogoutReason | null
  login: (username: string, password: string) => Promise<void>
  logout: (reason?: LogoutReason) => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
