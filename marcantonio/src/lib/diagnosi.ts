// Diagnosi di gravidanza ricavate confrontando due liste Mandria di DairyComp (di solito due lunedì di seguito).
// Ogni lista caricata lascia una "foto" compatta dello stato riproduttivo di ogni animale; chi nella foto
// precedente era fecondata e ora è gravida ha avuto una diagnosi positiva, chi ora è vuota una negativa,
// chi ha una fecondazione in più è tornata in calore. Le gravide che non lo sono più hanno perso la gravidanza.
import type { FotoRipro, ImportDC } from './types'
import type { AnimaleDC } from './types'
import { aggiungiGiorni } from './format'
import { GRUPPI_ESCLUSI, eMaschio, fecondazioni, giorniUltimoCalore, statoRipro, toro, type StatoRipro } from './fertilita'

/** Quante foto tenere (circa sei mesi di liste settimanali). */
export const FOTO_DA_TENERE = 26

/** Foto compatta di una lista: per ogni animale stato, fecondazioni, gruppo, lattazione. */
export function fotoDaLista(lista: ImportDC): FotoRipro {
  const animali: FotoRipro['animali'] = {}
  for (const a of lista.animali) {
    if (eMaschio(a)) continue
    animali[a.id] = [statoRipro(a), fecondazioni(a), a.gruppo ?? -1, a.lattazione ?? -1, giorniUltimoCalore(a), toro(a)]
  }
  return { id: lista.data, data: lista.data, animali }
}

/** Le fecondate della lista del 5/11/2026 (la prima con le colonne giuste), sostituita prima che le foto venissero salvate. */
export const FOTO_INIZIALE: FotoRipro = {
  id: '2026-11-05', data: '2026-11-05', parziale: true,
  animali: Object.fromEntries(([
    ['2', 1, 1, 3], ['5', 1, 1, 3], ['8', 3, 1, 3], ['39', 1, 4, 1], ['41', 1, 4, 1], ['46', 3, 4, 1], ['52', 2, 4, 1], ['53', 1, 4, 1],
    ['56', 1, 4, 1], ['57', 1, 4, 1], ['59', 1, 4, 1], ['65', 2, 4, 1], ['85', 3, 4, 1], ['105', 6, 10, 0], ['128', 3, 1, 2], ['132', 5, 1, 2],
    ['134', 1, 21, 2], ['135', 4, 1, 2], ['139', 2, 21, 2], ['142', 3, 10, 0], ['155', 2, 10, 0], ['157', 1, 10, 0], ['161', 1, 10, 0], ['175', 1, 10, 0],
    ['225', 1, 4, 1], ['228', 3, 1, 1], ['229', 1, 4, 1], ['232', 1, 4, 1], ['235', 1, 4, 1], ['236', 1, 4, 1], ['239', 1, 4, 1], ['253', 2, 4, 1],
    ['256', 1, 4, 1], ['258', 1, 4, 1], ['831', 1, 21, 5], ['932', 1, 1, 4], ['964', 4, 1, 4], ['977', 1, 21, 4], ['1020', 6, 21, 3], ['1030', 3, 1, 3],
    ['1070', 1, 1, 3], ['1079', 1, 1, 2], ['1083', 1, 1, 2], ['1099', 4, 1, 2], ['1102', 5, 1, 2], ['1103', 4, 1, 2], ['1110', 1, 1, 2], ['1112', 2, 1, 2],
    ['1113', 5, 1, 2], ['1120', 1, 1, 2], ['1126', 3, 21, 2], ['1138', 2, 1, 2],
  ] as [string, number, number, number][]).map(([id, n, g, l]) => [id, ['fecondata', n, g, l] as [StatoRipro, number, number, number]])),
}

