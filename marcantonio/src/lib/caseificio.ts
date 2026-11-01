import type { Analisi, Lavorazione, UscitaForme } from './types'
import { aggiungiGiorni, giorniTra } from './format'

export type StatoLotto = 'in stagionatura' | 'pronto' | 'esaurito'

export const dataPronta = (l: Lavorazione) => aggiungiGiorni(l.data, l.stagionaturaGiorni)

export function usciteDel(l: Lavorazione, uscite: UscitaForme[]) {
  return uscite.filter((u) => u.lavorazioneId === l.id)
}

export function formeDisponibili(l: Lavorazione, uscite: UscitaForme[]) {
  return l.formeProdotte - usciteDel(l, uscite).reduce((s, u) => s + u.forme, 0)
}

export function statoLotto(l: Lavorazione, uscite: UscitaForme[], oggi: string): StatoLotto {
  if (formeDisponibili(l, uscite) <= 0) return 'esaurito'
  return dataPronta(l) <= oggi ? 'pronto' : 'in stagionatura'
}

/** Frazione di stagionatura completata (0–1). */
export function avanzamento(l: Lavorazione, oggi: string) {
  if (l.stagionaturaGiorni <= 0) return 1
  return Math.min(1, Math.max(0, giorniTra(l.data, oggi) / l.stagionaturaGiorni))
}

/** Resa casearia: kg di formaggio fresco per 100 litri di latte. */
export const resa = (l: Lavorazione) => (l.litriLatte > 0 ? (l.pesoFrescoKg / l.litriLatte) * 100 : 0)

export const pesoMedioForma = (l: Lavorazione) => (l.formeProdotte > 0 ? l.pesoFrescoKg / l.formeProdotte : 0)

/** Codice lotto progressivo per data: CC-AAAAMMGG-n. */
export function nuovoCodiceLotto(data: string, lavorazioni: Lavorazione[], escludiId?: string) {
  const prefisso = `CC-${data.replace(/-/g, '')}-`
  const usati = lavorazioni
    .filter((l) => l.id !== escludiId && l.lotto.startsWith(prefisso))
    .map((l) => Number(l.lotto.slice(prefisso.length)) || 0)
  return prefisso + (Math.max(0, ...usati) + 1)
}

/** Analisi del latte più recente alla data di lavorazione (riferimento per la tracciabilità). */
export function analisiDiRiferimento(analisi: Analisi[], data: string): Analisi | undefined {
  return analisi.filter((a) => a.data <= data).sort((a, b) => b.data.localeCompare(a.data))[0]
}
