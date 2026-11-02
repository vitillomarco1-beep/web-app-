import { useId, useState } from 'react'

export interface Punto { etichetta: string; valore: number; dettaglio?: string }

/**
 * Istogramma a serie singola (nessuna legenda: il titolo della card nomina la serie).
 * Barre sottili con estremità arrotondate ancorate alla base, griglia recessiva,
 * tooltip al passaggio del mouse / focus con area di aggancio più ampia della barra.
 */
export default function BarChart({ dati, unita, altezza = 220, formatta = (n: number) => String(n) }: {
  dati: Punto[]
  unita: string
  altezza?: number
  formatta?: (n: number) => string
}) {
  const [attivo, setAttivo] = useState<number | null>(null)
  const idGrad = useId().replace(/:/g, '')
  if (dati.length === 0) return <div className="py-10 text-center text-sm text-stone-400">Nessun dato</div>

  const W = 720, H = altezza, mL = 48, mR = 8, mT = 12, mB = 28
  const iw = W - mL - mR, ih = H - mT - mB
  const max = Math.max(...dati.map((d) => d.valore))
  const passo = scalaPasso(max)
  const top = Math.ceil(max / passo) * passo || 1
  const tacche = Array.from({ length: Math.round(top / passo) + 1 }, (_, i) => i * passo)
  const slot = iw / dati.length
  const bw = Math.max(2, slot - 2) // 2px di stacco tra barre adiacenti
  const y = (v: number) => mT + ih - (v / top) * ih
  const ogniN = Math.ceil(dati.length / 10)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Istogramma, ${dati.length} valori in ${unita}`}>
        <defs>
          <linearGradient id={`b${idGrad}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#946073" /><stop offset="100%" stopColor="#613846" /></linearGradient>
          <linearGradient id={`u${idGrad}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f9a23d" /><stop offset="100%" stopColor="#db7a0c" /></linearGradient>
        </defs>
        {tacche.map((t) => (
          <g key={t}>
            <line x1={mL} x2={W - mR} y1={y(t)} y2={y(t)} className="stroke-stone-100" strokeWidth={1} strokeDasharray="3 4" />
            <text x={mL - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[11px]">{formatta(t)}</text>
          </g>
        ))}
        {dati.map((d, i) => {
          const x = mL + i * slot + 1
          const h = Math.max(0, y(0) - y(d.valore))
          const r = Math.min(4, bw / 2, h)
          return (
            <g key={i}>
              <path
                d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + bw - r} Q${x + bw},${y(0) - h} ${x + bw},${y(0) - h + r} V${y(0)} Z`}
                fill={attivo === null || attivo === i ? `url(#${i === dati.length - 1 ? 'u' : 'b'}${idGrad})` : '#e6d0d8'}
              />
              {i % ogniN === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-stone-500 text-[11px]">{d.etichetta}</text>
              )}
              {/* area di aggancio: tutta la colonna */}
              <rect x={mL + i * slot} y={mT} width={slot} height={ih} fill="transparent" tabIndex={0}
                onMouseEnter={() => setAttivo(i)} onMouseLeave={() => setAttivo(null)}
                onFocus={() => setAttivo(i)} onBlur={() => setAttivo(null)}>
                <title>{`${d.etichetta}: ${formatta(d.valore)} ${unita}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      {attivo !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-stone-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${((mL + attivo * slot + slot / 2) / W) * 100}%` }}
        >
          <div className="font-medium">{dati[attivo].dettaglio ?? dati[attivo].etichetta}</div>
          <div className="tabular-nums">{formatta(dati[attivo].valore)} {unita}</div>
        </div>
      )}
    </div>
  )
}

function scalaPasso(max: number): number {
  if (max <= 0) return 1
  const grezzo = max / 4
  const mag = 10 ** Math.floor(Math.log10(grezzo))
  const n = grezzo / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
}
