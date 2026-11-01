import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CREDENZIALI_DEMO } from '../config/azienda'

// ⚠️ Autenticazione SOLO dimostrativa: le credenziali sono nel codice del browser.
// Prima dell'uso reale va sostituita con un backend (es. Supabase, Firebase, API propria).
const CHIAVE = 'marcantonio:sessione'

interface AuthApi {
  autenticato: boolean
  accedi: (utente: string, password: string) => boolean
  esci: () => void
}

const AuthCtx = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticato, setAutenticato] = useState(() => sessionStorage.getItem(CHIAVE) === '1')

  const accedi = (utente: string, password: string) => {
    const ok = utente.trim() === CREDENZIALI_DEMO.utente && password === CREDENZIALI_DEMO.password
    if (ok) {
      sessionStorage.setItem(CHIAVE, '1')
      setAutenticato(true)
    }
    return ok
  }
  const esci = () => {
    sessionStorage.removeItem(CHIAVE)
    setAutenticato(false)
  }
  return <AuthCtx.Provider value={{ autenticato, accedi, esci }}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>')
  return ctx
}

export function RichiedeAccesso({ children }: { children: ReactNode }) {
  const { autenticato } = useAuth()
  const location = useLocation()
  if (!autenticato) return <Navigate to="/area-riservata/login" replace state={{ da: location.pathname }} />
  return <>{children}</>
}
