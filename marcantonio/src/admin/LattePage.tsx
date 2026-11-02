import { useMemo, useState } from 'react'
import { applicaGruppiRobot } from '../lib/gruppi'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { useStore } from '../lib/store'
import type { AnimaleDC } from '../lib/types'
import { PageHeader, StatTile, Vuoto, conferma } from '../components/ui'
import BarChart from '../components/BarChart'
import ImportDairyComp from '../components/ImportDairyComp'
import { FASI, etichettaColonna, faseDi, inLattazione as lattante, perGruppo, riepilogo, type Riepilogo } from '../lib/dairycomp'
import { fmt0, fmt1, fmt2, fmtData } from '../lib/format'

type Ordine = { col: string; giu: boolean }

const n1 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : fmt1(v))
const n2 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : fmt2(v))
const n0 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : fmt0(v))

function Variazione({ ora, prima, unita = '', decimali = 1 }: { ora: number | null; prima: number | null | undefined; unita?: string; decimali?: number }) {
  if (ora === null || prima === null || prima === undefined) return null
  const d = ora - prima
  if (Math.abs(d) < 10 ** -decimali / 2) return <span className="text-stone-500">= rispetto ai dati precedenti</span>
  return <span>{d > 0 ? '▲' : '▼'} {decimali ? fmt1(Math.abs(d)) : fmt0(Math.abs(d))}{unita} rispetto ai dati precedenti</span>
}

