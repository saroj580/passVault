import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import './index.css'
import AppLayout from './components/AppLayout'
import ItemDetailScreen from './screens/ItemDetailScreen'
import ItemFormScreen from './screens/ItemFormScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import VaultListScreen from './screens/VaultListScreen'

// Hash router: URLs look like index.html#/vault/3, which also works when
// Electron opens the built app from a file on disk (Step 7).
const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginScreen /> },
      { path: 'register', element: <RegisterScreen /> },
      { path: 'vault', element: <VaultListScreen /> },
      { path: 'vault/new', element: <ItemFormScreen /> },
      { path: 'vault/:id', element: <ItemDetailScreen /> },
      { path: 'vault/:id/edit', element: <ItemFormScreen /> },
      // Any unknown address goes back to login
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
