// Lettura automatica dei kg dalle foto del display della bilancia.
// Funziona solo quando il servizio online è configurato (vedi docs/CONFIGURAZIONE.md):
// le foto vengono inviate alla funzione "leggi-pesate", che usa Claude per leggere il display.
// La chiave dell'intelligenza artificiale resta sul server, mai nel browser.
import { blobInBase64 } from './fotoStore'

const URL_SERVIZIO = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHIAVE_PUBBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const letturaAutomaticaAttiva = Boolean(URL_SERVIZIO && CHIAVE_PUBBLICA)

export interface Lettura { kg: number | null; nota?: string }

/** Legge i kg da una o più foto (già compresse). Restituisce una lettura per foto, nello stesso ordine. */
export async function leggiPesate(foto: Blob[]): Promise<Lettura[]> {
  if (!letturaAutomaticaAttiva) throw new Error('Lettura automatica non configurata')
  const immagini = await Promise.all(foto.map(async (f) => ({ media_type: 'image/jpeg', data: await blobInBase64(f) })))
  const risposta = await fetch(`${URL_SERVIZIO}/functions/v1/leggi-pesate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHIAVE_PUBBLICA}` },
    body: JSON.stringify({ immagini }),
  })
  if (!risposta.ok) throw new Error(`Servizio non disponibile (${risposta.status})`)
  const json = (await risposta.json()) as { letture?: { foto: number; leggibile: boolean; kg: number; nota: string }[]; errore?: string }
  if (json.errore || !json.letture) throw new Error(json.errore ?? 'Risposta non valida')
  return foto.map((_, i) => {
    const l = json.letture!.find((x) => x.foto === i + 1)
    return l && l.leggibile ? { kg: l.kg, nota: l.nota || undefined } : { kg: null, nota: l?.nota || 'Non leggibile' }
  })
}
