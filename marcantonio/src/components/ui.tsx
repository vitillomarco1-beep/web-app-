import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { EsitoQualita } from '../lib/qualita'

export type Tono = 'brand' | 'arancio' | 'verde' | 'blu' | 'rosso' | 'viola'
type Icona = LucideIcon

const TONI: Record<Tono, string> = {
  brand: 'bg-brand-100 text-brand-700',
  arancio: 'bg-arancio-100 text-arancio-700',
  verde: 'bg-emerald-100 text-emerald-700',
  blu: 'bg-sky-100 text-sky-700',
  rosso: 'bg-rose-100 text-rose-700',
  viola: 'bg-violet-100 text-violet-700',
}

export function PageHeader({ titolo, descrizione, azioni, icona: I }: { titolo: string; descrizione?: string; azioni?: ReactNode; icona?: Icona }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {I && <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md shadow-brand-900/20 sm:flex"><I className="h-6 w-6" strokeWidth={1.8} /></span>}
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-900 sm:text-3xl">{titolo}</h1>
          {descrizione && <p className="mt-0.5 text-sm text-stone-500">{descrizione}</p>}
        </div>
      </div>
      {azioni && <div className="flex flex-wrap gap-2">{azioni}</div>}
    </div>
  )
}

/** Pastiglia di variazione: verde se sale, rossa se scende (con freccia e testo, mai solo colore). */
export function Variazione({ valore, suffisso = '%', testo }: { valore: number; suffisso?: string; testo?: string }) {
  const su = valore >= 0
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${su ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        {su ? '▲' : '▼'} {Math.abs(valore).toLocaleString('it-IT', { maximumFractionDigits: 1 })}{suffisso}
      </span>
      {testo && <span>{testo}</span>}
    </span>
  )
}

export function StatTile({ etichetta, valore, unita, nota, icona: I, tono = 'brand' }: { etichetta: string; valore: string; unita?: string; nota?: ReactNode; icona?: Icona; tono?: Tono }) {
  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{etichetta}</div>
        {I && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONI[tono]}`}><I className="h-[18px] w-[18px]" strokeWidth={2} /></span>}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-serif text-3xl font-bold tabular-nums text-stone-900">{valore}</span>
        {unita && <span className="text-sm text-stone-500">{unita}</span>}
      </div>
      {nota && <div className="mt-1.5 text-xs text-stone-500">{nota}</div>}
    </div>
  )
}

/** Etichetta colorata per un motivo di segnalazione di una vacca. */
export function MotivoChip({ testo }: { testo: string }) {
  const t = testo.toLowerCase()
  const cls = t.startsWith('allarme') ? 'bg-rose-50 text-rose-800 ring-rose-200'
    : t.startsWith('latte in calo') ? 'bg-arancio-50 text-arancio-800 ring-arancio-200'
      : t.startsWith('latte separato') ? 'bg-sky-50 text-sky-800 ring-sky-200'
        : t.startsWith('solo') ? 'bg-violet-50 text-violet-800 ring-violet-200'
          : 'bg-stone-100 text-stone-700 ring-stone-200'
  return <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{testo}</span>
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
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-white/60 p-10 text-center text-sm text-stone-600">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><path d="M3 7h18M5 7l1.5 12h11L19 7M9 11v4M15 11v4M9 7V4h6v3" /></svg>
      </div>
      {children}
    </div>
  )
}

export function conferma(msg: string) {
  return window.confirm(msg)
}
