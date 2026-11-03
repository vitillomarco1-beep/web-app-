import { useState, type FormEvent } from 'react'
import { Euro, Milk, Pencil, Plus, Scale, Trash2, TrendingDown, TrendingUp, Wheat, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CategoriaRazione, Ingrediente, Razione } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile, Vuoto } from '../components/ui'
import { CATEGORIE, calcolaMargine, costoRazione, nomeCategoria, settimaneConDati } from '../lib/margine'
import { KG_PER_LITRO } from '../lib/salute'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, nuovoId } from '../lib/format'
import { GRUPPI_PREDEFINITI } from '../lib/dairycomp'

type Scheda = 'lattazione' | 'aziendale' | 'razioni'
const num = (s: string) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const eur0 = (n: number) => `${fmt0(n)} €`
const segno = (n: number) => (n >= 0 ? 'text-emerald-700' : 'text-rose-700')

/** Margine sul costo alimentare: lattazione (solo le sue razioni) e aziendale (tutte le razioni). */
export default function MarginePage() {
  const { dati } = useStore()
  const settimane = settimaneConDati(dati)
  const [scheda, setScheda] = useState<Scheda>(dati.razioni.length ? 'lattazione' : 'razioni')
  const [sett, setSett] = useState(settimane[0] ?? '')
  const m = sett ? calcolaMargine(dati, sett) : null

  const schede: { id: Scheda; nome: string }[] = [
    { id: 'lattazione', nome: 'Margine lattazione' },
    { id: 'aziendale', nome: 'Margine aziendale' },
    { id: 'razioni', nome: 'Razioni e prezzi' },
  ]

  return (
    <>
      <PageHeader titolo="Margine" icona={Euro} descrizione="Ricavo del latte al netto dei costi alimentari"
        azioni={scheda !== 'razioni' && settimane.length > 0 && (
          <select className="input !w-auto" value={sett} onChange={(e) => setSett(e.target.value)} aria-label="Settimana">
            {settimane.map((s) => <option key={s} value={s}>Settimana {fmtData(s)} – {fmtData(aggiungiGiorni(s, 6))}</option>)}
          </select>
        )} />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
        {schede.map((s) => (
          <button key={s.id} onClick={() => setScheda(s.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${scheda === s.id ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{s.nome}</button>
        ))}
      </div>

      {scheda === 'razioni' ? <RazioniPrezzi /> : !m ? (
        <Vuoto><p>Per calcolare il margine servono i dati dei robot: caricali in <b>Carica la settimana</b>.</p></Vuoto>
      ) : !dati.razioni.length ? (
        <Vuoto>
          <p>Inserisci le razioni e i prezzi degli alimenti per calcolare il margine.</p>
          <button className="btn-primary mt-4" onClick={() => setScheda('razioni')}><Wheat className="h-4 w-4" />Razioni e prezzi</button>
        </Vuoto>
      ) : scheda === 'lattazione' ? <Lattazione m={m} /> : <Aziendale m={m} />}
    </>
  )
}

type M = ReturnType<typeof calcolaMargine>

function Avvisi({ m, tutte }: { m: M; tutte?: boolean }) {
  const { dati } = useStore()
  const msg: string[] = []
  m.stalle.filter((s) => s.fonteRazione === 'mancante').forEach((s) => msg.push(`Manca la razione di lattazione del gruppo ${s.gruppo} (stalla ${s.stalla}).`))
  const senza = [...m.stalle.filter((s) => s.senzaPrezzo).map((s) => s.razione?.nome), ...(tutte ? m.altre.filter((a) => a.senzaPrezzo).map((a) => a.razione.nome) : [])].filter(Boolean)
  if (senza.length) msg.push(`Alimenti senza prezzo in: ${senza.join(', ')} (contati a 0 €).`)
  if (tutte && !dati.mandriaDC.length && m.altre.length) msg.push('Per contare asciutte, close up e manze carica la lista completa in Mandria.')
  if (tutte && !m.altre.length) msg.push('Non hai ancora inserito razioni di asciutta, close up o manze.')
  m.stalle.filter((s) => s.fonteRazione === 'pesate' && s.kgRazioneCapo && s.kgDistribuitiCapo !== null && Math.abs(s.kgDistribuitiCapo / s.kgRazioneCapo - 1) > 0.2)
    .forEach((s) => msg.push(`Gruppo ${s.gruppo}: dalle pesate del carro risultano ${fmt1(s.kgDistribuitiCapo!)} kg per vacca, la razione ne prevede ${fmt1(s.kgRazioneCapo!)}. Controlla le pesate della settimana o i capi della razione: il costo è calcolato sui kg pesati.`))
  if (m.giorni.length < 7) msg.push(`La settimana ha ${m.giorni.length} giorni completi di dati robot: le cifre sono medie su quei giorni.`)
  if (!msg.length) return null
  return <div className="mb-6 rounded-xl border border-arancio-200 bg-arancio-50/60 p-4 text-sm text-arancio-900"><ul className="list-disc space-y-1 pl-5">{msg.map((x) => <li key={x}>{x}</li>)}</ul></div>
}

function Lattazione({ m }: { m: M }) {
  const t = m.lattazione
  const litri = t.kgLatte / KG_PER_LITRO
  return (
    <>
      <Avvisi m={m} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icona={TrendingUp} tono="verde" etichetta="Margine per vacca al giorno" valore={t.capi ? fmtEur(t.margine / t.capi) : '—'} nota={`${eur0(t.margine)} al giorno in tutto`} />
        <StatTile icona={Milk} tono="brand" etichetta="Ricavo latte per vacca" valore={t.capi ? fmtEur(t.ricavo / t.capi) : '—'} nota={`${fmt1(t.capi ? t.kgLatte / t.capi : 0)} kg · ${fmt2(m.prezzoLatte)} €/l`} />
        <StatTile icona={Wheat} tono="arancio" etichetta="Costo alimentare per vacca" valore={t.capi ? fmtEur(t.costo / t.capi) : '—'} nota={`${fmt0(t.capi)} vacche munte`} />
        <StatTile icona={Scale} tono="rosso" etichetta="Costo alimentare per litro" valore={litri ? `${fmt2(t.costo / litri)} €` : '—'} nota={`${t.ricavo ? fmt0((t.costo / t.ricavo) * 100) : 0}% del ricavo`} />
      </div>

      <div className="card mt-6">
        <h2>Per gruppo</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Gruppo</th><th className="text-right">Vacche</th><th className="text-right">Latte/vacca</th><th className="text-right">Ricavo/vacca</th><th className="text-right">Razione/vacca</th><th className="text-right">Robot/vacca</th><th className="text-right">Margine/vacca</th><th className="text-right">Margine/giorno</th></tr></thead>
            <tbody>
              {m.stalle.map((s) => (
                <tr key={s.stalla}>
                  <td><div className="font-semibold">Gruppo {s.gruppo}</div><div className="text-xs text-stone-500">Stalla {s.stalla} · {s.fonteRazione === 'pesate' ? `dalle pesate: ${fmt1(s.kgDistribuitiCapo ?? 0)} kg/capo${s.kgRazioneCapo ? ` (razione ${fmt1(s.kgRazioneCapo)})` : ''}` : s.fonteRazione === 'razione' ? 'razione teorica' : 'razione mancante'}</div></td>
                  <td className="text-right tabular-nums">{fmt0(s.capi)}</td>
                  <td className="text-right tabular-nums">{s.capi ? fmt1(s.kgLatte / s.capi) : '—'} kg</td>
                  <td className="text-right tabular-nums">{s.capi ? fmtEur(s.ricavo / s.capi) : '—'}</td>
                  <td className="text-right tabular-nums">{s.capi ? fmtEur(s.costoRazione / s.capi) : '—'}</td>
                  <td className="text-right tabular-nums">{s.capi ? fmtEur(s.costoRobot / s.capi) : '—'}</td>
                  <td className={`text-right font-semibold tabular-nums ${segno(s.margine)}`}>{s.capi ? fmtEur(s.margine / s.capi) : '—'}</td>
                  <td className={`text-right tabular-nums ${segno(s.margine)}`}>{fmtEur(s.margine)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-600" /><h2>Vacche con il margine più basso</h2></div>
        <p className="mt-0.5 text-sm text-stone-500">Latte della vacca meno il costo alimentare medio per capo del suo gruppo.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Vacca</th><th>Stalla</th><th className="text-right">Latte/giorno</th><th className="text-right">Ricavo</th><th className="text-right">Costo</th><th className="text-right">Margine</th></tr></thead>
            <tbody>
              {m.vacche.slice(0, 15).map((v) => (
                <tr key={v.vacca}>
                  <td className="font-semibold">{v.vacca}</td><td>{v.stalla}</td>
                  <td className="text-right tabular-nums">{fmt1(v.kgGiorno)} kg</td>
                  <td className="text-right tabular-nums">{fmtEur(v.ricavo)}</td>
                  <td className="text-right tabular-nums">{fmtEur(v.costo)}</td>
                  <td className={`text-right font-semibold tabular-nums ${segno(v.margine)}`}>{fmtEur(v.margine)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">{(() => { const n = m.vacche.filter((v) => v.margine < 0).length; return n === 0 ? 'Tutte le vacche ripagano il costo alimentare medio.' : n === 1 ? '1 vacca non ripaga il costo alimentare medio.' : `${n} vacche non ripagano il costo alimentare medio.` })()}</p>
      </div>
    </>
  )
}

function Aziendale({ m }: { m: M }) {
  const a = m.aziendale
  const litri = a.kgLatte / KG_PER_LITRO
  const voci = [
    ...m.stalle.map((s) => ({ k: `l${s.stalla}`, nome: s.razione?.nome ?? `Lattazione gruppo ${s.gruppo}`, cat: 'Lattazione', capi: s.capi, costo: s.costo })),
    ...m.altre.map((x) => ({ k: x.razione.id, nome: x.razione.nome, cat: nomeCategoria(x.razione.categoria), capi: x.capi, costo: x.costo })),
  ]
  return (
    <>
      <Avvisi m={m} tutte />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icona={TrendingUp} tono="verde" etichetta="Margine aziendale al giorno" valore={eur0(a.margine)} nota={`${eur0(a.margine * 30)} al mese`} />
        <StatTile icona={Milk} tono="brand" etichetta="Margine per vacca in latte al giorno" valore={a.capi ? fmtEur(a.margine / a.capi) : '—'} nota={`lattazione da sola: ${a.capi ? fmtEur(m.lattazione.margine / a.capi) : '—'}`} />
        <StatTile icona={Wheat} tono="arancio" etichetta="Costo alimentare al giorno" valore={eur0(a.costo)} nota={`di cui non in lattazione ${eur0(a.costoAltre)}`} />
        <StatTile icona={Scale} tono="rosso" etichetta="Costo alimentare per litro" valore={litri ? `${fmt2(a.costo / litri)} €` : '—'} nota={`lattazione da sola: ${litri ? fmt2(m.lattazione.costo / litri) : '—'} €`} />
      </div>

      <div className="card mt-6">
        <h2>Dove vanno i costi alimentari</h2>
        <div className="mt-3 grid gap-2 rounded-xl bg-brand-50/50 p-4 text-sm sm:grid-cols-3">
          <div>Ricavo latte<div className="text-lg font-bold text-brand-900">{eur0(a.ricavo)}</div></div>
          <div>− Costi alimentari (tutti)<div className="text-lg font-bold text-brand-900">{eur0(a.costo)}</div></div>
          <div>= Margine al giorno<div className={`text-lg font-bold ${segno(a.margine)}`}>{eur0(a.margine)}</div></div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Razione</th><th>Categoria</th><th className="text-right">Capi</th><th className="text-right">€/capo</th><th className="text-right">€/giorno</th><th className="text-right">Quota</th></tr></thead>
            <tbody>
              {voci.map((v) => (
                <tr key={v.k}>
                  <td className="font-semibold">{v.nome}</td><td>{v.cat}</td>
                  <td className="text-right tabular-nums">{fmt0(v.capi)}</td>
                  <td className="text-right tabular-nums">{v.capi ? fmtEur(v.costo / v.capi) : '—'}</td>
                  <td className="text-right tabular-nums">{fmtEur(v.costo)}</td>
                  <td className="text-right tabular-nums">{a.costo ? fmt0((v.costo / a.costo) * 100) : 0}%</td>
                </tr>
              ))}
              <tr className="font-semibold"><td colSpan={4}>Ricavo latte</td><td className="text-right tabular-nums">{fmtEur(a.ricavo)}</td><td /></tr>
              <tr className="font-semibold"><td colSpan={4}>Margine al netto di tutti i costi alimentari</td><td className={`text-right tabular-nums ${segno(a.margine)}`}>{fmtEur(a.margine)}</td><td /></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ---------------- Razioni e prezzi

const nuovaRazione = (): Razione => ({ id: '', nome: '', categoria: 'lattazione', gruppi: [], voci: [{ ingredienteId: '', kgCapo: 0 }] })

function RazioniPrezzi() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [modifica, setModifica] = useState<Razione | null>(null)
  const [gruppiTesto, setGruppiTesto] = useState('')
  const [nuovo, setNuovo] = useState({ nome: '', prezzo: '' })
  const ingr = [...dati.ingredienti].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))

  const apri = (r: Razione) => { setModifica(r); setGruppiTesto(r.gruppi.join(', ')) }
  const proposteGruppi = (c: CategoriaRazione) =>
    c === 'lattazione' ? dati.stalle.map((s) => s.gruppoDairyComp).filter((g): g is number => g !== undefined)
      : c === 'closeup' ? Object.keys(GRUPPI_PREDEFINITI).map(Number) : []

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    const r: Razione = {
      ...modifica,
      nome: modifica.nome.trim() || nomeCategoria(modifica.categoria),
      gruppi: gruppiTesto.split(/[^0-9]+/).filter(Boolean).map(Number),
      voci: modifica.voci.filter((v) => v.ingredienteId && v.kgCapo > 0),
      robot: modifica.categoria === 'lattazione' && modifica.robot?.ingredienteId && modifica.robot.kgCapo > 0 ? modifica.robot : undefined,
    }
    if (r.id) aggiorna('razioni', r); else aggiungi('razioni', { ...r, id: nuovoId() })
    setModifica(null)
  }
  const aggiungiIngrediente = (e: FormEvent) => {
    e.preventDefault()
    if (!nuovo.nome.trim()) return
    aggiungi('ingredienti', { id: nuovoId(), nome: nuovo.nome.trim(), prezzoQ: num(nuovo.prezzo) })
    setNuovo({ nome: '', prezzo: '' })
  }
  const usato = (id: string) => dati.razioni.some((r) => r.voci.some((v) => v.ingredienteId === id) || r.robot?.ingredienteId === id)

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h2>Razioni</h2>
          <button className="btn-primary" onClick={() => apri(nuovaRazione())} disabled={!ingr.length}><Plus className="h-4 w-4" />Nuova razione</button>
        </div>
        {!ingr.length && <p className="mt-2 text-sm text-stone-500">Prima inserisci gli alimenti con il prezzo (a destra).</p>}
        <div className="mt-4 space-y-3">
          {CATEGORIE.map((c) => dati.razioni.filter((r) => r.categoria === c.id).map((r) => {
            const k = costoRazione(r, dati.ingredienti)
            return (
              <div key={r.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-brand-900">{r.nome}</div>
                    <div className="text-xs text-stone-500">{c.nome} · gruppi {r.gruppi.join(', ') || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-900">{fmtEur(k.costoCapo + k.costoRobotCapo)}<span className="text-xs font-normal text-stone-500"> /capo/giorno</span></div>
                    <div className="text-xs text-stone-500">{fmt1(k.kgCapo)} kg t.q. · {fmt2(k.costoKg * 100)} €/q{k.senzaPrezzo ? ` · ${k.senzaPrezzo} senza prezzo` : ''}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-stone-600">
                  {r.voci.map((v) => `${dati.ingredienti.find((i) => i.id === v.ingredienteId)?.nome ?? '?'} ${fmt1(v.kgCapo)} kg`).join(' · ')}
                  {r.robot && <div className="text-xs">Robot: {dati.ingredienti.find((i) => i.id === r.robot!.ingredienteId)?.nome} {fmt1(r.robot.kgCapo)} kg/capo ({fmtEur(k.costoRobotCapo)})</div>}
                </div>
                <div className="mt-2 flex gap-3">
                  <button className="btn-link inline-flex items-center gap-1" onClick={() => apri(r)}><Pencil className="h-3.5 w-3.5" />Modifica</button>
                  <button className="btn-link inline-flex items-center gap-1" onClick={() => apri({ ...r, id: '', nome: `${r.nome} (copia)` })}>Duplica</button>
                  <button className="btn-danger-link inline-flex items-center gap-1" onClick={() => elimina('razioni', r.id)}><Trash2 className="h-3.5 w-3.5" />Elimina</button>
                </div>
              </div>
            )
          }))}
          {!dati.razioni.length && ingr.length > 0 && <p className="text-sm text-stone-500">Nessuna razione. Inserisci quelle di lattazione (una per stalla), asciutta e close up.</p>}
        </div>
      </div>

      <div className="card">
        <h2>Alimenti e prezzi</h2>
        <p className="mt-0.5 text-sm text-stone-500">Prezzo al quintale tal quale. Cambiando un prezzo si aggiornano tutte le razioni.</p>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={aggiungiIngrediente}>
          <input className="input min-w-0 flex-1" placeholder="Alimento (es. Silomais)" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} />
          <input className="input !w-24" inputMode="decimal" placeholder="€/q" value={nuovo.prezzo} onChange={(e) => setNuovo({ ...nuovo, prezzo: e.target.value })} />
          <button className="btn-primary px-3" aria-label="Aggiungi alimento"><Plus className="h-4 w-4" /></button>
        </form>
        <ul className="mt-3 divide-y divide-stone-100">
          {ingr.map((i) => <RigaIngrediente key={i.id} i={i} usato={usato(i.id)} />)}
        </ul>
      </div>

      {modifica && (
        <Modale titolo={modifica.id ? 'Modifica razione' : 'Nuova razione'} onChiudi={() => setModifica(null)}>
          <form className="space-y-4" onSubmit={salva}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Categoria">
                <select className="input" value={modifica.categoria} onChange={(e) => {
                  const c = e.target.value as CategoriaRazione
                  setModifica({ ...modifica, categoria: c })
                  if (!gruppiTesto.trim()) setGruppiTesto(proposteGruppi(c).slice(0, c === 'lattazione' ? 1 : undefined).join(', '))
                }}>
                  {CATEGORIE.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo label="Nome"><input className="input" value={modifica.nome} placeholder={nomeCategoria(modifica.categoria)} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} /></Campo>
            </div>
            <Campo label="Gruppi DairyComp che la mangiano">
              <input className="input" value={gruppiTesto} placeholder={modifica.categoria === 'closeup' ? '3, 23' : 'es. 1'} onChange={(e) => setGruppiTesto(e.target.value)} />
            </Campo>
            <div>
              <span className="label">Alimenti (kg tal quale per capo al giorno)</span>
              <div className="space-y-2">
                {modifica.voci.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <select className="input min-w-0 flex-1" value={v.ingredienteId} onChange={(e) => setModifica({ ...modifica, voci: modifica.voci.map((x, j) => (j === i ? { ...x, ingredienteId: e.target.value } : x)) })}>
                      <option value="">Scegli…</option>
                      {ingr.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                    <input className="input !w-20 shrink-0" inputMode="decimal" value={v.kgCapo || ''} placeholder="kg" onChange={(e) => setModifica({ ...modifica, voci: modifica.voci.map((x, j) => (j === i ? { ...x, kgCapo: num(e.target.value) } : x)) })} />
                    <button type="button" className="text-stone-400 hover:text-rose-600" aria-label="Togli" onClick={() => setModifica({ ...modifica, voci: modifica.voci.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-link mt-2" onClick={() => setModifica({ ...modifica, voci: [...modifica.voci, { ingredienteId: '', kgCapo: 0 }] })}>+ Aggiungi alimento</button>
            </div>
            {modifica.categoria === 'lattazione' && (
              <div>
                <span className="label">Concentrato al robot (kg per vacca al giorno, media)</span>
                <div className="flex gap-2">
                  <select className="input min-w-0 flex-1" value={modifica.robot?.ingredienteId ?? ''} onChange={(e) => setModifica({ ...modifica, robot: { ingredienteId: e.target.value, kgCapo: modifica.robot?.kgCapo ?? 0 } })}>
                    <option value="">Nessuno</option>
                    {ingr.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                  <input className="input !w-20 shrink-0" inputMode="decimal" placeholder="kg" value={modifica.robot?.kgCapo || ''} onChange={(e) => setModifica({ ...modifica, robot: { ingredienteId: modifica.robot?.ingredienteId ?? '', kgCapo: num(e.target.value) } })} />
                </div>
              </div>
            )}
            <div className="rounded-lg bg-brand-50/60 p-3 text-sm">
              {(() => { const k = costoRazione({ ...modifica, voci: modifica.voci.filter((v) => v.ingredienteId) }, dati.ingredienti); return <>Costo: <b>{fmtEur(k.costoCapo + k.costoRobotCapo)}</b> per capo al giorno · {fmt1(k.kgCapo)} kg tal quale</> })()}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}
    </div>
  )
}

function RigaIngrediente({ i, usato }: { i: Ingrediente; usato: boolean }) {
  const { aggiorna, elimina } = useStore()
  const [prezzo, setPrezzo] = useState(String(i.prezzoQ || ''))
  const salva = () => { const p = num(prezzo); if (p !== i.prezzoQ) aggiorna('ingredienti', { ...i, prezzoQ: p }) }
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.nome}</span>
      <input className="input !w-24 shrink-0 py-1.5 text-right" inputMode="decimal" value={prezzo} placeholder="€/q" aria-label={`Prezzo ${i.nome}`}
        onChange={(e) => setPrezzo(e.target.value)} onBlur={salva} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      <span className="w-8 text-xs text-stone-500">€/q</span>
      <button className="text-stone-300 hover:text-rose-600 disabled:opacity-30" disabled={usato} title={usato ? 'Usato in una razione' : 'Elimina'} onClick={() => elimina('ingredienti', i.id)}><Trash2 className="h-4 w-4" /></button>
    </li>
  )
}
