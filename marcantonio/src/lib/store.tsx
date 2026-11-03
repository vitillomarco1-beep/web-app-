import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apriDb, ascolta, contaPezzi, ricomponi, salvaCollezione } from './sync'
import type { Collezione, Dati } from './types'
import { DATI_VUOTI, datiDimostrativi } from './seed'

const CHIAVE = 'marcantonio:dati:v2' // v2: robot e gruppi aggiornati nei dati di esempio

function carica(): Dati {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (raw) return { ...DATI_VUOTI, ...JSON.parse(raw) }
  } catch {
    /* dati corrotti o storage non disponibile: si riparte dai dati di esempio */
  }
  return datiDimostrativi()
}

type Elemento<K extends Collezione> = Dati[K][number]

interface StoreApi {
  dati: Dati
  aggiungi: <K extends Collezione>(col: K, el: Elemento<K>) => void
  aggiorna: <K extends Collezione>(col: K, el: Elemento<K>) => void
  elimina: (col: Collezione, id: string) => void
  sostituisciTutto: (d: Dati) => void
  /** Sostituisce in blocco il contenuto di una collezione (es. dopo un'importazione). */
  imposta: <K extends Collezione>(col: K, valori: Dati[K]) => void
  /** Stato dell'archivio condiviso tra dispositivi. */
  sync: StatoSync
  /** Carica nell'archivio condiviso tutti i dati di questo dispositivo (prima attivazione). */
  caricaNelCloud: () => Promise<void>
}

/**
 * locale: nessun archivio condiviso disponibile (es. app aperta fuori da claude.ai)
 * connessione: in attesa della risposta dell'archivio
 * vuoto: archivio raggiungibile ma ancora mai riempito
 * sincronizzato / salvataggio / errore
 */
export type StatoSync = 'locale' | 'connessione' | 'vuoto' | 'sincronizzato' | 'salvataggio' | 'errore'

const StoreCtx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dati, setDati] = useState<Dati>(carica)
  const [sync, setSync] = useState<StatoSync>('connessione')
  const datiRef = useRef(dati)
  datiRef.current = dati
  const dbRef = useRef<unknown>(null)
  /** Ultima versione di ogni collezione allineata con l'archivio (confronto per riferimento). */
  const allineate = useRef<Partial<Record<Collezione, unknown>>>({})
  const pezzi = useRef<Partial<Record<Collezione, number>>>({})
  const attivo = useRef(false) // true quando l'archivio contiene già i dati: da qui in poi si salva
  const inCoda = useRef(new Set<Collezione>())
  const lavorando = useRef(false)
  const timer = useRef<number>()

  const svuotaCoda = useCallback(async () => {
    if (lavorando.current || !dbRef.current) return
    lavorando.current = true
    setSync('salvataggio')
    try {
      while (inCoda.current.size) {
        const col = inCoda.current.values().next().value as Collezione
        inCoda.current.delete(col)
        const valori = datiRef.current[col] as unknown[]
        pezzi.current[col] = await salvaCollezione(dbRef.current, col, valori, pezzi.current[col] ?? 0)
        allineate.current[col] = valori
      }
      setSync('sincronizzato')
    } catch {
      setSync('errore')
    } finally {
      lavorando.current = false
    }
  }, [])

  // Archivio condiviso: ascolto unico per tutta la sessione.
  useEffect(() => {
    let stop: (() => void) | undefined
    let annullato = false
    let attesa: number | undefined
    apriDb().then((db) => {
      if (annullato) return
      if (!db) { setSync('locale'); return }
      dbRef.current = db
      attesa = window.setTimeout(() => setSync((s) => (s === 'connessione' ? 'errore' : s)), 10000)
      stop = ascolta(db, (docs, daCache) => {
        if (daCache) return
        window.clearTimeout(attesa)
        pezzi.current = { ...pezzi.current, ...contaPezzi(docs) }
        if (!docs.length) { attivo.current = false; setSync('vuoto'); return }
        attivo.current = true
        const remoti = ricomponi(docs)
        const cambi: Partial<Dati> = {}
        for (const [col, valori] of Object.entries(remoti) as [Collezione, unknown[]][]) {
          if (inCoda.current.has(col)) continue // modifica locale in uscita: vince quella
          const attuale = datiRef.current[col]
          if (JSON.stringify(attuale) === JSON.stringify(valori)) { allineate.current[col] = attuale; continue }
          allineate.current[col] = valori
          ;(cambi as Record<string, unknown>)[col] = valori
        }
        if (Object.keys(cambi).length) setDati((d) => ({ ...d, ...cambi }))
        if (!lavorando.current) setSync('sincronizzato')
      }, () => setSync('errore'))
    })
    return () => { annullato = true; window.clearTimeout(attesa); stop?.() }
  }, [])

  // Le modifiche fatte su questo dispositivo vengono inviate all'archivio (raggruppate ogni 1,5 s).
  useEffect(() => {
    if (!attivo.current) return
    let nuove = false
    for (const col of Object.keys(dati) as Collezione[]) {
      if (allineate.current[col] !== dati[col]) { inCoda.current.add(col); nuove = true }
    }
    if (!nuove) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(svuotaCoda, 1500)
  }, [dati, svuotaCoda])

  const caricaNelCloud = useCallback(async () => {
    if (!dbRef.current) return
    attivo.current = true
    for (const col of Object.keys(datiRef.current) as Collezione[]) inCoda.current.add(col)
    await svuotaCoda()
  }, [svuotaCoda])

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(dati))
    } catch {
      /* storage pieno o bloccato */
    }
  }, [dati])

  const aggiungi = useCallback(<K extends Collezione>(col: K, el: Elemento<K>) => {
    setDati((d) => ({ ...d, [col]: [...d[col], el] }))
  }, [])

  const aggiorna = useCallback(<K extends Collezione>(col: K, el: Elemento<K>) => {
    setDati((d) => ({ ...d, [col]: (d[col] as Elemento<K>[]).map((x) => (x.id === el.id ? el : x)) }))
  }, [])

  const elimina = useCallback((col: Collezione, id: string) => {
    setDati((d) => ({ ...d, [col]: (d[col] as { id: string }[]).filter((x) => x.id !== id) }))
  }, [])

  const sostituisciTutto = useCallback((nuovi: Dati) => setDati({ ...DATI_VUOTI, ...nuovi }), [])
  const imposta = useCallback(<K extends Collezione>(col: K, valori: Dati[K]) => setDati((d) => ({ ...d, [col]: valori })), [])

  const api = useMemo(
    () => ({ dati, aggiungi, aggiorna, elimina, sostituisciTutto, imposta, sync, caricaNelCloud }),
    [dati, aggiungi, aggiorna, elimina, sostituisciTutto, imposta, sync, caricaNelCloud],
  )
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore deve essere usato dentro <StoreProvider>')
  return ctx
}
