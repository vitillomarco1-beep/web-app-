import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import { AZIENDA } from '../config/azienda'

const VOCI = [
  { to: '/', label: 'Home', end: true },
  { to: '/azienda', label: "L'azienda" },
  { to: '/prodotti', label: 'Prodotti' },
  { to: '/contatti', label: 'Contatti' },
]

export default function PublicLayout() {
  const [aperto, setAperto] = useState(false)
  const cls = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:text-brand-700'}`

  return (
    <div className="flex min-h-screen flex-col bg-crema-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" onClick={() => setAperto(false)} aria-label="Home"><Logo altezza="h-14 sm:h-16" /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {VOCI.map((v) => <NavLink key={v.to} to={v.to} end={v.end} className={cls}>{v.label}</NavLink>)}
            <Link to="/area-riservata" className="btn-primary ml-3">Area riservata</Link>
          </nav>
          <button className="rounded-md p-2 text-stone-600 md:hidden" onClick={() => setAperto((a) => !a)} aria-label="Menu" aria-expanded={aperto}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              {aperto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {aperto && (
          <nav className="flex flex-col gap-1 border-t border-stone-100 px-4 py-3 md:hidden">
            {VOCI.map((v) => <NavLink key={v.to} to={v.to} end={v.end} className={cls} onClick={() => setAperto(false)}>{v.label}</NavLink>)}
            <Link to="/area-riservata" className="btn-primary mt-2" onClick={() => setAperto(false)}>Area riservata</Link>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-brand-900 text-brand-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <Logo suScuro altezza="h-20" />
            <p className="mt-3 text-sm text-brand-200">{AZIENDA.descrizioneBreve}</p>
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-white">Contatti</h3>
            <p>{AZIENDA.indirizzo}</p>
            <p>Tel. {AZIENDA.telefono}</p>
            <p>{AZIENDA.email}</p>
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-white">Orari</h3>
            <p>{AZIENDA.orari}</p>
          </div>
        </div>
        <div className="border-t border-brand-800 py-4 text-center text-xs text-brand-300">
          © {new Date().getFullYear()} {AZIENDA.nome} · P.IVA {AZIENDA.partitaIva}
        </div>
      </footer>
    </div>
  )
}
