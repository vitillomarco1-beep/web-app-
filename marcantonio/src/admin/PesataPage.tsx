import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Turno } from '../lib/types'
import { aggiungiGiorni, fmt0, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { parseKg, scarichiDaPesate } from '../lib/pesate'
import { chiaveFoto, comprimiFoto, eliminaFoto, leggiFoto, salvaFoto } from '../lib/fotoStore'
import { leggiPesate } from '../lib/lettorePesate'

interface FotoPesata {
  id: string
  blob: Blob // foto già compressa
  url: string // anteprima
  kg: string // valore digitato o letto
  letto: boolean // compilato dalla lettura automatica
  nota?: string
  scattataIl: number // ms, dall'orario del file
}

// Bozza della pesata in corso: tra una foto e l'altra passano anche 20 minuti, il telefono si blocca
// e il browser può ricaricare la pagina. Foto (IndexedDB) e numeri (localStorage) restano sul telefono.
const CHIAVE_BOZZA = 'marcantonio:pesata-bozza'
const DURATA_BOZZA_MS = 8 * 3600 * 1000 // oltre un giro di carro la bozza non serve più
const fotoBozza = (id: string) => `bozza:${id}`
interface Bozza { data: string; turno: Turno; turnoToccato: boolean; aggiornataIl: number; foto: Omit<FotoPesata, 'blob' | 'url'>[] }
function leggiBozza(): Bozza | null {
  try { return JSON.parse(localStorage.getItem(CHIAVE_BOZZA) || 'null') } catch { return null }
}
function scriviBozza(b: Bozza | null) {
  try { if (b) localStorage.setItem(CHIAVE_BOZZA, JSON.stringify(b)); else localStorage.removeItem(CHIAVE_BOZZA) } catch { /* storage bloccato */ }
}

/** Turno suggerito dall'orario: prima delle 13 mattina, dopo sera. */
const turnoDaOra = (ms: number): Turno => (new Date(ms).getHours() < 13 ? 'mattina' : 'sera')

export default function PesataPage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const stalle = useMemo(() => [...dati.stalle].sort((a, b) => a.numero - b.numero), [dati.stalle])
  const numeri = stalle.map((s) => s.numero)
  const nFoto = numeri.length // 3 stalle → 3 foto: carico totale + residuo dopo ogni stalla tranne l'ultima

  const [data, setData] = useState(oggi)
  const [turno, setTurno] = useState<Turno>(turnoDaOra(Date.now()))
  const [turnoToccato, setTurnoToccato] = useState(false)
  const [foto, setFoto] = useState<FotoPesata[]>([])
  const [lettura, setLettura] = useState<'ferma' | 'in corso' | 'errore'>('ferma')
  const [erroreLettura, setErroreLettura] = useState('')
  const [salvata, setSalvata] = useState<null | { data: string; turno: Turno; kg: number[] }>(null)
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputGalleria = useRef<HTMLInputElement>(null)

  // libera le anteprime quando non servono più
  useEffect(() => () => foto.forEach((f) => URL.revokeObjectURL(f.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- bozza: si riprende all'apertura, si aggiorna a ogni modifica
  const [ripresa, setRipresa] = useState<number | null>(null)
  const pronta = useRef(false)
  useEffect(() => {
    (async () => {
      const b = leggiBozza()
      if (b && Date.now() - b.aggiornataIl < DURATA_BOZZA_MS && b.foto.length) {
        const recuperate: FotoPesata[] = []
        for (const f of b.foto) {
          const blob = await leggiFoto(fotoBozza(f.id)).catch(() => undefined)
          if (blob) recuperate.push({ ...f, blob, url: URL.createObjectURL(blob) })
        }
        if (recuperate.length) {
          setFoto(recuperate); setData(b.data); setTurno(b.turno); setTurnoToccato(b.turnoToccato)
          setRipresa(Math.min(...recuperate.map((f) => f.scattataIl)))
          const daLeggere = recuperate.filter((f) => !f.kg && !f.nota)
          if (daLeggere.length) leggi(daLeggere)
        }
      } else if (b) {
        for (const f of b.foto) await eliminaFoto(fotoBozza(f.id)).catch(() => undefined)
        scriviBozza(null)
      }
      pronta.current = true
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pronta.current) return
    scriviBozza(foto.length ? { data, turno, turnoToccato, aggiornataIl: Date.now(), foto: foto.map(({ blob: _b, url: _u, ...resto }) => resto) } : null)
  }, [foto, data, turno, turnoToccato])

  // Le pesate si ordinano dalla più pesante alla più leggera: il carro si svuota durante il giro.
  const ordinate = useMemo(() => {
    const tutteLette = foto.length === nFoto && foto.every((f) => parseKg(f.kg) !== null)
    return tutteLette ? [...foto].sort((a, b) => parseKg(b.kg)! - parseKg(a.kg)!) : foto
  }, [foto, nFoto])
  const completa = foto.length === nFoto && foto.every((f) => parseKg(f.kg) !== null)
  const kgStalle = completa ? scarichiDaPesate(ordinate.map((f) => parseKg(f.kg))) : []
  const giaPresenti = dati.scarichi.filter((s) => s.data === data && s.turno === turno)

  const aggiungiFile = async (files: FileList | null) => {
    if (!files?.length) return
    const posti = nFoto - foto.length
    const scelti = Array.from(files).slice(0, posti)
    const nuove: FotoPesata[] = []
    for (const f of scelti) {
      const blob = await comprimiFoto(f)
      const id = nuovoId()
      await salvaFoto(fotoBozza(id), blob).catch(() => undefined)
      nuove.push({ id, blob, url: URL.createObjectURL(blob), kg: '', letto: false, scattataIl: f.lastModified || Date.now() })
    }
    const tutte = [...foto, ...nuove]
    setFoto(tutte)
    setSalvata(null)
    // data e turno suggeriti dall'orario della prima foto (se l'utente non li ha cambiati)
    if (!turnoToccato && tutte[0]) {
      const t0 = Math.min(...tutte.map((x) => x.scattataIl))
      const giorno = isoGiorno(new Date(t0))
      if (giorno <= oggi) setData(giorno)
      setTurno(turnoDaOra(t0))
    }
    if (nuove.length) leggi(nuove)
  }

  const leggi = async (daLeggere: FotoPesata[]) => {
    setLettura('in corso')
    setErroreLettura('')
    try {
      const risultati = await leggiPesate(daLeggere.map((f) => f.blob))
      const perId = new Map(daLeggere.map((f, i) => [f.id, risultati[i]]))
      // dallo stato più recente: nel frattempo potrebbero essere state aggiunte altre foto o scritto un numero
      setFoto((attuali) => attuali.map((f) => {
        const r = perId.get(f.id)
        return r && !(f.kg && !f.letto) ? { ...f, kg: r.kg === null ? f.kg : String(r.kg), letto: r.kg !== null, nota: r.nota } : f
      }))
      setLettura('ferma')
    } catch (e) {
      setLettura('errore')
      setErroreLettura((e as Error).message)
    }
  }

  const rimuovi = (id: string) => {
    const f = foto.find((x) => x.id === id)
    if (f) URL.revokeObjectURL(f.url)
    void eliminaFoto(fotoBozza(id)).catch(() => undefined)
    setFoto(foto.filter((x) => x.id !== id))
  }

  const salva = async () => {
    if (!completa) return
    if (kgStalle.some((k) => k === null || k < 0)) return
    if (giaPresenti.length && !window.confirm(`Esistono già scarichi per ${turno} del ${fmtData(data)}: sostituirli?`)) return
    // scarichi per stalla
    numeri.forEach((n, i) => {
      const kg = kgStalle[i]!
      const esistenti = dati.scarichi.filter((s) => s.data === data && s.turno === turno && s.stalla === n)
      const [primo, ...doppi] = esistenti
      if (primo) aggiorna('scarichi', { ...primo, kg })
      else aggiungi('scarichi', { id: nuovoId(), data, turno, stalla: n, kg })
      doppi.forEach((s) => elimina('scarichi', s.id))
    })
    // foto come prova, in ordine di pesata (0 = carico totale)
    for (let i = 0; i < 6; i++) await eliminaFoto(chiaveFoto(data, turno, i))
    for (let i = 0; i < ordinate.length; i++) await salvaFoto(chiaveFoto(data, turno, i), ordinate[i].blob)
    setSalvata({ data, turno, kg: kgStalle.map((k) => k!) })
    foto.forEach((f) => { URL.revokeObjectURL(f.url); void eliminaFoto(fotoBozza(f.id)).catch(() => undefined) })
    setFoto([])
    scriviBozza(null)
    setRipresa(null)
    setTurnoToccato(false)
  }

  if (nFoto === 0) {
    return <p className="text-sm text-stone-600">Non ci sono stalle configurate: chiedi al titolare di impostarle nella sezione Alimentazione.</p>
  }

  if (salvata) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
        <h1 className="mt-4 text-xl font-bold">Pesata salvata</h1>
        <p className="mt-1 text-stone-600">{salvata.turno === 'mattina' ? 'Mattina' : 'Sera'} del {fmtData(salvata.data)}</p>
        <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left">
          {numeri.map((n, i) => (
            <li key={n} className="flex justify-between rounded-md bg-white px-3 py-2 ring-1 ring-stone-200"><span>Stalla {n}</span><b className="tabular-nums">{fmt0(salvata.kg[i])} kg</b></li>
          ))}
        </ul>
        <button className="btn-primary mt-6 w-full max-w-xs py-3" onClick={() => {
          setSalvata(null)
          if (salvata.turno === 'mattina') setTurno('sera')
        }}>Nuova pesata</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Pesata del carro</h1>
      <p className="mt-1 text-sm text-stone-600">
        Fotografa il display {nFoto} volte: carico totale, dopo la stalla {numeri.slice(0, -1).join(', poi dopo la stalla ')}.
        {' I numeri si leggono in automatico dalla foto: controlla solo che siano giusti.'}
      </p>

      {/* Quando */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="col-span-2 flex items-center gap-2">
          <button type="button" className="btn-secondary px-3" onClick={() => { setData(aggiungiGiorni(data, -1)); setTurnoToccato(true) }} aria-label="Giorno precedente">‹</button>
          <input className="input text-center" type="date" max={oggi} value={data} onChange={(e) => { if (e.target.value) { setData(e.target.value); setTurnoToccato(true) } }} />
          <button type="button" className="btn-secondary px-3" disabled={data >= oggi} onClick={() => { setData(aggiungiGiorni(data, 1)); setTurnoToccato(true) }} aria-label="Giorno successivo">›</button>
        </div>
        {(['mattina', 'sera'] as Turno[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTurno(t); setTurnoToccato(true) }}
            className={`rounded-lg py-3 text-sm font-semibold ${turno === t ? 'bg-brand-700 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}>
            {t === 'mattina' ? 'Mattina' : 'Sera'}
          </button>
        ))}
      </div>
      {giaPresenti.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">! Per questo turno ci sono già scarichi registrati: salvando verranno sostituiti.</p>
      )}

      {ripresa !== null && foto.length > 0 && foto.length < nFoto && (
        <p className="mt-3 rounded-md bg-sky-50 p-2 text-xs text-sky-800">Ripresa la pesata iniziata alle {new Date(ripresa).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}: scatta la foto {foto.length + 1}.</p>
      )}

      {/* Foto */}
      <div className="mt-5 space-y-3">
        {ordinate.map((f, i) => {
          const ruolo = completa ? (i === 0 ? 'Carico totale' : `Dopo stalla ${numeri[i - 1]}`) : `Foto ${i + 1}`
          return (
            <div key={f.id} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <a href={f.url} target="_blank" rel="noreferrer" className="shrink-0"><img src={f.url} alt={`Pesata: ${ruolo}`} className="h-24 w-20 rounded-md object-cover" /></a>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{ruolo}</span>
                  <button type="button" className="text-xs text-red-600" onClick={() => rimuovi(f.id)}>Rimuovi</button>
                </div>
                <label className="mt-1 flex items-center gap-2">
                  <input className="input text-right text-lg font-semibold tabular-nums" inputMode="decimal" placeholder={lettura === 'in corso' && !f.kg ? 'lettura…' : 'kg'} aria-label={`kg ${ruolo}`}
                    value={f.kg} onChange={(e) => setFoto(foto.map((x) => (x.id === f.id ? { ...x, kg: e.target.value.replace(/[^\d.,]/g, ''), letto: false } : x)))} />
                  <span className="text-sm text-stone-500">kg</span>
                </label>
                {f.letto && <p className="mt-1 text-[11px] text-stone-500">Letto in automatico: controlla che corrisponda.</p>}
                {f.nota && <p className="mt-1 text-[11px] text-amber-700">{f.nota}</p>}
              </div>
            </div>
          )
        })}

        {foto.length < nFoto && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-primary py-4" onClick={() => inputCamera.current?.click()}>📷 Scatta foto {foto.length + 1}</button>
            <button type="button" className="btn-secondary py-4" onClick={() => inputGalleria.current?.click()}>Scegli dalla galleria</button>
            <input ref={inputCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { aggiungiFile(e.target.files); e.target.value = '' }} />
            <input ref={inputGalleria} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { aggiungiFile(e.target.files); e.target.value = '' }} />
          </div>
        )}
        {lettura === 'in corso' && <p className="text-center text-sm text-stone-500">Lettura dei numeri in corso…</p>}
        {lettura === 'errore' && <p className="text-sm text-amber-800">Lettura automatica non riuscita ({erroreLettura}). Scrivi i numeri a mano o <button type="button" className="underline" onClick={() => leggi(foto.filter((x) => !x.kg))}>riprova</button>.</p>}
      </div>

      {/* Riepilogo */}
      {completa && (
        <div className="mt-5 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200">
          <h2 className="text-sm font-semibold text-brand-900">Scaricato in ogni stalla</h2>
          {kgStalle.some((k) => k !== null && k < 0) ? (
            <p className="mt-2 text-sm text-red-700">✕ Due pesate sono uguali o non tornano: controlla i numeri.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {numeri.map((n, i) => (
                <li key={n} className="flex justify-between text-sm"><span>Stalla {n}</span><b className="tabular-nums">{fmt0(kgStalle[i]!)} kg</b></li>
              ))}
              <li className="flex justify-between border-t border-brand-200 pt-1 text-sm"><span>Totale</span><b className="tabular-nums">{fmt0(parseKg(ordinate[0].kg)!)} kg</b></li>
            </ul>
          )}
          <p className="mt-2 text-[11px] text-stone-500">Le pesate sono messe in ordine dalla più pesante: l'ordine di scatto non conta.</p>
        </div>
      )}

      <button type="button" className="btn-primary mt-5 w-full py-4 text-base" disabled={!completa || kgStalle.some((k) => k === null || k < 0)} onClick={salva}>
        Salva pesata
      </button>
      {!completa && <p className="mt-2 text-center text-xs text-stone-500">Servono {nFoto} foto con il relativo numero ({foto.length}/{nFoto}).</p>}
    </div>
  )
}
