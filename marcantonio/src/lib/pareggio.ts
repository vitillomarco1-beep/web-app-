// Cosa fare di una vacca che produce al pareggio (IOFC stimato ≈ 0):
// - gravida da almeno 180 giorni → valutare la messa in asciutta anticipata
// - non gravida, oltre 300 giorni di lattazione, al pareggio da almeno 5 giorni → fine carriera, valutare il macello
// - le altre → calo da controllare (possibile problema di salute: da trattare, non da asciugare)
// - asciutta già entro 7 giorni → nessun avviso
import type { Dati } from './types'
import type { MargineVacca } from './margine'
import { GIORNI_MIN_PAREGGIO } from './margine'
import { statoAsciutta, type StatoAsciutta } from './parti'
import { aggiungiGiorni } from './format'

export const DIM_FINE_CARRIERA = 300
export const GIORNI_PAREGGIO_MACELLO = 5

const giorniTra = (da: string, a: string) => {
  const [y1, m1, d1] = da.split('-').map(Number), [y2, m2, d2] = a.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/** Giorni di lattazione alla data: dall'ultima lista Mandria di DairyComp, o dai robot (Lely) se mancano. */
export function giorniLattazione(dati: Dati, vacca: string, data: string): number | null {
  const lista = dati.mandriaDC[0]
  const a = lista?.animali.find((x) => x.id === vacca)
  if (a && typeof a.dim === 'number') return a.dim + giorniTra(lista!.data, data)
  const r = dati.robotVacche.filter((x) => x.vacca === vacca && typeof x.dim === 'number').sort((x, y) => y.data.localeCompare(x.data))[0]
  return r ? r.dim! + giorniTra(r.data, data) : null
}

export type Azione = 'asciutta' | 'macello' | 'salute' | 'nessuna'
export interface ValutazionePareggio { azione: Azione; stato: StatoAsciutta; dim: number | null }

export function valutaPareggio(dati: Dati, v: MargineVacca, settimana: string): ValutazionePareggio {
  const fine = aggiungiGiorni(settimana, 6)
  const stato = statoAsciutta(v.vacca, dati.partiDC[0])
  const dim = giorniLattazione(dati, v.vacca, fine)
  if (v.giorniAlPareggio < GIORNI_MIN_PAREGGIO || stato.tipo === 'imminente') return { azione: 'nessuna', stato, dim }
  if (stato.tipo === 'vicina') return { azione: 'asciutta', stato, dim }
  if (stato.tipo === 'non gravida' && dim !== null && dim > DIM_FINE_CARRIERA) {
    // fine carriera: si aspetta di più prima di segnalarla
    return { azione: v.giorniAlPareggio >= GIORNI_PAREGGIO_MACELLO ? 'macello' : 'nessuna', stato, dim }
  }
  return { azione: 'salute', stato, dim }
}
