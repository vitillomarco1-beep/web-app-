// Archivio locale delle foto delle pesate (IndexedDB: le foto sono troppo grandi per localStorage).
// Con il servizio online questo modulo verrà sostituito dallo storage condiviso (Supabase Storage).

const DB = 'marcantonio-foto'
const STORE = 'pesate'

function apri(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await apri()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, modo).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Chiave della foto i-esima (0 = carico totale) di un giro. */
export const chiaveFoto = (data: string, turno: string, i: number) => `${data}:${turno}:${i}`

export const salvaFoto = (chiave: string, foto: Blob) => tx('readwrite', (s) => s.put(foto, chiave))
export const leggiFoto = (chiave: string) => tx<Blob | undefined>('readonly', (s) => s.get(chiave) as IDBRequest<Blob | undefined>)
export const eliminaFoto = (chiave: string) => tx('readwrite', (s) => s.delete(chiave))

/** Riduce la foto (lato lungo max 1280 px, JPEG) per risparmiare spazio: il display resta leggibile. */
export async function comprimiFoto(file: Blob, latoMax = 1280, qualita = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scala = Math.min(1, latoMax / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scala)
  canvas.height = Math.round(bitmap.height * scala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compressione non riuscita'))), 'image/jpeg', qualita),
  )
}

export function blobInBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}
