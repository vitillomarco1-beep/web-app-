// Quotazioni CLAL: prezzi medi mensili della Borsa Merci di Milano (€/t), pagine "Mercato agricolo" di teseo.clal.it.
// Il sito non permette all'app di leggerle da sola: si copiano le tabelle dal sito e si incollano qui.
import type { QuotazioneClal } from './types'

export const PAGINE_CLAL = [
  { nome: 'Cereali', url: 'https://teseo.clal.it/?section=conf_cereali' },
  { nome: 'Foraggi (fieni, erba medica)', url: 'https://teseo.clal.it/?section=conf_foraggi' },
  { nome: 'Foraggi (paglia, melasso, polpe)', url: 'https://teseo.clal.it/?section=conf_foraggi&v=2' },
  { nome: 'Semi oleosi e farine (soia, girasole…)', url: 'https://teseo.clal.it/?section=conf_semi' },
]

/** Ultime quotazioni lette da CLAL (media di ottobre 2026), usate finché non se ne importano di nuove. */
const SNAPSHOT: [string, number][] = [
  ['Frumento tenero panificabile superiore', 266], ['Granoturco nazionale ibrido', 256], ['Granoturco Naz. Zoot. Qualità Caratterist.', 286],
  ['Orzo Comunitario', 254], ['Crusca di frumento tenero', 164], ['Sorgo', 248], ['Farina Glutinata', 218],
  ['Fieno di erba medica pressato', 218], ['Fieno maggengo pressato', 181.25], ['Fieno agostano pressato', 191.25], ['Erba medica disidratata in balloni', 365],
  ['Paglia pressata', 193], ['Melasso di barbabietola', 313], ['Polpe essiccate', 357],
  ['Semi di soia nazionale', 509], ['Semi di soia esteri', 526], ['Panello di lino', 445],
  ['Farina di estrazione di soia nazionale', 505], ['Farina di estrazione di soia estera', 502],
  ['Farina di soia decorticata nazionale', 513], ['Farina di soia decorticata estera', 510],
  ['Farina di estrazione di girasole integrale', 224], ['Farina di estrazione di girasole decorticato', 326], ['Farina di estrazione di colza', 355],
]
export const QUOTAZIONI_INIZIALI: QuotazioneClal[] = SNAPSHOT.map(([nome, prezzoT]) => ({ id: nome, nome, mese: '2026-10', prezzoT, importataIl: '2026-11-03' }))

/** Quotazioni attuali: le importate prevalgono su quelle iniziali (per prodotto, la più recente). */
export function quotazioniAttuali(importate: QuotazioneClal[]): QuotazioneClal[] {
  const m = new Map(QUOTAZIONI_INIZIALI.map((q) => [q.id, q]))
  for (const q of importate) { const v = m.get(q.id); if (!v || q.mese >= v.mese) m.set(q.id, q) }
  return [...m.values()]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const num = (t: string) => { const n = Number(t.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null }

/**
 * Legge il testo copiato dalle pagine CLAL dei prezzi medi mensili (una tabella per prodotto:
 * nome del prodotto, riga degli anni, una riga per mese). Per ogni prodotto prende il mese più
 * recente dell'anno più recente che ha un valore.
 */
export function leggiTabelleClal(testo: string): { nome: string; mese: string; prezzoT: number }[] {
  const ris = new Map<string, { nome: string; mese: string; prezzoT: number }>()
  let prodotto: string | null = null
  let anni: string[] | null = null
  let dopoTitolo = false
  const noti = new Map(SNAPSHOT.map(([n]) => [norm(n), n]))
  for (const grezza of testo.replace(/\r/g, '').split('\n')) {
    const riga = grezza.trim()
    if (!riga) continue
    const celle = riga.split(/\t|\s{2,}|\|/).map((c) => c.trim()).filter(Boolean)
    if (/prezzi medi/i.test(riga)) { prodotto = null; anni = null; dopoTitolo = true; continue }
    const anniRiga = celle.filter((c) => /^(19|20)\d\d$/.test(c))
    if (anniRiga.length >= 3) { anni = anniRiga; continue }
    const nome = noti.get(norm(riga)) ?? (dopoTitolo && /[a-z]{3}/i.test(riga) && !/\d/.test(riga) ? riga : null)
    if (nome) { prodotto = nome; anni = null; dopoTitolo = false; continue }
    const m = MESI.indexOf(norm(celle[0] ?? ''))
    if (m < 0 || !prodotto || !anni) continue
    const valori = celle.slice(1).filter((c) => !c.includes('%') && c !== '-')
    if (valori.length < anni.length) continue
    const v = num(valori[anni.length - 1])
    if (v === null || v <= 0) continue
    const mese = `${anni[anni.length - 1]}-${String(m + 1).padStart(2, '0')}`
    const prima = ris.get(prodotto)
    if (!prima || mese >= prima.mese) ris.set(prodotto, { nome: prodotto, mese, prezzoT: v })
  }
  return [...ris.values()]
}

/** Prodotto CLAL suggerito per un alimento, dal nome. */
const SUGGERIMENTI: [RegExp, string][] = [
  [/erba medica disidratata|disidratat/, 'Erba medica disidratata in balloni'],
  [/medica/, 'Fieno di erba medica pressato'],
  [/agostano/, 'Fieno agostano pressato'],
  [/\bfieno\b|maggengo|polifit/, 'Fieno maggengo pressato'],
  [/\bpaglia\b/, 'Paglia pressata'],
  [/melasso/, 'Melasso di barbabietola'],
  [/polpe|bietola/, 'Polpe essiccate'],
  [/crusca|cruschello|tritello/, 'Crusca di frumento tenero'],
  [/glutin/, 'Farina Glutinata'],
  [/girasole/, 'Farina di estrazione di girasole integrale'],
  [/colza/, 'Farina di estrazione di colza'],
  [/\blino\b/, 'Panello di lino'],
  [/seme di soia|soia integrale|semi di soia/, 'Semi di soia nazionale'],
  [/decorticat/, 'Farina di soia decorticata nazionale'],
  [/\bsoia\b/, 'Farina di estrazione di soia nazionale'],
  [/\bsorgo\b/, 'Sorgo'],
  [/\borzo\b/, 'Orzo Comunitario'],
  [/\bmais\b|granoturco|granturco/, 'Granoturco nazionale ibrido'],
  [/\bfrumento\b|\bgrano\b/, 'Frumento tenero panificabile superiore'],
]
export function suggerisci(nomeAlimento: string): string | undefined {
  const n = norm(nomeAlimento)
  if (/silo|insilat|pastone|trinciat|fasciat/.test(n)) return undefined // prodotti aziendali insilati: nessuna quotazione
  return SUGGERIMENTI.find(([r]) => r.test(n))?.[1]
}

export const meseIt = (m: string) => { const [y, mm] = m.split('-').map(Number); return `${MESI[mm - 1]} ${y}` }
