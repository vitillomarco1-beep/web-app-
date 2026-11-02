import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { UTENTI_DEMO, type Ruolo } from '../config/azienda'

// ⚠️ Autenticazione SOLO dimostrativa: le credenziali sono nel codice del browser.
// Prima dell'uso reale va sostituita con il servizio online (Supabase Auth), vedi docs/CONFIGURAZIONE.md.
const CHIAVE = 'marcantonio:sessione'

interface Sessione { utente: string; ruolo: Ruolo }

interface AuthApi {
  autenticato: boolean
  sessione: Sessione | null
  accedi: (utente: string, password: string) => Sessione | null
  esci: () => void
}

const AuthCtx = createContext<AuthApi | null>(null)

function leggiSessione(): Sessione | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHIAVE) ?? 'null')
    return s && s.utente && s.ruolo ? s : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessione, setSessione] = useState<Sessione | null>(leggiSessione)

  const accedi = (utente: string, password: string) => {
    const u = UTENTI_DEMO.find((x) => x.utente === utente.trim().toLowerCase() && x.password === password)
    if (!u) return null
    const s = { utente: u.utente, ruolo: u.ruolo }
    sessionStorage.setItem(CHIAVE, JSON.stringify(s))
    setSessione(s)
    return s
  }
  const esci = () => {
    sessionStorage.removeItem(CHIAVE)
    setSessione(null)
  }
  return <AuthCtx.Provider value={{ autenticato: !!sessione, sessione, accedi, esci }}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>')
  return ctx
}

export const paginaIniziale = (ruolo: Ruolo) => (ruolo === 'collaboratore' ? '/area-riservata/pesata' : '/area-riservata')

/**
 * Pagina dove andare dopo l'accesso: quella richiesta prima del login, se adatta al ruolo.
 * La pagina Pesata viene ignorata per il titolare: di solito è rimasta da una sessione del collaboratore.
 */
export function destinazioneDopoAccesso(ruolo: Ruolo, richiesta?: string) {
  if (!richiesta || !richiesta.startsWith('/area-riservata') || richiesta.startsWith('/area-riservata/login')) return paginaIniziale(ruolo)
  if (ruolo === 'collaboratore') return richiesta.startsWith('/area-riservata/pesata') ? richiesta : paginaIniziale(ruolo)
  return richiesta.startsWith('/area-riservata/pesata') ? paginaIniziale(ruolo) : richiesta
}

/** Protegge una pagina: richiede l'accesso e, se indicato, uno dei ruoli ammessi. */
export function RichiedeAccesso({ children, ruoli }: { children: ReactNode; ruoli?: Ruolo[] }) {
  const { sessione } = useAuth()
  const location = useLocation()
  if (!sessione) return <Navigate to="/area-riservata/login" replace state={{ da: location.pathname }} />
  if (ruoli && !ruoli.includes(sessione.ruolo)) return <Navigate to={paginaIniziale(sessione.ruolo)} replace />
  return <>{children}</>
}
