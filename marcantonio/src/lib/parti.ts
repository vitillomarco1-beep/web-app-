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
export interface VaccinoPreparto { id: string; nome: string; breve: string; cerca: string; doseMl: number; mlConf: number; dosiConf: number }

/** Cryptium anche a circa 60 giorni dal parto: una dose da 2 ml sottocute, lista del martedì. */
export const CRYPTIUM_60: VaccinoPreparto = { id: 'cryptium60', nome: 'Bovilis Cryptium (60 giorni dal parto)', breve: 'Cryptium 60 gg', cerca: 'cryptium', doseMl: 2, mlConf: 40, dosiConf: 20 }
export const CRYPTIUM60_GG_DA = 58
export const CRYPTIUM60_GG_A = 65

/** Martedì della settimana (le liste dei vaccini si fanno il martedì). */
export const martediDi = (oggi = isoGiorno(), spostamento = 0) => aggiungiGiorni(lunediDi(oggi), 1 + 7 * spostamento)

/** Animali che il martedì della settimana sono tra `da` e `a` giorni dal parto previsto. */
export function aGiorniDalParto(parti: PartoPrevisto[], da: number, a: number, oggi = isoGiorno(), spostamento = 0) {
  const martedi = martediDi(oggi, spostamento)
  const animali = parti
    .map((p) => ({ p, giorniAlParto: giorniTra(martedi, p.dataParto) }))
    .filter((x) => x.giorniAlParto >= da && x.giorniAlParto <= a)
    .sort((x, y) => x.giorniAlParto - y.giorniAlParto)
  return { martedi, animali }
}

/** Animali da vaccinare con il Cryptium dei 60 giorni nel martedì della settimana (vacche e manze). */
export const cryptium60DellaSettimana = (parti: PartoPrevisto[], oggi = isoGiorno(), spostamento = 0) =>
  aGiorniDalParto(parti, CRYPTIUM60_GG_DA, CRYPTIUM60_GG_A, oggi, spostamento)

/** Lenzelta (mastite da S. aureus ed E. coli): 2 ml intramuscolo, 1ª dose circa 55 giorni prima del parto (consiglio della veterinaria;
 *  il foglietto dice 45), 2ª dose 3 settimane dopo. */
export const LENZELTA_1: VaccinoPreparto = { id: 'lenzelta1', nome: 'Lenzelta 1ª dose', breve: 'Lenzelta 1ª', cerca: 'lenzelta', doseMl: 2, mlConf: 10, dosiConf: 5 }
export const LENZELTA_2: VaccinoPreparto = { id: 'lenzelta2', nome: 'Lenzelta 2ª dose', breve: 'Lenzelta 2ª', cerca: 'lenzelta', doseMl: 2, mlConf: 10, dosiConf: 5 }
/** 1ª dose: il martedì in cui l'animale è a 51–57 giorni dal parto (in media 54; subito prima del Cryptium dei 60 giorni, senza sovrapporsi). */
export const LENZELTA1_GG_DA = 51
export const LENZELTA1_GG_A = 57
/** 2ª dose: 3 settimane dopo la 1ª; senza 1ª segnata, a 30–36 giorni dal parto. */
export const LENZELTA_INTERVALLO = 21
export const LENZELTA2_GG_DA = LENZELTA1_GG_DA - LENZELTA_INTERVALLO
export const LENZELTA2_GG_A = LENZELTA1_GG_A - LENZELTA_INTERVALLO

export interface RigaLenzelta { p: PartoPrevisto; giorniAlParto: number; nota?: string }

/** Liste del Lenzelta per il martedì della settimana. */
export function lenzeltaDellaSettimana(parti: PartoPrevisto[], vaccinazioni: { id: string; fattaIl: string }[], oggi = isoGiorno(), spostamento = 0) {
  const { martedi, animali: prima } = aGiorniDalParto(parti, LENZELTA1_GG_DA, LENZELTA1_GG_A, oggi, spostamento)
  const fatta = new Map(vaccinazioni.map((v) => [v.id, v.fattaIl]))
  const lunedi = aggiungiGiorni(martedi, -1)
  const seconda: RigaLenzelta[] = []
  for (const p of parti) {
    const giorniAlParto = giorniTra(martedi, p.dataParto)
    if (giorniAlParto < 0) continue
    const d1 = fatta.get(idVaccinazione(p, LENZELTA_1.id))
    const d2 = fatta.get(idVaccinazione(p, LENZELTA_2.id))
    if (d1) {
      const dopo = giorniTra(d1, martedi)
      if (dopo < LENZELTA_INTERVALLO) continue
      // nella sua settimana sempre; dopo, solo se non è ancora fatta (o è stata segnata questa settimana)
      if (dopo < LENZELTA_INTERVALLO + 7 || !d2 || d2 >= lunedi) seconda.push({ p, giorniAlParto, nota: dopo >= LENZELTA_INTERVALLO + 7 && (!d2 || d2 >= lunedi) ? `in ritardo: 1ª dose il ${d1.split('-').reverse().join('/')}` : undefined })
    } else if (giorniAlParto >= LENZELTA2_GG_DA && giorniAlParto <= LENZELTA2_GG_A) {
      seconda.push({ p, giorniAlParto, nota: '1ª dose non segnata' })
    }
  }
  seconda.sort((x, y) => x.giorniAlParto - y.giorniAlParto)
  return { martedi, prima: prima as RigaLenzelta[], seconda }
}

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
