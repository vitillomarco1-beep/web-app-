// Controlli funzionali APA (file CFAnalis_*.txt e CFProduz_*.txt, di solito dentro uno zip).
// CFAnalis: per riga marca auricolare (14), data AAAAMMGG (8), grasso % ×100 (3), proteine % ×100 (3),
//           cellule ×1000/ml (5), lattosio % ×100 (3). Un valore 000 = non letto dal laboratorio.
// CFProduz: per riga marca auricolare (14), spazi, latte kg ×10 (4) e un secondo valore (8).
import type { ControlloApa } from './types'

export type RigaApa = [kg: number | null, grasso: number | null, proteine: number | null, cellule: number | null, lattosio: number | null]

/** Matricola normalizzata: maiuscole, senza spazi, "IT" davanti se sono solo cifre. */
export const normMatricola = (m: string) => {
  const s = m.trim().toUpperCase().replace(/\s+/g, '')
  return /^\d+$/.test(s) ? `IT${s}` : s
}

/* ---------- lettura di uno zip nel browser (senza librerie) ---------- */
async function inflate(dati: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const out = new Blob([dati.slice()]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** File di testo contenuti in uno zip: nome → contenuto. */
export async function leggiZip(buf: ArrayBuffer): Promise<Map<string, string>> {
  const b = new Uint8Array(buf)
  const dv = new DataView(buf)
  // fine della directory centrale
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('Il file non è uno zip valido.')
  const n = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = new Map<string, string>()
  const dec = new TextDecoder('latin1')
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const metodo = dv.getUint16(p + 10, true)
    const compr = dv.getUint32(p + 20, true)
    const lNome = dv.getUint16(p + 28, true), lExtra = dv.getUint16(p + 30, true), lComm = dv.getUint16(p + 32, true)
    const offset = dv.getUint32(p + 42, true)
    const nome = dec.decode(b.subarray(p + 46, p + 46 + lNome))
    p += 46 + lNome + lExtra + lComm
    // intestazione locale: i dati iniziano dopo nome ed extra locali
    const inizio = offset + 30 + dv.getUint16(offset + 26, true) + dv.getUint16(offset + 28, true)
    const grezzi = b.subarray(inizio, inizio + compr)
    if (metodo === 0) out.set(nome, dec.decode(grezzi))
    else if (metodo === 8) out.set(nome, dec.decode(await inflate(grezzi)))
  }
  return out
}

/* ---------- lettura dei due file ---------- */
const val = (s: string, div: number) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n / div : null }

export function leggiAnalisi(testo: string): { data: string | null; righe: Map<string, RigaApa> } {
  const righe = new Map<string, RigaApa>()
  let data: string | null = null
  for (const riga of testo.split(/\r?\n/)) {
    const l = riga.trimEnd()
    if (!/^[A-Z]{2}\d{12}\d{8}\d{14}/.test(l)) continue
    const m = l.slice(0, 14), d = l.slice(14, 22), r = l.slice(22)
    data ??= `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    righe.set(m, [null, val(r.slice(0, 3), 100), val(r.slice(3, 6), 100), val(r.slice(6, 11), 1), val(r.slice(11, 14), 100)])
  }
  return { data, righe }
}

export function leggiProduzione(testo: string): { data: string | null; kg: Map<string, number> } {
  const kg = new Map<string, number>()
  let data: string | null = null
  for (const riga of testo.split(/\r?\n/)) {
    const l = riga.trimEnd()
    const intest = l.match(/^0{14}(\d{8})/)
    if (intest) { const d = intest[1]; data = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`; continue }
    const m = l.match(/^([A-Z]{2}\d{12})\s+(\d{4})/)
    if (m) { const v = val(m[2], 10); if (v !== null) kg.set(m[1], v) }
  }
  return { data, kg }
}

/** Da file (zip o txt) ai controlli pronti da salvare: ogni zip è un controllo, i .txt sciolti insieme un altro. */
export async function leggiControlli(files: File[]): Promise<ControlloApa[]> {
  const gruppi: { nome: string; testi: Map<string, string> }[] = []
  const sciolti = new Map<string, string>()
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) gruppi.push({ nome: f.name, testi: await leggiZip(await f.arrayBuffer()) })
    else sciolti.set(f.name, await f.text())
  }
  if (sciolti.size) gruppi.push({ nome: [...sciolti.keys()].join(', '), testi: sciolti })
  const out: ControlloApa[] = []
  for (const g of gruppi) out.push(daTesti(g.nome, g.testi))
  return out
}

