import type { ReactNode } from 'react'
import type { EsitoQualita } from '../lib/qualita'

export function PageHeader({ titolo, descrizione, azioni }: { titolo: string; descrizione?: string; azioni?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{titolo}</h1>
        {descrizione && <p className="mt-1 text-sm text-stone-500">{descrizione}</p>}
      </div>
      {azioni && <div className="flex gap-2">{azioni}</div>}
    </div>
  )
}

export function StatTile({ etichetta, valore, unita, nota }: { etichetta: string; valore: string; unita?: string; nota?: ReactNode }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{etichetta}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums text-stone-900">{valore}</span>
        {unita && <span className="text-sm text-stone-500">{unita}</span>}
      </div>
      {nota && <div className="mt-1 text-xs text-stone-500">{nota}</div>}
    </div>
  )
}

const STILE_ESITO: Record<EsitoQualita, { cls: string; icona: string }> = {
  conforme: { cls: 'bg-green-50 text-green-800 ring-green-200', icona: '✓' },
  attenzione: { cls: 'bg-amber-50 text-amber-800 ring-amber-200', icona: '!' },
  'non conforme': { cls: 'bg-red-50 text-red-800 ring-red-200', icona: '✕' },
}

/** Badge di stato: colore + icona + testo (mai solo colore). */
export function BadgeEsito({ esito }: { esito: EsitoQualita | null }) {
  if (!esito) return <span className="text-xs text-stone-400">n.d.</span>
  const s = STILE_ESITO[esito]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span aria-hidden>{s.icona}</span>
      {esito}
    </span>
  )
}

export function Modale({ titolo, onChiudi, children }: { titolo: string; onChiudi: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-label={titolo} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titolo}</h2>
          <button onClick={onChiudi} className="text-2xl leading-none text-stone-400 hover:text-stone-700" aria-label="Chiudi">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export function Vuoto({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</div>
}

export function conferma(msg: string) {
  return window.confirm(msg)
}
