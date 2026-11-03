// Prezzi degli alimenti: listino tipico preimpostato e importazione delle quotazioni CLAL (copia e incolla).

/** Alimenti più comuni nelle razioni delle bovine da latte, con le parole per riconoscerli nelle quotazioni. */
export const LISTINO_TIPICO: { nome: string; parole: string[]; fonte: 'fornitore' | 'aziendale' }[] = [
  { nome: 'Silomais', parole: ['silomais', 'insilato di mais', 'trinciato di mais'], fonte: 'aziendale' },
  { nome: 'Silofrumento', parole: ['silofrumento', 'insilato di frumento', 'trinciato di frumento'], fonte: 'aziendale' },
  { nome: 'Pastone di mais', parole: ['pastone'], fonte: 'aziendale' },
  { nome: 'Fieno di erba medica', parole: ['erba medica', 'medica', 'fieno di erba medica'], fonte: 'aziendale' },
  { nome: 'Fieno polifita', parole: ['polifita', 'fieno di prato', 'fieno maggengo', 'loietto', 'fieno'], fonte: 'aziendale' },
  { nome: 'Paglia', parole: ['paglia'], fonte: 'fornitore' },
  { nome: 'Farina di mais', parole: ['mais', 'granoturco', 'granturco'], fonte: 'fornitore' },
  { nome: 'Farina di soia 44%', parole: ['soia 44', 'estrazione di soia', 'farina di soia', 'f.e. soia', 'soia decorticata', 'soia'], fonte: 'fornitore' },
  { nome: 'Melasso', parole: ['melasso'], fonte: 'fornitore' },
  { nome: 'Orzo', parole: ['orzo'], fonte: 'fornitore' },
  { nome: 'Crusca / cruschello', parole: ['crusca', 'cruschello', 'tritello'], fonte: 'fornitore' },
  { nome: 'Polpe di bietola', parole: ['polpe', 'bietola', 'barbabietola'], fonte: 'fornitore' },
  { nome: 'Farina di girasole', parole: ['girasole'], fonte: 'fornitore' },
  { nome: 'Seme di cotone', parole: ['cotone'], fonte: 'fornitore' },
  { nome: 'Pasta di scarto', parole: ['pasta di scarto', 'scarti di pasta', 'pasta'], fonte: 'fornitore' },
  { nome: 'Nucleo / integratore', parole: ['nucleo', 'integratore'], fonte: 'fornitore' },
  { nome: 'Mash Robot', parole: ['mash'], fonte: 'fornitore' },
]

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** Numero italiano o inglese: "1.234,50" "234,00" "234.5" */
function numero(t: string): number | null {
  let s = t.trim()
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export interface RigaQuotazione { voce: string; prezzo: number; min?: number; max?: number }

/**
 * Legge le righe copiate da una tabella di quotazioni (CLAL, Borsa Merci…): per ogni riga il nome
 * del prodotto è il testo prima del primo numero; il prezzo è la media di minimo e massimo se ci sono
 * due valori vicini, altrimenti il primo valore. Le date e le variazioni (+/- e %) vengono ignorate.
 */
export function leggiQuotazioni(testo: string): RigaQuotazione[] {
  const out: RigaQuotazione[] = []
  for (const riga of testo.replace(/\r/g, '').split('\n')) {
    const r = riga.replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, (d) => ' '.repeat(d.length)) // via le date
    // numeri "prezzo": non seguiti da %, °, ª o lettere, non preceduti da + o - (variazioni)
    const prezzi: { v: number; pos: number }[] = []
    for (const m of r.matchAll(/(^|[^\w.,+\-])(\d[\d.,]*)(?![\d.,]*\s*[%°ªº])(?![\d.,]*[A-Za-zÀ-ú])/g)) {
      const v = numero(m[2].replace(/[.,]$/, ''))
      if (v !== null && v > 0) prezzi.push({ v, pos: m.index! + m[1].length })
    }
    if (!prezzi.length) continue
    const voce = r.slice(0, prezzi[0].pos).replace(/[\t;|€:]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (voce.length < 3 || !/[A-Za-zÀ-ú]{3}/.test(voce)) continue
    const [a, b] = prezzi.map((x) => x.v)
    const coppia = b !== undefined && Math.abs(a - b) <= Math.max(a, b) * 0.25
    out.push(coppia ? { voce, prezzo: (a + b) / 2, min: Math.min(a, b), max: Math.max(a, b) } : { voce, prezzo: a })
  }
  return out
}

/** Abbina una voce di quotazione a un alimento (per nome o per le parole del listino tipico). */
export function abbina<T extends { id: string; nome: string }>(voce: string, ingredienti: T[]): T | undefined {
  const v = norm(voce)
  const diretto = ingredienti.find((i) => v.includes(norm(i.nome)) || norm(i.nome).includes(v))
  if (diretto) return diretto
  // ordine: le parole più lunghe prima (es. "farina di soia" prima di "mais")
  const candidati = LISTINO_TIPICO.flatMap((l) => l.parole.map((p) => ({ l, p }))).sort((a, b) => b.p.length - a.p.length)
  for (const { l, p } of candidati) {
    if (!new RegExp(`(^|[^a-z])${norm(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(v)) continue
    const parola = (testo: string, q: string) => new RegExp(`(^|[^a-z])${norm(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(norm(testo))
    const ingr = ingredienti.find((i) => norm(i.nome) === norm(l.nome)) ?? ingredienti.find((i) => l.parole.some((q) => parola(i.nome, q)))
    if (ingr) return ingr
  }
  return undefined
}

/** Alimento già inserito che corrisponde a una voce del listino tipico (nome uguale o parola chiave intera). */
export function alimentoDelListino<T extends { nome: string }>(l: { nome: string; parole: string[] }, ingredienti: T[]): T | undefined {
  const parola = (testo: string, q: string) => new RegExp(`(^|[^a-z])${norm(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(norm(testo))
  return ingredienti.find((i) => norm(i.nome) === norm(l.nome)) ?? ingredienti.find((i) => l.parole.some((q) => parola(i.nome, q)))
}
