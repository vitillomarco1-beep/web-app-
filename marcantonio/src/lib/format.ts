const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export const fmt0 = (n: number) => nf0.format(n)
export const fmt1 = (n: number) => nf1.format(n)
export const fmt2 = (n: number) => nf2.format(n)
export const fmtEur = (n: number) => eur.format(n)

export function fmtData(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function fmtDataOra(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

/** Data locale in formato ISO yyyy-mm-dd. */
export function isoGiorno(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

export function aggiungiGiorni(iso: string, giorni: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoGiorno(new Date(y, m - 1, d + giorni))
}

/** Lunedì della settimana che contiene la data. */
export function lunediDi(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const giorno = (dt.getDay() + 6) % 7 // 0 = lunedì
  return isoGiorno(new Date(y, m - 1, d - giorno))
}

export function etaMesi(dataNascita: string, oggi = isoGiorno()): number {
  const [y1, m1, d1] = dataNascita.split('-').map(Number)
  const [y2, m2, d2] = oggi.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
}

export function giorniTra(daIso: string, aIso: string): number {
  const a = new Date(daIso + 'T00:00:00')
  const b = new Date(aIso + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export const nuovoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
