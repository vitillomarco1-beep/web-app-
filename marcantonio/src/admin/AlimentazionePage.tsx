import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Scarico, Stalla, Turno } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile, Vuoto } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, isoGiorno, lunediDi, nuovoId } from '../lib/format'
import { perGiorno } from '../lib/statistiche'
import { parseKg, pesateDaScarichi, scarichiDaPesate } from '../lib/pesate'
import VerificaSettimanale from './VerificaSettimanale'
import FotoPesate from '../components/FotoPesate'

const TURNI: Turno[] = ['mattina', 'sera']
type Griglia = Record<string, string> // chiave `${stalla}-${turno}` -> kg digitati
const chiave = (stalla: number, turno: Turno) => `${stalla}-${turno}`

export default function AlimentazionePage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const stalle = [...dati.stalle].sort((a, b) => a.numero - b.numero)
  const scarichi = dati.scarichi

  const [scheda, setScheda] = useState<'scarichi' | 'verifica'>('scarichi')

  // ---- Inserimento del giorno: pesate del carro (predefinito) o kg diretti per stalla
  const [giorno, setGiorno] = useState(oggi)
  const [modo, setModo] = useState<'pesate' | 'diretto'>('pesate')
  const [griglia, setGriglia] = useState<Griglia>({})
  const [pesate, setPesate] = useState<Record<Turno, string[]>>({ mattina: [], sera: [] })
  const [parziali, setParziali] = useState<Record<Turno, boolean>>({ mattina: false, sera: false })
  const [salvato, setSalvato] = useState(false)
  const [errore, setErrore] = useState('')
  const [turnoErrato, setTurnoErrato] = useState<Turno | null>(null)
  const delGiorno = useMemo(() => scarichi.filter((s) => s.data === giorno), [scarichi, giorno])
  const numeri = stalle.map((s) => s.numero) // ordine di scarico = numero di stalla

  useEffect(() => {
    const g: Griglia = {}
    for (const s of delGiorno) g[chiave(s.stalla, s.turno)] = String((Number(g[chiave(s.stalla, s.turno)]) || 0) + s.kg)
    setGriglia(g)
    const p: Record<Turno, string[]> = { mattina: [], sera: [] }
    const parz: Record<Turno, boolean> = { mattina: false, sera: false }
    for (const t of TURNI) {
      const kg = numeri.map((n) => (g[chiave(n, t)] !== undefined ? Number(g[chiave(n, t)]) : null))
      const letture = pesateDaScarichi(kg)
      if (letture) p[t] = letture.map(String)
      else parz[t] = kg.some((k) => k !== null)
    }
    setPesate(p)
    setParziali(parz)
    setSalvato(false)
    setErrore('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giorno, delGiorno, numeri.join(',')])

  /** kg per stalla calcolati dalle pesate di un turno, nell'ordine di scarico. */
  const calcolati = (t: Turno) => scarichiDaPesate(numeri.map((_, i) => parseKg(pesate[t][i])))

  const scriviScarico = (stalla: number, t: Turno, kg: number | null) => {
    const esistenti = delGiorno.filter((s) => s.stalla === stalla && s.turno === t)
    if (kg === null) { esistenti.forEach((s) => elimina('scarichi', s.id)); return }
    const [primo, ...doppi] = esistenti
    if (primo) { if (primo.kg !== kg) aggiorna('scarichi', { ...primo, kg }) }
    else aggiungi('scarichi', { id: nuovoId(), data: giorno, turno: t, stalla, kg })
    doppi.forEach((s) => elimina('scarichi', s.id))
  }

  const salvaGiorno = (e: FormEvent) => {
    e.preventDefault()
    setErrore('')
    setTurnoErrato(null)
    if (modo === 'diretto') {
      for (const n of numeri) for (const t of TURNI) scriviScarico(n, t, parseKg(griglia[chiave(n, t)]))
      setSalvato(true)
      return
    }
    // controlli: ogni pesata deve essere minore o uguale alla precedente
    for (const t of TURNI) {
      const kg = calcolati(t)
      const neg = kg.findIndex((k) => k !== null && k < 0)
      if (neg >= 0) {
        setErrore(`${t === 'mattina' ? 'Mattina' : 'Sera'}: una pesata è più alta della precedente, ma durante il giro il carro può solo alleggerirsi. Le foto sono probabilmente arrivate in ordine diverso.`)
        setTurnoErrato(t)
        return
      }
    }
    for (const t of TURNI) {
      const vuoto = pesate[t].every((v) => !v?.trim())
      if (vuoto && parziali[t]) continue // kg inseriti direttamente: non toccarli
      const kg = calcolati(t)
      numeri.forEach((n, i) => {
        // se manca la lettura necessaria per una stalla, il suo scarico resta com'era
        if (kg[i] === null && !vuoto) return
        scriviScarico(n, t, kg[i])
      })
    }
    setSalvato(true)
  }

  // ---- Statistiche
  const ultimoGiorno = scarichi.reduce((m, s) => (s.data > m ? s.data : m), '')
  const kgDi = (lista: Scarico[]) => lista.reduce((s, x) => s + x.kg, 0)
  const sommaGiorno = (data: string, stalla?: number) =>
    kgDi(scarichi.filter((s) => s.data === data && (stalla === undefined || s.stalla === stalla)))

  // Le medie usano solo giorni conclusi: oggi è di solito ancora incompleto
  const ultimoCompleto = scarichi.reduce((m, s) => (s.data < oggi && s.data > m ? s.data : m), '') || ultimoGiorno
  const da7 = ultimoCompleto ? aggiungiGiorni(ultimoCompleto, -6) : oggi
  const scarichi7 = scarichi.filter((s) => s.data >= da7 && s.data <= ultimoCompleto)
  const giorni7 = new Set(scarichi7.map((s) => s.data)).size || 1
  const mediaCapoStalla = (st: Stalla) => (st.capi > 0 ? kgDi(scarichi7.filter((s) => s.stalla === st.numero)) / giorni7 / st.capi : 0)
  const capiTotali = stalle.reduce((s, x) => s + x.capi, 0)
  const mediaCapo = capiTotali > 0 ? kgDi(scarichi7) / giorni7 / capiTotali : 0

  // Latte per kg di razione: tutte le stalle ospitano vacche in lattazione,
  // quindi si confronta la razione complessiva con il latte munto negli stessi giorni.
  const latteGiorni = perGiorno(dati.mungiture.filter((m) => m.data >= da7 && m.data <= ultimoCompleto))
  const litri7 = [...latteGiorni.values()].reduce((s, g) => s + g.litri, 0)
  const razione7 = kgDi(scarichi7.filter((s) => latteGiorni.has(s.data)))
  const ultimaMungitura = [...latteGiorni.values()].sort((a, b) => b.data.localeCompare(a.data))[0]

  // ---- Grafico per stalla
  const [stallaGrafico, setStallaGrafico] = useState<number | null>(null)
  const sg = stallaGrafico ?? stalle[0]?.numero ?? null
  const fineGrafico = ultimoGiorno || oggi
  const serie = Array.from({ length: 30 }, (_, i) => {
    const data = aggiungiGiorni(fineGrafico, i - 29)
    return { data, kg: sg === null ? 0 : sommaGiorno(data, sg) }
  })

  // ---- Registro ultimi 14 giorni
  const registroGiorni = Array.from({ length: 14 }, (_, i) => aggiungiGiorni(oggi, -i))
  const cella = (data: string, stalla: number, turno: Turno) => {
    const l = scarichi.filter((s) => s.data === data && s.stalla === stalla && s.turno === turno)
    return l.length ? kgDi(l) : null
  }

  // ---- Gestione stalle
  const [modStalla, setModStalla] = useState<Stalla | null>(null)
  const salvaStalla = (e: FormEvent) => {
    e.preventDefault()
    if (!modStalla) return
    if (dati.stalle.some((s) => s.numero === modStalla.numero && s.id !== modStalla.id)) {
      alert(`Esiste già la stalla n. ${modStalla.numero}.`)
      return
    }
    if (modStalla.id) aggiorna('stalle', modStalla)
    else aggiungi('stalle', { ...modStalla, id: nuovoId() })
    setModStalla(null)
  }
  const creaTreStalle = () => {
    ;[1, 2, 3].forEach((n) => aggiungi('stalle', { id: nuovoId(), numero: n, nome: `Stalla ${n}`, capi: 0 }))
  }

  if (stalle.length === 0) {
    return (
      <>
        <PageHeader titolo="Alimentazione" descrizione="Razione scaricata dal carro miscelatore, mattina e sera, per stalla" />
        <Vuoto>
          <p>Non ci sono ancora stalle configurate.</p>
          <button className="btn-primary mt-4" onClick={creaTreStalle}>Crea le stalle 1, 2 e 3</button>
        </Vuoto>
      </>
    )
  }

  const totaleGriglia = modo === 'diretto'
    ? Object.values(griglia).reduce((s, v) => s + (parseKg(v) ?? 0), 0)
    : TURNI.reduce((s, t) => s + calcolati(t).reduce<number>((a, k) => a + (k && k > 0 ? k : 0), 0), 0)
  const etichettaFoto = (i: number) =>
    i === 0 ? 'Carico totale'
      : i === numeri.length - 1 ? `Dopo st. ${numeri[i - 1]} → st. ${numeri[i]}`
        : `Dopo stalla ${numeri[i - 1]}`

  return (
    <>
      <PageHeader titolo="Alimentazione" descrizione="Razione scaricata dal carro miscelatore (peso tal quale), mattina e sera, per stalla" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta={ultimoCompleto ? `Razione scaricata il ${fmtData(ultimoCompleto)}` : 'Razione scaricata'}
          valore={fmt0(ultimoCompleto ? sommaGiorno(ultimoCompleto) : 0)} unita="kg"
          nota={stalle.map((s) => `St. ${s.numero}: ${fmt0(ultimoCompleto ? sommaGiorno(ultimoCompleto, s.numero) : 0)}`).join(' · ')} />
        <StatTile etichetta="Kg per vacca al giorno" valore={capiTotali > 0 ? fmt1(mediaCapo) : '—'} unita="kg/capo"
          nota={capiTotali > 0 ? `Media 7 giorni · ${stalle.map((s) => `St. ${s.numero}: ${s.capi ? fmt1(mediaCapoStalla(s)) : '—'}`).join(' · ')}` : 'Inserisci i capi presenti in ogni stalla'} />
        <StatTile etichetta="Latte per kg di razione" valore={razione7 > 0 ? fmt2(litri7 / razione7) : '—'} unita="l/kg"
          nota="Tutte le stalle, ultimi 7 giorni (razione tal quale)" />
        <StatTile etichetta="Vacche alimentate" valore={fmt0(capiTotali)} unita="capi"
          nota={ultimaMungitura ? <>Munte il {fmtData(ultimaMungitura.data)}: {ultimaMungitura.capi}{Math.abs(ultimaMungitura.capi - capiTotali) > capiTotali * 0.1 && <span className="font-medium text-amber-700"> · aggiorna i capi per stalla</span>}</> : 'Somma dei capi nelle stalle'} />
      </div>

      {(() => {
        const lunScorso = aggiungiGiorni(lunediDi(oggi), -7)
        const daVerificare = Array.from({ length: 8 }, (_, i) => aggiungiGiorni(lunScorso, -7 * i))
          .filter((l) => !dati.verifiche.some((v) => v.settimana === l) && scarichi.some((s) => s.data >= l && s.data <= aggiungiGiorni(l, 6))).length
        const cls = (s: typeof scheda) => `border-b-2 px-4 py-2 text-sm font-medium ${scheda === s ? 'border-brand-700 text-brand-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`
        return (
          <div className="mb-6 flex gap-1 border-b border-stone-200" role="tablist">
            <button role="tab" aria-selected={scheda === 'scarichi'} className={cls('scarichi')} onClick={() => setScheda('scarichi')}>Scarichi giornalieri</button>
            <button role="tab" aria-selected={scheda === 'verifica'} className={cls('verifica')} onClick={() => setScheda('verifica')}>
              Verifica settimanale {daVerificare > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800">{daVerificare}</span>}
            </button>
          </div>
        )
      })()}

      {scheda === 'verifica' ? (
        <VerificaSettimanale onApriGiorno={(d) => { setGiorno(d); setScheda('scarichi'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      ) : (<>
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Inserimento del giorno */}
        <section className="card xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-semibold">Inserisci gli scarichi del giorno</h2>
            <button type="button" className="btn-link text-xs" onClick={() => { setModo(modo === 'pesate' ? 'diretto' : 'pesate'); setErrore('') }}>
              {modo === 'pesate' ? 'Inserisci i kg per stalla' : 'Inserisci le pesate del carro'}
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {modo === 'pesate'
              ? `Scrivi i ${numeri.length} numeri delle foto della bilancia, nell'ordine: i kg scaricati in ogni stalla vengono calcolati.`
              : 'Kg scaricati in ogni stalla. Lascia vuoto se non c\'è stato scarico.'}
          </p>
          <form onSubmit={salvaGiorno} className="mt-4">
            <div className="mb-4 flex items-center gap-2">
              <button type="button" className="btn-secondary px-3" onClick={() => setGiorno(aggiungiGiorni(giorno, -1))} aria-label="Giorno precedente">‹</button>
              <input className="input" type="date" max={oggi} value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} />
              <button type="button" className="btn-secondary px-3" disabled={giorno >= oggi} onClick={() => setGiorno(aggiungiGiorni(giorno, 1))} aria-label="Giorno successivo">›</button>
            </div>

            {modo === 'pesate' ? (
              <div className="space-y-4">
                {TURNI.map((t) => {
                  const kg = calcolati(t)
                  return (
                    <fieldset key={t} className="rounded-lg border border-stone-200 p-3">
                      <legend className="px-1 text-sm font-semibold">{t === 'mattina' ? 'Mattina' : 'Sera'}</legend>
                      {parziali[t] && pesate[t].every((v) => !v) && (
                        <p className="mb-2 text-xs text-amber-800">Per questo turno ci sono kg inseriti direttamente solo per alcune stalle: correggili con “Inserisci i kg per stalla”.</p>
                      )}
                      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${numeri.length}, minmax(0, 1fr))` }}>
                        {numeri.map((_, i) => (
                          <label key={i} className="block">
                            <span className="mb-1 block text-[11px] font-medium leading-tight text-stone-600">Foto {i + 1}<br />{etichettaFoto(i)}</span>
                            <input className="input text-right tabular-nums" inputMode="decimal" aria-label={`${t}, foto ${i + 1}: ${etichettaFoto(i)}`}
                              value={pesate[t][i] ?? ''}
                              onChange={(e) => {
                                setSalvato(false); setErrore('')
                                const nuove = [...pesate[t]]; nuove[i] = e.target.value.replace(/[^\d.,]/g, '')
                                setPesate({ ...pesate, [t]: nuove })
                              }} />
                          </label>
                        ))}
                      </div>
                      <FotoPesate data={giorno} turno={t} quante={numeri.length} etichette={numeri.map((_, i) => etichettaFoto(i))} />
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {numeri.map((n, i) => (
                          <span key={n} className={kg[i] !== null && kg[i]! < 0 ? 'font-semibold text-red-700' : 'text-stone-600'}>
                            Stalla {n}: <b className="tabular-nums">{kg[i] === null ? '—' : `${fmt0(kg[i]!)} kg`}</b>
                          </span>
                        ))}
                      </div>
                    </fieldset>
                  )
                })}
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Stalla</th><th className="num">Mattina (kg)</th><th className="num">Sera (kg)</th></tr></thead>
                <tbody>
                  {stalle.map((st) => (
                    <tr key={st.id}>
                      <td><b>{st.numero}</b> <span className="text-xs text-stone-500">{st.nome}</span></td>
                      {TURNI.map((t) => (
                        <td key={t} className="num">
                          <input className="input w-28 text-right tabular-nums" inputMode="decimal" aria-label={`Stalla ${st.numero}, ${t}`}
                            value={griglia[chiave(st.numero, t)] ?? ''}
                            onChange={(e) => { setSalvato(false); setGriglia({ ...griglia, [chiave(st.numero, t)]: e.target.value.replace(/[^\d.,]/g, '') }) }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {errore && (
              <div className="mt-3 text-sm text-red-700" role="alert">
                <p>✕ {errore}</p>
                {turnoErrato && (
                  <button type="button" className="btn-secondary mt-2" onClick={() => {
                    // il carro si svuota durante il giro: l'ordine giusto è dalla pesata più alta alla più bassa
                    const ordinate = [...pesate[turnoErrato]].map((v) => ({ v, n: parseKg(v) ?? -1 })).sort((a, b) => b.n - a.n).map((x) => x.v)
                    setPesate({ ...pesate, [turnoErrato]: ordinate })
                    setErrore(''); setTurnoErrato(null)
                  }}>Riordina dalla più pesante alla più leggera</button>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-stone-600">Totale scaricato: <b className="tabular-nums">{fmt0(totaleGriglia)} kg</b></span>
              <div className="flex items-center gap-3">
                {salvato && <span className="text-sm text-green-700">✓ Salvato</span>}
                <button className="btn-primary">Salva</button>
              </div>
            </div>
          </form>
        </section>

        {/* Grafico */}
        <section className="card xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Kg scaricati al giorno – ultimi 30 giorni</h2>
            <div className="flex gap-1" role="group" aria-label="Stalla">
              {stalle.map((s) => (
                <button key={s.id} onClick={() => setStallaGrafico(s.numero)}
                  className={`rounded-full px-3 py-1 text-sm ${sg === s.numero ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
                  Stalla {s.numero}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <BarChart unita="kg" formatta={fmt0}
              dati={serie.map((g) => ({ etichetta: fmtData(g.data).slice(0, 5), valore: g.kg, dettaglio: `${fmtData(g.data)} · stalla ${sg}` }))} />
          </div>
        </section>
      </div>

      {/* Registro */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="font-semibold">Registro ultimi 14 giorni</h2>
          <span className="text-xs text-stone-500">Clicca su un giorno per modificarlo</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              {stalle.map((s) => <th key={s.id} className="num" colSpan={2}>Stalla {s.numero} (M / S)</th>)}
              <th className="num">Totale kg</th>
            </tr>
          </thead>
          <tbody>
            {registroGiorni.map((data) => {
              const tot = sommaGiorno(data)
              return (
                <tr key={data} className="cursor-pointer" onClick={() => { setGiorno(data); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <td className={data === giorno ? 'font-semibold text-brand-800' : ''}>{fmtData(data)}</td>
                  {stalle.flatMap((s) => TURNI.map((t) => {
                    const v = cella(data, s.numero, t)
                    return (
                      <td key={`${s.id}-${t}`} className="num">
                        {v === null ? <span className="text-xs font-medium text-amber-700">manca</span> : fmt0(v)}
                      </td>
                    )
                  }))}
                  <td className="num font-semibold">{tot ? fmt0(tot) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Stalle */}
      <section className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Stalle</h2>
          <button className="btn-link" onClick={() => setModStalla({ id: '', numero: Math.max(0, ...stalle.map((s) => s.numero)) + 1, nome: '', capi: 0 })}>+ Aggiungi stalla</button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Il numero deve corrispondere a quello che i collaboratori scrivono nei messaggi. Tutte le stalle ospitano vacche in lattazione: tieni aggiornato il numero di capi di ciascuna per avere i kg per capo corretti.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {stalle.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-brand-800">{s.numero}</div>
                  <div className="text-sm font-medium">{s.nome || `Stalla ${s.numero}`}</div>
                  <div className="text-sm text-stone-500">{s.capi} capi{s.capi > 0 && ` · ${fmt1(mediaCapoStalla(s))} kg/capo/giorno`}</div>
                </div>
                <button className="btn-link" onClick={() => setModStalla(s)}>Modifica</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      </>)}

      {modStalla && (
        <Modale titolo={modStalla.id ? `Modifica stalla ${modStalla.numero}` : 'Nuova stalla'} onChiudi={() => setModStalla(null)}>
          <form onSubmit={salvaStalla} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Numero *"><input className="input" type="number" min={1} required value={modStalla.numero} onChange={(e) => setModStalla({ ...modStalla, numero: Number(e.target.value) })} disabled={!!modStalla.id} /></Campo>
            <Campo label="Capi presenti"><input className="input" type="number" min={0} value={modStalla.capi} onChange={(e) => setModStalla({ ...modStalla, capi: Number(e.target.value) })} /></Campo>
            <Campo label="Nome / gruppo" className="sm:col-span-2"><input className="input" placeholder="es. Lattazione – primipare" value={modStalla.nome} onChange={(e) => setModStalla({ ...modStalla, nome: e.target.value })} /></Campo>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setModStalla(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}
    </>
  )
}
