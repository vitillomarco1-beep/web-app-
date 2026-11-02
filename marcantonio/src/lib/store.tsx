import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
}

const StoreCtx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dati, setDati] = useState<Dati>(carica)

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
    () => ({ dati, aggiungi, aggiorna, elimina, sostituisciTutto, imposta }),
    [dati, aggiungi, aggiorna, elimina, sostituisciTutto, imposta],
  )
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore deve essere usato dentro <StoreProvider>')
  return ctx
}
