/**
 * Archiviazione dei documenti allegati (fascicolo aziendale AGEA dei clienti,
 * documenti ufficiali degli aggiornamenti normativi) tramite IndexedDB, più adatta
 * di localStorage per file binari potenzialmente pesanti. Ogni voce ha al più un
 * documento, salvato con una chiave deterministica: caricarne uno nuovo sovrascrive
 * semplicemente il precedente.
 */

const DB_NAME = 'cfc-documenti'
const STORE_NAME = 'file'
const DB_VERSION = 1

function apriDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const richiesta = indexedDB.open(DB_NAME, DB_VERSION)
    richiesta.onupgradeneeded = () => {
      if (!richiesta.result.objectStoreNames.contains(STORE_NAME)) {
        richiesta.result.createObjectStore(STORE_NAME)
      }
    }
    richiesta.onsuccess = () => resolve(richiesta.result)
    richiesta.onerror = () => reject(richiesta.error)
  })
}

async function salvaPerChiave(chiave: string, file: Blob): Promise<void> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(file, chiave)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function leggiPerChiave(chiave: string): Promise<Blob | undefined> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const richiesta = tx.objectStore(STORE_NAME).get(chiave)
    richiesta.onsuccess = () => resolve(richiesta.result as Blob | undefined)
    richiesta.onerror = () => reject(richiesta.error)
  })
}

async function eliminaPerChiave(chiave: string): Promise<void> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(chiave)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function chiaveFascicolo(clienteId: string): string {
  return `fascicolo-agea:${clienteId}`
}

export function salvaFascicoloAgea(clienteId: string, file: Blob) {
  return salvaPerChiave(chiaveFascicolo(clienteId), file)
}
export function leggiFascicoloAgea(clienteId: string) {
  return leggiPerChiave(chiaveFascicolo(clienteId))
}
export function eliminaFascicoloAgea(clienteId: string) {
  return eliminaPerChiave(chiaveFascicolo(clienteId))
}

function chiaveDocumentoNormativa(normativaId: string): string {
  return `normativa-doc:${normativaId}`
}

export function salvaDocumentoNormativa(normativaId: string, file: Blob) {
  return salvaPerChiave(chiaveDocumentoNormativa(normativaId), file)
}
export function leggiDocumentoNormativa(normativaId: string) {
  return leggiPerChiave(chiaveDocumentoNormativa(normativaId))
}
export function eliminaDocumentoNormativa(normativaId: string) {
  return eliminaPerChiave(chiaveDocumentoNormativa(normativaId))
}
