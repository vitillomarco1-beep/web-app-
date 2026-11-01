import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'
import { CREDENZIALI_DEMO } from '../config/azienda'

export default function LoginPage() {
  const { autenticato, accedi } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const destinazione = (location.state as { da?: string } | null)?.da ?? '/area-riservata'

  if (autenticato) return <Navigate to={destinazione} replace />

  const invia = (e: FormEvent) => {
    e.preventDefault()
    if (accedi(utente, password)) navigate(destinazione, { replace: true })
    else setErrore('Credenziali non valide')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-prato-700 to-prato-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center text-xl font-semibold">Area riservata</h1>
        <form onSubmit={invia} className="mt-6 space-y-4">
          <label className="block"><span className="label">Utente</span><input className="input" autoComplete="username" value={utente} onChange={(e) => setUtente(e.target.value)} autoFocus /></label>
          <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {errore && <p className="text-sm text-red-600" role="alert">{errore}</p>}
          <button className="btn-primary w-full">Accedi</button>
        </form>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Versione dimostrativa: utente <b>{CREDENZIALI_DEMO.utente}</b>, password <b>{CREDENZIALI_DEMO.password}</b>.
        </p>
        <Link to="/" className="mt-4 block text-center text-sm text-stone-500 hover:underline">← Torna al sito</Link>
      </div>
    </div>
  )
}
