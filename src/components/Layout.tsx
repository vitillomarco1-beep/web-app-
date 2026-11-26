import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Scale, Sprout, Tractor, Users, type LucideIcon } from 'lucide-react'

const navItems: { to: string; label: string; end: boolean; icon: LucideIcon }[] = [
  { to: '/', label: 'Panoramica', end: true, icon: LayoutDashboard },
  { to: '/clienti', label: 'Clienti', end: false, icon: Tractor },
  { to: '/gruppi', label: 'Gruppi', end: false, icon: Users },
  { to: '/normativa', label: 'Normativa', end: false, icon: Scale },
]

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600 text-white"
              aria-hidden="true"
            >
              <Sprout className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-stone-900">
                Carbon Farming Calculator
              </p>
              <p className="hidden text-xs leading-tight text-stone-500 sm:block">
                Bilancio crediti di carbonio — Reg. (UE) 2024/3012
              </p>
            </div>
          </div>
          {/* Da sm in su: navigazione in alto. Sotto sm la sostituisce la tab bar in basso. */}
          <nav aria-label="Sezioni principali" className="hidden gap-1 sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-forest-100 text-forest-800'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-28 pt-4 text-center text-xs text-stone-500 sm:px-6 sm:pb-8">
        Strumento di supporto professionale — non sostituisce la verifica di un organismo di
        certificazione accreditato ai sensi del regolamento (UE) 2024/3012.
      </footer>

      {/* Tab bar in stile iOS per schermi stretti: 4 sezioni, target di almeno 44pt, area sicura inferiore. */}
      <nav
        aria-label="Sezioni principali"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-4">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                    isActive ? 'text-forest-700' : 'text-stone-500'
                  }`
                }
              >
                <item.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
