import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { paginaIniziale, useAuth } from '../lib/auth'
import { UTENTI_DEMO } from '../config/azienda'

export default function LoginPage() {
  const { sessione, accedi } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const richiesta = (location.state as { da?: string } | null)?.da

  if (sessione) return <Navigate to={richiesta ?? paginaIniziale(sessione.ruolo)} replace />

  const invia = (e: FormEvent) => {
    e.preventDefault()
    const s = accedi(utente, password)
    if (s) navigate(richiesta ?? paginaIniziale(s.ruolo), { replace: true })
    else setErrore('Credenziali non valide')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center"><Logo altezza="h-28" /></div>
        <h1 className="text-center text-xl font-semibold">Area riservata</h1>
        <form onSubmit={invia} className="mt-6 space-y-4">
          <label className="block"><span className="label">Utente</span><input className="input" autoComplete="username" value={utente} onChange={(e) => setUtente(e.target.value)} autoFocus /></label>
          <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {errore && <p className="text-sm text-red-600" role="alert">{errore}</p>}
          <button className="btn-primary w-full">Accedi</button>
        </form>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Versione dimostrativa. Accessi di prova:
          {UTENTI_DEMO.map((u) => <span key={u.utente} className="block">• <b>{u.utente}</b> / <b>{u.password}</b> — {u.descrizione}</span>)}
        </p>
        <Link to="/" className="mt-4 block text-center text-sm text-stone-500 hover:underline">← Torna al sito</Link>
      </div>
    </div>
  )
}