export default function LattePage() {
  const { dati, elimina } = useStore()
  const imports = useMemo(() => [...dati.importDC].sort((a, b) => b.data.localeCompare(a.data)), [dati.importDC])
  const [selezionato, setSelezionato] = useState<string | null>(null)
  const [importa, setImporta] = useState(false)
  const [gruppoFiltro, setGruppoFiltro] = useState<number | null | 'tutti'>('tutti')
  const [gruppoTrend, setGruppoTrend] = useState<number | 'mandria'>('mandria')
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<Ordine>({ col: 'latte', giu: true })

  const corrente = imports.find((i) => i.id === selezionato) ?? imports[0]
  const precedente = corrente ? imports[imports.indexOf(corrente) + 1] : undefined
  const stallaDi = (g: number | null) => dati.stalle.find((s) => s.gruppoDairyComp !== undefined && s.gruppoDairyComp === g)

  if (!corrente) {
    return (
      <>
        <PageHeader titolo="Latte" descrizione="Gruppi e intera mandria, dai dati di DairyComp" />
        <Vuoto>
          <p>Non ci sono ancora dati di DairyComp.</p>
          <button className="btn-primary mt-4" onClick={() => setImporta(true)}><Upload className="h-4 w-4" />Importa da DairyComp</button>
        </Vuoto>
        {importa && <ImportDairyComp onChiudi={() => setImporta(false)} onImportato={(id) => { setImporta(false); setSelezionato(id) }} />}
      </>
    )
  }

  // Latte dai robot e gruppo effettivo: comanda il robot che munge la vacca
  const { animali: animaliTutti, incoerenze, giorniRobot, latteDaiRobot } = applicaGruppiRobot(corrente.animali, dati.robotVacche, dati.robotGiorni, dati.stalle, corrente.data)
  const nonInLattazione = corrente.animali.filter((a) => !lattante(a))
  const perStato = [...nonInLattazione.reduce((m, a) => m.set(a.codiceRiproduttivo ?? '—', (m.get(a.codiceRiproduttivo ?? '—') ?? 0) + 1), new Map<string, number>())]

  const inLattazione = (a: AnimaleDC[]) => a.filter(lattante)
  const haDim = animaliTutti.some((a) => a.dim !== null)
  const statiRipro = [...new Set(animaliTutti.map((a) => a.codiceRiproduttivo).filter((x): x is string => !!x))].sort()
  const mandria = riepilogo(inLattazione(animaliTutti))
  const mandriaPrima = precedente ? riepilogo(inLattazione(precedente.animali)) : undefined
  const asciutte = animaliTutti.filter((a) => /^ASC/i.test(a.codiceRiproduttivo ?? '')).length
  const gruppi = perGruppo(animaliTutti).map(([g, a]) => {
    const latt = a.filter(lattante)
    return { g, r: riepilogo(latt.length ? latt : a), animali: latt, soloAsciutte: latt.length === 0, totale: a.length }
  })
  // robot dei soli gruppi presenti nel file (con vacche in lattazione)
  const gruppiNelFile = new Set(inLattazione(animaliTutti).map((a) => a.gruppo))
  const robotTotali = dati.stalle.filter((x) => x.gruppoDairyComp !== undefined && gruppiNelFile.has(x.gruppoDairyComp)).reduce((s, x) => s + (x.robot?.numero ?? 0), 0)
  const maxLatte = Math.max(1, ...gruppi.map((x) => x.r.latteMedio ?? 0))
  const extraChiavi = Object.keys(mandria.extra)
  const haGrasso = mandria.grasso !== null, haProt = mandria.proteine !== null, haCell = mandria.cellule !== null

  // andamento nel tempo (dal più vecchio)
  const trend = [...imports].reverse().map((i) => {
    const a = inLattazione(i.animali).filter((x) => gruppoTrend === 'mandria' || x.gruppo === gruppoTrend)
    return { data: i.data, r: riepilogo(a) }
  })

  // elenco vacche
  const valoreCol = (a: AnimaleDC, col: string): number | string | null => {
    if (col in a) return (a as unknown as Record<string, number | string | null>)[col] ?? null
    return a.extra?.[col] ?? null
  }
  const elenco = animaliTutti
    .filter((a) => gruppoFiltro === 'tutti' || a.gruppo === gruppoFiltro)
    .filter((a) => a.id.toLowerCase().includes(cerca.toLowerCase()))
    .sort((a, b) => {
      const x = valoreCol(a, ordine.col), y = valoreCol(b, ordine.col)
      if (x === null) return 1
      if (y === null) return -1
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'it', { numeric: true })
      return ordine.giu ? -c : c
    })
  const intest = (col: string, label: string, num = true) => (
    <th className={num ? 'num' : ''}>
      <button className="uppercase hover:text-stone-800" onClick={() => setOrdine({ col, giu: ordine.col === col ? !ordine.giu : true })}>
        {label}{ordine.col === col ? (ordine.giu ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  )

  const rigaRiepilogo = (r: Riepilogo) => (
    <>
      <td className="num">{r.capi}</td>
      <td className="num">{n0(r.dimMedio)}</td>
      <td className="num">
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-stone-100 sm:block">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${((r.latteMedio ?? 0) / maxLatte) * 100}%` }} />
          </div>
          <b>{n1(r.latteMedio)}</b>
        </div>
      </td>
      <td className="num">{r.latteTotale ? fmt0(r.latteTotale) : '—'}</td>
      <td className="num">{r.capi && r.lattazioneMedia !== null ? `${fmt0((r.primipare / r.capi) * 100)}%` : '—'}</td>
      {haGrasso && <td className="num">{n2(r.grasso)}</td>}
      {haProt && <td className="num">{n2(r.proteine)}</td>}
      {haCell && <td className="num">{n0(r.cellule)}</td>}
      {extraChiavi.map((k) => <td key={k} className="num">{r.extra[k] !== undefined ? fmt1(r.extra[k]) : '—'}</td>)}
    </>
  )

  return (
    <>
      <PageHeader titolo="Latte" descrizione="Gruppi e intera mandria, dai dati di DairyComp"
        azioni={<button className="btn-primary" onClick={() => setImporta(true)}><Upload className="h-4 w-4" />Importa da DairyComp</button>} />

      {/* Dati di riferimento */}
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 whitespace-nowrap">Dati del
          <select className="input w-auto py-1.5" value={corrente.id} onChange={(e) => setSelezionato(e.target.value)}>
            {imports.map((i) => <option key={i.id} value={i.id}>{fmtData(i.data)}</option>)}
          </select>
        </label>
        <span className="min-w-0 break-all text-stone-500">{corrente.nomeFile}</span>
        <button className="btn-danger-link ml-auto" onClick={() => { if (conferma(`Eliminare i dati DairyComp del ${fmtData(corrente.data)}?`)) { elimina('importDC', corrente.id); setSelezionato(null) } }}>Elimina questi dati</button>
      </div>

      {/* Intera mandria */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta="Vacche in lattazione" valore={fmt0(mandria.capi)} unita="capi" nota={[asciutte ? `${asciutte} asciutte` : '', mandria.lattazioneMedia !== null ? `${fmt0(mandria.primipare)} primipare` : ''].filter(Boolean).join(' · ') || 'nel file importato'} />
        <StatTile etichetta="DIM medio" valore={n0(mandria.dimMedio)} unita="giorni" nota={<Variazione ora={mandria.dimMedio} prima={mandriaPrima?.dimMedio} unita=" gg" decimali={0} />} />
        <StatTile etichetta="Latte medio per capo" valore={n1(mandria.latteMedio)} unita="kg/giorno"
          nota={latteDaiRobot ? `dai robot, media dal ${fmtData(giorniRobot[0])} al ${fmtData(giorniRobot[giorniRobot.length - 1])}` : <Variazione ora={mandria.latteMedio} prima={mandriaPrima?.latteMedio} unita=" kg" />} />
        <StatTile etichetta="Latte della mandria" valore={fmt0(mandria.latteTotale)} unita="kg/giorno"
          nota={haGrasso || haProt ? `Grasso ${n2(mandria.grasso)}% · Proteine ${n2(mandria.proteine)}%` : undefined} />
      </div>

      {/* Per gruppo */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 pb-2">
          <h2 className="font-semibold">Per gruppo</h2>
          <span className="text-xs text-stone-500">Clicca un gruppo per vederne le vacche</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Gruppo</th><th>Robot</th><th className="num">Vacche/robot</th><th className="num">Latte/robot (kg)</th><th className="num">Capi</th><th className="num">DIM medio</th><th className="num">Latte medio (kg/capo)</th>
              <th className="num">Latte totale (kg)</th><th className="num">Primipare</th>
              {haGrasso && <th className="num">Grasso %</th>}{haProt && <th className="num">Proteine %</th>}{haCell && <th className="num">Cellule (×1000)</th>}
              {extraChiavi.map((k) => <th key={k} className="num">{etichettaColonna(k)}</th>)}
            </tr>
          </thead>
          <tbody>
            {gruppi.filter((x) => !x.soloAsciutte).map(({ g, r, soloAsciutte, totale }) => {
              const st = stallaDi(g)
              return (
                <tr key={String(g)} className={`cursor-pointer ${gruppoFiltro === g ? 'bg-brand-50' : ''}`} onClick={() => setGruppoFiltro(gruppoFiltro === g ? 'tutti' : g)}>
                  <td className="whitespace-nowrap"><b>Gruppo {g ?? '—'}</b>{st ? <span className="ml-2 rounded-full bg-arancio-100 px-2 py-0.5 text-xs text-arancio-800">Stalla {st.numero}</span> : soloAsciutte ? null : totale > r.capi ? <span className="ml-2 text-xs text-stone-400">+{totale - r.capi} non in lattazione</span> : null}</td>
                  <td className="whitespace-nowrap text-stone-600">{st?.robot ? `${st.robot.numero} × ${st.robot.marca}` : '—'}</td>
                  <td className="num">{st?.robot ? fmt0(r.capi / st.robot.numero) : '—'}</td>
                  <td className="num">{st?.robot && r.latteTotale ? fmt0(r.latteTotale / st.robot.numero) : '—'}</td>
                  {rigaRiepilogo(r)}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-stone-50 font-semibold">
              <td className="px-3 py-2">Intera mandria <span className="text-xs font-normal text-stone-500">(in lattazione)</span></td>
              <td className="px-3 py-2 font-normal text-stone-600">{robotTotali ? `${robotTotali} robot` : '—'}</td>
              <td className="num px-3 py-2">{robotTotali ? fmt0(mandria.capi / robotTotali) : '—'}</td>
              <td className="num px-3 py-2">{robotTotali ? fmt0(mandria.latteTotale / robotTotali) : '—'}</td>
              {rigaRiepilogo(mandria)}
            </tr>
          </tfoot>
        </table>
      </section>

      {nonInLattazione.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          Non in lattazione e non conteggiati: {perStato.map(([st, n]) => `${n} ${st.toLowerCase()}`).join(', ')}.
        </p>
      )}

      {incoerenze.length > 0 && (
        <section className="card mt-6 ring-1 ring-amber-200">
          <h2 className="font-semibold text-amber-900">! {incoerenze.length} vacche da sistemare in DairyComp</h2>
          <p className="mt-1 text-sm text-stone-600">Sono munte dal robot di un gruppo ma in DairyComp risultano in un altro. Qui vengono già conteggiate nel gruppo del robot: aggiorna il gruppo in DairyComp e alla prossima importazione l'avviso sparisce.</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {incoerenze.map((x) => (
              <li key={x.vacca} className="rounded-full bg-amber-50 px-3 py-1 text-amber-900 ring-1 ring-inset ring-amber-200">
                <b>{x.vacca}</b>: gruppo {x.gruppoDairyComp ?? '—'} → <b>{x.gruppoRobot}</b> <span className="text-amber-700">(robot {x.robot})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
        {/* Fasi di lattazione */}
        <section className="card">
          <h2 className="font-semibold">Fasi di lattazione</h2>
          {!haDim ? (
            <p className="mt-2 text-sm text-stone-500">Il file non contiene i giorni di lattazione (DIM): aggiungi la colonna DIM alla lista di DairyComp per vedere le fasi.</p>
          ) : (<>
          <p className="mt-1 text-xs text-stone-500">Numero di vacche per giorni di lattazione (DIM)</p>
          <table className="table mt-3">
            <thead><tr><th>Gruppo</th>{FASI.map((f) => <th key={f.nome} className="num">{f.nome}<span className="block font-normal normal-case text-stone-400">{f.a === Infinity ? `> ${f.da - 1}` : `${f.da}–${f.a}`} gg</span></th>)}</tr></thead>
            <tbody>
              {gruppi.filter((x) => !x.soloAsciutte && x.r.dimMedio !== null).map(({ g, animali }) => (
                <tr key={String(g)}>
                  <td>Gruppo {g ?? '—'}</td>
                  {FASI.map((f) => <td key={f.nome} className="num">{animali.filter((a) => faseDi(a.dim) === f.nome).length || '·'}</td>)}
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Mandria</td>
                {FASI.map((f) => <td key={f.nome} className="num">{inLattazione(animaliTutti).filter((a) => faseDi(a.dim) === f.nome).length}</td>)}
              </tr>
              <tr className="text-xs text-stone-500">
                <td>kg/capo</td>
                {FASI.map((f) => <td key={f.nome} className="num">{n1(riepilogo(inLattazione(animaliTutti).filter((a) => faseDi(a.dim) === f.nome)).latteMedio)}</td>)}
              </tr>
            </tbody>
          </table>
          </>)}
        </section>

        {/* Stato riproduttivo */}
        {statiRipro.length > 0 && (
          <section className="card overflow-x-auto">
            <h2 className="font-semibold">Stato riproduttivo</h2>
            <p className="mt-1 text-xs text-stone-500">Numero di vacche e latte medio per stato, come riportato da DairyComp</p>
            <table className="table mt-3">
              <thead><tr><th>Stato</th>{gruppi.filter((x) => !x.soloAsciutte).map((x) => <th key={String(x.g)} className="num">Gr. {x.g ?? '—'}</th>)}<th className="num">Mandria</th><th className="num">kg/capo</th></tr></thead>
              <tbody>
                {statiRipro.map((st) => {
                  const tutte = animaliTutti.filter((a) => a.codiceRiproduttivo === st)
                  return (
                    <tr key={st}>
                      <td className="whitespace-nowrap font-medium">{st}</td>
                      {gruppi.filter((x) => !x.soloAsciutte).map((x) => <td key={String(x.g)} className="num">{x.animali.filter((a) => a.codiceRiproduttivo === st).length || '·'}</td>)}
                      <td className="num font-semibold">{tutte.length} <span className="font-normal text-stone-400">({fmt0((tutte.length / animaliTutti.length) * 100)}%)</span></td>
                      <td className="num">{n1(riepilogo(tutte).latteMedio)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
        </div>

        {/* Andamento */}
        <section className="card xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Latte medio per capo nel tempo</h2>
            <div className="flex flex-wrap gap-1">
              {(['mandria', ...gruppi.filter((x) => !x.soloAsciutte).map((x) => x.g)] as (number | 'mandria' | null)[]).filter((x) => x !== null).map((x) => (
                <button key={String(x)} onClick={() => setGruppoTrend(x as number | 'mandria')}
                  className={`rounded-full px-3 py-1 text-sm ${gruppoTrend === x ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
                  {x === 'mandria' ? 'Mandria' : `Gr. ${x}`}
                </button>
              ))}
            </div>
          </div>
          {trend.length < 2 ? <p className="mt-6 text-sm text-stone-500">L'andamento compare dopo almeno due importazioni.</p> : (
            <div className="mt-4">
              <BarChart unita="kg/capo" formatta={(n) => fmt1(n)}
                dati={trend.map((t) => ({ etichetta: fmtData(t.data).slice(0, 5), valore: t.r.latteMedio ?? 0, dettaglio: `${fmtData(t.data)} · ${t.r.capi} capi · DIM ${n0(t.r.dimMedio)}` }))} />
            </div>
          )}
        </section>
      </div>

      {/* Elenco vacche */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
          <h2 className="font-semibold">Vacche {gruppoFiltro !== 'tutti' && <>del gruppo {gruppoFiltro ?? '—'}</>} <span className="font-normal text-stone-500">({elenco.length})</span></h2>
          {gruppoFiltro !== 'tutti' && <button className="btn-link" onClick={() => setGruppoFiltro('tutti')}>Mostra tutte</button>}
          <input className="input ml-auto w-48" placeholder="Cerca numero…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </div>
        <table className="table">
          <thead>
            <tr>
              {intest('id', 'Vacca', false)}{intest('gruppo', 'Gruppo')}{intest('lattazione', 'Latt.')}{intest('dim', 'DIM')}<th>Fase</th>{intest('latte', 'Latte kg')}
              {haGrasso && intest('grasso', 'Grasso %')}{haProt && intest('proteine', 'Prot. %')}{haCell && intest('cellule', 'Cellule')}
              {intest('codiceRiproduttivo', 'Stato rip.', false)}{intest('giorniGravidanza', 'DCC')}
              {extraChiavi.map((k) => <th key={k} className="num">{etichettaColonna(k)}</th>)}
            </tr>
          </thead>
          <tbody>
            {elenco.slice(0, 300).map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.id}</td>
                <td className="num">{a.gruppo ?? '—'}</td>
                <td className="num">{a.lattazione ?? '—'}</td>
                <td className="num">{a.dim ?? '—'}</td>
                <td className="text-xs text-stone-500">{!lattante(a) ? 'asciutta' : faseDi(a.dim) ?? '—'}</td>
                <td className="num font-semibold">{n1(a.latte)}</td>
                {haGrasso && <td className="num">{n2(a.grasso)}</td>}
                {haProt && <td className="num">{n2(a.proteine)}</td>}
                {haCell && <td className="num">{n0(a.cellule)}</td>}
                <td className="whitespace-nowrap text-xs">{a.codiceRiproduttivo ?? '—'}</td>
                <td className="num">{a.giorniGravidanza || '—'}</td>
                {extraChiavi.map((k) => <td key={k} className="num">{a.extra?.[k] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-xs text-stone-500">
        Medie di gruppo e mandria calcolate sulle vacche in lattazione; grasso e proteine ponderati sul latte, cellule come media geometrica.
        Le mungiture giornaliere della sala restano in <Link to="/area-riservata/produzione" className="text-brand-700 hover:underline">Mungiture</Link>.
      </p>

      {importa && <ImportDairyComp onChiudi={() => setImporta(false)} onImportato={(id) => { setImporta(false); setSelezionato(id) }} />}
    </>
  )
}
