import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Baby, Ban, Check, CirclePlus, Dna, HeartHandshake, LogOut, Moon, NotebookPen, Search, Stethoscope, Timer, type LucideIcon } from 'lucide-react'
import { useStore } from '../lib/store'
import type { ImportDC } from '../lib/types'
import { PageHeader } from '../components/ui'
import { PROTOCOLLI, allinea, applicaEvento, nomeTipo, partiDaMandria, passiDaFare, protocollo, type DatiEvento, type TipoEvento } from '../lib/registro'
import { statoRipro, NOMI_STATO } from '../lib/fertilita'
import { aggiungiGiorni, fmtData, isoGiorno, nuovoId } from '../lib/format'

type Scheda = TipoEvento | 'sincronizzazione'
const SCHEDE: { id: Scheda; nome: string; icona: LucideIcon; aiuto: string }[] = [
  { id: 'parto', nome: 'Parto', icona: Baby, aiuto: 'Nuova lattazione; i vitelli entrano in mandria' },
  { id: 'fecondazione', nome: 'Fecondazione', icona: Dna, aiuto: 'Con il toro usato' },
  { id: 'diagnosi', nome: 'Diagnosi', icona: Stethoscope, aiuto: 'Gravida o vuota: parto e asciutta si calcolano da soli' },
  { id: 'asciutta', nome: 'Asciutta', icona: Moon, aiuto: 'Con il trattamento usato' },
  { id: 'sincronizzazione', nome: 'Sincronizzazione', icona: Timer, aiuto: 'Avvia un protocollo: ogni giorno la lista delle iniezioni' },
  { id: 'calore', nome: 'Calore', icona: HeartHandshake, aiuto: 'Visto ma non fecondata' },
  { id: 'spostamento', nome: 'Cambio gruppo', icona: ArrowRightLeft, aiuto: 'Da un gruppo all’altro' },
  { id: 'nascita', nome: 'Nascita o acquisto', icona: CirclePlus, aiuto: 'Un animale nuovo in mandria' },
  { id: 'nonFecondare', nome: 'Non fecondare', icona: Ban, aiuto: 'Da riformare a fine lattazione' },
  { id: 'uscita', nome: 'Uscita', icona: LogOut, aiuto: 'Venduta, macellata o morta' },
]

const listaVuota = (oggi: string): ImportDC => ({ id: `registro-${oggi}`, data: oggi, importatoIl: new Date().toISOString(), nomeFile: 'Registro della mandria', animali: [] })

