import { useMemo, useRef, useState } from 'react'
import { ClipboardList, FileUp, Loader2, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, Vuoto, conferma } from '../components/ui'
import { matricole } from '../lib/dairycomp'
import { fmt0, fmt1, fmt2, fmtData } from '../lib/format'
import { SOGLIE, indici, leggiControlli, normMatricola, vaccheDelControllo, type Indici, type VaccaApa } from '../lib/apa'

const pct = (v: number | null) => (v === null ? '—' : `${fmt0(v * 100)}%`)
const num = (v: number | null, d = 2) => (v === null ? '—' : d === 2 ? fmt2(v) : d === 1 ? fmt1(v) : fmt0(v))
type Tono = 'buono' | 'medio' | 'scarso' | null
const COLORE: Record<'buono' | 'medio' | 'scarso', string> = { buono: 'text-emerald-700', medio: 'text-arancio-700', scarso: 'text-rose-700' }

/** Righe del confronto: valore, giudizio e spiegazione in parole semplici. */
const RIGHE: { nome: string; spiega: string; v: (i: Indici) => number | null; fmt: (v: number | null) => string; tono: (v: number | null) => Tono }[] = [
  { nome: 'Vacche controllate', spiega: '', v: (i) => i.n, fmt: (v) => num(v, 0), tono: () => null },
  { nome: 'Latte medio (kg)', spiega: 'al controllo', v: (i) => i.kgMedio, fmt: (v) => num(v, 1), tono: () => null },
  { nome: 'Grasso %', spiega: 'pesato sul latte, come il latte di massa', v: (i) => i.grasso, fmt: (v) => num(v), tono: (v) => (v === null ? null : v >= 3.6 ? 'buono' : v >= 3.3 ? 'medio' : 'scarso') },
  { nome: 'Proteine %', spiega: '', v: (i) => i.proteine, fmt: (v) => num(v), tono: (v) => (v === null ? null : v >= 3.3 ? 'buono' : v >= 3.1 ? 'medio' : 'scarso') },
  { nome: 'Grasso / proteine', spiega: 'normale 1,1–1,4', v: (i) => i.gp, fmt: (v) => num(v), tono: (v) => (v === null ? null : v >= 1.1 && v <= 1.4 ? 'buono' : v >= 1.0 ? 'medio' : 'scarso') },
  { nome: 'Vacche con grasso sotto le proteine', spiega: 'segno di rumine acido: poca fibra', v: (i) => i.gpBassoPct, fmt: pct, tono: (v) => (v === null ? null : v <= 0.15 ? 'buono' : v <= 0.3 ? 'medio' : 'scarso') },
  { nome: 'Vacche con grasso/proteine sopra 1,4', spiega: 'rischio chetosi: dimagriscono troppo', v: (i) => i.gpAltoPct, fmt: pct, tono: (v) => (v === null ? null : v <= 0.1 ? 'buono' : v <= 0.2 ? 'medio' : 'scarso') },
  { nome: 'Cellule (migliaia/ml)', spiega: 'media come il latte di massa', v: (i) => i.cellule, fmt: (v) => num(v, 0), tono: (v) => (v === null ? null : v <= 150 ? 'buono' : v <= 250 ? 'medio' : 'scarso') },
  { nome: 'Vacche sopra 200.000 cellule', spiega: 'mastite subclinica', v: (i) => i.celluleAltePct, fmt: pct, tono: (v) => (v === null ? null : v <= 0.15 ? 'buono' : v <= 0.25 ? 'medio' : 'scarso') },
  { nome: 'Lattosio %', spiega: 'basso = mammella infiammata o stress', v: (i) => i.lattosio, fmt: (v) => num(v), tono: (v) => (v === null ? null : v >= 4.7 ? 'buono' : v >= 4.5 ? 'medio' : 'scarso') },
]

