// Patologie e stima del latte perso.
import type { AnimaleDC, CasoClinico, GiornoRobot, GiornoVaccaRobot } from './types'
import { aggiungiGiorni, giorniTra } from './format'

export const PATOLOGIE: { id: string; nome: string; descrizione: string; quarti?: boolean }[] = [
  { id: 'mastite', nome: 'Mastite', descrizione: 'Infiammazione della mammella', quarti: true },
  { id: 'zoppia', nome: 'Zoppia', descrizione: 'Dermatite digitale, ulcera, ascesso…' },
  { id: 'chetosi', nome: 'Chetosi', descrizione: 'Squilibrio energetico nel post-parto' },
  { id: 'ipocalcemia', nome: 'Ipocalcemia', descrizione: 'Febbre da latte' },
  { id: 'abomaso', nome: 'Dislocazione abomaso', descrizione: 'Sinistra o destra' },
  { id: 'placenta', nome: 'Ritenzione di placenta', descrizione: 'Dopo il parto' },
  { id: 'metrite', nome: 'Metrite', descrizione: 'Infezione uterina' },
  { id: 'respiratoria', nome: 'Problemi respiratori', descrizione: 'Polmonite, BRD' },
  { id: 'digestiva', nome: 'Problemi digestivi', descrizione: 'Diarrea, acidosi ruminale' },
  { id: 'altro', nome: 'Altro', descrizione: 'Altre patologie' },
]
/** Prezzo del latte predefinito (€/litro) e densità per passare dai kg dei robot ai litri. */
export const PREZZO_LATTE_PREDEFINITO = 0.55
export const KG_PER_LITRO = 1.03
export const euroDaKg = (kg: number, prezzoLitro: number) => (kg / KG_PER_LITRO) * prezzoLitro

export const costoUnitario = (f: { prezzoConfezione: number; unitaPerConfezione: number }) =>
  f.unitaPerConfezione > 0 ? f.prezzoConfezione / f.unitaPerConfezione : 0
export const costoFarmaci = (c: { farmaci?: { quantita: number; costoUnitario: number }[] }) =>
  (c.farmaci ?? []).reduce((s, u) => s + u.quantita * u.costoUnitario, 0)

/** Farmaco in esaurimento: sotto la scorta minima o, se non impostata, sotto una confezione. */
export const inEsaurimento = (f: { giacenza: number; scortaMinima?: number; unitaPerConfezione: number }) =>
  f.scortaMinima !== undefined ? f.giacenza <= f.scortaMinima : f.giacenza < f.unitaPerConfezione

export const nomePatologia = (id: string) => PATOLOGIE.find((p) => p.id === id)?.nome ?? id

export interface StimaPerdita {
  dal: string
  al: string
  giorni: number // giorni con dati dei robot nel periodo
  media: number | null // produzione attesa (kg/giorno)
  fonte: 'propria' | 'simili' | null
  nSimili?: number
  mediaDurante: number | null
  calo: number // kg persi rispetto all'atteso
  separato: number // kg di latte separato (non consegnato) nel periodo
  robot?: string
}

const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)

/**
 * Stima del latte perso per un caso.
 * - Periodo: dall'inizio del caso alla guarigione (o all'ultimo giorno caricato), solo giorni completi.
 * - Produzione attesa: media della vacca nei 7 giorni completi prima dell'inizio (almeno 3 giorni);
 *   altrimenti media delle vacche simili nello stesso periodo (stesso robot, stessa classe di lattazione,
 *   giorni di lattazione entro ±20), usando la lista DairyComp.
 * - Calo: somma giornaliera di (atteso − prodotto) quando positivo.
 */
