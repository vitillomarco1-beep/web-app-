// Margine sul costo alimentare (IOFC): ricavo del latte meno il costo della razione.
// - Lattazione: per ogni stalla con robot, latte e capi dai robot, costo della razione dalle
//   pesate del carro (kg realmente scaricati) o, se mancano, dalla razione teorica × capi,
//   più il concentrato dato al robot.
// - Aziendale: lo stesso ricavo meno TUTTE le razioni (anche asciutta, close up, manze…).
import type { CategoriaRazione, Dati, Ingrediente, Razione } from './types'
import { KG_PER_LITRO, PREZZO_LATTE_PREDEFINITO } from './salute'
import { aggiungiGiorni, lunediDi } from './format'

export const CATEGORIE: { id: CategoriaRazione; nome: string }[] = [
  { id: 'lattazione', nome: 'Lattazione' },
  { id: 'closeup', nome: 'Close up' },
  { id: 'asciutta', nome: 'Asciutta' },
  { id: 'manze', nome: 'Manze' },
  { id: 'altro', nome: 'Altro' },
]
export const nomeCategoria = (c: CategoriaRazione) => CATEGORIE.find((x) => x.id === c)?.nome ?? c

export function costoRazione(r: Razione, ingredienti: Ingrediente[]) {
  const prezzo = (id: string) => ingredienti.find((i) => i.id === id)?.prezzoQ
  let kgCapo = 0, costoCapo = 0, senzaPrezzo = 0
  for (const v of r.voci) {
    const p = prezzo(v.ingredienteId)
    kgCapo += v.kgCapo
    if (p === undefined || !(p > 0)) senzaPrezzo++
    else costoCapo += (v.kgCapo * p) / 100
  }
  const pr = r.robot ? prezzo(r.robot.ingredienteId) : undefined
  const costoRobotCapo = r.robot && pr ? (r.robot.kgCapo * pr) / 100 : 0
  if (r.robot && !(pr && pr > 0)) senzaPrezzo++
  return { kgCapo, costoCapo, costoKg: kgCapo > 0 ? costoCapo / kgCapo : 0, costoRobotCapo, senzaPrezzo }
}

/** Settimane (lunedì) con dati robot completi, dalla più recente. */
export function settimaneConDati(dati: Dati): string[] {
  return [...new Set(dati.robotGiorni.filter((g) => g.completo).map((g) => lunediDi(g.data)))].sort().reverse()
}

export interface MargineStalla {
  stalla: number
  nome: string
  gruppo: number
  razione?: Razione
  capi: number // vacche munte (media giornaliera)
  kgLatte: number // al giorno
  ricavo: number // €/giorno
  costoRazione: number // €/giorno
  fonteRazione: 'pesate' | 'razione' | 'mancante'
  kgDistribuitiCapo: number | null // dalle pesate
  kgRazioneCapo: number | null // dalla razione teorica
  costoRobot: number // €/giorno
  costo: number
  margine: number
  senzaPrezzo: number
}
export interface MargineAltro { razione: Razione; capi: number; costoCapo: number; costo: number; senzaPrezzo: number }
export interface MargineVacca { vacca: string; stalla: number; kgGiorno: number; ricavo: number; costo: number; margine: number }

