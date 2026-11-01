import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Scarico, Stalla, Turno } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile, Vuoto } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, isoGiorno, lunediDi, nuovoId } from '../lib/format'
import { perGiorno } from '../lib/statistiche'
import VerificaSettimanale from './VerificaSettimanale'

const TURNI: Turno[] = ['mattina', 'sera']
type Griglia = Record<string, string> // chiave `${stalla}-${turno}` -> kg digitati
const chiave = (stalla: number, turno: Turno) => `${stalla}-${turno}`

export default function AlimentazionePage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const stalle = [...dati.stalle].sort((a, b) => a.numero - b.numero)
  const scarichi = dati.scarichi

  const [scheda, setScheda] = useState<'scarichi' | 'verifica'>('scarichi')

  // ---- Griglia di inserimento del giorno
  const [giorno, setGiorno] = useState(oggi)
  const [griglia, setGriglia] = useState<Griglia>({})
  const [salvato, setSalvato] = useState(false)
  const delGiorno = useMemo(() => scarichi.filter((s) => s.data === giorno), [scarichi, giorno])

  useEffect(() => {
    const g: Griglia = {}
    for (const s of delGiorno) g[chiave(s.stalla, s.turno)] = String(s.kg)
    setGriglia(g)
    setSalvato(false)
  }, [giorno, delGiorno])

  const salvaGiorno = (e: FormEvent) => {
    e.preventDefault()
    for (const st of stalle) {
      for (const t of TURNI) {
        const val = griglia[chiave(st.numero, t)]?.trim()
        const esistenti = delGiorno.filter((s) => s.stalla === st.numero && s.turno === t)
        if (!val) {
          esistenti.forEach((s) => elimina('scarichi', s.id))
          continue
        }
        const kg = Number(val.replace(',', '.'))
        if (!Number.isFinite(kg) || kg < 0) continue
        const [primo, ...doppi] = esistenti
        if (primo) {
          if (primo.kg !== kg) aggiorna('scarichi', { ...primo, kg })
        } else {
          aggiungi('scarichi', { id: nuovoId(), data: giorno, turno: t, stalla: st.numero, kg })
        }
        doppi.forEach((s) => elimina('scarichi', s.id))
      }
    }
    setSalvato(true)
  }

  // ---- Statistiche
  const ultimoGiorno = scarichi.reduce((m, s) => (s.data > m ? s.data : m), '')
  const kgDi = (lista: Scarico[]) => lista.reduce((s, x) => s + x.kg, 0)
  const sommaGiorno = (data: string, stalla?: number) =>
    kgDi(scarichi.filter((s) => s.data === data && (stalla === undefined || s.stalla === stalla)))

  const da7 = ultimoGiorno ? aggiungiGiorni(ultimoGiorno, -6) : oggi
  const giorni7 = new Set(scarichi.filter((s) => s.data >= da7 && s.data <= ultimoGiorno).map((s) => s.data)).size || 1
  const mediaCapoStalla = (st: Stalla) => {
    const kg = kgDi(scarichi.filter((s) => s.stalla === st.numero && s.data >= da7 && s.data <= ultimoGiorno))
    return st.capi > 0 ? kg / giorni7 / st.capi : 0
  }

  // Latte per kg di razione: confronto tra la stalla delle vacche in lattazione e le mungiture
  const stallaLatte = stalle.find((s) => /latt/i.test(s.nome)) ?? stalle[0]
  const latteGiorni = perGiorno(dati.mungiture.filter((m) => m.data >= da7 && m.data <= ultimoGiorno))
  const litri7 = [...latteGiorni.values()].reduce((s, g) => s + g.litri, 0)
  const razioneLatte7 = stallaLatte
    ? kgDi(scarichi.filter((s) => s.stalla === stallaLatte.numero && s.data >= da7 && s.data <= ultimoGiorno && latteGiorni.has(s.data)))
    : 0

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

  const totaleGriglia = Object.values(griglia).reduce((s, v) => s + (Number(String(v).replace(',', '.')) || 0), 0)

  return (
    <>
      <PageHeader titolo="Alimentazione" descrizione="Razione scaricata dal carro miscelatore (peso tal quale), mattina e sera, per stalla" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta={ultimoGiorno ? `Razione scaricata il ${fmtData(ultimoGiorno)}` : 'Razione scaricata'}
          valore={fmt0(ultimoGiorno ? sommaGiorno(ultimoGiorno) : 0)} unita="kg"
          nota={stalle.map((s) => `St. ${s.numero}: ${fmt0(ultimoGiorno ? sommaGiorno(ultimoGiorno, s.numero) : 0)}`).join(' · ')} />
        {stalle.slice(0, 2).map((s) => (
          <StatTile key={s.id} etichetta={`Stalla ${s.numero} – kg per capo al giorno`} valore={s.capi > 0 ? fmt1(mediaCapoStalla(s)) : '—'} unita="kg/capo"
            nota={`${s.nome} · ${s.capi} capi · media 7 giorni`} />
        ))}
        <StatTile etichetta="Latte per kg di razione" valore={razioneLatte7 > 0 ? fmt2(litri7 / razioneLatte7) : '—'} unita="l/kg"
          nota={stallaLatte ? `Stalla ${stallaLatte.numero}, ultimi 7 giorni (razione tal quale)` : '—'} />
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
          <h2 className="font-semibold">Inserisci gli scarichi del giorno</h2>
          <p className="mt-1 text-xs text-stone-500">Kg letti sulla pesata del carro. Lascia vuoto se non c'è stato scarico.</p>
          <form onSubmit={salvaGiorno} className="mt-4">
            <div className="mb-4 flex items-center gap-2">
              <button type="button" className="btn-secondary px-3" onClick={() => setGiorno(aggiungiGiorni(giorno, -1))} aria-label="Giorno precedente">‹</button>
              <input className="input" type="date" max={oggi} value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} />
              <button type="button" className="btn-secondary px-3" disabled={giorno >= oggi} onClick={() => setGiorno(aggiungiGiorni(giorno, 1))} aria-label="Giorno successivo">›</button>
            </div>
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
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-stone-600">Totale: <b className="tabular-nums">{fmt0(totaleGriglia)} kg</b></span>
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
        <p className="mt-1 text-xs text-stone-500">Il numero deve corrispondere a quello che i collaboratori scrivono nei messaggi. Tieni aggiornato il numero di capi per avere i kg per capo corretti.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {stalle.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-brand-800">{s.numero}</div>
                  <div className="text-sm font-medium">{s.nome || `Stalla ${s.numero}`}</div>
                  <div className="text-sm text-stone-500">{s.capi} capi</div>
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
            <Campo label="Nome / gruppo" className="sm:col-span-2"><input className="input" placeholder="es. Vacche in lattazione" value={modStalla.nome} onChange={(e) => setModStalla({ ...modStalla, nome: e.target.value })} /></Campo>
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
