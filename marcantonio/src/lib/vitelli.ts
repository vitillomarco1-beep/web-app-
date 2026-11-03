// Vaccinazioni dei vitelli: si fanno il martedì mattina. Ogni vaccino ha un'età obiettivo;
// la finestra è di 7 giorni centrata sull'obiettivo, così ogni vitello cade una sola volta
// in un martedì e l'età media alla vaccinazione è proprio l'obiettivo.
import type { ImportDC } from './types'
import { aggiungiGiorni, isoGiorno } from './format'

export interface VaccinoVitello { id: string; nome: string; breve: string; obiettivo: number; cerca: string; doseMl: number; via: string }
export const VACCINI_VITELLI: VaccinoVitello[] = [
  { id: 'intranasal', nome: 'Bovalto Respi Intranasal', breve: 'Intranasal', obiettivo: 3, cerca: 'intranasal', doseMl: 2, via: 'intranasale' },
  { id: 'respi4-1', nome: 'Bovalto Respi 4 – 1ª dose', breve: 'Respi 4 · 1ª', obiettivo: 15, cerca: 'respi 4', doseMl: 2, via: 'sottocute' },
  { id: 'respi4-2', nome: 'Bovalto Respi 4 – 2ª dose', breve: 'Respi 4 · 2ª', obiettivo: 35, cerca: 'respi 4', doseMl: 2, via: 'sottocute' },
]
export const finestra = (v: VaccinoVitello) => ({ da: Math.max(0, v.obiettivo - 3), a: Math.max(0, v.obiettivo - 3) + 6 })

const giorniTra = (da: string, a: string) => {
  const [y1, m1, d1] = da.split('-').map(Number), [y2, m2, d2] = a.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/** Martedì da preparare: oggi se è martedì, altrimenti il prossimo. */
export function prossimoMartedi(oggi = isoGiorno()) {
  const [y, m, d] = oggi.split('-').map(Number)
  const g = new Date(y, m - 1, d).getDay() // 2 = martedì
  return aggiungiGiorni(oggi, (2 - g + 7) % 7)
}

function leggiData(t: string | null | undefined): string | null {
  if (!t) return null
  let m = t.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = t.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (!m) return null
  const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export interface Vitello { id: string; gruppo: number | null; nascita: string }

export function vitelli(lista: ImportDC | undefined): Vitello[] {
  if (!lista) return []
  return lista.animali.flatMap((a) => {
    const n = leggiData(a.dataNascita)
    const nascita = n ?? (typeof a.giorniVita === 'number' ? aggiungiGiorni(lista.data, -a.giorniVita) : null)
    return nascita ? [{ id: a.id, gruppo: a.gruppo, nascita }] : []
  })
}

export const etaAl = (v: Vitello, data: string) => giorniTra(v.nascita, data)
export const idVacVitello = (vitello: string, vaccino: string) => `${vitello}|${vaccino}`

/** Età massima (giorni) considerata "vitello" quando i vitelli si prendono dalla lista Mandria. */
export const ETA_MAX_VITELLI = 90

/**
 * Lista da cui prendere i vitelli: la più recente tra la lista vitelli e la lista Mandria,
 * purché quest'ultima abbia i giorni di vita (GDNAS) o la data di nascita.
 */
export function fonteVitelli(dati: { vitelliDC: ImportDC[]; mandriaDC: ImportDC[] }): { lista: ImportDC; daMandria: boolean } | undefined {
  const v = dati.vitelliDC[0]
  const m = dati.mandriaDC[0]
  const mUsabile = m && m.animali.some((a) => typeof a.giorniVita === 'number' || !!a.dataNascita) ? m : undefined
  if (mUsabile && (!v || mUsabile.data >= v.data)) return { lista: mUsabile, daMandria: true }
  return v ? { lista: v, daMandria: false } : undefined
}

/** Vitelli della lista scelta (dalla Mandria solo quelli fino a ETA_MAX_VITELLI giorni alla data della lista). */
export function vitelliDaFonte(f: ReturnType<typeof fonteVitelli>): Vitello[] {
  if (!f) return []
  const tutti = vitelli(f.lista)
  return f.daMandria ? tutti.filter((c) => etaAl(c, f.lista.data) <= ETA_MAX_VITELLI) : tutti
}