/** Controlli funzionali APA: per stalla, con le vacche da controllare. */
export default function ControlliApaPage() {
  const { dati, imposta } = useStore()
  const controlli = useMemo(() => [...dati.controlliApa].sort((a, b) => b.data.localeCompare(a.data)), [dati.controlliApa])
  const [scelto, setScelto] = useState<string | null>(null)
  const [stato, setStato] = useState<'' | 'lettura' | string>('')
  const [esito, setEsito] = useState('')
  const [filtro, setFiltro] = useState<number | 'tutte' | 'altre'>('tutte')
  const [ordine, setOrdine] = useState<'cellule' | 'gp' | 'kg' | 'vacca'>('cellule')
  const input = useRef<HTMLInputElement>(null)

  const c = controlli.find((x) => x.id === scelto) ?? controlli[0]
  const prima = c ? controlli[controlli.indexOf(c) + 1] : undefined

  // matricola → numero e gruppo, dalla lista Mandria (colonna MATR)
  const mandria = dati.mandriaDC[0]
  const perMatricola = useMemo(() => {
    const m = new Map<string, { vacca: string; gruppo: number | null; lattazione: number | null }>()
    const animale = new Map((mandria?.animali ?? []).map((a) => [a.id, a]))
    for (const [id, matr] of matricole(mandria)) m.set(normMatricola(matr), { vacca: id, gruppo: animale.get(id)?.gruppo ?? null, lattazione: animale.get(id)?.lattazione ?? null })
    return m
  }, [mandria])
  const stalle = useMemo(() => dati.stalle.filter((s) => s.gruppoDairyComp !== undefined).sort((a, b) => a.numero - b.numero), [dati.stalle])
  const stallaDelGruppo = (g: number | null) => stalle.find((s) => s.gruppoDairyComp === g)?.numero ?? null
  const vacche = useMemo(() => (c ? vaccheDelControllo(c, prima, perMatricola, stallaDelGruppo) : []), [c, prima, perMatricola, stalle]) // eslint-disable-line react-hooks/exhaustive-deps
  const vaccheprima = useMemo(() => (prima ? vaccheDelControllo(prima, undefined, perMatricola, stallaDelGruppo) : []), [prima, perMatricola, stalle]) // eslint-disable-line react-hooks/exhaustive-deps
  const collegate = vacche.filter((v) => v.vacca).length

  const carica = async (files: FileList | null) => {
    if (!files?.length) return
    setStato('lettura'); setEsito('')
    try {
      const nuovi = await leggiControlli([...files])
      const ids = new Set(nuovi.map((x) => x.id))
      imposta('controlliApa', [...dati.controlliApa.filter((x) => !ids.has(x.id)), ...nuovi])
      const piuRecente = [...nuovi].sort((a, b) => b.data.localeCompare(a.data))[0]
      setScelto(piuRecente.id)
      setEsito(`✓ ${nuovi.map((x) => `Controllo del ${fmtData(x.data)}: ${Object.keys(x.vacche).length} vacche`).join(' · ')}`)
      setStato('')
    } catch (e) {
      setStato((e as Error).message || 'Non riesco a leggere il file.')
    }
  }

  const caricatore = (
    <>
      <input ref={input} type="file" multiple accept=".zip,.txt" className="hidden" onChange={(e) => { void carica(e.target.files); e.target.value = '' }} />
      <button className="btn-primary" onClick={() => input.current?.click()} disabled={stato === 'lettura'}>
        {stato === 'lettura' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}Carica controllo APA
      </button>
    </>
  )

  if (!c) {
    return (
      <>
        <PageHeader titolo="Controlli funzionali APA" icona={ClipboardList} descrizione="Grasso, proteine, cellule e lattosio di ogni vacca, divisi per stalla" />
        <Vuoto>
          <p>Carica lo <b>zip</b> che ti manda l’APA (contiene CFAnalis e CFProduz) così com’è, oppure i due file .txt.</p>
          <div className="mt-4 flex justify-center">{caricatore}</div>
          {stato && stato !== 'lettura' && <p className="mt-3 text-sm text-red-600">{stato}</p>}
        </Vuoto>
      </>
    )
  }

  // gruppi da confrontare: le stalle, gli altri animali collegati, quelli senza numero
  const colonne: { k: string; nome: string; vs: VaccaApa[]; prima: VaccaApa[] }[] = [
    ...stalle.map((s) => ({ k: `s${s.numero}`, nome: `Stalla ${s.numero}`, vs: vacche.filter((v) => v.stalla === s.numero), prima: vaccheprima.filter((v) => v.stalla === s.numero) })),
    ...(vacche.some((v) => v.stalla === null) ? [{ k: 'altre', nome: collegate ? 'Altri / senza numero' : 'Senza numero', vs: vacche.filter((v) => v.stalla === null), prima: vaccheprima.filter((v) => v.stalla === null) }] : []),
    { k: 'tutte', nome: 'Mandria', vs: vacche, prima: vaccheprima },
  ].filter((x) => x.vs.length)
  const ind = colonne.map((x) => ({ ...x, i: indici(x.vs), ip: x.prima.length ? indici(x.prima) : null }))

  // vacche da controllare, per stalla
  const croniche = vacche.filter((v) => v.cellule !== null && v.cellule > SOGLIE.cellule && v.cellulePrima !== null && v.cellulePrima > SOGLIE.cellule)
  const nuove = vacche.filter((v) => v.cellule !== null && v.cellule > SOGLIE.cellule && (v.cellulePrima === null || v.cellulePrima <= SOGLIE.cellule))
  const guarite = vacche.filter((v) => v.cellule !== null && v.cellule <= SOGLIE.cellule && v.cellulePrima !== null && v.cellulePrima > SOGLIE.cellule)
  const gpMoltoBasso = vacche.filter((v) => v.gp !== null && v.gp < 0.9)
  const chetosi = vacche.filter((v) => v.gp !== null && v.gp > SOGLIE.gpAlto)
  const gruppiStalla: { nome: string; f: (v: VaccaApa) => boolean }[] = [
    ...stalle.map((s) => ({ nome: `Stalla ${s.numero}`, f: (v: VaccaApa) => v.stalla === s.numero })),
    { nome: collegate ? 'Altri / senza numero' : 'Senza numero', f: (v: VaccaApa) => v.stalla === null },
  ]
  const nomeV = (v: VaccaApa) => v.vacca ?? v.matricola.slice(-5)

  const elenco = vacche
    .filter((v) => (filtro === 'tutte' ? true : filtro === 'altre' ? v.stalla === null : v.stalla === filtro))
    .sort((a, b) => ordine === 'cellule' ? (b.cellule ?? -1) - (a.cellule ?? -1) : ordine === 'gp' ? (a.gp ?? 9) - (b.gp ?? 9) : ordine === 'kg' ? (b.kg ?? 0) - (a.kg ?? 0)
      : (a.vacca ?? 'zz').localeCompare(b.vacca ?? 'zz', 'it', { numeric: true }))

  return (
    <>
      <PageHeader titolo="Controlli funzionali APA" icona={ClipboardList} descrizione="Grasso, proteine, cellule e lattosio di ogni vacca, divisi per stalla"
        azioni={<div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={c.id} onChange={(e) => setScelto(e.target.value)} aria-label="Controllo">
            {controlli.map((x) => <option key={x.id} value={x.id}>Controllo del {fmtData(x.data)}</option>)}
          </select>
          {caricatore}
        </div>} />
      {esito && <p className="-mt-3 mb-4 text-sm text-emerald-700">{esito}</p>}
      {stato && stato !== 'lettura' && <p className="-mt-3 mb-4 text-sm text-red-600">{stato}</p>}

      {collegate < vacche.length * 0.8 && (
        <div className="mb-6 rounded-xl border border-arancio-200 bg-arancio-50/60 p-4 text-sm text-arancio-900">
          {collegate === 0
            ? <>Per dividere le vacche per stalla serve la <b>matricola</b>: carica in <b>Mandria</b> la lista di DairyComp con la colonna <b>MATR</b>. Intanto le vacche sono indicate con le ultime cifre della marca auricolare.</>
            : <>{vacche.length - collegate} vacche del controllo non hanno la matricola nella lista Mandria (forse vendute, o lista Mandria vecchia): compaiono come "senza numero".</>}
        </div>
      )}

      {/* ---- Confronto tra le stalle */}
      <section className="card">
        <h2>Confronto tra le stalle</h2>
        <p className="mt-0.5 text-xs text-stone-500">Controllo del {fmtData(c.data)}{prima ? `; tra parentesi il controllo del ${fmtData(prima.data)}` : ''}. Verde buono, arancio da migliorare, rosso da sistemare.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-3 text-left font-semibold">Indice</th>
              {ind.map((x) => <th key={x.k} className="px-2 text-right font-semibold">{x.nome}</th>)}
            </tr></thead>
            <tbody>
              {RIGHE.map((r) => (
                <tr key={r.nome} className="border-b border-stone-100 last:border-0 tabular-nums">
                  <td className="py-1.5 pr-3"><span className="text-stone-800">{r.nome}</span>{r.spiega && <span className="block text-[11px] text-stone-500">{r.spiega}</span>}</td>
                  {ind.map((x) => {
                    const v = r.v(x.i), t = r.tono(v), p = x.ip ? r.v(x.ip) : null
                    return <td key={x.k} className={`px-2 text-right font-semibold ${t ? COLORE[t] : 'text-stone-700'}`}>{r.fmt(v)}{p !== null && <span className="block text-[11px] font-normal text-stone-400">({r.fmt(p)})</span>}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Cellule per lattazione */}
      {vacche.some((v) => v.lattazione) && (() => {
        const cat = [
          { k: 'l1', nome: 'Primipare', f: (v: VaccaApa) => v.lattazione === 1 },
          { k: 'l2', nome: 'Secondipare', f: (v: VaccaApa) => v.lattazione === 2 },
          { k: 'l3', nome: '3ª lattazione e oltre', f: (v: VaccaApa) => (v.lattazione ?? 0) >= 3 },
          { k: 'tutte', nome: 'Mandria', f: (v: VaccaApa) => (v.lattazione ?? 0) >= 1 },
        ].map((x) => {
          const vs = vacche.filter(x.f), pv = vaccheprima.filter(x.f)
          const conta = (l: VaccaApa[]) => l.filter((v) => v.cellule !== null).length
          const quota = (l: VaccaApa[], soglia: number) => (conta(l) ? l.filter((v) => v.cellule !== null && v.cellule > soglia).length / conta(l) : null)
          return { ...x, vs, i: indici(vs), ip: pv.length ? indici(pv) : null, alte: quota(vs, SOGLIE.celluleAlte), altePrima: pv.length ? quota(pv, SOGLIE.celluleAlte) : null,
            croniche: croniche.filter(x.f).length, nuove: nuove.filter(x.f).length, guarite: guarite.filter(x.f).length }
        }).filter((x) => x.vs.length)
        const tonoCell = (v: number | null): Tono => (v === null ? null : v <= 150 ? 'buono' : v <= 250 ? 'medio' : 'scarso')
        const tonoQuota = (v: number | null, b: number, m: number): Tono => (v === null ? null : v <= b ? 'buono' : v <= m ? 'medio' : 'scarso')
        const righe: { nome: string; spiega?: string; val: (x: (typeof cat)[number]) => { v: string; t: Tono; p?: string } }[] = [
          { nome: 'Vacche controllate', val: (x) => ({ v: fmt0(x.i.n), t: null }) },
          { nome: 'Cellule (migliaia/ml)', spiega: 'media come il latte di massa', val: (x) => ({ v: num(x.i.cellule, 0), t: tonoCell(x.i.cellule), p: x.ip ? num(x.ip.cellule, 0) : undefined }) },
          { nome: 'Vacche sopra 200.000', spiega: 'mastite subclinica', val: (x) => ({ v: pct(x.i.celluleAltePct), t: tonoQuota(x.i.celluleAltePct, 0.15, 0.25), p: x.ip ? pct(x.ip.celluleAltePct) : undefined }) },
          { nome: 'Vacche sopra 400.000', val: (x) => ({ v: pct(x.alte), t: tonoQuota(x.alte, 0.05, 0.12), p: x.altePrima !== null ? pct(x.altePrima) : undefined }) },
          ...(prima ? [
            { nome: 'Mastiti croniche', spiega: 'sopra 200.000 in tutti e due i controlli', val: (x: (typeof cat)[number]) => ({ v: fmt0(x.croniche), t: null }) },
            { nome: 'Nuove infezioni', spiega: 'sopra 200.000, prima no', val: (x: (typeof cat)[number]) => ({ v: fmt0(x.nuove), t: null }) },
            { nome: 'Guarite', spiega: 'tornate sotto 200.000', val: (x: (typeof cat)[number]) => ({ v: fmt0(x.guarite), t: null }) },
          ] : []),
          { nome: 'Lattosio %', val: (x) => ({ v: num(x.i.lattosio), t: x.i.lattosio === null ? null : x.i.lattosio >= 4.7 ? 'buono' : x.i.lattosio >= 4.5 ? 'medio' : 'scarso', p: x.ip ? num(x.ip.lattosio) : undefined }) },
        ]
        return (
          <section className="card mt-6">
            <h2>Cellule per lattazione</h2>
            <p className="mt-0.5 text-xs text-stone-500">Tutte le stalle insieme, lattazione dalla lista Mandria{prima ? `; tra parentesi il controllo del ${fmtData(prima.data)}` : ''}.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-3 text-left font-semibold">Indice</th>
                  {cat.map((x) => <th key={x.k} className="px-2 text-right font-semibold">{x.nome}</th>)}
                </tr></thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r.nome} className="border-b border-stone-100 last:border-0 tabular-nums">
                      <td className="py-1.5 pr-3"><span className="text-stone-800">{r.nome}</span>{r.spiega && <span className="block text-[11px] text-stone-500">{r.spiega}</span>}</td>
                      {cat.map((x) => { const o = r.val(x); return <td key={x.k} className={`px-2 text-right font-semibold ${o.t ? COLORE[o.t] : 'text-stone-700'}`}>{o.v}{o.p !== undefined && <span className="block text-[11px] font-normal text-stone-400">({o.p})</span>}</td> })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })()}

      {/* ---- Vacche da controllare per stalla */}
      <h2 className="mb-3 mt-8">Vacche da controllare</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {gruppiStalla.map((g) => {
          const liste = [
            { nome: 'Mastite cronica', spiega: 'sopra 200.000 cellule in tutti e due gli ultimi controlli', tono: 'text-rose-700', el: croniche.filter(g.f).sort((a, b) => b.cellule! - a.cellule!), val: (v: VaccaApa) => `${fmt0(v.cellule!)}` },
            { nome: 'Nuove infezioni', spiega: 'sopra 200.000 cellule, prima no', tono: 'text-arancio-700', el: nuove.filter(g.f).sort((a, b) => b.cellule! - a.cellule!), val: (v: VaccaApa) => `${fmt0(v.cellule!)}` },
            { nome: 'Grasso molto sotto le proteine', spiega: 'grasso/proteine sotto 0,9: rumine acido', tono: 'text-sky-700', el: gpMoltoBasso.filter(g.f).sort((a, b) => a.gp! - b.gp!), val: (v: VaccaApa) => fmt2(v.gp!) },
            { nome: 'Rischio chetosi', spiega: 'grasso/proteine sopra 1,4', tono: 'text-violet-700', el: chetosi.filter(g.f).sort((a, b) => b.gp! - a.gp!), val: (v: VaccaApa) => fmt2(v.gp!) },
          ]
          if (!liste.some((l) => l.el.length)) return null
          return (
            <section key={g.nome} className="card">
              <h3 className="font-semibold text-stone-900">{g.nome}</h3>
              <ul className="mt-2 space-y-3">
                {liste.filter((l) => l.el.length).map((l) => (
                  <li key={l.nome}>
                    <div className="text-sm"><b className={l.tono}>{l.nome} ({l.el.length})</b> <span className="text-xs text-stone-500">· {l.spiega}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {l.el.map((v) => <span key={v.matricola} title={v.matricola} className="inline-flex items-baseline gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-sm tabular-nums"><b>{nomeV(v)}</b><span className="text-xs text-stone-500">{l.val(v)}</span></span>)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      {prima && <p className="mt-2 text-xs text-stone-500">Rispetto al controllo del {fmtData(prima.data)}: {guarite.length} vacche sono tornate sotto 200.000 cellule.</p>}

      {/* ---- Andamento */}
      {controlli.length > 1 && (
        <section className="card mt-8">
          <h2>Andamento della mandria</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-3">Controllo</th><th className="px-2 text-right">Vacche</th><th className="px-2 text-right">Grasso</th><th className="px-2 text-right">Proteine</th><th className="px-2 text-right">Grasso sotto proteine</th><th className="px-2 text-right">Cellule</th><th className="pl-2 text-right">Sopra 200.000</th>
              </tr></thead>
              <tbody>
                {controlli.map((x) => {
                  const i = indici(vaccheDelControllo(x, undefined, perMatricola, stallaDelGruppo))
                  return (
                    <tr key={x.id} className={`border-b border-stone-100 last:border-0 tabular-nums ${x.id === c.id ? 'bg-brand-50/60' : ''}`}>
                      <td className="py-1.5 pr-3">{fmtData(x.data)}</td><td className="px-2 text-right">{i.n}</td>
                      <td className="px-2 text-right">{num(i.grasso)}%</td><td className="px-2 text-right">{num(i.proteine)}%</td>
                      <td className="px-2 text-right">{pct(i.gpBassoPct)}</td><td className="px-2 text-right">{num(i.cellule, 0)}</td><td className="pl-2 text-right">{pct(i.celluleAltePct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- Tutte le vacche */}
      <section className="card mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Tutte le vacche <span className="text-base font-normal text-stone-500">({elenco.length})</span></h2>
          <div className="flex flex-wrap gap-2">
            {[{ k: 'tutte' as const, n: 'Tutte' }, ...stalle.map((s) => ({ k: s.numero, n: `Stalla ${s.numero}` })), { k: 'altre' as const, n: 'Altre' }].map((x) => (
              <button key={String(x.k)} type="button" onClick={() => setFiltro(x.k)} aria-pressed={filtro === x.k}
                className={`rounded-full border px-3 py-1 text-sm ${filtro === x.k ? 'border-brand-700 bg-brand-700 text-white' : 'border-stone-300 bg-white text-stone-600'}`}>{x.n}</button>
            ))}
            <select className="input !w-auto py-1 text-sm" value={ordine} onChange={(e) => setOrdine(e.target.value as typeof ordine)} aria-label="Ordina per">
              <option value="cellule">Cellule più alte</option><option value="gp">Grasso/proteine più basso</option><option value="kg">Più latte</option><option value="vacca">Numero vacca</option>
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Vacca</th><th>Matricola</th><th>Stalla</th><th className="text-right">Latte kg</th><th className="text-right">Grasso</th><th className="text-right">Proteine</th><th className="text-right">G/P</th><th className="text-right">Cellule</th><th className="text-right">Lattosio</th></tr></thead>
            <tbody>
              {elenco.map((v) => {
                const cellAlte = v.cellule !== null && v.cellule > SOGLIE.cellule
                return (
                  <tr key={v.matricola}>
                    <td className="font-semibold">{v.vacca ?? '—'}</td>
                    <td className="tabular-nums text-stone-500">{v.matricola}</td>
                    <td>{v.stalla ?? (v.gruppo !== null ? `gr. ${v.gruppo}` : '—')}</td>
                    <td className="text-right tabular-nums">{num(v.kg, 1)}</td>
                    <td className="text-right tabular-nums">{num(v.grasso)}</td>
                    <td className="text-right tabular-nums">{num(v.proteine)}</td>
                    <td className={`text-right font-semibold tabular-nums ${v.gp === null ? '' : v.gp < SOGLIE.gpBasso ? 'text-sky-700' : v.gp > SOGLIE.gpAlto ? 'text-violet-700' : 'text-stone-700'}`}>{num(v.gp)}</td>
                    <td className={`text-right tabular-nums ${cellAlte ? 'font-semibold text-rose-700' : ''}`}>{num(v.cellule, 0)}{v.cellulePrima !== null && <span className="ml-1 text-[11px] font-normal text-stone-400">({fmt0(v.cellulePrima)})</span>}</td>
                    <td className={`text-right tabular-nums ${v.lattosio !== null && v.lattosio < SOGLIE.lattosio ? 'font-semibold text-arancio-700' : ''}`}>{num(v.lattosio)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 text-sm text-stone-600">
        <h2>Come leggere i valori</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Grasso/proteine sotto 1</b>: il grasso è sceso sotto le proteine. Di solito il rumine è troppo acido: poca fibra lunga, troppi amidi o zuccheri.</li>
          <li><b>Grasso/proteine sopra 1,4</b>, soprattutto nelle fresche: la vacca usa il grasso corporeo, rischio chetosi.</li>
          <li><b>Cellule sopra 200.000</b>: mastite subclinica. Se resta alta in due controlli di seguito è cronica; tra parentesi il controllo precedente.</li>
          <li><b>Lattosio sotto 4,6%</b>: mammella infiammata o vacca sotto stress.</li>
        </ul>
        <button className="mt-4 inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600" onClick={() => { if (conferma(`Eliminare il controllo del ${fmtData(c.data)}?`)) { imposta('controlliApa', dati.controlliApa.filter((x) => x.id !== c.id)); setScelto(null) } }}>
          <Trash2 className="h-3.5 w-3.5" />Elimina questo controllo
        </button>
      </section>
    </>
  )
}
