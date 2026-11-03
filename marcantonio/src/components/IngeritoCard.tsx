import { useState } from 'react'
import { useStore } from '../lib/store'
import type { Stalla } from '../lib/types'
import { analisiValida } from '../lib/pmr'
import { VOCI, mangimeRobot, parteMangime, partePmr, scala, somma, type Parte } from '../lib/ingerito'
import { fmt1, fmt2, fmtData } from '../lib/format'

/** Quanto ingerisce una vacca al giorno: PMR + mangime al robot, in kg di sostanza secca e di nutrienti. */
export default function IngeritoCard({ stalle, kgTqCapo, data, onAnalisiPmr, onRazioni }: {
  stalle: Stalla[]; kgTqCapo: (s: Stalla) => number; data: string; onAnalisiPmr: () => void; onRazioni: () => void
}) {
  const { dati } = useStore()
  const [sel, setSel] = useState<number | 'media'>('media')

  const perStalla = stalle.filter((s) => s.capi > 0).map((s) => {
    const a = analisiValida(dati.analisiPmr, s.numero, data)
    const kg = kgTqCapo(s)
    const pmr = a && kg > 0 ? partePmr(kg, a) : null
    const m = mangimeRobot(dati, s)
    const robot = m?.ingrediente.analisi ? parteMangime(m.kg, m.ingrediente.analisi) : null
    return { s, a, pmr, m, robot }
  })
  const capiTot = perStalla.reduce((t, x) => t + x.s.capi, 0)
  const media = (k: 'pmr' | 'robot'): Parte | null => {
    if (!perStalla.length || perStalla.some((x) => !x[k])) return null
    return perStalla.reduce<Parte | null>((t, x) => somma(t, scala(x[k]!, x.s.capi / capiTot)), null)
  }
  const scelta = sel === 'media' ? null : perStalla.find((x) => x.s.numero === sel)
  const pmr = scelta ? scelta.pmr : media('pmr')
  const robot = scelta ? scelta.robot : media('robot')
  const tot = somma(pmr, robot)
  const mancaPmr = !dati.analisiPmr.length
  const mancaRobot = perStalla.some((x) => !x.m)
  const mancaAnalisiRobot = perStalla.some((x) => x.m && !x.m.ingrediente.analisi)
  const nomeRobot = perStalla.find((x) => x.m)?.m?.ingrediente.nome ?? 'Mangime robot'
  const ssStimata = perStalla.some((x) => x.m?.ingrediente.analisi?.ssStimata)
  const kgRobot = scelta ? scelta.m?.kg : perStalla.length ? perStalla.reduce((t, x) => t + (x.m?.kg ?? 0) * x.s.capi, 0) / capiTot : undefined

  const f = (v: number | null | undefined, k: string) => (v === null || v === undefined ? '—' : k === 'sodio' ? `${fmt1(v * 1000)} g` : k === 'ufl' ? fmt1(v) : fmt2(v))
  /** Quale parte copre la voce: entrambe, solo PMR o solo mangime (la % si calcola sulla SS di quella parte). */
  const base = (k: keyof Parte) => {
    const inPmr = pmr?.[k] !== null && pmr?.[k] !== undefined, inRobot = robot?.[k] !== null && robot?.[k] !== undefined
    if (inPmr && inRobot) return { ss: tot!.ss, nota: '' }
    if (inPmr) return { ss: pmr!.ss, nota: robot ? 'solo PMR' : '' }
    return { ss: robot?.ss ?? 0, nota: pmr ? 'solo mangime' : '' }
  }
  const pct = (k: keyof Parte, v: number | null | undefined) => {
    const b = base(k)
    if (v === null || v === undefined || !b.ss) return '—'
    return k === 'ufl' ? `${fmt2(v / b.ss)} /kg SS` : `${(v / b.ss * 100).toLocaleString('it-IT', { minimumFractionDigits: k === 'sodio' ? 2 : 1, maximumFractionDigits: k === 'sodio' ? 2 : 1 })}%`
  }

  return (
    <section className="card mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Ingerito per vacca al giorno</h2>
          <p className="text-xs text-stone-500">PMR del carro (media 7 giorni al {fmtData(data)}) + mangime al robot ({nomeRobot})</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Stalla">
          {(['media', ...perStalla.map((x) => x.s.numero)] as const).map((v) => (
            <button key={v} onClick={() => setSel(v)} className={`rounded-full px-3 py-1 text-sm ${sel === v ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
              {v === 'media' ? 'Media' : `Stalla ${v}`}
            </button>
          ))}
        </div>
      </div>

      {tot && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-arancio-50 px-4 py-3 text-sm text-stone-700">
          <span>PMR <b>{pmr ? fmt1(pmr.ss) : '—'}</b> kg SS</span><span>+</span>
          <span>robot <b>{robot ? fmt1(robot.ss) : '—'}</b> kg SS{kgRobot ? ` (${fmt1(kgRobot)} kg t.q.)` : ''}</span><span>=</span>
          <span className="font-serif text-2xl font-bold text-stone-900">{fmt1(tot.ss)}</span><span>kg di sostanza secca</span>
        </div>
      )}

      {tot && (
        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Per vacca al giorno (kg)</th><th className="num">PMR</th><th className="num">Robot</th><th className="num">Totale</th><th className="num">% su SS</th></tr></thead>
            <tbody>
              {VOCI.filter((v) => tot[v.k] !== null).map((v) => (
                <tr key={v.k}>
                  <td className="font-medium">{v.nome}{v.k !== 'ss' && base(v.k).nota && <span className="ml-1 text-xs font-normal text-stone-400">({base(v.k).nota})</span>}</td>
                  <td className="num">{f(pmr?.[v.k], v.k)}</td>
                  <td className="num">{f(robot?.[v.k], v.k)}</td>
                  <td className="num font-semibold">{f(tot[v.k], v.k)}</td>
                  <td className="num text-stone-500">{v.k === 'ss' ? '' : pct(v.k, tot[v.k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 space-y-1 text-xs text-stone-500">
        {mancaPmr && <p><button className="btn-link text-xs" onClick={onAnalisiPmr}>+ Aggiungi l’analisi del PMR</button> per calcolare la sostanza secca del carro.</p>}
        {mancaRobot && <p>Indica il mangime e i kg al robot nella razione di lattazione di ogni gruppo: <button className="btn-link text-xs" onClick={onRazioni}>Razioni e prezzi</button>.</p>}
        {mancaAnalisiRobot && <p>Il mangime del robot non ha i componenti analitici: aggiungili in <button className="btn-link text-xs" onClick={onRazioni}>Razioni e prezzi</button> (pulsante “Analisi” accanto all’alimento).</p>}
        {robot && <p>Alcuni valori esistono solo per una parte: NDF, ADF e amido vengono dall’analisi del PMR, la fibra grezza dal cartellino del mangime. Per quelle voci la % è calcolata sulla sostanza secca della sola parte che le contiene.{ssStimata && ' La sostanza secca del mangime non è sul cartellino: uso l’88%, valore tipico dei mangimi.'}</p>}
      </div>
    </section>
  )
}
