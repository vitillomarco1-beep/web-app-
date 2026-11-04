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

/** Numero della vacca: "vacca 1072", "la 1072", "n. 1072", oppure il primo numero di 1–5 cifre non seguito da unità. */
export function vaccaNota(testo: string): string | undefined {
  const m = testo.match(/\b(?:vacca|vitell[oa]|manza|bovina|capo|numero|n\.?|la|il)\s*(?:n\.?|numero)?\s*(\d{1,5})\b/i)
    ?? testo.match(/(?<!\b(?:alle|ore|dalle|verso le|vms|ms)\s*)\b(\d{1,5})\b(?![:.,]\d)(?!\s*(?:kg|litri|l\b|ml|gradi|°|%|ore|minuti|giorni|tubett|dosi|volte|quintal|q\b|euro|€))/i)
  return m?.[1]
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
