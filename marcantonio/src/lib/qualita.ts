import type { Analisi } from './types'
import { aggiungiGiorni } from './format'

// Requisiti per il latte crudo vaccino – Reg. (CE) 853/2004, All. III, Sez. IX:
// - tenore di germi a 30 °C ≤ 100.000/ml (media geometrica mobile su 2 mesi,
//   con almeno 2 prelievi al mese)
// - cellule somatiche ≤ 400.000/ml (media geometrica mobile su 3 mesi,
//   con almeno 1 prelievo al mese)
export const LIMITE_CBT = 100 // migliaia UFC/ml
export const LIMITE_SCC = 400 // migliaia cellule/ml

export type EsitoQualita = 'conforme' | 'attenzione' | 'non conforme'

export function mediaGeometrica(valori: number[]): number | null {
  const positivi = valori.filter((v) => v > 0)
  if (positivi.length === 0) return null
  const sommaLog = positivi.reduce((s, v) => s + Math.log(v), 0)
  return Math.exp(sommaLog / positivi.length)
}

function analisiNellaFinestra(analisi: Analisi[], finoA: string, mesi: number): Analisi[] {
  const da = aggiungiGiorni(finoA, -Math.round(mesi * 30.4))
  return analisi.filter((a) => a.data > da && a.data <= finoA)
}

export function mediaMobileCbt(analisi: Analisi[], finoA: string) {
  const finestra = analisiNellaFinestra(analisi, finoA, 2)
  return { valore: mediaGeometrica(finestra.map((a) => a.caricaBatterica)), campioni: finestra.length }
}

export function mediaMobileScc(analisi: Analisi[], finoA: string) {
  const finestra = analisiNellaFinestra(analisi, finoA, 3)
  return { valore: mediaGeometrica(finestra.map((a) => a.cellule)), campioni: finestra.length }
}

/** Esito rispetto a un limite: "attenzione" oltre l'80% del limite. */
export function esito(valore: number | null, limite: number): EsitoQualita | null {
  if (valore === null) return null
  if (valore > limite) return 'non conforme'
  if (valore > limite * 0.8) return 'attenzione'
  return 'conforme'
}

export function esitoAnalisi(a: Analisi): EsitoQualita {
  if (a.inibenti) return 'non conforme'
  const e = [esito(a.caricaBatterica, LIMITE_CBT), esito(a.cellule, LIMITE_SCC)]
  if (e.includes('non conforme')) return 'non conforme'
  if (e.includes('attenzione')) return 'attenzione'
  return 'conforme'
}
