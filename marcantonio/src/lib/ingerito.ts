// Cosa ingerisce una vacca in lattazione al giorno: PMR del carro (kg pesati × analisi del PMR)
// più il mangime dato al robot (kg della razione × componenti del cartellino).
import type { AnalisiMangime, AnalisiPmr, Dati, Stalla } from './types'

/** Mangimi noti (dal cartellino). */
export const MANGIMI_NOTI: { nome: string; cerca: string; analisi: AnalisiMangime }[] = [
  { nome: 'Mash Robot', cerca: 'mash', analisi: { ss: 88, ssStimata: true, pg: 17, grassi: 5, fibra: 6.5, ceneri: 5.5, sodio: 0.1 } },
]
export const SS_MANGIME_TIPICA = 88

export interface Parte { ss: number; pg: number | null; grassi: number | null; ceneri: number | null; amido: number | null; ndf: number | null; adf: number | null; fibra: number | null; sodio: number | null; ufl: number | null }
export const VOCI: { k: keyof Parte; nome: string; dec?: number }[] = [
  { k: 'ss', nome: 'Sostanza secca' },
  { k: 'pg', nome: 'Proteina grezza' },
  { k: 'grassi', nome: 'Grassi' },
  { k: 'amido', nome: 'Amido' },
  { k: 'ndf', nome: 'NDF' },
  { k: 'adf', nome: 'ADF' },
  { k: 'fibra', nome: 'Fibra grezza' },
  { k: 'ceneri', nome: 'Ceneri' },
  { k: 'sodio', nome: 'Sodio', dec: 3 },
  { k: 'ufl', nome: 'UFL' },
]

/** PMR: kg tal quale per capo × analisi (ss sul t.q., il resto % sulla ss). */
export function partePmr(kgTq: number, a: AnalisiPmr): Parte {
  const ss = (kgTq * a.ss) / 100
  const q = (p?: number) => (p === undefined ? null : (ss * p) / 100)
  return { ss, pg: q(a.pg), grassi: q(a.grassi), ceneri: q(a.ceneri), amido: q(a.amido), ndf: q(a.ndf), adf: q(a.adf), fibra: null, sodio: null, ufl: a.ufl === undefined ? null : ss * a.ufl }
}

/** Mangime: kg tal quale × componenti % t.q. del cartellino. */
export function parteMangime(kgTq: number, a: AnalisiMangime): Parte {
  const q = (p?: number) => (p === undefined ? null : (kgTq * p) / 100)
  return { ss: (kgTq * (a.ss ?? SS_MANGIME_TIPICA)) / 100, pg: q(a.pg), grassi: q(a.grassi), ceneri: q(a.ceneri), amido: q(a.amido), ndf: null, adf: null, fibra: q(a.fibra), sodio: q(a.sodio), ufl: null }
}

export function somma(a: Parte | null, b: Parte | null): Parte | null {
  if (!a) return b
  if (!b) return a
  const s = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0))
  return { ss: a.ss + b.ss, pg: s(a.pg, b.pg), grassi: s(a.grassi, b.grassi), ceneri: s(a.ceneri, b.ceneri), amido: s(a.amido, b.amido), ndf: s(a.ndf, b.ndf), adf: s(a.adf, b.adf), fibra: s(a.fibra, b.fibra), sodio: s(a.sodio, b.sodio), ufl: s(a.ufl, b.ufl) }
}
export function scala(a: Parte, f: number): Parte {
  const m = (x: number | null) => (x === null ? null : x * f)
  return { ss: a.ss * f, pg: m(a.pg), grassi: m(a.grassi), ceneri: m(a.ceneri), amido: m(a.amido), ndf: m(a.ndf), adf: m(a.adf), fibra: m(a.fibra), sodio: m(a.sodio), ufl: m(a.ufl) }
}

/** Mangime del robot per la stalla: dalla razione di lattazione del suo gruppo. */
export function mangimeRobot(dati: Dati, st: Stalla) {
  const r = dati.razioni.find((x) => x.categoria === 'lattazione' && st.gruppoDairyComp !== undefined && x.gruppi.includes(st.gruppoDairyComp))
  if (!r?.robot || !(r.robot.kgCapo > 0)) return null
  const ingr = dati.ingredienti.find((i) => i.id === r.robot!.ingredienteId)
  return ingr ? { kg: r.robot.kgCapo, ingrediente: ingr } : null
}
