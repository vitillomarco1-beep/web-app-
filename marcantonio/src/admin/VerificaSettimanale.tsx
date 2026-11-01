import { useState } from 'react'
import { useStore } from '../lib/store'
import type { Turno } from '../lib/types'
import { Vuoto, conferma } from '../components/ui'
import { aggiungiGiorni, fmt0, fmt1, fmtData, fmtDataOra, isoGiorno, lunediDi, nuovoId } from '../lib/format'

const TURNI: Turno[] = ['mattina', 'sera']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
/** Scostamento dalla mediana delle 4 settimane precedenti oltre il quale un valore viene segnalato. */
const SOGLIA_ANOMALIA = 0.15

function mediana(v: number[]): number | null {
  if (v.length === 0) return null
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function VerificaSettimanale({ onApriGiorno }: { onApriGiorno: (data: string) => void }) {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const lunCorrente = lunediDi(oggi)
  const [lun, setLun] = useState(aggiungiGiorni(lunCorrente, -7)) // di default la settimana scorsa
  const [verificatore, setVerificatore] = useState(() => [...dati.verifiche].sort((a, b) => b.verificataIl.localeCompare(a.verificataIl))[0]?.verificataDa ?? '')
  const [note, setNote] = useState('')

  const stalle = [...dati.stalle].sort((a, b) => a.numero - b.numero)
  const dom = aggiungiGiorni(lun, 6)
  const giorni = Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lun, i))
  const scarichiSett = dati.scarichi.filter((s) => s.data >= lun && s.data <= dom)
  const totaleSett = scarichiSett.reduce((t, s) => t + s.kg, 0)
  const verifica = dati.verifiche.find((v) => v.settimana === lun)
  const modificataDopo = verifica && verifica.totaleKg !== totaleSett

  // Riferimento per le anomalie: mediana dei 28 giorni precedenti, per stalla e turno
  const riferimento = (stalla: number, turno: Turno) =>
    mediana(dati.scarichi.filter((s) => s.stalla === stalla && s.turno === turno && s.data >= aggiungiGiorni(lun, -28) && s.data < lun).map((s) => s.kg))

  const valore = (data: string, stalla: number, turno: Turno) => {
    const l = scarichiSett.filter((s) => s.data === data && s.stalla === stalla && s.turno === turno)
    return l.length ? l.reduce((t, s) => t + s.kg, 0) : null
  }

  let mancanti = 0, anomalie = 0, attesi = 0
  const celle = giorni.map((data) =>
    stalle.flatMap((st) => TURNI.map((t) => {
      const futuro = data > oggi
      const v = valore(data, st.numero, t)
      const ref = riferimento(st.numero, t)
      const scost = v !== null && ref ? (v - ref) / ref : null
      const anomalo = scost !== null && Math.abs(scost) > SOGLIA_ANOMALIA
      if (!futuro) { attesi++; if (v === null) mancanti++; if (anomalo) anomalie++ }
      return { chiave: `${st.id}-${t}`, v, scost, anomalo, futuro }
    })),
  )

  const settimanaFutura = lun > lunCorrente
  const settimanaInCorso = lun === lunCorrente

  const segnaVerificata = () => {
    if (!verificatore.trim()) { alert('Indica chi ha fatto la verifica.'); return }
    if (mancanti > 0 && !conferma(`Mancano ${mancanti} scarichi in questa settimana. Segnarla comunque come verificata?`)) return
    const v = { id: verifica?.id ?? nuovoId(), settimana: lun, verificataIl: new Date().toISOString(), verificataDa: verificatore.trim(), totaleKg: totaleSett, note: note.trim() || undefined }
    if (verifica) aggiorna('verifiche', v)
    else aggiungi('verifiche', v)
    setNote('')
  }

  // Elenco delle ultime settimane con il loro stato
  const settimane = Array.from({ length: 10 }, (_, i) => aggiungiGiorni(lunCorrente, -7 * i))

  if (stalle.length === 0) return <Vuoto>Configura prima le stalle.</Vuoto>

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <div className="xl:col-span-3">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button className="btn-secondary px-3" onClick={() => setLun(aggiungiGiorni(lun, -7))} aria-label="Settimana precedente">‹</button>
          <h2 className="text-lg font-semibold">Settimana dal {fmtData(lun)} al {fmtData(dom)}</h2>
          <button className="btn-secondary px-3" disabled={settimanaFutura || settimanaInCorso} onClick={() => setLun(aggiungiGiorni(lun, 7))} aria-label="Settimana successiva">›</button>
        </div>

        {/* Stato della verifica */}
        {verifica ? (
          <div className={`mb-4 rounded-lg p-4 text-sm ring-1 ring-inset ${modificataDopo ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-green-50 text-green-900 ring-green-200'}`}>
            <b>{modificataDopo ? '! Verificata, ma modificata in seguito' : '✓ Settimana verificata'}</b> da {verifica.verificataDa} il {fmtDataOra(verifica.verificataIl)}
            {modificataDopo && <> — il totale era {fmt0(verifica.totaleKg)} kg, ora è {fmt0(totaleSett)} kg. Ricontrolla e conferma di nuovo.</>}
            {verifica.note && <div className="mt-1">Note: {verifica.note}</div>}
          </div>
        ) : (
          <div className="mb-4 rounded-lg bg-stone-100 p-4 text-sm text-stone-700">
            {settimanaInCorso ? 'Settimana in corso: potrai verificarla quando sarà conclusa.' : 'Settimana da verificare.'}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <span>Scarichi registrati: <b>{attesi - mancanti}</b> / {attesi}</span>
          <span className={mancanti ? 'font-medium text-amber-800' : ''}>Mancanti: <b>{mancanti}</b></span>
          <span className={anomalie ? 'font-medium text-amber-800' : ''}>Da controllare: <b>{anomalie}</b></span>
          <span>Totale: <b>{fmt0(totaleSett)} kg</b></span>
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th rowSpan={2}>Giorno</th>
                {stalle.map((s) => <th key={s.id} colSpan={2} className="text-center">Stalla {s.numero}</th>)}
                <th rowSpan={2} className="num">Totale</th>
              </tr>
              <tr>{stalle.flatMap((s) => TURNI.map((t) => <th key={`${s.id}-${t}`} className="num">{t === 'mattina' ? 'Mattina' : 'Sera'}</th>))}</tr>
            </thead>
            <tbody>
              {giorni.map((data, i) => {
                const totGiorno = scarichiSett.filter((s) => s.data === data).reduce((t, s) => t + s.kg, 0)
                return (
                  <tr key={data} className={data > oggi ? 'opacity-40' : 'cursor-pointer'} onClick={() => data <= oggi && onApriGiorno(data)} title={data <= oggi ? 'Apri il giorno per correggere' : undefined}>
                    <td className="whitespace-nowrap">{GIORNI[i]} {fmtData(data).slice(0, 5)}</td>
                    {celle[i].map((c) => (
                      <td key={c.chiave} className={`num ${c.anomalo ? 'bg-amber-50' : ''}`}>
                        {c.futuro ? '' : c.v === null ? <span className="text-xs font-medium text-amber-700">manca</span> : (
                          <>
                            {fmt0(c.v)}
                            {c.anomalo && c.scost !== null && (
                              <span className="block text-[11px] font-medium text-amber-800">{c.scost > 0 ? '▲' : '▼'} {fmt0(Math.abs(c.scost) * 100)}%</span>
                            )}
                          </>
                        )}
                      </td>
                    ))}
                    <td className="num font-semibold">{totGiorno ? fmt0(totGiorno) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50 font-semibold">
                <td className="px-3 py-2">Totale</td>
                {stalle.flatMap((s) => TURNI.map((t) => (
                  <td key={`${s.id}-${t}`} className="num px-3 py-2">{fmt0(scarichiSett.filter((x) => x.stalla === s.numero && x.turno === t).reduce((a, x) => a + x.kg, 0))}</td>
                )))}
                <td className="num px-3 py-2">{fmt0(totaleSett)}</td>
              </tr>
              <tr className="text-stone-600">
                <td className="px-3 py-2 text-xs">kg/capo/giorno</td>
                {stalle.map((s) => {
                  const kg = scarichiSett.filter((x) => x.stalla === s.numero).reduce((a, x) => a + x.kg, 0)
                  const ggConDati = new Set(scarichiSett.filter((x) => x.stalla === s.numero).map((x) => x.data)).size
                  return <td key={s.id} colSpan={2} className="px-3 py-2 text-center text-xs">{s.capi && ggConDati ? fmt1(kg / ggConDati / s.capi) : '—'}</td>
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          In giallo i valori che si scostano più del {SOGLIA_ANOMALIA * 100}% dalla mediana delle 4 settimane precedenti (stessa stalla e turno):
          confrontali con la foto della pesata. Clicca su un giorno per correggerlo.
        </p>

        {!settimanaFutura && !settimanaInCorso && (
          <div className="card mt-4 grid items-end gap-4 sm:grid-cols-3">
            <label className="block"><span className="label">Verificata da *</span><input className="input" value={verificatore} onChange={(e) => setVerificatore(e.target.value)} placeholder="Nome" /></label>
            <label className="block"><span className="label">Note</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. corretta stalla 2 di mercoledì" /></label>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={segnaVerificata}>{verifica ? 'Conferma di nuovo' : 'Segna come verificata'}</button>
              {verifica && <button className="btn-secondary" onClick={() => conferma('Annullare la verifica di questa settimana?') && elimina('verifiche', verifica.id)}>Annulla verifica</button>}
            </div>
          </div>
        )}
      </div>

      {/* Elenco settimane */}
      <aside className="card h-fit">
        <h3 className="font-semibold">Ultime settimane</h3>
        <ul className="mt-3 space-y-1 text-sm">
          {settimane.map((s) => {
            const v = dati.verifiche.find((x) => x.settimana === s)
            const tot = dati.scarichi.filter((x) => x.data >= s && x.data <= aggiungiGiorni(s, 6)).reduce((a, x) => a + x.kg, 0)
            const stato = s === lunCorrente ? 'in corso' : !v ? (tot === 0 ? 'nessun dato' : 'da verificare') : v.totaleKg !== tot ? 'modificata' : 'verificata'
            const cls = { 'in corso': 'text-stone-500', 'nessun dato': 'text-stone-400', 'da verificare': 'text-amber-800', modificata: 'text-amber-800', verificata: 'text-green-800' }[stato]
            const icona = { 'in corso': '…', 'nessun dato': '–', 'da verificare': '!', modificata: '!', verificata: '✓' }[stato]
            return (
              <li key={s}>
                <button onClick={() => setLun(s)} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left ${s === lun ? 'bg-brand-50 font-medium' : 'hover:bg-stone-50'}`}>
                  <span>{fmtData(s).slice(0, 5)} – {fmtData(aggiungiGiorni(s, 6)).slice(0, 5)}</span>
                  <span className={`text-xs font-medium ${cls}`}><span aria-hidden>{icona}</span> {stato}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