/** Aggiunge (o sostituisce) la foto di una lista e tiene solo le più recenti. */
export function aggiornaFoto(foto: FotoRipro[], nuova: FotoRipro): FotoRipro[] {
  return [...foto.filter((f) => f.id !== nuova.id), nuova].sort((a, b) => a.data.localeCompare(b.data)).slice(-FOTO_DA_TENERE)
}

export interface Esito { vacca: string; gruppo: number; lattazione: number; nota?: string }
export interface ConfrontoDiagnosi {
  da: string // data della lista precedente
  a: string // data della lista attuale
  positive: Esito[] // fecondata → gravida
  negative: Esito[] // fecondata → vuota o non fecondare, senza nuova fecondazione
  rifecondate: Esito[] // una fecondazione in più: tornata in calore
  inAttesa: number // ancora fecondate senza diagnosi
  attese: Esito[]
  perse: Esito[] // gravida → non più gravida (escluso il parto)
  gravidePrima: number // gravide nella foto precedente (per la quota di perse)
}

/** Confronta due foto; `filtro` sceglie gli animali per gruppo e lattazione della foto attuale (o precedente se uscito). */
export function confronta(prima: FotoRipro, dopo: FotoRipro, filtro: (gruppo: number, lattazione: number) => boolean = () => true): ConfrontoDiagnosi {
  const r: ConfrontoDiagnosi = { da: prima.data, a: dopo.data, positive: [], negative: [], rifecondate: [], inAttesa: 0, attese: [], perse: [], gravidePrima: 0 }
  for (const [vacca, [s0, n0, g0, l0]] of Object.entries(prima.animali)) {
    const ora = dopo.animali[vacca]
    if (!ora) continue // uscita dall'allevamento
    const [s1, n1, g1, l1] = ora
    if (GRUPPI_ESCLUSI.includes(g1) || !filtro(g1, l1)) continue
    const e: Esito = { vacca, gruppo: g1, lattazione: l1 }
    if (s0 === 'fecondata') {
      if (s1 === 'gravida') r.positive.push(e)
      else if (n1 > n0) r.rifecondate.push({ ...e, nota: `${n1}ª fecondazione` })
      else if (s1 === 'vuota' || s1 === 'nonFecondare') r.negative.push(e)
      else if (s1 === 'fecondata') { r.inAttesa++; r.attese.push(e) }
    } else if (s0 === 'gravida' && !prima.parziale) {
      r.gravidePrima++
      const partorita = l1 > l0 || s1 === 'attesa'
      if (!partorita && s1 !== 'gravida') r.perse.push({ ...e, nota: s1 === 'fecondata' ? 'rifecondata' : s1 === 'nonFecondare' ? 'non fecondare' : 'vuota' })
    }
  }
  return r
}

/** Tutti i confronti tra foto consecutive, dal più recente. */
export function storicoDiagnosi(foto: FotoRipro[], filtro?: (gruppo: number, lattazione: number) => boolean): ConfrontoDiagnosi[] {
  const ordinate = [...foto].sort((a, b) => a.data.localeCompare(b.data))
  const out: ConfrontoDiagnosi[] = []
  for (let i = 1; i < ordinate.length; i++) out.push(confronta(ordinate[i - 1], ordinate[i], filtro))
  return out.reverse()
}

export const quotaPositive = (c: { positive: unknown[]; negative: unknown[] }) => {
  const d = c.positive.length + c.negative.length
  return d ? c.positive.length / d : null
}

export interface RigaGruppo { gruppo: number; positive: number; negative: number; rifecondate: number; perse: number; inAttesa: number }

/** Lo stesso confronto diviso per gruppo DairyComp (gruppo della lista attuale). */
export function perGruppo(c: ConfrontoDiagnosi): RigaGruppo[] {
  const m = new Map<number, RigaGruppo>()
  const riga = (g: number) => m.get(g) ?? m.set(g, { gruppo: g, positive: 0, negative: 0, rifecondate: 0, perse: 0, inAttesa: 0 }).get(g)!
  c.positive.forEach((e) => riga(e.gruppo).positive++)
  c.negative.forEach((e) => riga(e.gruppo).negative++)
  c.rifecondate.forEach((e) => riga(e.gruppo).rifecondate++)
  c.perse.forEach((e) => riga(e.gruppo).perse++)
  c.attese.forEach((e) => riga(e.gruppo).inAttesa++)
  return [...m.values()].sort((a, b) => a.gruppo - b.gruppo)
}

