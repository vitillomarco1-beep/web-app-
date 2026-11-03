// Parti previsti (lista di DairyComp) e vaccinazioni da fare prima del parto.
import type { AnimaleDC, ImportDC } from './types'
import { aggiungiGiorni, isoGiorno, lunediDi } from './format'

/** Durata della gravidanza usata quando il file ha solo i giorni di gravidanza (DCC). */
export const GESTAZIONE_GG = 280
/** Di default: il martedì si prepara la lista della settimana che inizia 5 settimane dopo il lunedì corrente. */
export const SETTIMANE_ANTICIPO = 5

const giorniTra = (da: string, a: string) => {
  const [y1, m1, d1] = da.split('-').map(Number)
  const [y2, m2, d2] = a.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

function valida(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getMonth() !== m - 1) return null
  return isoGiorno(dt)
}

/**
 * Legge la data del parto scritta nel file (gg/mm/aa, gg/mm/aaaa, aaaa-mm-gg, anche con - o .).
 * Se la data potrebbe essere letta in due modi (es. 07/12 o 12/07), sceglie quella coerente
 * con i giorni di gravidanza; senza, usa l'ordine italiano giorno/mese.
 */
export function leggiDataParto(testo: string | null | undefined, dataLista: string, dcc?: number | null): string | null {
  if (!testo) return null
  const t = testo.trim()
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return valida(+m[1], +m[2], +m[3])
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (!m) return null
  const it = valida(+m[3], +m[2], +m[1])
  const us = valida(+m[3], +m[1], +m[2])
  if (it && us && it !== us && typeof dcc === 'number') {
    const atteso = aggiungiGiorni(dataLista, GESTAZIONE_GG - dcc)
    return Math.abs(giorniTra(atteso, us)) < Math.abs(giorniTra(atteso, it)) ? us : it
  }
  return it ?? us
}

export interface PartoPrevisto {
  vacca: string
  gruppo: number | null
  lattazione: number | null
  dataParto: string
  stimata: boolean // calcolata dai giorni di gravidanza, non scritta nel file
  giorniGravidanzaOggi: number | null
}

export function partiPrevisti(lista: ImportDC | undefined, oggi = isoGiorno()): PartoPrevisto[] {
  if (!lista) return []
  const out: PartoPrevisto[] = []
  for (const a of lista.animali as AnimaleDC[]) {
    const dcc = a.giorniGravidanza ?? null
    let data = leggiDataParto(a.dataPartoPrevista, lista.data, dcc)
    // una data molto nel passato non è un parto previsto (es. colonna con la data dell'ultimo parto)
    if (data && data < aggiungiGiorni(lista.data, -30)) data = null
    let stimata = false
    if (!data && typeof dcc === 'number' && dcc > 0) { data = aggiungiGiorni(lista.data, GESTAZIONE_GG - dcc); stimata = true }
    if (!data) continue
    const gg = typeof dcc === 'number' ? dcc + giorniTra(lista.data, oggi) : GESTAZIONE_GG - giorniTra(oggi, data)
    out.push({ vacca: a.id, gruppo: a.gruppo, lattazione: a.lattazione, dataParto: data, stimata, giorniGravidanzaOggi: gg })
  }
  return out.sort((x, y) => x.dataParto.localeCompare(y.dataParto) || x.vacca.localeCompare(y.vacca, 'it', { numeric: true }))
}

/** Settimana (lunedì–domenica) dei parti per cui vaccinare adesso. */
export function settimanaVaccinazioni(oggi = isoGiorno(), anticipo = SETTIMANE_ANTICIPO, spostamento = 0) {
  const da = aggiungiGiorni(lunediDi(oggi), 7 * (anticipo + spostamento))
  return { da, a: aggiungiGiorni(da, 6) }
}

export const nellaSettimana = (p: PartoPrevisto, s: { da: string; a: string }) => p.dataParto >= s.da && p.dataParto <= s.a
export const idVaccinazione = (p: PartoPrevisto) => `${p.vacca}|${p.dataParto}`

export function categoriaParto(l: number | null) {
  if (l === null) return '—'
  if (l === 0) return 'Manza'
  return `Vacca (latt. ${l})`
}
