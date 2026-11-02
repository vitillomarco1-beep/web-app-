import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Camera, FileUp, HeartPulse, Pill, ClipboardList, Factory, FlaskConical, Globe, Home, LogOut, MessageSquare, Milk, MoreHorizontal,
  Settings, Tag, Truck, Wheat, X, type LucideIcon,
} from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'

interface Voce { to: string; label: string; icona: LucideIcon; end?: boolean; badge?: number }

const R = '/area-riservata'

export default function AdminLayout() {
  const { esci, sessione } = useAuth()
  const collaboratore = sessione?.ruolo === 'collaboratore'
  const { dati } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [altroAperto, setAltroAperto] = useState(false)
  const nonLetti = dati.messaggi.filter((m) => !m.letto).length

  // Sezioni raggruppate per argomento: poche voci, nomi semplici
  const gruppi: { titolo?: string; voci: Voce[] }[] = collaboratore
    ? [{ voci: [{ to: `${R}/pesata`, label: 'Pesata carro', icona: Camera }] }]
    : [
        { voci: [{ to: R, label: 'Oggi', icona: Home, end: true }, { to: `${R}/pesata`, label: 'Pesata carro', icona: Camera }, { to: `${R}/carica`, label: 'Carica la settimana', icona: FileUp }] },
        { titolo: 'Stalla', voci: [
          { to: `${R}/alimentazione`, label: 'Alimentazione', icona: Wheat },
          { to: `${R}/mandria`, label: 'Mandria', icona: Tag },
          { to: `${R}/salute`, label: 'Salute', icona: HeartPulse },
          { to: `${R}/farmaci`, label: 'Farmaci', icona: Pill },
        ] },
        { titolo: 'Latte', voci: [
          { to: `${R}/latte`, label: 'Gruppi e mandria', icona: BarChart3 },
          { to: `${R}/mungiture`, label: 'Mungiture robot', icona: Milk },
          { to: `${R}/qualita`, label: 'Qualità', icona: FlaskConical },
          { to: `${R}/consegne`, label: 'Consegne', icona: Truck },
        ] },
        { titolo: 'Altro', voci: [
          { to: `${R}/messaggi`, label: 'Messaggi', icona: MessageSquare, badge: nonLetti },
          { to: `${R}/caseificio`, label: 'Caseificio', icona: Factory },
          { to: `${R}/impostazioni`, label: 'Dati e backup', icona: Settings },
        ] },
      ]

  // Barra in basso su telefono: le 4 azioni più usate + "Altro"
  const barra: Voce[] = collaboratore ? [] : [
    { to: R, label: 'Oggi', icona: Home, end: true },
    { to: `${R}/pesata`, label: 'Pesata', icona: Camera },
    { to: `${R}/alimentazione`, label: 'Stalle', icona: Wheat },
    { to: `${R}/latte`, label: 'Latte', icona: Milk },
  ]
  const inBarra = barra.some((v) => (v.end ? location.pathname === v.to : location.pathname.startsWith(v.to)))

  const voceCls = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-brand-50 text-brand-800 shadow-[inset_3px_0_0] shadow-arancio-500' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`

  const elenco = (chiudi?: () => void) => (
    <nav className="space-y-5">
      {gruppi.map((g, i) => (
        <div key={i}>
          {g.titolo && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{g.titolo}</div>}
          <div className="space-y-0.5">
            {g.voci.map((v) => (
              <NavLink key={v.to} to={v.to} end={v.end} className={voceCls} onClick={chiudi}>
                <v.icona className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                <span className="flex-1">{v.label}</span>
                {!!v.badge && <span className="rounded-full bg-arancio-500 px-2 py-0.5 text-[11px] font-semibold text-brand-900">{v.badge}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  const piede = (
    <div className="space-y-0.5 border-t border-stone-200 pt-3">
      <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-500 hover:bg-stone-100"><Globe className="h-[18px] w-[18px]" strokeWidth={1.8} />Sito pubblico</Link>
      <button onClick={() => { esci(); navigate('/') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-500 hover:bg-stone-100">
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />Esci{sessione && <span className="ml-auto text-xs text-stone-400">{sessione.utente}</span>}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-crema-50 lg:flex">
      {/* Barra laterale (computer) */}
      <aside className="hidden border-r border-stone-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:p-4">
        <Link to={collaboratore ? `${R}/pesata` : R} className="mb-6 block px-2"><Logo altezza="h-16" /></Link>
        <div className="flex-1 overflow-y-auto">{elenco()}</div>
        {piede}
      </aside>

      {/* Intestazione (telefono) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
        <Link to={collaboratore ? `${R}/pesata` : R}><Logo altezza="h-10" /></Link>
        {collaboratore && (
          <button onClick={() => { esci(); navigate('/') }} className="flex items-center gap-1.5 text-sm text-stone-500"><LogOut className="h-4 w-4" />Esci</button>
        )}
      </header>

      <main className={`min-w-0 flex-1 p-4 sm:p-8 ${collaboratore ? '' : 'pb-28 lg:pb-8'}`}><Outlet /></main>

      {/* Barra in basso (telefono) */}
      {!collaboratore && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigazione principale">
          <div className="grid grid-cols-5">
            {barra.map((v) => (
              <NavLink key={v.to} to={v.to} end={v.end}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-stone-500'}`}>
                {({ isActive }) => (<>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-brand-50' : ''}`}><v.icona className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} /></span>
                  {v.label}
                </>)}
              </NavLink>
            ))}
            <button onClick={() => setAltroAperto(true)} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${!inBarra ? 'text-brand-700' : 'text-stone-500'}`}>
              <span className={`flex h-8 w-12 items-center justify-center rounded-full ${!inBarra ? 'bg-brand-50' : ''}`}><MoreHorizontal className="h-5 w-5" /></span>
              Altro
              {nonLetti > 0 && <span className="absolute right-4 top-2 h-2 w-2 rounded-full bg-arancio-500" aria-label={`${nonLetti} messaggi non letti`} />}
            </button>
          </div>
        </nav>
      )}

      {/* Pannello "Altro" (telefono) */}
      {altroAperto && (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setAltroAperto(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 font-serif text-lg font-bold text-brand-900"><ClipboardList className="h-5 w-5" />Tutte le sezioni</span>
              <button onClick={() => setAltroAperto(false)} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Chiudi"><X className="h-5 w-5" /></button>
            </div>
            {elenco(() => setAltroAperto(false))}
            <div className="mt-5">{piede}</div>
          </div>
        </div>
      )}
    </div>
  )
}
