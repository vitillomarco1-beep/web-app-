import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Panoramica', end: true },
  { to: '/clienti', label: 'Clienti', end: false },
  { to: '/gruppi', label: 'Gruppi', end: false },
  { to: '/normativa', label: 'Normativa', end: false },
]

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-600 text-lg text-white">
              🌱
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-stone-900">
                Carbon Farming Calculator
              </p>
              <p className="text-xs leading-tight text-stone-500">
                Bilancio crediti di carbonio — Reg. (UE) 2024/3012
              </p>
            </div>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-center text-xs text-stone-400 sm:px-6">
        Strumento di supporto professionale — non sostituisce la verifica di un organismo di
        certificazione accreditato ai sensi del regolamento (UE) 2024/3012.
      </footer>
    </div>
  )
}
