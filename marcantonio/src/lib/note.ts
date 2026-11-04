import { aggiungiGiorni } from './format'
import type { CasoClinico, Farmaco, Severita, UsoFarmaco } from './types'
import { costoUnitario } from './salute'
// Note veloci: argomento e numero della vacca riconosciuti dal testo (anche dettato).
export const CATEGORIE_NOTE: { id: string; nome: string; link: string; parole: RegExp }[] = [
  { id: 'farmaci', nome: 'Farmaci', link: '/area-riservata/farmaci', parole: /(finit|ordinar|scort|comprar|manca|mancano).*(farmac|antibiot|vaccin|tubett|siring|dosi|flacon)|(farmac|antibiot|vaccin|tubett|siring|dosi|flacon).*(finit|ordinar|scort|comprar|manca|mancano)/i },
  { id: 'salute', nome: 'Salute', link: '/area-riservata/salute', parole: /mastit|zopp|febbr|diarre|trattat|tratta|farmac|antibiot|chetos|ritenzion|metrit|dislocaz|piede|unghion|tosse|polmonit|ferit|gonfi|sangue|grumi|\bcalo\b|cala |non mangia|abbattut|iniezion|siring|veterinar|collass|ipocalc|febbre/i },
  { id: 'vitelli', nome: 'Vitelli', link: '/area-riservata/vitelli', parole: /vitell|nat[oa] |colostr|svezz/i },
  { id: 'riproduzione', nome: 'Parti e asciutta', link: '/area-riservata/parti', parole: /calore|fecond|insemin|gravid|parto|partorit|asciutt|aborto|close up|sala parto|toro/i },
  { id: 'robot', nome: 'Robot', link: '/area-riservata/mungiture', parole: /robot|vms|ms1|lely|mungitur|allarme|fermo|guast|tettarell|capezzol/i },
  { id: 'alimentazione', nome: 'Alimentazione', link: '/area-riservata/alimentazione', parole: /carro|razion|unifeed|pmr|silo|mangim|mash|fieno|paglia|scaric|mangiatoia|acqua|abbeverat|nucleo|soia|mais|orzo|melasso|pasta|quintal/i },
]
export const ALTRO = { id: 'altro', nome: 'Altro', link: '/area-riservata' }

export function categoriaNota(testo: string) {
  return CATEGORIE_NOTE.find((c) => c.parole.test(testo)) ?? ALTRO
}
export const infoCategoria = (id: string) => CATEGORIE_NOTE.find((c) => c.id === id) ?? ALTRO

// ---- Numero dell'animale dalla dettatura
// Può arrivare in tanti modi: "970", "9 7 0", "9 70", "97 0", "nove sette zero", "nove settanta",
// "novecento settanta", "novecentosettanta". Si provano le interpretazioni possibili e, se c'è la
// lista della mandria, si sceglie quella che corrisponde a un animale presente.

const UNITA: Record<string, number> = { zero: 0, uno: 1, un: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9,
  dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19 }
const DECINE: Record<string, number> = { venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80, novanta: 90 }

/** Parola italiana → numero (fino a 9999), es. "novecentosettantadue" → 972. null se non è un numero. */
export function parolaNumero(p: string): number | null {
  let w = p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (!w) return null
  let tot = 0
  const m = w.match(/^(.*?)mila?(.*)$/) // mille, duemila
  if (m && /^(|un|due|tre|quattro|cinque|sei|sette|otto|nove)$/.test(m[1]) && (w.startsWith('mille') || w.includes('mila'))) {
    const k = m[1] ? parolaNumero(m[1]) : 1
    if (k === null) return null
    tot += k * 1000
    w = w.startsWith('mille') ? w.slice(5) : m[2]
  }
  const c = w.match(/^(.*?)cento(.*)$/)
  if (c) {
    const h = c[1] ? parolaNumero(c[1]) : 1
    if (h === null || h > 9) return null
    tot += h * 100
    w = c[2]
  }
  if (!w) return tot || (p.match(/cento|mill|mila/) ? tot : null)
  if (w in UNITA) return tot + UNITA[w]
  for (const [d, v] of Object.entries(DECINE)) {
    const base = d.slice(0, -1) // "settant" per "settantuno"/"settantotto"
    if (w === d) return tot + v
    if (w.startsWith(d) || w.startsWith(base)) {
      const resto = w.startsWith(d) ? w.slice(d.length) : w.slice(base.length)
      if (resto in UNITA && UNITA[resto] < 10) return tot + v + UNITA[resto]
    }
  }
  return null
}