function daTesti(nomeFile: string, testi: Map<string, string>): ControlloApa {
  const an = [...testi.entries()].find(([n]) => /analis/i.test(n)) ?? [...testi.entries()].find(([, t]) => /^[A-Z]{2}\d{34}/m.test(t))
  const pr = [...testi.entries()].find(([n]) => /produz/i.test(n))
  if (!an) throw new Error(`${nomeFile}: non trovo il file delle analisi (CFAnalis). Carica lo zip dell’APA così com’è.`)
  const a = leggiAnalisi(an[1])
  const p = pr ? leggiProduzione(pr[1]) : { data: null, kg: new Map<string, number>() }
  const data = a.data ?? p.data
  if (!data || !a.righe.size) throw new Error(`${nomeFile}: il file delle analisi non contiene vacche leggibili.`)
  const vacche: ControlloApa['vacche'] = {}
  for (const [m, r] of a.righe) vacche[m] = [p.kg.get(m) ?? null, r[1], r[2], r[3], r[4]]
  for (const [m, kg] of p.kg) if (!vacche[m]) vacche[m] = [kg, null, null, null, null]
  return { id: data, data, nomeFile, importatoIl: new Date().toISOString(), vacche }
}

/* ---------- indicatori ---------- */
export const SOGLIE = { cellule: 200, celluleAlte: 400, gpBasso: 1.0, gpAlto: 1.4, lattosio: 4.6 }

export interface VaccaApa {
  matricola: string; vacca: string | null; stalla: number | null; gruppo: number | null; lattazione: number | null
  kg: number | null; grasso: number | null; proteine: number | null; gp: number | null; cellule: number | null; lattosio: number | null
  cellulePrima: number | null // controllo precedente
}

export interface Indici {
  n: number; kgMedio: number | null; grasso: number | null; proteine: number | null; gp: number | null
  gpBassoPct: number | null; gpAltoPct: number | null; cellule: number | null /* media geometrica pesata sul latte */; celluleAltePct: number | null; lattosio: number | null
}

const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)
/** Media pesata sul latte (come il latte di massa); senza kg, media semplice. */
const pesata = (vs: VaccaApa[], k: 'grasso' | 'proteine' | 'lattosio') => {
  const ok = vs.filter((v) => v[k] !== null)
  const conKg = ok.filter((v) => v.kg)
  if (conKg.length) return conKg.reduce((s, v) => s + v[k]! * v.kg!, 0) / conKg.reduce((s, v) => s + v.kg!, 0)
  return media(ok.map((v) => v[k]!))
}

export function indici(vs: VaccaApa[]): Indici {
  const conGp = vs.filter((v) => v.gp !== null)
  const conCell = vs.filter((v) => v.cellule !== null)
  const pesi = conCell.map((v) => v.kg ?? 1)
  const totPesi = pesi.reduce((s, x) => s + x, 0)
  const geo = conCell.length ? Math.exp(conCell.reduce((s, v, i) => s + Math.log(Math.max(1, v.cellule!)) * pesi[i], 0) / totPesi) : null
  const grasso = pesata(vs, 'grasso'), proteine = pesata(vs, 'proteine')
  return {
    n: vs.length,
    kgMedio: media(vs.filter((v) => v.kg !== null).map((v) => v.kg!)),
    grasso, proteine, gp: grasso && proteine ? grasso / proteine : null,
    gpBassoPct: conGp.length ? conGp.filter((v) => v.gp! < SOGLIE.gpBasso).length / conGp.length : null,
    gpAltoPct: conGp.length ? conGp.filter((v) => v.gp! > SOGLIE.gpAlto).length / conGp.length : null,
    cellule: geo,
    celluleAltePct: conCell.length ? conCell.filter((v) => v.cellule! > SOGLIE.cellule).length / conCell.length : null,
    lattosio: pesata(vs, 'lattosio'),
  }
}

/** Vacche di un controllo con numero di stalla (dalla matricola della lista Mandria) e cellule del controllo precedente. */
export function vaccheDelControllo(c: ControlloApa, prima: ControlloApa | undefined, perMatricola: Map<string, { vacca: string; gruppo: number | null; lattazione?: number | null }>, stallaDelGruppo: (g: number | null) => number | null): VaccaApa[] {
  return Object.entries(c.vacche).map(([matricola, [kg, grasso, proteine, cellule, lattosio]]) => {
    const a = perMatricola.get(normMatricola(matricola))
    return {
      matricola, vacca: a?.vacca ?? null, gruppo: a?.gruppo ?? null, lattazione: a?.lattazione ?? null, stalla: a ? stallaDelGruppo(a.gruppo) : null,
      kg, grasso, proteine, gp: grasso && proteine ? grasso / proteine : null, cellule, lattosio,
      cellulePrima: prima?.vacche[matricola]?.[3] ?? null,
    }
  })
}
