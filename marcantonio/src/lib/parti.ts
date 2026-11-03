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
export const idVaccinazione = (p: PartoPrevisto, vaccino: string) => `${p.vacca}|${p.dataParto}|${vaccino}`

/** Vaccini da fare insieme prima del parto (2 ml a capo ciascuno). */
export const VACCINI_PREPARTO = [
  { id: 'rotavec', nome: 'Bovilis Rotavec Corona', breve: 'Rotavec', cerca: 'rotavec', doseMl: 2, mlConf: 10, dosiConf: 5 },
  { id: 'cryptium', nome: 'Bovilis Cryptium', breve: 'Cryptium', cerca: 'cryptium', doseMl: 2, mlConf: 40, dosiConf: 20 },
] as const
export type VaccinoPreparto = (typeof VACCINI_PREPARTO)[number]

/** Farmaco del magazzino corrispondente al vaccino (cercato per nome). */
export const farmacoDelVaccino = <F extends { nome: string }>(farmaci: F[], v: VaccinoPreparto) =>
  farmaci.find((f) => f.nome.toLowerCase().includes(v.cerca))

/** Quantità di una dose nell'unità del magazzino. */
export const doseInUnita = (unita: string, v: VaccinoPreparto) => (unita === 'ml' ? v.doseMl : 1)

/** Animale con tutti i vaccini fatti. */
export const vaccinataTutto = (p: PartoPrevisto, fatte: Set<string>) => VACCINI_PREPARTO.every((v) => fatte.has(idVaccinazione(p, v.id)))

export function categoriaParto(l: number | null) {
  if (l === null) return '—'
  if (l === 0) return 'Manza'
  return `Vacca (latt. ${l})`
}

/** Giorni di asciutta prima del parto (messa in asciutta = parto previsto − questi giorni). */
export const GIORNI_ASCIUTTA = 60
/** Gravidanza minima per proporre l'asciutta anticipata: prima, un calo di produzione fa pensare a un problema di salute. */
export const GRAVIDANZA_MIN_ASCIUTTA_ANTICIPATA = 180
/** Messa in asciutta entro questi giorni: è già in programma, nessun avviso. */
export const ASCIUTTA_IMMINENTE_GG = 7

export type StatoAsciutta =
  | { tipo: 'imminente' | 'vicina' | 'lontana'; dataAsciutta: string; giorniAllAsciutta: number; giorniGravidanza: number | null }
  | { tipo: 'non gravida' | 'sconosciuto' }

/** Dove si trova una vacca rispetto alla messa in asciutta, secondo la lista parti di DairyComp. */
export function statoAsciutta(vacca: string, lista: ImportDC | undefined, oggi = isoGiorno(), giorniAsciutta = GIORNI_ASCIUTTA): StatoAsciutta {
  if (!lista || !lista.animali.some((a) => a.id === vacca)) return { tipo: 'sconosciuto' }
  const p = partiPrevisti(lista, oggi).find((x) => x.vacca === vacca)
  if (!p) return { tipo: 'non gravida' }
  const dataAsciutta = aggiungiGiorni(p.dataParto, -giorniAsciutta)
  const giorniAllAsciutta = giorniTra(oggi, dataAsciutta)
  const tipo = giorniAllAsciutta <= ASCIUTTA_IMMINENTE_GG ? 'imminente' : (p.giorniGravidanzaOggi ?? 0) >= GRAVIDANZA_MIN_ASCIUTTA_ANTICIPATA ? 'vicina' : 'lontana'
  return { tipo, dataAsciutta, giorniAllAsciutta, giorniGravidanza: p.giorniGravidanzaOggi }
}

export interface MessaInAsciutta { p: PartoPrevisto; dataAsciutta: string; giorniAlParto: number }

/** Asciutta solo il lunedì: si asciugano le vacche che quel lunedì sono a 58–64 giorni dal parto previsto
 *  (7 giorni, così ogni vacca capita in un solo lunedì; in media circa 61 giorni di asciutta). */
export const ASCIUTTA_GG_DA = 58
export const ASCIUTTA_GG_A = 64

/** Vacche da mettere in asciutta il lunedì della settimana che contiene la data. */
export function asciutteDellaSettimana(lista: ImportDC | undefined, oggi = isoGiorno(), spostamento = 0): { da: string; a: string; vacche: MessaInAsciutta[] } {
  const da = aggiungiGiorni(lunediDi(oggi), 7 * spostamento)
  const a = aggiungiGiorni(da, 6)
  const vacche = partiPrevisti(lista, oggi)
    .map((p) => ({ p, dataAsciutta: da, giorniAlParto: giorniTra(da, p.dataParto) }))
    .filter((x) => x.p.lattazione !== 0 && x.giorniAlParto >= ASCIUTTA_GG_DA && x.giorniAlParto <= ASCIUTTA_GG_A) // le manze non si asciugano
    .sort((x, y) => x.giorniAlParto - y.giorniAlParto)
  return { da, a, vacche }
}