/** Registro della mandria: il gestionale per chi non ha DairyComp. Ogni evento aggiorna mandria e liste di lavoro. */
export default function RegistroPage() {
  const { dati, imposta, aggiorna, aggiungi } = useStore()
  const oggi = isoGiorno()
  const lista = dati.mandriaDC[0]
  const animali = useMemo(() => lista?.animali ?? [], [lista])
  const [scheda, setScheda] = useState<Scheda | null>(null)
  const [f, setF] = useState<DatiEvento & { protocollo?: string; daPasso?: { sinc: string; passo: string } }>({ tipo: 'parto', vacca: '', data: oggi })
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null)
  const [cerca, setCerca] = useState('')

  const gruppi = useMemo(() => {
    const g = new Set<number>()
    animali.forEach((a) => a.gruppo !== null && g.add(a.gruppo))
    dati.nomiGruppi.forEach((x) => Number.isFinite(Number(x.id)) && g.add(Number(x.id)))
    return [...g].sort((a, b) => a - b)
  }, [animali, dati.nomiGruppi])
  const nomeGruppo = (g: number) => dati.nomiGruppi.find((x) => x.id === String(g))?.nome ?? `Gruppo ${g}`
  // gruppo più usato da chi è in un certo stato: proposta per il parto e l'asciutta
  const gruppoTipico = (filtro: (c: string, latt: number) => boolean) => {
    const conta = new Map<number, number>()
    animali.forEach((a) => a.gruppo !== null && filtro((a.codiceRiproduttivo ?? '').toUpperCase(), a.lattazione ?? 0) && conta.set(a.gruppo, (conta.get(a.gruppo) ?? 0) + 1))
    return [...conta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }
  const tori = useMemo(() => [...new Set(animali.map((a) => String(a.extra?.UTOR ?? '')).filter((t) => t && t !== '-'))].sort(), [animali])

  // animali proposti nella casella del numero, secondo l'evento
  const proposti = (t: Scheda) => animali.filter((a) => {
    const s = statoRipro(a)
    if (t === 'parto') return s === 'gravida'
    if (t === 'fecondazione' || t === 'sincronizzazione' || t === 'calore') return s === 'vuota' || s === 'attesa' || s === 'manza' || s === 'fecondata'
    if (t === 'diagnosi') return s === 'fecondata'
    if (t === 'asciutta') return s === 'gravida' && (a.lattazione ?? 0) >= 1 && !/^ASC/i.test(a.codiceRiproduttivo ?? '')
    return true
  }).map((a) => a.id)

  const apri = (t: Scheda, vacca = '', extra: Partial<typeof f> = {}) => {
    setEsito(null)
    setScheda(t)
    const gruppo = t === 'parto' ? gruppoTipico((c, l) => c.startsWith('PARTO') && l >= 2) : t === 'asciutta' ? gruppoTipico((c) => c.startsWith('ASC')) : null
    setF({ tipo: t === 'sincronizzazione' ? 'fecondazione' : t, vacca, data: oggi, gruppo, esito: 'positiva', facilita: 'facile', vitelli: [{ id: '', sesso: 'F' }], protocollo: 'ovsynch', nota: t === 'asciutta' ? 'antibiotico e sigillante' : t === 'uscita' ? 'venduta' : '', ...extra })
  }

  const salva = () => {
    if (!scheda) return
    if (scheda === 'sincronizzazione') {
      const v = f.vacca.trim()
      if (!animali.some((a) => a.id === v)) { setEsito({ ok: false, testo: `La vacca ${v || '?'} non è in mandria.` }); return }
      const p = protocollo(f.protocollo ?? 'ovsynch')!
      aggiungi('sincronizzazioni', { id: nuovoId(), vacca: v, protocollo: p.id, inizio: f.data, fatti: [] })
      aggiungi('eventi', { id: nuovoId(), data: f.data, tipo: 'calore', vacca: v, testo: `Avviata sincronizzazione ${p.nome}` })
      setEsito({ ok: true, testo: `✓ ${v}: ${p.nome} dal ${fmtData(f.data)}. Le iniezioni compaiono qui sopra nel giorno giusto.` })
      setScheda(null)
      return
    }
    const base = allinea(lista ?? listaVuota(oggi), oggi)
    const vitelle = new Map<number, number>()
    animali.forEach((x) => x.gruppo !== null && (x.lattazione ?? 0) === 0 && typeof x.giorniVita === 'number' && x.giorniVita <= 90 && vitelle.set(x.gruppo, (vitelle.get(x.gruppo) ?? 0) + 1))
    const gruppoVitelli = [...vitelle].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null
    const r = applicaEvento(base, { ...f, gruppoVitelli })
    if ('errore' in r) { setEsito({ ok: false, testo: r.errore }); return }
    imposta('mandriaDC', [r.lista])
    imposta('partiDC', [partiDaMandria(r.lista)])
    imposta('eventi', [r.evento, ...dati.eventi])
    if (f.daPasso) {
      const s = dati.sincronizzazioni.find((x) => x.id === f.daPasso!.sinc)
      if (s) aggiorna('sincronizzazioni', { ...s, fatti: [...s.fatti, f.daPasso.passo], chiusa: true })
    }
    // una fecondazione o un parto chiudono le sincronizzazioni ancora aperte di quella vacca
    if (f.tipo === 'fecondazione' || f.tipo === 'parto' || f.tipo === 'uscita') {
      dati.sincronizzazioni.filter((x) => x.vacca === r.evento.vacca && !x.chiusa && x.id !== f.daPasso?.sinc).forEach((x) => aggiorna('sincronizzazioni', { ...x, chiusa: true }))
    }
    setEsito({ ok: true, testo: `✓ Registrato · ${nomeTipo(r.evento.tipo)}, ${r.evento.vacca}: ${r.evento.testo}` })
    setScheda(null)
  }

  const passi = passiDaFare(dati.sincronizzazioni, oggi, 3)
  const segnaPasso = (sId: string, passoId: string) => {
    const s = dati.sincronizzazioni.find((x) => x.id === sId)
    if (!s) return
    const p = protocollo(s.protocollo)
    const fatti = [...s.fatti, passoId]
    aggiorna('sincronizzazioni', { ...s, fatti, chiusa: p ? p.passi.every((x) => fatti.includes(x.id)) : false })
  }

  const ev = dati.eventi.filter((e) => !cerca.trim() || e.vacca === cerca.trim()).slice(0, 40)
  const a = animali.find((x) => x.id === f.vacca.trim())
  const campo = 'input'

  return (
    <>
      <PageHeader titolo="Registro della mandria" icona={NotebookPen} descrizione="Ogni evento aggiorna la mandria, i parti previsti, le asciutte, la fertilità e le liste dei vaccini" />

      {/* ---- da fare con le sincronizzazioni */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2>Sincronizzazioni: da fare</h2>
          <span className="text-sm text-stone-500">{dati.sincronizzazioni.filter((s) => !s.chiusa).length} vacche in protocollo</span>
        </div>
        {passi.length === 0 ? <p className="mt-2 text-sm text-stone-500">Niente da fare nei prossimi giorni.</p> : (
          <ul className="mt-3 divide-y divide-stone-100">
            {passi.map(({ s, p, passo, giorno, ritardo }) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="w-14 font-serif text-lg font-bold text-brand-900">{s.vacca}</span>
                <span className="min-w-0 flex-1 text-sm"><b>{passo.cosa}</b> <span className="text-stone-500">· {p.nome}, giorno {passo.giorno}</span></span>
                <span className={`whitespace-nowrap text-sm ${ritardo > 0 ? 'font-semibold text-rose-700' : ritardo === 0 ? 'font-semibold text-brand-800' : 'text-stone-500'}`}>
                  {ritardo > 0 ? `in ritardo di ${ritardo} ${ritardo === 1 ? 'giorno' : 'giorni'}` : ritardo === 0 ? 'oggi' : `${fmtData(giorno).slice(0, 5)}`}
                </span>
                {ritardo >= 0 && (passo.fecondazione
                  ? <button className="btn-primary px-3 py-1.5 text-sm" onClick={() => apri('fecondazione', s.vacca, { daPasso: { sinc: s.id, passo: passo.id } })}><Dna className="h-4 w-4" />Registra fecondazione</button>
                  : <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => segnaPasso(s.id, passo.id)}><Check className="h-4 w-4" />Fatto</button>)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- eventi */}
      <h2 className="mb-3 mt-8">Registra un evento</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SCHEDE.map((s) => (
          <button key={s.id} type="button" onClick={() => apri(s.id)} aria-pressed={scheda === s.id}
            className={`rounded-2xl p-4 text-left transition ${scheda === s.id ? 'bg-brand-700 text-white shadow-lg' : 'bg-white ring-1 ring-stone-200 hover:ring-brand-300'}`}>
            <s.icona className="h-6 w-6" />
            <div className="mt-2 font-semibold">{s.nome}</div>
            <div className={`mt-0.5 text-xs ${scheda === s.id ? 'text-brand-100' : 'text-stone-500'}`}>{s.aiuto}</div>
          </button>
        ))}
      </div>
      {esito && <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${esito.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{esito.testo}</p>}

      {scheda && (
        <form className="card mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salva() }}>
          <h3 className="font-semibold sm:col-span-2">{SCHEDE.find((s) => s.id === scheda)?.nome}{f.daPasso ? ' · fine del protocollo' : ''}</h3>
          <label className="block">
            <span className="label">{scheda === 'nascita' ? 'Numero del nuovo animale' : 'Numero della vacca'}</span>
            <input id="reg-vacca" className={campo} list="reg-proposti" inputMode="numeric" autoFocus value={f.vacca} onChange={(e) => setF({ ...f, vacca: e.target.value })} required />
            {scheda !== 'nascita' && <datalist id="reg-proposti">{proposti(scheda).slice(0, 200).map((id) => <option key={id} value={id} />)}</datalist>}
            {a && scheda !== 'nascita' && <span className="mt-1 block text-xs text-stone-500">Gruppo {a.gruppo ?? '—'} · {a.lattazione ? `${a.lattazione}ª lattazione` : 'manza'} · {NOMI_STATO[statoRipro(a)].toLowerCase()}</span>}
          </label>
          <label className="block">
            <span className="label">{scheda === 'sincronizzazione' ? 'Primo giorno del protocollo' : 'Giorno'}</span>
            <input id="reg-data" type="date" className={campo} value={f.data} max={scheda === 'sincronizzazione' ? aggiungiGiorni(oggi, 14) : oggi} onChange={(e) => setF({ ...f, data: e.target.value })} required />
          </label>

          {scheda === 'parto' && <>
            <label className="block"><span className="label">Come è andato</span>
              <select id="reg-facilita" className={campo} value={f.facilita} onChange={(e) => setF({ ...f, facilita: e.target.value })}>
                {['facile', 'aiutato', 'difficile', 'cesareo'].map((x) => <option key={x}>{x}</option>)}
              </select></label>
            <GruppoSel valore={f.gruppo ?? null} gruppi={gruppi} nome={nomeGruppo} onChange={(g) => setF({ ...f, gruppo: g })} etichetta="Gruppo dopo il parto" />
            <div className="sm:col-span-2">
              <span className="label">Vitelli (lascia vuoto il numero se non resta in azienda)</span>
              {(f.vitelli ?? []).map((v, i) => (
                <div key={i} className="mt-1 flex flex-wrap gap-2">
                  <input id={`reg-vitello-${i}`} className="input !w-40" placeholder="Numero" value={v.id} onChange={(e) => setF({ ...f, vitelli: f.vitelli!.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)) })} />
                  <select id={`reg-sesso-${i}`} className="input !w-40" value={v.sesso} onChange={(e) => setF({ ...f, vitelli: f.vitelli!.map((x, j) => (j === i ? { ...x, sesso: e.target.value as 'F' | 'M' } : x)) })}>
                    <option value="F">femmina</option><option value="M">maschio</option>
                  </select>
                </div>
              ))}
              {(f.vitelli ?? []).length < 2 && <button type="button" className="btn-link mt-1 text-sm" onClick={() => setF({ ...f, vitelli: [...(f.vitelli ?? []), { id: '', sesso: 'F' }] })}>+ gemelli</button>}
            </div>
          </>}
          {scheda === 'fecondazione' && (
            <label className="block"><span className="label">Toro</span>
              <input id="reg-toro" className={campo} list="reg-tori" value={f.toro ?? ''} onChange={(e) => setF({ ...f, toro: e.target.value })} placeholder="es. DIAMANTE.S (S = sessato)" />
              <datalist id="reg-tori">{tori.map((t) => <option key={t} value={t} />)}</datalist></label>
          )}
          {scheda === 'diagnosi' && (
            <fieldset className="block"><span className="label">Esito</span>
              <div className="mt-1 flex gap-2">
                {(['positiva', 'negativa'] as const).map((x) => (
                  <button key={x} type="button" onClick={() => setF({ ...f, esito: x })} aria-pressed={f.esito === x}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${f.esito === x ? 'border-brand-700 bg-brand-700 text-white' : 'border-stone-300 bg-white'}`}>{x === 'positiva' ? 'Gravida' : 'Vuota'}</button>
                ))}
              </div></fieldset>
          )}
          {scheda === 'asciutta' && <>
            <label className="block"><span className="label">Trattamento</span>
              <select id="reg-tratt" className={campo} value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })}>
                {['antibiotico e sigillante', 'solo sigillante', 'nessun trattamento'].map((x) => <option key={x}>{x}</option>)}
              </select></label>
            <GruppoSel valore={f.gruppo ?? null} gruppi={gruppi} nome={nomeGruppo} onChange={(g) => setF({ ...f, gruppo: g })} etichetta="Gruppo delle asciutte" />
          </>}
          {(scheda === 'spostamento' || scheda === 'nascita') && <GruppoSel valore={f.gruppo ?? null} gruppi={gruppi} nome={nomeGruppo} onChange={(g) => setF({ ...f, gruppo: g })} etichetta="Nuovo gruppo" />}
          {scheda === 'nascita' && <>
            <label className="block"><span className="label">Matricola (se c'è già)</span><input id="reg-matr" className={campo} value={f.matricola ?? ''} onChange={(e) => setF({ ...f, matricola: e.target.value })} /></label>
            <label className="block"><span className="label">Giorni di vita (0 = nata in azienda)</span><input id="reg-eta" type="number" min={0} className={campo} value={f.nascitaGiorni ?? 0} onChange={(e) => setF({ ...f, nascitaGiorni: Number(e.target.value) || 0 })} /></label>
          </>}
          {scheda === 'uscita' && (
            <label className="block"><span className="label">Motivo</span>
              <select id="reg-motivo" className={campo} value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })}>
                {['venduta', 'macellata', 'morta'].map((x) => <option key={x}>{x}</option>)}
              </select></label>
          )}
          {scheda === 'sincronizzazione' && (
            <div className="sm:col-span-2">
              <span className="label">Protocollo</span>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {PROTOCOLLI.map((p) => (
                  <button key={p.id} type="button" onClick={() => setF({ ...f, protocollo: p.id })} aria-pressed={f.protocollo === p.id}
                    className={`rounded-xl border p-3 text-left ${f.protocollo === p.id ? 'border-brand-700 bg-brand-50' : 'border-stone-200 bg-white'}`}>
                    <b className="text-sm">{p.nome}</b>
                    <span className="mt-0.5 block text-xs text-stone-500">{p.passi.map((x) => `giorno ${x.giorno}: ${x.cosa.toLowerCase()}`).join(' · ')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {(scheda === 'calore' || scheda === 'nonFecondare' || scheda === 'parto' || scheda === 'fecondazione') && (
            <label className="block sm:col-span-2"><span className="label">Nota (facoltativa)</span><input id="reg-nota" className={campo} value={scheda === 'parto' ? (f.nota ?? '') : f.nota ?? ''} onChange={(e) => setF({ ...f, nota: e.target.value })} /></label>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary"><Check className="h-4 w-4" />Registra</button>
            <button type="button" className="btn-secondary" onClick={() => setScheda(null)}>Annulla</button>
          </div>
        </form>
      )}

      {/* ---- storico */}
      <section className="card mt-8 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Ultimi eventi</h2>
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input id="reg-cerca" className="input pl-9" placeholder="Solo una vacca…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
          </div>
        </div>
        {ev.length === 0 ? <p className="mt-3 text-sm text-stone-500">Nessun evento registrato.</p> : (
          <table className="table mt-3">
            <thead><tr><th>Giorno</th><th>Vacca</th><th>Evento</th><th>Dettagli</th></tr></thead>
            <tbody>
              {ev.map((e) => (
                <tr key={e.id}><td className="whitespace-nowrap">{fmtData(e.data)}</td><td className="font-semibold">{e.vacca}</td><td className="whitespace-nowrap">{nomeTipo(e.tipo)}</td><td className="text-stone-600">{e.testo}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-stone-500">Le liste di lavoro sono in <Link className="btn-link" to="/area-riservata/fertilita">Fertilità</Link> e <Link className="btn-link" to="/area-riservata/parti">Parti e vaccini</Link>; la storia di ogni vacca nella sua scheda in <Link className="btn-link" to="/area-riservata/mandria">Mandria</Link>.</p>
      </section>
    </>
  )
}

function GruppoSel({ valore, gruppi, nome, onChange, etichetta }: { valore: number | null; gruppi: number[]; nome: (g: number) => string; onChange: (g: number | null) => void; etichetta: string }) {
  return (
    <label className="block"><span className="label">{etichetta}</span>
      <select id={`reg-gruppo-${etichetta.length}`} className="input" value={valore ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">— invariato —</option>
        {gruppi.map((g) => <option key={g} value={g}>{g} · {nome(g)}</option>)}
      </select>
    </label>
  )
}