/** Una foto salvata prima che si tenessero anche ultimo calore e toro. */
export const fotoSenzaCalore = (f: FotoRipro) => Object.values(f.animali).some((r) => r.length < 6)

export interface Fecondazione {
  numero: number // 1ª, 2ª… della lattazione
  data: string | null // giorno esatto (dai giorni dall'ultimo calore)
  tra: [string, string] | null // se il giorno non si conosce: tra queste due liste
  prima: string | null // se il giorno non si conosce ed era già fatta alla prima lista salvata
  toro: string | null
  esito: 'gravida' | 'ritorno' | 'attesa' | 'vuota'
}

/**
 * Fecondazioni della lattazione in corso, ricavate dalle liste Mandria del lunedì:
 * ogni volta che il numero di fecondazioni sale c'è stata una fecondazione; giorno e toro
 * si leggono dai giorni dall'ultimo calore e dall'ultimo toro della lista che la mostra per prima.
 */
export function storicoFecondazioni(foto: FotoRipro[], a: AnimaleDC, dataLista: string): Fecondazione[] {
  const attuale = fotoDaLista({ id: dataLista, data: dataLista, importatoIl: '', nomeFile: '', animali: [a] }).animali[a.id]
  if (!attuale) return []
  const righe = [...foto.filter((f) => f.data < dataLista && !f.parziale), { id: dataLista, data: dataLista, animali: { [a.id]: attuale } } as FotoRipro]
    .sort((x, y) => x.data.localeCompare(y.data))
    .map((f) => ({ data: f.data, r: f.animali[a.id] }))
    .filter((x) => x.r && x.r[3] === attuale[3]) // solo la lattazione in corso
  const out = new Map<number, Fecondazione>()
  const esatta = (data: string, r: NonNullable<FotoRipro['animali'][string]>) => (typeof r[4] === 'number' && r[4] > 0 ? aggiungiGiorni(data, -r[4]) : null)
  righe.forEach(({ data, r }, i) => {
    const n = r[1]
    const nPrima = i > 0 ? righe[i - 1].r[1] : 0
    for (let k = Math.max(1, nPrima + 1); k <= n; k++) {
      if (out.has(k)) continue
      const ultima = k === n
      out.set(k, {
        numero: k,
        data: ultima ? esatta(data, r) : null,
        tra: i > 0 ? [righe[i - 1].data, data] : null,
        prima: i === 0 ? data : null,
        toro: ultima ? r[5] ?? null : null,
        esito: 'ritorno',
      })
    }
  })
  const lista = [...out.values()].sort((x, y) => x.numero - y.numero)
  const ultima = lista[lista.length - 1]
  if (ultima) {
    const s = attuale[0]
    ultima.esito = s === 'gravida' ? 'gravida' : s === 'fecondata' ? 'attesa' : 'vuota'
    // la lista di oggi conosce sempre giorno e toro dell'ultima
    ultima.data ??= esatta(dataLista, attuale)
    ultima.toro ??= attuale[5] ?? null
  }
  for (const f of lista) if (f.data) { f.tra = null; f.prima = null }
  // una fecondazione senza giorno è comunque avvenuta prima della successiva di cui si conosce il giorno
  let dopo: string | null = null
  for (const f of [...lista].reverse()) {
    if (f.data) { dopo = f.data; continue }
    if (dopo && f.prima && dopo < f.prima) f.prima = dopo
    if (dopo && f.tra && dopo < f.tra[1]) { f.prima = dopo; f.tra = null }
  }
  return lista
}
