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
