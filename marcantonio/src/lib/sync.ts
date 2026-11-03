// Archivio condiviso tra dispositivi (PC, telefono, tablet) tramite il database dell'artifact.
// Ogni collezione dei Dati viene salvata in uno o più documenti "dati/<collezione>~<n>"
// (pezzi da max ~180 KB, il limite di un documento è 256 KiB). Tutti i pezzi di un salvataggio
// portano lo stesso "ver": chi legge ricompone una collezione solo quando i pezzi sono completi.

import type { Collezione, Dati } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any
type Snap = { id: string; data(): Record<string, unknown> | undefined }

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> }
  }
}

const COLLEZIONE_DB = 'dati'
const MAX_BYTE = 180_000
const enc = new TextEncoder()

export async function apriDb(): Promise<Db | null> {
  try {
    if (!window.claude?.use) return null
    return (await window.claude.use('db')) ?? null
  } catch {
    return null
  }
}

/** Divide l'elenco in pezzi JSON (stringhe) ognuno sotto MAX_BYTE. */
export function aPezzi(valori: unknown[]): string[] {
  const pezzi: string[] = []
  let corrente: string[] = []
  let byte = 2
  for (const v of valori) {
    const s = JSON.stringify(v)
    const b = enc.encode(JSON.stringify(s)).length - 1 // misura come stringa con escape, come viene salvata
    if (corrente.length && byte + b > MAX_BYTE) {
      pezzi.push('[' + corrente.join(',') + ']')
      corrente = []
      byte = 2
    }
    corrente.push(s)
    byte += b
  }
  pezzi.push('[' + corrente.join(',') + ']')
  return pezzi
}

/** Ricompone le collezioni complete dai documenti del database. */
export function ricomponi(docs: Snap[]): Partial<Record<Collezione, unknown[]>> {
  const perCol = new Map<string, Map<number, { n: number; ver: string; items: string }>>()
  for (const d of docs) {
    const x = d.data() as { col?: string; i?: number; n?: number; ver?: string; items?: string } | undefined
    if (!x || typeof x.col !== 'string' || typeof x.items !== 'string') continue
    if (!perCol.has(x.col)) perCol.set(x.col, new Map())
    perCol.get(x.col)!.set(Number(x.i), { n: Number(x.n), ver: String(x.ver), items: x.items })
  }
  const out: Partial<Record<Collezione, unknown[]>> = {}
  for (const [col, pezzi] of perCol) {
    const primo = pezzi.get(0)
    if (!primo) continue
    const parti: unknown[] = []
    let completo = true
    for (let i = 0; i < primo.n; i++) {
      const p = pezzi.get(i)
      if (!p || p.ver !== primo.ver) { completo = false; break }
      try { parti.push(...(JSON.parse(p.items) as unknown[])) } catch { completo = false; break }
    }
    if (completo) out[col as Collezione] = parti
  }
  return out
}

/** Salva una collezione: prima i pezzi 1..n-1, poi il pezzo 0 (che dichiara n), infine toglie i vecchi in più. */
export async function salvaCollezione(db: Db, col: Collezione, valori: unknown[], pezziPrima: number): Promise<number> {
  const pezzi = aPezzi(valori)
  const ver = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const ref = (i: number) => db.collection(COLLEZIONE_DB).doc(`${col}~${i}`)
  const n = pezzi.length
  for (let i = n - 1; i >= 0; i--) await ref(i).set({ col, i, n, ver, items: pezzi[i] })
  for (let i = n; i < pezziPrima; i++) await ref(i).delete()
  return n
}

export function ascolta(db: Db, onDati: (docs: Snap[], daCache: boolean) => void, onErrore: () => void): () => void {
  return db.collection(COLLEZIONE_DB).onSnapshot(
    (q: { docs: Snap[]; metadata: { fromCache: boolean } }) => onDati(q.docs, q.metadata.fromCache),
    () => onErrore(),
  )
}

export function contaPezzi(docs: Snap[]): Partial<Record<Collezione, number>> {
  const out: Partial<Record<Collezione, number>> = {}
  for (const d of docs) {
    const col = d.id.split('~')[0] as Collezione
    const i = Number(d.id.split('~')[1])
    out[col] = Math.max(out[col] ?? 0, i + 1)
  }
  return out
}

export const COLLEZIONI = (d: Dati) => Object.keys(d) as Collezione[]
