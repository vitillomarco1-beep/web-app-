import { useState, type FormEvent } from 'react'
import { Milk, Pencil, Plus, Scale, Trash2, TrendingDown, TrendingUp, Wheat, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { AnalisiMangime, CategoriaRazione, Ingrediente, Razione } from '../lib/types'
import { MANGIMI_NOTI, SS_MANGIME_TIPICA } from '../lib/ingerito'
import { Campo, Modale, StatTile, Vuoto } from '../components/ui'
import { CATEGORIE, calcolaMargine, costoRazione, nomeCategoria, settimaneConDati } from '../lib/margine'
import { KG_PER_LITRO } from '../lib/salute'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, nuovoId } from '../lib/format'
import { GRUPPI_PREDEFINITI } from '../lib/dairycomp'

type Vista = 'lattazione' | 'aziendale'
const num = (s: string) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const eur0 = (n: number) => `${fmt0(n)} €`
const segno = (n: number) => (n >= 0 ? 'text-emerald-700' : 'text-rose-700')

/** Margine sul costo alimentare (scheda della sezione Alimentazione): lattazione e aziendale. */
export default function MargineSezione({ onVaiRazioni }: { onVaiRazioni: () => void }) {
  const { dati } = useStore()
  const settimane = settimaneConDati(dati)
  const [vista, setVista] = useState<Vista>('lattazione')
  const [sett, setSett] = useState(settimane[0] ?? '')
  const m = sett ? calcolaMargine(dati, sett) : null

  if (!m) return <Vuoto><p>Per calcolare il margine servono i dati dei robot: caricali in <b>Carica la settimana</b>.</p></Vuoto>
  if (!dati.razioni.length) return (
    <Vuoto>
      <p>Inserisci le razioni e i prezzi degli alimenti per calcolare il margine.</p>
      <button className="btn-primary mt-4" onClick={onVaiRazioni}><Wheat className="h-4 w-4" />Razioni e prezzi</button>
    </Vuoto>
  )
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
          {([['lattazione', 'Margine lattazione'], ['aziendale', 'Margine aziendale']] as const).map(([id, nome]) => (
            <button key={id} onClick={() => setVista(id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${vista === id ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{nome}</button>
          ))}
        </div>
        <select className="input !w-auto" value={sett} onChange={(e) => setSett(e.target.value)} aria-label="Settimana">
          {settimane.map((s) => <option key={s} value={s}>Settimana {fmtData(s)} – {fmtData(aggiungiGiorni(s, 6))}</option>)}
        </select>
      </div>
      {vista === 'lattazione' ? <Lattazione m={m} /> : <Aziendale m={m} />}
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

export function RazioniPrezzi() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [modifica, setModifica] = useState<Razione | null>(null)
  const [gruppiTesto, setGruppiTesto] = useState('')
  const [nuovo, setNuovo] = useState({ nome: '', prezzo: '' })
  const [nuovoInRazione, setNuovoInRazione] = useState({ nome: '', prezzo: '' })
  /** Crea un alimento dalla finestra della razione e lo mette nella prima riga vuota. */
  const creaInRazione = () => {
    if (!modifica || !nuovoInRazione.nome.trim()) return
    const id = nuovoId()
    aggiungi('ingredienti', { id, nome: nuovoInRazione.nome.trim(), prezzoQ: num(nuovoInRazione.prezzo) })
    const vuota = modifica.voci.findIndex((v) => !v.ingredienteId)
    setModifica({ ...modifica, voci: vuota >= 0 ? modifica.voci.map((v, j) => (j === vuota ? { ...v, ingredienteId: id } : v)) : [...modifica.voci, { ingredienteId: id, kgCapo: 0 }] })
    setNuovoInRazione({ nome: '', prezzo: '' })
  }
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
          <button className="btn-primary" onClick={() => apri(nuovaRazione())} ><Plus className="h-4 w-4" />Nuova razione</button>
        </div>
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
        {MANGIMI_NOTI.map((m) => {
          const esistente = dati.ingredienti.find((i) => i.nome.toLowerCase().includes(m.cerca))
          if (esistente?.analisi) return null
          return (
            <div key={m.nome} className="mt-3 rounded-xl border border-arancio-200 bg-arancio-50/60 p-3 text-sm">
              <div className="font-semibold text-brand-900">{m.nome} – dal cartellino</div>
              <div className="text-xs text-stone-600">PG {fmt1(m.analisi.pg!)}% · grassi {fmt1(m.analisi.grassi!)}% · fibra {fmt1(m.analisi.fibra!)}% · ceneri {fmt1(m.analisi.ceneri!)}% · sodio {m.analisi.sodio}% (sul tal quale)</div>
              <button className="btn-link mt-1" onClick={() => esistente ? aggiorna('ingredienti', { ...esistente, analisi: m.analisi }) : aggiungi('ingredienti', { id: nuovoId(), nome: m.nome, prezzoQ: 0, analisi: m.analisi })}>
                {esistente ? `Applica a “${esistente.nome}”` : 'Aggiungi agli alimenti'}
              </button>
            </div>
          )
        })}
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
              <input className="input" required pattern=".*[0-9].*" title="Scrivi almeno un numero di gruppo" value={gruppiTesto} placeholder={modifica.categoria === 'closeup' ? '3, 23' : 'es. 1'} onChange={(e) => setGruppiTesto(e.target.value)} />
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
                    <CampoKg valore={v.kgCapo} onCambia={(n) => setModifica({ ...modifica, voci: modifica.voci.map((x, j) => (j === i ? { ...x, kgCapo: n } : x)) })} />
                    <button type="button" className="text-stone-400 hover:text-rose-600" aria-label="Togli" onClick={() => setModifica({ ...modifica, voci: modifica.voci.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-link mt-2" onClick={() => setModifica({ ...modifica, voci: [...modifica.voci, { ingredienteId: '', kgCapo: 0 }] })}>+ Aggiungi alimento</button>
              <div className="mt-3 rounded-lg border border-dashed border-stone-300 p-3">
                <span className="text-xs font-medium text-stone-600">Alimento non in elenco? Crealo qui:</span>
                <div className="mt-1.5 flex gap-2">
                  <input className="input min-w-0 flex-1" placeholder="Nome (es. Silomais)" value={nuovoInRazione.nome} onChange={(e) => setNuovoInRazione({ ...nuovoInRazione, nome: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); creaInRazione() } }} />
                  <input className="input !w-20 shrink-0" inputMode="decimal" placeholder="€/q" value={nuovoInRazione.prezzo} onChange={(e) => setNuovoInRazione({ ...nuovoInRazione, prezzo: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); creaInRazione() } }} />
                  <button type="button" className="btn-secondary px-3" onClick={creaInRazione} aria-label="Crea alimento"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            {modifica.categoria === 'lattazione' && (
              <div>
                <span className="label">Concentrato al robot (kg per vacca al giorno, media)</span>
                <div className="flex gap-2">
                  <select className="input min-w-0 flex-1" value={modifica.robot?.ingredienteId ?? ''} onChange={(e) => setModifica({ ...modifica, robot: { ingredienteId: e.target.value, kgCapo: modifica.robot?.kgCapo ?? 0 } })}>
                    <option value="">Nessuno</option>
                    {ingr.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                  <CampoKg valore={modifica.robot?.kgCapo ?? 0} onCambia={(n) => setModifica({ ...modifica, robot: { ingredienteId: modifica.robot?.ingredienteId ?? '', kgCapo: n } })} />
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

const CAMPI_MANGIME: { k: keyof AnalisiMangime; nome: string }[] = [
  { k: 'ss', nome: 'Sostanza secca' }, { k: 'pg', nome: 'Proteina grezza' }, { k: 'grassi', nome: 'Grassi grezzi' }, { k: 'fibra', nome: 'Fibra grezza' },
  { k: 'ceneri', nome: 'Ceneri grezze' }, { k: 'amido', nome: 'Amido' }, { k: 'sodio', nome: 'Sodio' },
]

function RigaIngrediente({ i, usato }: { i: Ingrediente; usato: boolean }) {
  const { aggiorna, elimina } = useStore()
  const [prezzo, setPrezzo] = useState(String(i.prezzoQ || ''))
  const [analisi, setAnalisi] = useState<Record<string, string> | null>(null)
  const apriAnalisi = () => setAnalisi(Object.fromEntries(CAMPI_MANGIME.map((c) => [c.k, i.analisi?.[c.k] !== undefined && !(c.k === 'ss' && i.analisi?.ssStimata) ? String(i.analisi[c.k]).replace('.', ',') : ''])))
  const salvaAnalisi = (e: FormEvent) => {
    e.preventDefault()
    if (!analisi) return
    const a: AnalisiMangime = {}
    for (const c of CAMPI_MANGIME) { const t = analisi[c.k]?.trim(); if (t) (a as Record<string, number>)[c.k] = num(t) }
    if (a.ss === undefined) { a.ss = SS_MANGIME_TIPICA; a.ssStimata = true }
    const vuota = CAMPI_MANGIME.every((c) => c.k === 'ss' || a[c.k] === undefined)
    aggiorna('ingredienti', { ...i, analisi: vuota ? undefined : a })
    setAnalisi(null)
  }
  const salva = () => { const p = num(prezzo); if (p !== i.prezzoQ) aggiorna('ingredienti', { ...i, prezzoQ: p }) }
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 text-sm font-medium">
        <span className="block truncate">{i.nome}</span>
        <button className="text-xs font-normal text-brand-700 hover:underline" onClick={apriAnalisi}>{i.analisi ? `Analisi: PG ${fmt1(i.analisi.pg ?? 0)}% · SS ${fmt1(i.analisi.ss ?? 0)}%${i.analisi.ssStimata ? ' (stimata)' : ''}` : '+ Analisi'}</button>
      </span>
      <input className="input !w-24 shrink-0 py-1.5 text-right" inputMode="decimal" value={prezzo} placeholder="€/q" aria-label={`Prezzo ${i.nome}`}
        onChange={(e) => setPrezzo(e.target.value)} onBlur={salva} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      <span className="w-8 text-xs text-stone-500">€/q</span>
      {analisi && (
        <Modale titolo={`Componenti analitici – ${i.nome}`} onChiudi={() => setAnalisi(null)}>
          <form className="space-y-4" onSubmit={salvaAnalisi}>
            <p className="text-sm text-stone-600">Come sul cartellino: <b>% sul tal quale</b>. Se la sostanza secca non c'è, lascia vuoto: uso l'{SS_MANGIME_TIPICA}%, valore tipico dei mangimi.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CAMPI_MANGIME.map((c) => (
                <label key={c.k} className="block"><span className="label">{c.nome} %</span>
                  <input className="input" inputMode="decimal" value={analisi[c.k] ?? ''} placeholder={c.k === 'ss' ? `${SS_MANGIME_TIPICA} (tipica)` : ''}
                    onChange={(e) => setAnalisi({ ...analisi, [c.k]: e.target.value.replace(/[^0-9.,]/g, '') })} />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAnalisi(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}
      <button className="text-stone-300 hover:text-rose-600 disabled:opacity-30" disabled={usato} title={usato ? 'Usato in una razione' : 'Elimina'} onClick={() => elimina('ingredienti', i.id)}><Trash2 className="h-4 w-4" /></button>
    </li>
  )
}

/** Campo dei kg: tiene il testo scritto (es. "0," mentre si digita 0,7) e passa il numero. */
function CampoKg({ valore, onCambia }: { valore: number; onCambia: (n: number) => void }) {
  const [testo, setTesto] = useState(valore ? String(valore).replace('.', ',') : '')
  // se il valore cambia da fuori (es. riga tolta), riallinea il testo
  if (num(testo) !== valore && !(testo === '' && valore === 0)) setTesto(valore ? String(valore).replace('.', ',') : '')
  return (
    <input className="input !w-20 shrink-0" inputMode="decimal" placeholder="kg" value={testo}
      onChange={(e) => { const t = e.target.value.replace(/[^0-9.,]/g, ''); setTesto(t); onCambia(num(t)) }} />
  )
}
