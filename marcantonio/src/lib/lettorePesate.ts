// Lettura automatica dei kg dalle foto del display della bilancia del carro.
// 1) Dentro l'app di Claude: le foto vengono lette da Claude (capacità "sample" con immagini), nessuna chiave da configurare.
// 2) In alternativa, se configurato, il servizio online "leggi-pesate" (vedi docs/CONFIGURAZIONE.md).
import { blobInBase64 } from './fotoStore'

const URL_SERVIZIO = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHIAVE_PUBBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const servizioConfigurato = Boolean(URL_SERVIZIO && CHIAVE_PUBBLICA)

export interface Lettura { kg: number | null; nota?: string }

const PROMPT = (n: number) => `Ti mando ${n} foto del display della bilancia di un carro miscelatore (unifeed) in una stalla.
Per ogni foto leggi il numero mostrato sul display principale: è il peso in kg del carico, un numero intero (di solito tra 0 e 40000).
Ignora orari, date, scritte e altri numeri piccoli. Se il display usa un punto o uno spazio come separatore delle migliaia (es. "12.340"), il peso è 12340.
Se una foto non si legge con sicurezza (sfocata, riflessi, cifre tagliate) dichiarala non leggibile invece di indovinare.
Rispondi SOLO con un oggetto JSON: {"letture":[{"foto":1,"leggibile":true,"kg":12340,"nota":""}, ...]} con una voce per ogni foto, nello stesso ordine in cui le ricevi.`

/* eslint-disable @typescript-eslint/no-explicit-any */
async function conClaude(foto: Blob[]): Promise<Lettura[] | null> {
  const claude = (window as any).claude
  const sample = claude?.use ? await claude.use('sample').catch(() => null) : null
  if (!sample) return null
  const limiti = await sample.limits().catch(() => null)
  if (limiti && !limiti.images) return null
  const max = limiti?.images?.maxCount ?? foto.length
  const out: Lettura[] = []
  // a gruppi, se il limite di immagini per richiesta è più basso del numero di foto
  for (let i = 0; i < foto.length; i += Math.max(1, max)) {
    const gruppo = foto.slice(i, i + Math.max(1, max))
    let json: any
    try {
      json = await sample.json(PROMPT(gruppo.length), { images: gruppo, modelTier: 'default' })
    } catch (e: any) {
      if (e?.code === 'not_granted' || e?.code === 'denied') throw new Error('lettura non consentita: scrivi i numeri a mano')
      if (e?.code === 'rate_limited') throw new Error('troppe richieste, riprova tra poco')
      throw new Error('non sono riuscito a leggere le foto')
    }
    const letture: any[] = Array.isArray(json?.letture) ? json.letture : []
    gruppo.forEach((_, j) => {
      const l = letture.find((x) => Number(x?.foto) === j + 1) ?? letture[j]
      const kg = l && l.leggibile !== false ? Math.round(Number(String(l.kg).replace(/[^\d]/g, ''))) : NaN
      out.push(Number.isFinite(kg) && kg > 0 ? { kg, nota: l?.nota || undefined } : { kg: null, nota: l?.nota || 'Non leggibile: scrivi il numero' })
    })
  }
  return out
}

async function conServizio(foto: Blob[]): Promise<Lettura[]> {
  const immagini = await Promise.all(foto.map(async (f) => ({ media_type: 'image/jpeg', data: await blobInBase64(f) })))
  const risposta = await fetch(`${URL_SERVIZIO}/functions/v1/leggi-pesate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHIAVE_PUBBLICA}` },
    body: JSON.stringify({ immagini }),
  })
  if (!risposta.ok) throw new Error(`servizio non disponibile (${risposta.status})`)
  const json = (await risposta.json()) as { letture?: { foto: number; leggibile: boolean; kg: number; nota: string }[]; errore?: string }
  if (json.errore || !json.letture) throw new Error(json.errore ?? 'risposta non valida')
  return foto.map((_, i) => {
    const l = json.letture!.find((x) => x.foto === i + 1)
    return l && l.leggibile ? { kg: l.kg, nota: l.nota || undefined } : { kg: null, nota: l?.nota || 'Non leggibile' }
  })
}

/** Legge i kg da una o più foto (già compresse). Restituisce una lettura per foto, nello stesso ordine. */
export async function leggiPesate(foto: Blob[]): Promise<Lettura[]> {
  const r = await conClaude(foto)
  if (r) return r
  if (servizioConfigurato) return conServizio(foto)
  throw new Error('la lettura automatica funziona aprendo l’app dal link di Claude')
}
