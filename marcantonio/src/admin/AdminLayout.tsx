import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'

export default function AdminLayout() {
  const { esci } = useAuth()
  const { dati } = useStore()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const nonLetti = dati.messaggi.filter((m) => !m.letto).length

  const voci = [
    { to: '/area-riservata', label: 'Cruscotto', end: true },
    { to: '/area-riservata/mandria', label: 'Mandria' },
    { to: '/area-riservata/produzione', label: 'Produzione' },
    { to: '/area-riservata/alimentazione', label: 'Alimentazione' },
    { to: '/area-riservata/qualita', label: 'Qualità latte' },
    { to: '/area-riservata/caseificio', label: 'Caseificio' },
    { to: '/area-riservata/consegne', label: 'Consegne latte' },
    { to: '/area-riservata/messaggi', label: 'Messaggi', badge: nonLetti },
    { to: '/area-riservata/impostazioni', label: 'Dati e backup' },
  ]

  const nav = (
    <nav className="flex flex-col gap-1">
      {voci.map((v) => (
        <NavLink key={v.to} to={v.to} end={v.end} onClick={() => setAperto(false)}
          className={({ isActive }) => `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-arancio-500 font-semibold text-brand-900' : 'text-brand-100 hover:bg-brand-800'}`}>
          {v.label}
          {!!v.badge && <span className="rounded-full bg-white px-2 text-xs font-semibold text-brand-800">{v.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className={`${aperto ? 'block' : 'hidden'} bg-brand-900 p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0`}>
        <div className="mb-6 hidden lg:block"><Logo suScuro altezza="h-16" /></div>
        {nav}
        <div className="mt-6 space-y-1 border-t border-brand-800 pt-4">
          <Link to="/" className="block rounded-md px-3 py-2 text-sm text-brand-200 hover:bg-brand-800">← Sito pubblico</Link>
          <button onClick={() => { esci(); navigate('/') }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-brand-200 hover:bg-brand-800">Esci</button>
        </div>
      </aside>
      <div className="flex items-center justify-between bg-brand-900 px-4 py-3 lg:hidden">
        <Logo suScuro altezza="h-8" />
        <button onClick={() => setAperto((a) => !a)} className="text-sm font-medium text-white" aria-expanded={aperto}>{aperto ? 'Chiudi' : 'Menu'}</button>
      </div>
      <main className="min-w-0 flex-1 p-4 sm:p-8"><Outlet /></main>
    </div>
  )
}
