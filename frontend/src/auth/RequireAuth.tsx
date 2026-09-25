// A "guard" route: its child screens only show when logged in;
// otherwise it sends the user to the Login screen.
import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

export default function RequireAuth() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Outlet />
}
