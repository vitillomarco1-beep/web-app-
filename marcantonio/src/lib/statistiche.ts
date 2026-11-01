import type { Consegna, Mungitura } from './types'
import { aggiungiGiorni } from './format'

export interface Giornata { data: string; litri: number; capi: number; turni: number }

/** Aggrega le mungiture per giorno (litri sommati, capi = massimo tra i turni). */
export function perGiorno(mungiture: Mungitura[]): Map<string, Giornata> {
  const m = new Map<string, Giornata>()
  for (const x of mungiture) {
    const g = m.get(x.data) ?? { data: x.data, litri: 0, capi: 0, turni: 0 }
    g.litri += x.litri
    g.capi = Math.max(g.capi, x.capiMunti)
    g.turni += 1
    m.set(x.data, g)
  }
  return m
}

/** Serie degli ultimi `n` giorni fino a `fino` (incluso), con 0 nei giorni senza dati. */
export function serieGiorni(mungiture: Mungitura[], fino: string, n: number): Giornata[] {
  const m = perGiorno(mungiture)
  return Array.from({ length: n }, (_, i) => {
    const data = aggiungiGiorni(fino, i - n + 1)
    return m.get(data) ?? { data, litri: 0, capi: 0, turni: 0 }
  })
}

export function totaleConsegne(consegne: Consegna[]) {
  const litri = consegne.reduce((s, c) => s + c.litri, 0)
  const importo = consegne.reduce((s, c) => s + c.litri * c.prezzoLitro, 0)
  return { litri, importo, prezzoMedio: litri > 0 ? importo / litri : 0 }
}
