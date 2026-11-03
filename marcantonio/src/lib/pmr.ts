import type { AnalisiPmr } from './types'

/** Analisi valida per una stalla a una data: la più recente fatta per quella stalla o per tutte. */
export function analisiValida(analisi: AnalisiPmr[], stalla: number, data: string): AnalisiPmr | undefined {
  return analisi
    .filter((a) => a.data <= data && (a.stalla === undefined || a.stalla === stalla))
    .sort((a, b) => b.data.localeCompare(a.data) || (a.stalla === undefined ? 1 : 0) - (b.stalla === undefined ? 1 : 0))[0]
}

export const VALORI_PMR: { k: keyof AnalisiPmr; nome: string; unita: string }[] = [
  { k: 'ss', nome: 'Sostanza secca', unita: '% t.q.' },
  { k: 'pg', nome: 'Proteina grezza', unita: '% ss' },
  { k: 'ndf', nome: 'NDF', unita: '% ss' },
  { k: 'adf', nome: 'ADF', unita: '% ss' },
  { k: 'amido', nome: 'Amido', unita: '% ss' },
  { k: 'grassi', nome: 'Grassi', unita: '% ss' },
  { k: 'ceneri', nome: 'Ceneri', unita: '% ss' },
  { k: 'ufl', nome: 'UFL', unita: '/kg ss' },
]
