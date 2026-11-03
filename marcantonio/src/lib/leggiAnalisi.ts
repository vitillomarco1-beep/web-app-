// Lettura automatica del referto di laboratorio del PMR (PDF o foto) con Claude.
// Il PDF viene trasformato in immagini (e testo) nel browser; i valori letti vanno sempre controllati.
import { comprimiFoto } from './fotoStore'

export interface ValoriLetti {
  data?: string | null; ss?: number | null; pg?: number | null; ndf?: number | null; adf?: number | null
  amido?: number | null; grassi?: number | null; ceneri?: number | null; ufl?: number | null; laboratorio?: string | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function pdfInImmagini(file: File): Promise<{ immagini: Blob[]; testo: string }> {
  const pdfjs: any = await import('pdfjs-dist')
  // worker nello stesso thread (nessun file separato da caricare)
  await import('pdfjs-dist/build/pdf.worker.min.mjs' as string)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const immagini: Blob[] = []
  let testo = ''
  for (let n = 1; n <= Math.min(doc.numPages, 3); n++) {
    const pagina = await doc.getPage(n)
    const tc = await pagina.getTextContent()
    testo += tc.items.map((i: any) => i.str).join(' ') + '\n'
    const vp = pagina.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width; canvas.height = vp.height
    await pagina.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
    immagini.push(await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), 'image/jpeg', 0.85)))
  }
  return { immagini, testo }
}

const PROMPT = `Sei un tecnico di alimentazione delle bovine da latte. Ti mando il referto di laboratorio dell'analisi di un PMR (unifeed).
Estrai i valori e rispondi SOLO con un oggetto JSON con queste chiavi (numeri con il punto decimale, null se il valore non c'è):
- "data": data del prelievo o del campionamento in formato AAAA-MM-GG (se manca, la data del referto)
- "ss": sostanza secca in % sul tal quale (se c'è solo l'umidità: 100 - umidità)
- "pg": proteina grezza in % sulla sostanza secca
- "ndf", "adf", "amido", "grassi" (estratto etereo / grassi grezzi), "ceneri": in % sulla sostanza secca
- "ufl": UFL per kg di sostanza secca
- "laboratorio": nome del laboratorio
Se il referto riporta sia i valori sul tal quale sia sulla sostanza secca, usa quelli sulla sostanza secca.
Se riporta solo i valori sul tal quale, convertili: valore_ss = valore_tq / (ss / 100). Stessa cosa per le UFL.
Non inventare valori.`

export async function leggiReferto(file: File): Promise<{ valori: ValoriLetti } | { errore: string }> {
  const claude = (window as any).claude
  const sample = claude?.use ? await claude.use('sample').catch(() => null) : null
  if (!sample) return { errore: 'La lettura automatica funziona solo aprendo l’app dal link di Claude. Inserisci i valori a mano: il file viene comunque allegato.' }
  let immagini: Blob[] = [], testo = ''
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ({ immagini, testo } = await pdfInImmagini(file))
    else immagini = [await comprimiFoto(file, 2000, 0.85)]
  } catch {
    return { errore: 'Non riesco ad aprire il file. Prova con una foto del referto o inserisci i valori a mano.' }
  }
  const limiti = await sample.limits().catch(() => null)
  const max = limiti?.images?.maxCount ?? 0
  const input = PROMPT + (testo.trim() ? `\n\nTesto estratto dal PDF (può essere disordinato):\n${testo.slice(0, 20000)}` : '')
  try {
    const valori = await sample.json(input, max ? { images: immagini.slice(0, max), modelTier: 'default' } : { modelTier: 'default' })
    return { valori: valori as ValoriLetti }
  } catch (e: any) {
    const codice = e?.code
    if (codice === 'not_granted' || codice === 'denied') return { errore: 'Lettura automatica non consentita. Inserisci i valori a mano.' }
    if (codice === 'rate_limited') return { errore: 'Troppe richieste in poco tempo: riprova tra qualche minuto o inserisci i valori a mano.' }
    return { errore: 'Non sono riuscito a leggere il referto. Inserisci i valori a mano: il file viene comunque allegato.' }
  }
}

/** Salva il file nell'archivio condiviso dell'app (se disponibile). */
export async function allegaFile(file: File): Promise<{ id: string; url: string; nome: string } | null> {
  try {
    const assets = await (window as any).claude?.use?.('assets')
    if (!assets) return null
    const r = await assets.upload(file)
    return { id: r.id, url: r.url, nome: file.name }
  } catch {
    return null
  }
}