const UNITA_MISURA = /^(kg|chili|litri|litro|l|ml|gradi|°|%|ore|minuti|giorni|tubett|dos|volt|quintal|q|euro|€|cc|grammi|g)/i
const PRIMA_NON_ANIMALE = /\b(alle|ore|dalle|verso|vms|ms|robot|box|gruppo|stalla|posto|cuccetta)\s*$/i

/** Sequenze di numeri consecutivi (cifre o parole) nel testo, con la parola che le precede. */
function sequenze(testo: string): { pezzi: string[]; valori: number[]; prima: string; dopo: string }[] {
  const tok = testo.split(/(\s+|[,;:.!?()]+)/).filter((t) => t && !/^\s+$/.test(t))
  const out: { pezzi: string[]; valori: number[]; prima: string; dopo: string }[] = []
  let i = 0
  while (i < tok.length) {
    // "un"/"una" sono quasi sempre articoli ("una vacca zoppa"), non numeri
    const val = (t: string) => (/^\d{1,5}$/.test(t) ? Number(t) : /^(un|una|un')$/i.test(t) ? null : parolaNumero(t))
    if (val(tok[i]) === null) { i++; continue }
    const pezzi: string[] = [], valori: number[] = []
    const prima = tok.slice(Math.max(0, i - 2), i).join(' ')
    while (i < tok.length) {
      const v = val(tok[i])
      if (v !== null) { pezzi.push(tok[i]); valori.push(v); i++; continue }
      // "nove e settanta": la "e" unisce due numeri
      if (/^e$/i.test(tok[i]) && i + 1 < tok.length && val(tok[i + 1]) !== null && pezzi.length) { i++; continue }
      break
    }
    out.push({ pezzi, valori, prima, dopo: tok[i] ?? '' })
  }
  return out
}

/** Interpretazioni possibili di una sequenza: cifre accostate ("9 70" → 970) e somma ("novecento settanta" → 970). */
function candidati(valori: number[]): string[] {
  const accostati = valori.map(String).join('')
  const somma = String(valori.reduce((a, b) => a + b, 0))
  // la somma ha senso se ogni pezzo sta negli "zeri" del precedente: 900 + 70, 90 + 7, 1000 + 50
  const zeri = (n: number) => { let z = 0; while (n > 0 && n % 10 === 0) { n /= 10; z++ } return z }
  const sommaPlausibile = valori.length > 1 && valori.every((v, k) => k === 0 || (v > 0 && v < 10 ** zeri(valori.slice(0, k).reduce((a, b) => a + b, 0))))
  return [...new Set(sommaPlausibile ? [somma, accostati] : [accostati, somma])].filter((x) => x.length <= 5)
}

/**
 * Numero dell'animale nella nota. Se si passa l'elenco degli animali presenti, sceglie l'interpretazione
 * che corrisponde a un animale; altrimenti la più probabile.
 */
export function vaccaNota(testo: string, presenti?: Set<string>): string | undefined {
  const seq = sequenze(testo).filter((s) => !PRIMA_NON_ANIMALE.test(s.prima) && !UNITA_MISURA.test(s.dopo))
  // prima le sequenze dopo "vacca", "la", "numero"…, poi le altre
  const ordinate = [...seq.filter((s) => /\b(vacca|vitell[oa]|manza|bovina|capo|numero|n|la|il|matricola)\s*$/i.test(s.prima)), ...seq]
  for (const s of ordinate) {
    const c = candidati(s.valori)
    if (presenti?.size) { const ok = c.find((x) => presenti.has(x)); if (ok) return ok }
  }
  return ordinate.length ? candidati(ordinate[0].valori)[0] : undefined
}

// ---- Inserimento automatico in Salute


const PATOLOGIA_DA_TESTO: [RegExp, string][] = [
  [/mastit|grumi|quarto|capezzol/i, 'mastite'],
  [/zopp|piede|unghion|dermatit|ulcera|ascesso|arti?\b|zampa/i, 'zoppia'],
  [/chetos/i, 'chetosi'],
  [/ipocalc|febbre da latte|a terra|collass/i, 'ipocalcemia'],
  [/abomaso|dislocaz/i, 'abomaso'],
  [/placenta|ritenzion|seconda/i, 'placenta'],
  [/metrit|scolo|utero/i, 'metrite'],
  [/polmon|tosse|respir|bronch/i, 'respiratoria'],
  [/diarre|acidosi|digest|meteoris|gonfi/i, 'digestiva'],
]
const NUMERI: Record<string, number> = { un: 1, uno: 1, una: 1, mezzo: 0.5, mezza: 0.5, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, venti: 20, trenta: 30 }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Quarti della mammella (mastite): "posteriore sinistro" → PS, ecc. */
function quarti(testo: string): string[] {
  const t = norm(testo)
  const out = new Set<string>()
  for (const m of t.matchAll(/\b(anterior[ei]|davanti|posterior[ei]|dietro)\s+(destr[oa]|sinistr[oa])\b/g)) {
    out.add(`${/^(anterior|davanti)/.test(m[1]) ? 'A' : 'P'}${m[2].startsWith('d') ? 'D' : 'S'}`)
  }
  for (const m of t.matchAll(/\b(as|ad|ps|pd)\b/g)) out.add(m[1].toUpperCase())
  return [...out]
}

/** Farmaci del magazzino nominati nella nota, con la quantità detta prima del nome (es. "2 tubetti di X", "un X", "10 ml di X"). */
function farmaciDaTesto(testo: string, farmaci: Farmaco[]): UsoFarmaco[] {
  const t = norm(testo)
  const out: UsoFarmaco[] = []
  for (const f of farmaci) {
    const nome = norm(f.nome).split(/\s+/)[0] // basta la prima parola del nome commerciale
    if (nome.length < 4) continue
    const i = t.indexOf(nome)
    if (i < 0) continue
    const prima = t.slice(Math.max(0, i - 40), i)
    const m = prima.match(/(\d+(?:[.,]\d+)?|un[oa]?|mezz[oa]|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|venti|trenta)\s*(?:[a-z]+\s+){0,2}(?:di\s+|d')?$/)
    const q = m ? (NUMERI[m[1]] ?? Number(m[1].replace(',', '.'))) : 1
    out.push({ farmacoId: f.id, quantita: q > 0 ? q : 1, costoUnitario: costoUnitario(f) })
  }
  return out
}

/** Dalla nota di salute ricava il caso clinico da inserire (serve il numero della vacca). */
export function casoDaNota(testo: string, vacca: string, oggi: string, farmaci: Farmaco[]): Omit<CasoClinico, 'id'> {
  const patologia = PATOLOGIA_DA_TESTO.find(([r]) => r.test(testo))?.[1] ?? 'altro'
  const t = norm(testo)
  const severita: Severita = /grav|a terra|collass|non si alza|urgente/.test(t) ? 'grave' : /liev|legger|poco/.test(t) ? 'lieve' : 'moderata'
  const tr = testo.match(/(?:trattat[ao]|curat[ao]|terapia|fatt[oa])\s+(?:con\s+)?(.+)$/i)
  const q = patologia === 'mastite' ? quarti(testo) : []
  const usi = farmaciDaTesto(testo, farmaci)
  return {
    vacca, patologia, dataInizio: oggi, severita,
    trattamento: tr ? tr[1].trim().replace(/[.;]$/, '') : '',
    ...(q.length ? { quarti: q } : {}),
    ...(usi.length ? { farmaci: usi } : {}),
    note: `Nota dettata: "${testo}"`,
  }
}

// ---- Promemoria: "ricordami domani di fecondare la vacca 135"


const GIORNI_SETT = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato']
const MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export const ePromemoria = (testo: string) => /\b(ricordami|ricorda(?:mi|re)?|promemoria|non dimenticare|non scordare)\b/i.test(testo)

/** Giorno del promemoria dal testo (oggi se non è indicato) e testo ripulito. */
export function promemoriaDaTesto(testo: string, oggi: string): { data: string; titolo: string } {
  const t = testo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const [y, m, d] = oggi.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  let data = oggi
  let trovato = ''
  const num = (x: string) => (/^\d+$/.test(x) ? Number(x) : parolaNumero(x) ?? NaN)
  let r: RegExpMatchArray | null
  if ((r = t.match(/\bdopodomani\b/))) { data = aggiungiGiorni(oggi, 2); trovato = r[0] }
  else if ((r = t.match(/\bdomani\b/))) { data = aggiungiGiorni(oggi, 1); trovato = r[0] }
  else if ((r = t.match(/\b(?:tra|fra)\s+(\w+)\s+(giorn[oi]|settiman[ae]|mes[ei])\b/))) {
    const n = num(r[1])
    if (Number.isFinite(n)) { data = aggiungiGiorni(oggi, n * (r[2].startsWith('settiman') ? 7 : r[2].startsWith('mes') ? 30 : 1)); trovato = r[0] }
  }
  else if ((r = t.match(/\b(?:la\s+)?prossima\s+settimana\b/))) { data = aggiungiGiorni(oggi, ((8 - dow) % 7) || 7); trovato = r[0] }
  else if ((r = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/))) {
    const yy = r[3] ? (r[3].length === 2 ? 2000 + Number(r[3]) : Number(r[3])) : y
    let cand = `${yy}-${String(r[2]).padStart(2, '0')}-${String(r[1]).padStart(2, '0')}`
    if (!r[3] && cand < oggi) cand = `${yy + 1}${cand.slice(4)}`
    data = cand; trovato = r[0]
  }
  else if ((r = t.match(new RegExp(`\\b(?:il\\s+)?(\\d{1,2}|\\w+)\\s+(${MESI_IT.join('|')})\\b`)))) {
    const g = num(r[1]), mese = MESI_IT.indexOf(r[2]) + 1
    if (Number.isFinite(g) && g >= 1 && g <= 31) {
      let cand = `${y}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`
      if (cand < oggi) cand = `${y + 1}${cand.slice(4)}`
      data = cand; trovato = r[0]
    }
  }
  else if ((r = t.match(new RegExp(`\\b(?:il\\s+|la\\s+|questo\\s+|prossimo\\s+)?(${GIORNI_SETT.join('|')})\\b`)))) {
    const g = GIORNI_SETT.indexOf(r[1])
    data = aggiungiGiorni(oggi, ((g - dow + 7) % 7) || 7); trovato = r[0]
  }
  else if ((r = t.match(/\boggi\b|\bstasera\b|\bdopo\b/))) { trovato = r[0] }
  // testo del promemoria: tolgo "ricordami", la data e il "di/che" iniziale
  let titolo = testo
  titolo = titolo.replace(/\b(ricordami|ricorda(?:mi|re)?|promemoria|non dimenticare|non scordare)\b\s*(?:di|che|:)?\s*/i, '')
  if (trovato) {
    const i = titolo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(trovato)
    if (i >= 0) titolo = titolo.slice(0, i) + titolo.slice(i + trovato.length)
  }
  titolo = titolo.replace(/^\s*(?:(?:il|la|lo|per)\s+)?(?:di|che|:|,)\s+/i, '').replace(/\s+(?:il|la|lo)\s+(?=di\s)/i, ' ').replace(/\s{2,}/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '')
  return { data, titolo: titolo ? titolo[0].toUpperCase() + titolo.slice(1) : testo }
}