export function stimaPerdita(
  caso: CasoClinico, robotVacche: GiornoVaccaRobot[], robotGiorni: GiornoRobot[],
  listaDC?: { data: string; animali: AnimaleDC[] }, altriCasi: CasoClinico[] = [],
): StimaPerdita | null {
  const completi = [...new Set(robotGiorni.filter((g) => g.completo).map((g) => g.data))].sort()
  if (!completi.length) return null
  const fine = caso.dataFine && caso.dataFine < completi[completi.length - 1] ? caso.dataFine : completi[completi.length - 1]
  const periodo = completi.filter((d) => d >= caso.dataInizio && d <= fine)
  const dellaVacca = new Map(robotVacche.filter((v) => v.vacca === caso.vacca).map((v) => [v.data, v]))
  const giorniCaso = periodo.filter((d) => dellaVacca.has(d))
  const out: StimaPerdita = { dal: caso.dataInizio, al: fine, giorni: giorniCaso.length, media: null, fonte: null, mediaDurante: null, calo: 0, separato: 0 }
  if (!giorniCaso.length) return out
  out.robot = dellaVacca.get(giorniCaso[0])!.robot
  out.mediaDurante = media(giorniCaso.map((d) => dellaVacca.get(d)!.kg))
  // latte separato: il colostro dei primi 5 giorni di lattazione è separato di routine e non si conta
  const me0 = listaDC?.animali.find((a) => a.id === caso.vacca)
  const dimDel = (d: string) => dellaVacca.get(d)!.dim ?? (me0?.dim != null && listaDC ? me0.dim - giorniTra(d, listaDC.data) : null)
  out.separato = giorniCaso.reduce((s, d) => { const dim = dimDel(d); return dim !== null && dim <= 5 ? s : s + dellaVacca.get(d)!.kgSeparato }, 0)

  // 1) storico della vacca: 7 giorni completi prima dell'inizio
  const prima = completi.filter((d) => d < caso.dataInizio && d >= aggiungiGiorni(caso.dataInizio, -7) && dellaVacca.has(d))
  let attesoPerGiorno: (d: string) => number | null = () => null
  if (prima.length >= 3) {
    const m = media(prima.map((d) => dellaVacca.get(d)!.kg))!
    out.media = m; out.fonte = 'propria'; attesoPerGiorno = () => m
  } else if (listaDC) {
    // 2) vacche simili
    const me = listaDC.animali.find((a) => a.id === caso.vacca)
    if (me && me.dim !== null) {
      const dimInizio = me.dim - giorniTra(caso.dataInizio, listaDC.data)
      const primipara = me.lattazione === 1
      const malate = new Set(altriCasi.filter((c) => c.id !== caso.id && c.dataInizio <= fine && (!c.dataFine || c.dataFine >= caso.dataInizio)).map((c) => c.vacca))
      const simili = listaDC.animali.filter((a) => a.id !== caso.vacca && !malate.has(a.id) && a.dim !== null && a.lattazione !== null && a.lattazione > 0 &&
        (a.lattazione === 1) === primipara && Math.abs((a.dim - giorniTra(caso.dataInizio, listaDC.data)) - dimInizio) <= 20)
      const perGiorno = new Map<string, number[]>()
      for (const v of robotVacche) {
        if (v.robot !== out.robot || !giorniCaso.includes(v.data) || v.mungiture === 0) continue
        if (!simili.some((a) => a.id === v.vacca)) continue
        perGiorno.set(v.data, [...(perGiorno.get(v.data) ?? []), v.kg])
      }
      const nSimili = new Set(robotVacche.filter((v) => v.robot === out.robot && giorniCaso.includes(v.data) && simili.some((a) => a.id === v.vacca)).map((v) => v.vacca)).size
      if (nSimili >= 3) {
        out.fonte = 'simili'; out.nSimili = nSimili
        attesoPerGiorno = (d) => media(perGiorno.get(d) ?? [])
        out.media = media(giorniCaso.map((d) => attesoPerGiorno(d)).filter((x): x is number => x !== null))
      }
    }
  }
  if (out.fonte) {
    out.calo = giorniCaso.reduce((s, d) => {
      const a = attesoPerGiorno(d)
      return a === null ? s : s + Math.max(0, a - dellaVacca.get(d)!.kg)
    }, 0)
  }
  return out
}
