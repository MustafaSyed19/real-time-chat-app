import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/authContext.tsx'


createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
  ,
)
