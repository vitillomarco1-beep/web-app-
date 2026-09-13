/**
 * Archiviazione dei documenti allegati ai clienti (es. fascicolo aziendale AGEA in
 * PDF) tramite IndexedDB, più adatta di localStorage per file binari potenzialmente
 * pesanti. Ogni cliente ha al più un fascicolo, salvato con una chiave deterministica
 * derivata dal suo id: caricarne uno nuovo sovrascrive semplicemente il precedente.
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

function chiaveFascicolo(clienteId: string): string {
  return `fascicolo-agea:${clienteId}`
}

export async function salvaFascicoloAgea(clienteId: string, file: Blob): Promise<void> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(file, chiaveFascicolo(clienteId))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function leggiFascicoloAgea(clienteId: string): Promise<Blob | undefined> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const richiesta = tx.objectStore(STORE_NAME).get(chiaveFascicolo(clienteId))
    richiesta.onsuccess = () => resolve(richiesta.result as Blob | undefined)
    richiesta.onerror = () => reject(richiesta.error)
  })
}

export async function eliminaFascicoloAgea(clienteId: string): Promise<void> {
  const db = await apriDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(chiaveFascicolo(clienteId))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
