import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Euro, HeartPulse, Milk, Pencil, Pill, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import type { CasoClinico, Severita } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile } from '../components/ui'
import { PATOLOGIE, PREZZO_LATTE_PREDEFINITO, costoFarmaci, costoUnitario, euroDaKg, nomePatologia, stimaPerdita, type StimaPerdita } from '../lib/salute'
import { ultimoImport } from '../lib/dairycomp'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, isoGiorno, nuovoId } from '../lib/format'

const SEVERITA: { v: Severita; label: string; cls: string }[] = [
  { v: 'lieve', label: 'Lieve', cls: 'bg-green-50 text-green-800 ring-green-200' },
  { v: 'moderata', label: 'Moderata', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { v: 'grave', label: 'Grave', cls: 'bg-red-50 text-red-800 ring-red-200' },
]
const QUARTI = ['AS', 'AD', 'PS', 'PD']
const BadgeSev = ({ s }: { s: Severita }) => {
  const x = SEVERITA.find((y) => y.v === s)!
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${x.cls}`}>{x.label}</span>
}

export default function SalutePage() {
  const { dati, aggiungi, aggiorna, elimina, imposta } = useStore()
  const prezzo = dati.parametri.find((x) => x.id === 'prezzoLatte')?.valore ?? PREZZO_LATTE_PREDEFINITO
  const [modPrezzo, setModPrezzo] = useState<string | null>(null)
  const salvaPrezzo = () => {
    const v = Number((modPrezzo ?? '').replace(',', '.'))
    if (Number.isFinite(v) && v > 0) imposta('parametri', [...dati.parametri.filter((x) => x.id !== 'prezzoLatte'), { id: 'prezzoLatte', valore: v }])
    setModPrezzo(null)
  }
  const location = useLocation()
  const navigate = useNavigate()
  const oggi = isoGiorno()
  const [patologia, setPatologia] = useState<string | null>(null)
  const [modifica, setModifica] = useState<CasoClinico | null>(null)
  const [daEliminare, setDaEliminare] = useState<string | null>(null)

  // lista DairyComp reale (per riconoscere le vacche e per la stima con le vacche simili)
  const lista = dati.mandriaDC[0] ?? (() => { const u = ultimoImport(dati.importDC); return u && !u.nomeFile.endsWith('(esempio)') ? u : undefined })()
  const vaccheNote = useMemo(() => [...new Set([...(lista?.animali.map((a) => a.id) ?? []), ...dati.robotVacche.map((v) => v.vacca)])]
    .sort((a, b) => a.localeCompare(b, 'it', { numeric: true })), [lista, dati.robotVacche])
  const trattamentiUsati = [...new Set(dati.casi.map((c) => c.trattamento).filter(Boolean))]

  const nuovo = (pat: string, vacca = ''): CasoClinico => ({ id: '', vacca, patologia: pat, dataInizio: oggi, severita: 'lieve', trattamento: '', quarti: [] })

  // arrivo dalla pagina Mungiture robot con una vacca da registrare
  useEffect(() => {
    const v = (location.state as { vacca?: string } | null)?.vacca
    if (v) { setModifica(nuovo('mastite', v)); navigate(location.pathname, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stime = useMemo(() => {
    const m = new Map<string, StimaPerdita | null>()
    for (const c of dati.casi) m.set(c.id, stimaPerdita(c, dati.robotVacche, dati.robotGiorni, lista, dati.casi))
    return m
  }, [dati.casi, dati.robotVacche, dati.robotGiorni, lista])

  /** Costo totale di un caso: latte perso (in euro) + farmaci + altri costi. */
  const costoCaso = (c: CasoClinico) => {
    const st = stime.get(c.id)
    return (st ? euroDaKg(st.calo + st.separato, prezzo) : 0) + costoFarmaci(c) + (c.costoAltro ?? 0)
  }
  const farmacoDi = (id: string) => dati.farmaci.find((f) => f.id === id)
  const sospensione = (c: CasoClinico) => Math.max(0, ...(c.farmaci ?? []).map((u) => farmacoDi(u.farmacoId)?.sospensioneLatte ?? 0))

  const da30 = aggiungiGiorni(oggi, -30)
  const casiRecenti = dati.casi.filter((c) => c.dataInizio >= da30 || !c.dataFine)
  const attivi = dati.casi.filter((c) => !c.dataFine)
  const perditaRecente = casiRecenti.reduce((s, c) => { const x = stime.get(c.id); return s + (x ? x.calo + x.separato : 0) }, 0)

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    const c = { ...modifica, vacca: modifica.vacca.trim(), dataFine: modifica.dataFine || undefined, note: modifica.note?.trim() || undefined,
      quarti: PATOLOGIE.find((p) => p.id === modifica.patologia)?.quarti ? modifica.quarti : undefined }
    c.farmaci = (c.farmaci ?? []).filter((u) => u.farmacoId && u.quantita > 0)
    c.costoAltro = c.costoAltro && c.costoAltro > 0 ? c.costoAltro : undefined
    // giacenze: si scala la differenza rispetto a quanto già registrato per questo caso
    const prima = c.id ? dati.casi.find((x) => x.id === c.id)?.farmaci ?? [] : []
    aggiornaGiacenze(prima, c.farmaci)
    if (c.id) aggiorna('casi', c)
    else aggiungi('casi', { ...c, id: nuovoId() })
    setPatologia(c.patologia)
    setModifica(null)
  }

  /** Scala dal magazzino le quantità nuove e restituisce quelle tolte. */
  const aggiornaGiacenze = (prima: { farmacoId: string; quantita: number }[], dopo: { farmacoId: string; quantita: number }[]) => {
    const delta = new Map<string, number>()
    prima.forEach((u) => delta.set(u.farmacoId, (delta.get(u.farmacoId) ?? 0) - u.quantita))
    dopo.forEach((u) => delta.set(u.farmacoId, (delta.get(u.farmacoId) ?? 0) + u.quantita))
    for (const [id, d] of delta) {
      const f = farmacoDi(id)
      if (f && d !== 0) aggiorna('farmaci', { ...f, giacenza: Math.round((f.giacenza - d) * 1000) / 1000 })
    }
  }

  const elenco = (patologia ? dati.casi.filter((c) => c.patologia === patologia) : dati.casi)
    .slice().sort((a, b) => (a.dataFine ? 1 : 0) - (b.dataFine ? 1 : 0) || b.dataInizio.localeCompare(a.dataInizio))
  const infoVacca = (id: string) => lista?.animali.find((a) => a.id === id)

  return (
    <>
      <PageHeader titolo="Salute" icona={HeartPulse} descrizione="Patologie, trattamenti e latte perso per ogni vacca"
        azioni={<button className="btn-primary" onClick={() => setModifica(nuovo(patologia ?? 'mastite'))}><Plus className="h-4 w-4" />Registra un caso</button>} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile icona={HeartPulse} tono="rosso" etichetta="Casi in corso" valore={fmt0(attivi.length)} unita="vacche" />
        <StatTile icona={CalendarDays} tono="brand" etichetta="Casi ultimi 30 giorni" valore={fmt0(dati.casi.filter((c) => c.dataInizio >= da30).length)} unita="casi" />
        <StatTile icona={Milk} tono="arancio" etichetta="Latte perso (30 giorni e in corso)" valore={fmt0(perditaRecente)} unita="kg" nota={`≈ ${fmtEur(euroDaKg(perditaRecente, prezzo))} · calo + latte separato`} />
        <StatTile icona={Euro} tono="verde" etichetta="Costo totale (30 giorni e in corso)" valore={fmtEur(casiRecenti.reduce((s, c) => s + costoCaso(c), 0))}
          nota={`farmaci ${fmtEur(casiRecenti.reduce((s, c) => s + costoFarmaci(c), 0))} · ${new Set(casiRecenti.map((c) => c.vacca)).size} vacche`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        Prezzo del latte:
        {modPrezzo === null ? (
          <><b>{fmt2(prezzo)} €/litro</b><button className="btn-link" onClick={() => setModPrezzo(String(prezzo).replace('.', ','))}>modifica</button></>
        ) : (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); salvaPrezzo() }}>
            <input className="input w-24 py-1" inputMode="decimal" autoFocus value={modPrezzo} onChange={(e) => setModPrezzo(e.target.value)} /> €/litro
            <button className="btn-primary px-3 py-1.5">Salva</button><button type="button" className="btn-link" onClick={() => setModPrezzo(null)}>Annulla</button>
          </form>
        )}
        <span className="text-xs text-stone-400">(i robot misurano in kg: 1 litro ≈ 1,03 kg)</span>
      </div>

      {/* Pulsanti delle patologie */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PATOLOGIE.map((p) => {
          const casi = dati.casi.filter((c) => c.patologia === p.id)
          const inCorso = casi.filter((c) => !c.dataFine).length
          const perso = casi.reduce((s, c) => { const x = stime.get(c.id); return s + (x ? x.calo + x.separato : 0) }, 0)
          const sel = patologia === p.id
          return (
            <button key={p.id} onClick={() => setPatologia(sel ? null : p.id)}
              className={`rounded-2xl p-4 text-left transition ${sel ? 'bg-brand-700 text-white shadow-lg' : 'bg-white ring-1 ring-stone-200 hover:ring-brand-300'}`}>
              <div className="flex items-center justify-between">
                <HeartPulse className={`h-5 w-5 ${sel ? 'text-arancio-300' : 'text-brand-500'}`} />
                {inCorso > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sel ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>{inCorso} in corso</span>}
              </div>
              <div className="mt-2 font-semibold">{p.nome}</div>
              <div className={`text-xs ${sel ? 'text-brand-100' : 'text-stone-500'}`}>{p.descrizione}</div>
              <div className={`mt-2 text-xs ${sel ? 'text-brand-100' : 'text-stone-600'}`}>{casi.length} casi{casi.length > 0 && ` · ${fmtEur(casi.reduce((t, c) => t + costoCaso(c), 0))}`}{perso > 0 && ` · ${fmt0(perso)} kg`}</div>
            </button>
          )
        })}
      </div>

      {/* Elenco casi */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
          <h2 className="font-semibold">{patologia ? nomePatologia(patologia) : 'Tutti i casi'} <span className="font-normal text-stone-500">({elenco.length})</span></h2>
          {patologia && <button className="btn-secondary ml-auto" onClick={() => setModifica(nuovo(patologia))}><Plus className="h-4 w-4" />Nuovo caso di {nomePatologia(patologia).toLowerCase()}</button>}
          {patologia && <button className="btn-link" onClick={() => setPatologia(null)}>Mostra tutte</button>}
        </div>
        {elenco.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-stone-500">Nessun caso registrato{patologia ? ' per questa patologia' : ''}. Usa "Registra un caso" per inserirne uno.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vacca</th>{!patologia && <th>Patologia</th>}<th>Periodo</th><th>Severità</th><th>Trattamento</th>
                <th className="num">Atteso</th><th className="num">Durante</th><th className="num">Calo</th><th className="num">Separato</th><th className="num">Latte perso</th><th className="num">Farmaci</th><th className="num">Costo totale</th><th></th>
              </tr>
            </thead>
            <tbody>
              {elenco.map((c) => {
                const s = stime.get(c.id)
                const a = infoVacca(c.vacca)
                return (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap"><b>{c.vacca}</b>
                      <span className="block text-xs text-stone-500">{[a?.gruppo !== undefined && a?.gruppo !== null ? `gr. ${a.gruppo}` : '', s?.robot ? `robot ${s.robot}` : '', a?.lattazione ? `${a.lattazione}ª latt.` : ''].filter(Boolean).join(' · ')}</span>
                    </td>
                    {!patologia && <td className="whitespace-nowrap">{nomePatologia(c.patologia)}{c.quarti?.length ? <span className="block text-xs text-stone-500">{c.quarti.join(', ')}</span> : null}</td>}
                    <td className="whitespace-nowrap">{fmtData(c.dataInizio)} → {c.dataFine ? fmtData(c.dataFine) : <span className="font-medium text-amber-700">in corso</span>}
                      {s && <span className="block text-xs text-stone-500">{s.giorni} giorni con dati</span>}
                    </td>
                    <td><BadgeSev s={c.severita} /></td>
                    <td className="max-w-[16rem] text-sm">{c.trattamento || (c.farmaci?.length ? '' : '—')}
                      {c.farmaci?.map((u, i) => { const f = farmacoDi(u.farmacoId); return <span key={i} className="block text-xs text-stone-600"><Pill className="mr-1 inline h-3 w-3" />{f?.nome ?? 'farmaco eliminato'} · {u.quantita} {f?.unita ?? ''}</span> })}
                      {sospensione(c) > 0 && <span className="block text-xs font-medium text-amber-700">Sospensione latte {sospensione(c)} giorni</span>}{c.patologia === 'mastite' && patologia && c.quarti?.length ? <span className="block text-xs text-stone-500">Quarti: {c.quarti.join(', ')}</span> : null}</td>
                    <td className="num">{s?.media != null ? <>{fmt1(s.media)}<span className="block text-[11px] text-stone-400">{s.fonte === 'simili' ? `${s.nSimili} vacche simili` : 'sua media'}</span></> : <span className="text-xs text-stone-400">{s && s.giorni ? 'storico insufficiente' : 'nessun dato'}</span>}</td>
                    <td className="num">{s?.mediaDurante != null ? fmt1(s.mediaDurante) : '—'}</td>
                    <td className="num">{s?.fonte ? `${fmt0(s.calo)} kg` : '—'}</td>
                    <td className="num">{s && s.separato > 0 ? `${fmt0(s.separato)} kg` : '—'}</td>
                    <td className="num">{s && (s.fonte || s.separato > 0) ? <>{fmt0(s.calo + s.separato)} kg<span className="block text-[11px] text-stone-400">{fmtEur(euroDaKg(s.calo + s.separato, prezzo))}</span></> : '—'}</td>
                    <td className="num">{c.farmaci?.length ? fmtEur(costoFarmaci(c)) : '—'}{c.costoAltro ? <span className="block text-[11px] text-stone-400">+ {fmtEur(c.costoAltro)} altri</span> : null}</td>
                    <td className="num font-semibold">{fmtEur(costoCaso(c))}</td>
                    <td className="whitespace-nowrap text-right">
                      {daEliminare === c.id ? (
                        <span className="text-sm">Eliminare? <button className="btn-danger-link mx-1" onClick={() => { aggiornaGiacenze(c.farmaci ?? [], []); elimina('casi', c.id); setDaEliminare(null) }}>Sì</button><button className="btn-link" onClick={() => setDaEliminare(null)}>No</button></span>
                      ) : (
                        <>
                          {!c.dataFine && <button className="btn-link mr-3" onClick={() => aggiorna('casi', { ...c, dataFine: oggi })}>Guarita oggi</button>}
                          <button className="mr-2 text-stone-400 hover:text-brand-700" onClick={() => setModifica(c)} aria-label="Modifica"><Pencil className="h-4 w-4" /></button>
                          <button className="text-stone-400 hover:text-red-700" onClick={() => setDaEliminare(c.id)} aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="px-5 pb-4 pt-2 text-xs text-stone-500">
          Atteso: media della vacca nei 7 giorni prima della malattia, oppure (per le vacche senza storico, es. post-parto) media delle vacche
          simili sullo stesso robot. Calo = somma giornaliera di quanto prodotto in meno rispetto all'atteso, sui giorni caricati dai robot.
          Separato = latte non consegnato nel periodo.
        </p>
      </section>

      {modifica && (() => {
        const pat = PATOLOGIE.find((p) => p.id === modifica.patologia)
        const a = infoVacca(modifica.vacca.trim())
        const anteprima = modifica.vacca.trim() ? stimaPerdita({ ...modifica, id: modifica.id || 'nuovo', dataFine: modifica.dataFine || undefined }, dati.robotVacche, dati.robotGiorni, lista, dati.casi) : null
        return (
          <Modale titolo={modifica.id ? `Modifica caso · vacca ${modifica.vacca}` : 'Registra un caso'} onChiudi={() => setModifica(null)}>
            <form onSubmit={salva} className="grid gap-4 sm:grid-cols-2">
              <Campo label="Numero vacca *">
                <input className="input" list="vacche-note" required inputMode="numeric" value={modifica.vacca} onChange={(e) => setModifica({ ...modifica, vacca: e.target.value })} autoFocus={!modifica.vacca} />
                <datalist id="vacche-note">{vaccheNote.map((v) => <option key={v} value={v} />)}</datalist>
                {modifica.vacca.trim() && (
                  <span className={`mt-1 block text-xs ${a || vaccheNote.includes(modifica.vacca.trim()) ? 'text-stone-500' : 'text-amber-700'}`}>
                    {a ? `Gruppo ${a.gruppo ?? '—'} · ${a.lattazione ?? '?'}ª lattazione · ${a.dim ?? '?'} giorni di lattazione · ${a.codiceRiproduttivo ?? ''}` : vaccheNote.includes(modifica.vacca.trim()) ? 'Vacca presente nei dati dei robot' : '! Vacca non trovata nei dati caricati'}
                  </span>
                )}
              </Campo>
              <Campo label="Patologia">
                <select className="input" value={modifica.patologia} onChange={(e) => setModifica({ ...modifica, patologia: e.target.value })}>
                  {PATOLOGIE.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Campo>
              {pat?.quarti && (
                <div className="sm:col-span-2">
                  <span className="label">Quarti colpiti</span>
                  <div className="flex gap-2">
                    {QUARTI.map((q) => {
                      const on = modifica.quarti?.includes(q)
                      return <button key={q} type="button" onClick={() => setModifica({ ...modifica, quarti: on ? modifica.quarti!.filter((x) => x !== q) : [...(modifica.quarti ?? []), q] })}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-inset ${on ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-stone-600 ring-stone-300'}`}>{q}</button>
                    })}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="label">Severità</span>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITA.map((x) => (
                    <button key={x.v} type="button" onClick={() => setModifica({ ...modifica, severita: x.v })}
                      className={`rounded-lg py-2 text-sm font-semibold ring-1 ring-inset ${modifica.severita === x.v ? x.cls + ' ring-2' : 'bg-white text-stone-600 ring-stone-300'}`}>{x.label}</button>
                  ))}
                </div>
              </div>
              <Campo label="Trattamento" className="sm:col-span-2">
                <input className="input" list="trattamenti" placeholder="es. antibiotico intramammario, antinfiammatorio…" value={modifica.trattamento} onChange={(e) => setModifica({ ...modifica, trattamento: e.target.value })} />
                <datalist id="trattamenti">{trattamentiUsati.map((t) => <option key={t} value={t} />)}</datalist>
              </Campo>
              <div className="sm:col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="label mb-0">Farmaci usati</span>
                  {dati.farmaci.length > 0
                    ? <button type="button" className="btn-link" onClick={() => setModifica({ ...modifica, farmaci: [...(modifica.farmaci ?? []), { farmacoId: '', quantita: 0, costoUnitario: 0 }] })}>+ Aggiungi farmaco</button>
                    : <Link to="/area-riservata/farmaci" className="btn-link">Aggiungi i farmaci al magazzino</Link>}
                </div>
                {(modifica.farmaci ?? []).map((u, i) => {
                  const f = farmacoDi(u.farmacoId)
                  const cambia = (n: Partial<typeof u>) => setModifica({ ...modifica, farmaci: modifica.farmaci!.map((x, j) => (j === i ? { ...x, ...n } : x)) })
                  return (
                    <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
                      <select className="input min-w-0 flex-1" value={u.farmacoId} onChange={(e) => { const nf = farmacoDi(e.target.value); cambia({ farmacoId: e.target.value, costoUnitario: nf ? costoUnitario(nf) : 0 }) }}>
                        <option value="">— scegli —</option>
                        {dati.farmaci.map((x) => <option key={x.id} value={x.id}>{x.nome} ({fmtEur(costoUnitario(x))}/{x.unita}, in magazzino {x.giacenza} {x.unita})</option>)}
                      </select>
                      <input className="input w-24 text-right" inputMode="decimal" placeholder="qtà" value={u.quantita || ''} onChange={(e) => cambia({ quantita: Number(e.target.value.replace(',', '.')) || 0 })} />
                      <span className="w-16 text-sm text-stone-500">{f?.unita ?? ''}</span>
                      <span className="w-20 text-right text-sm font-medium">{fmtEur(u.quantita * u.costoUnitario)}</span>
                      <button type="button" className="text-stone-400 hover:text-red-700" onClick={() => setModifica({ ...modifica, farmaci: modifica.farmaci!.filter((_, j) => j !== i) })} aria-label="Togli"><X className="h-4 w-4" /></button>
                    </div>
                  )
                })}
              </div>
              <Campo label="Altri costi (€) · veterinario, manodopera…"><input className="input" type="number" min={0} step="0.01" value={modifica.costoAltro ?? ''} onChange={(e) => setModifica({ ...modifica, costoAltro: e.target.value === '' ? undefined : Number(e.target.value) })} /></Campo>
              <div className="self-end pb-2 text-sm text-stone-600">Costo farmaci: <b>{fmtEur(costoFarmaci(modifica))}</b>{sospensione(modifica) > 0 && <span className="block text-amber-700">Sospensione latte: {sospensione(modifica)} giorni dall'ultima somministrazione</span>}</div>
              <Campo label="Inizio *"><input className="input" type="date" required max={oggi} value={modifica.dataInizio} onChange={(e) => setModifica({ ...modifica, dataInizio: e.target.value })} /></Campo>
              <Campo label="Guarigione (vuoto = in corso)"><input className="input" type="date" min={modifica.dataInizio} max={oggi} value={modifica.dataFine ?? ''} onChange={(e) => setModifica({ ...modifica, dataFine: e.target.value })} /></Campo>
              <Campo label="Note" className="sm:col-span-2"><textarea className="input" value={modifica.note ?? ''} onChange={(e) => setModifica({ ...modifica, note: e.target.value })} /></Campo>
              {anteprima && anteprima.giorni > 0 && (
                <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700 sm:col-span-2">
                  Con i dati caricati: atteso <b>{anteprima.media != null ? `${fmt1(anteprima.media)} kg/giorno` : '—'}</b>
                  {anteprima.fonte === 'simili' && ` (da ${anteprima.nSimili} vacche simili)`}, prodotto <b>{anteprima.mediaDurante != null ? fmt1(anteprima.mediaDurante) : '—'}</b> su {anteprima.giorni} giorni
                  → latte perso <b>{fmt0(anteprima.calo + anteprima.separato)} kg</b>{anteprima.separato > 0 && ` (di cui ${fmt0(anteprima.separato)} separati)`},
                  circa <b>{fmtEur(euroDaKg(anteprima.calo + anteprima.separato, prezzo))}</b>.
                  Costo totale del caso: <b>{fmtEur(euroDaKg(anteprima.calo + anteprima.separato, prezzo) + costoFarmaci(modifica) + (modifica.costoAltro ?? 0))}</b>.
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" className="btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
                <button className="btn-primary">Salva</button>
              </div>
            </form>
          </Modale>
        )
      })()}
    </>
  )
}