export function calcolaMargine(dati: Dati, settimana: string) {
  const prezzoLatte = dati.parametri.find((x) => x.id === 'prezzoLatte')?.valore ?? PREZZO_LATTE_PREDEFINITO
  const fine = aggiungiGiorni(settimana, 6)
  const giorni = [...new Set(dati.robotGiorni.filter((g) => g.completo && g.data >= settimana && g.data <= fine).map((g) => g.data))].sort()
  const nG = Math.max(1, giorni.length)
  const euro = (kg: number) => (kg / KG_PER_LITRO) * prezzoLatte

  const stalle: MargineStalla[] = []
  const vacche: MargineVacca[] = []
  for (const s of dati.stalle) {
    const nomi = s.robot?.nomi ?? []
    if (s.gruppoDairyComp === undefined || !nomi.length) continue
    const kgLatte = dati.robotGiorni.filter((g) => g.completo && giorni.includes(g.data) && nomi.includes(g.robot)).reduce((t, g) => t + g.kg, 0) / nG
    const vg = dati.robotVacche.filter((v) => giorni.includes(v.data) && nomi.includes(v.robot) && v.mungiture > 0)
    const capi = vg.length / nG
    const razione = dati.razioni.find((r) => r.categoria === 'lattazione' && r.gruppi.includes(s.gruppoDairyComp!))
    const c = razione ? costoRazione(razione, dati.ingredienti) : null
    // pesate del carro della stalla nei giorni del periodo
    const pesate = dati.scarichi.filter((x) => x.stalla === s.numero && x.data >= settimana && x.data <= fine)
    const giorniPesate = new Set(pesate.map((x) => x.data)).size
    const kgDistribuiti = giorniPesate ? pesate.reduce((t, x) => t + x.kg, 0) / giorniPesate : null
    let costoR = 0, fonte: MargineStalla['fonteRazione'] = 'mancante'
    if (c && kgDistribuiti !== null && c.costoKg > 0) { costoR = kgDistribuiti * c.costoKg; fonte = 'pesate' }
    else if (c) { costoR = c.costoCapo * capi; fonte = 'razione' }
    const costoRobot = c ? c.costoRobotCapo * capi : 0
    const ricavo = euro(kgLatte)
    const costo = costoR + costoRobot
    stalle.push({
      stalla: s.numero, nome: s.nome, gruppo: s.gruppoDairyComp, razione, capi, kgLatte, ricavo, costoRazione: costoR, fonteRazione: fonte,
      kgDistribuitiCapo: kgDistribuiti !== null && capi ? kgDistribuiti / capi : null, kgRazioneCapo: c ? c.kgCapo : null, costoRobot, costo, margine: ricavo - costo, senzaPrezzo: c?.senzaPrezzo ?? 0,
    })
    // margine di ogni vacca: suo latte − costo medio per capo della stalla
    const costoCapo = capi ? costo / capi : 0
    const perVacca = new Map<string, { kg: number; n: number }>()
    for (const v of vg) { const x = perVacca.get(v.vacca) ?? { kg: 0, n: 0 }; x.kg += v.kg; x.n++; perVacca.set(v.vacca, x) }
    for (const [vacca, x] of perVacca) {
      const kgGiorno = x.kg / x.n
      vacche.push({ vacca, stalla: s.numero, kgGiorno, ricavo: euro(kgGiorno), costo: costoCapo, margine: euro(kgGiorno) - costoCapo })
    }
  }

  const mandria = dati.mandriaDC[0]?.animali ?? []
  const altre: MargineAltro[] = dati.razioni.filter((r) => r.categoria !== 'lattazione').map((r) => {
    const c = costoRazione(r, dati.ingredienti)
    const capi = mandria.filter((a) => a.gruppo !== null && r.gruppi.includes(a.gruppo)).length
    return { razione: r, capi, costoCapo: c.costoCapo, costo: c.costoCapo * capi, senzaPrezzo: c.senzaPrezzo }
  })

  const tot = (k: keyof Pick<MargineStalla, 'capi' | 'kgLatte' | 'ricavo' | 'costo' | 'margine'>) => stalle.reduce((t, s) => t + s[k], 0)
  const lattazione = { capi: tot('capi'), kgLatte: tot('kgLatte'), ricavo: tot('ricavo'), costo: tot('costo'), margine: tot('margine') }
  const costoAltre = altre.reduce((t, a) => t + a.costo, 0)
  const aziendale = { ...lattazione, costoAltre, costo: lattazione.costo + costoAltre, margine: lattazione.ricavo - lattazione.costo - costoAltre }
  return { giorni, prezzoLatte, stalle, altre, vacche: vacche.sort((a, b) => a.margine - b.margine), lattazione, aziendale }
}
