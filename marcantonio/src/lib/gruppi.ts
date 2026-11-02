// Gruppo "effettivo" di ogni vacca: comanda il robot che la munge.
// Se una vacca è munta dal robot di una stalla ma in DairyComp è registrata in un altro gruppo,
// viene conteggiata nel gruppo della stalla del robot e segnalata, finché non la si corregge in DairyComp.
import type { AnimaleDC, GiornoVaccaRobot, GiornoRobot, Stalla } from './types'
import { inLattazione } from './dairycomp'

export interface Incoerenza { vacca: string; gruppoDairyComp: number | null; gruppoRobot: number; robot: string }

/** Robot usato da ogni vacca nei giorni completi (fino a 7) che arrivano alla data indicata, con il latte medio. */
export function robotPerVacca(robotVacche: GiornoVaccaRobot[], robotGiorni: GiornoRobot[], finoA: string) {
  const giorni = [...new Set(robotGiorni.filter((g) => g.completo && g.data <= finoA).map((g) => g.data))].sort().slice(-7)
  const m = new Map<string, { kg: number; n: number; robot: string; ultimo: string }>()
  for (const v of robotVacche) {
    if (!giorni.includes(v.data) || v.mungiture === 0) continue
    const x = m.get(v.vacca) ?? { kg: 0, n: 0, robot: v.robot, ultimo: '' }
    x.kg += v.kg; x.n++
    if (v.data >= x.ultimo) { x.robot = v.robot; x.ultimo = v.data } // il robot dell'ultimo giorno
    m.set(v.vacca, x)
  }
  return { giorni, perVacca: m }
}

export function applicaGruppiRobot(animali: AnimaleDC[], robotVacche: GiornoVaccaRobot[], robotGiorni: GiornoRobot[], stalle: Stalla[], data: string) {
  const { giorni, perVacca } = robotPerVacca(robotVacche, robotGiorni, data)
  const gruppoDelRobot = (robot: string) => stalle.find((s) => s.robot?.nomi?.includes(robot))?.gruppoDairyComp
  const incoerenze: Incoerenza[] = []
  const risultato = animali.map((a) => {
    const r = perVacca.get(a.id)
    if (!r || !inLattazione(a)) return a
    let b = a
    if (a.latte === null) b = { ...b, latte: Math.round((r.kg / r.n) * 10) / 10 } // latte medio dai robot
    const gR = gruppoDelRobot(r.robot)
    if (gR !== undefined && gR !== a.gruppo) {
      incoerenze.push({ vacca: a.id, gruppoDairyComp: a.gruppo, gruppoRobot: gR, robot: r.robot })
      b = { ...b, gruppo: gR }
    }
    return b
  })
  return { animali: risultato, incoerenze, giorniRobot: giorni, latteDaiRobot: animali.some((a) => a.latte === null && inLattazione(a) && perVacca.has(a.id)) }
}
