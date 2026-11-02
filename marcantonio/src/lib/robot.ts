// Importazione degli export di mungitura dei robot.
// DeLaval (DelPro): elenco di ogni mungitura, CSV con ";" e due righe di intestazione
// (gruppi di colonne, poi nomi). Le singole mungiture non vengono conservate: si salvano
// i riepiloghi per robot e per vacca di ogni giorno, che bastano per controlli e grafici.
import type { GiornoRobot, GiornoVaccaRobot } from './types'

export interface Mungitura {
  data: string // yyyy-mm-dd
  ora: string // HH:MM
  vacca: string
  gruppo: string
  robot: string
  azione: string
  durataSec: number
  kg: number
  kickOff: boolean
  incompleta: boolean
  capezzoliNonTrovati: boolean
  allarmeAmd: boolean
  separato: boolean
  sangueMax: number | null
  dim?: number | null // giorni di lattazione, se il file li riporta (Lely)
}

export interface FileRobot { fonte: 'DeLaval' | 'Lely'; mungiture: Mungitura[]; scartate: number }

const num = (s: string | undefined) => {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function separaCsv(riga: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', dentro = false
  for (const c of riga) {
    if (c === '"') dentro = !dentro
    else if (c === sep && !dentro) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

/** Riconosce e legge un export "Mungiture" di DeLaval DelPro. */
export function leggiDeLaval(testo: string): FileRobot {
  const linee = testo.replace(/^﻿/, '').replace(/\r/g, '').split('\n')
  const iNomi = linee.findIndex((l) => /numero animale/i.test(l) && /(MS\/MP|Ora inizio)/i.test(l))
  if (iNomi < 0) throw new Error('Non sembra un export delle mungiture DeLaval (manca la riga con "Numero animale").')
  const sep = linee[iNomi].includes(';') ? ';' : linee[iNomi].includes('\t') ? '\t' : ','
  const nomi = separaCsv(linee[iNomi], sep).map((x) => x.toLowerCase())
  const gruppi = iNomi > 0 ? separaCsv(linee[iNomi - 1], sep).map((x) => x.toLowerCase()) : []
  const col = (...alias: string[]) => nomi.findIndex((n) => alias.some((a) => n.startsWith(a)))
  const gruppoDa = (prefisso: string) => gruppi.findIndex((g) => g.startsWith(prefisso))
  const c = {
    ora: col('ora inizio', 'inizio'), vacca: col('numero animale', 'animale'), gruppo: col('gruppo'), robot: col('ms/mp', 'robot', 'box'),
    azione: col('azione'), durata: col('durata'), kg: col('produzione'), kick: col('kick'), incompleto: col('incomplet'),
    capezzoli: col('capezzoli non trovati'), amdMammella: col('mammella'), destinazione: col('destinazione'),
  }
  if (c.ora < 0 || c.vacca < 0 || c.kg < 0) throw new Error('Mancano le colonne principali (ora, numero animale, produzione).')
  const iSangue = gruppoDa('sangue')
  const mungiture: Mungitura[] = []
  let scartate = 0
  for (const l of linee.slice(iNomi + 1)) {
    if (!l.trim()) continue
    const r = separaCsv(l, sep)
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(r[c.ora] ?? '')
    if (!m) { scartate++; continue }
    const durata = (r[c.durata] ?? '').split(':').map(Number)
    const sangue = iSangue >= 0 ? r.slice(iSangue, iSangue + 4).map(num).filter((x): x is number => x !== null) : []
    const destinazione = (r[c.destinazione] ?? '').toLowerCase()
    mungiture.push({
      data: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
      ora: `${m[4].padStart(2, '0')}:${m[5]}`,
      vacca: (r[c.vacca] ?? '').trim(),
      gruppo: c.gruppo >= 0 ? r[c.gruppo] ?? '' : '',
      robot: c.robot >= 0 ? r[c.robot] || '—' : '—',
      azione: c.azione >= 0 ? r[c.azione] || 'Mungitura' : 'Mungitura',
      durataSec: durata.length === 2 && durata.every(Number.isFinite) ? durata[0] * 60 + durata[1] : 0,
      kg: num(r[c.kg]) ?? 0,
      kickOff: c.kick >= 0 && !!r[c.kick],
      incompleta: c.incompleto >= 0 && !!r[c.incompleto],
      capezzoliNonTrovati: c.capezzoli >= 0 && !!r[c.capezzoli],
      allarmeAmd: c.amdMammella >= 0 && r[c.amdMammella] === '1',
      separato: !!destinazione && destinazione !== 'tank',
      sangueMax: sangue.length ? Math.max(...sangue) : null,
    })
  }
  if (!mungiture.length) throw new Error('Nessuna mungitura trovata nel file.')
  return { fonte: 'DeLaval', mungiture, scartate }
}

const minuti = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Intervallo più lungo senza eventi al robot nel giorno (fino a mezzanotte se il giorno è completo). */
function pausaPiuLunga(ore: string[], giornoCompleto: boolean) {
  const t = [...new Set(ore.map(minuti))].sort((a, b) => a - b)
  const punti = [0, ...t, ...(giornoCompleto ? [24 * 60] : [])]
  let max = 0, dalle = 0
  for (let i = 1; i < punti.length; i++) {
    if (punti[i] - punti[i - 1] > max) { max = punti[i] - punti[i - 1]; dalle = punti[i - 1] }
  }
  return { pausaMaxMin: max, pausaDalle: hhmm(dalle) }
}

/** Riconosce il formato (DeLaval DelPro o Lely Horizon) e legge il file. */
export function leggiFileRobot(testo: string): FileRobot {
  const inizio = testo.replace(/^\uFEFF/, '').slice(0, 3000).toLowerCase()
  if (inizio.includes('numero vacca') && inizio.includes('resa di mungitura')) return leggiLely(testo)
  return leggiDeLaval(testo)
}

/** Export Lely Horizon, rapporto "Visite di mungitura" (modello Visita vacca – storico). */
export function leggiLely(testo: string): FileRobot {
  const linee = testo.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')
  const iNomi = linee.findIndex((l) => /numero vacca/i.test(l) && /resa di mungitura/i.test(l))
  if (iNomi < 0) throw new Error('Non sembra un export delle visite di mungitura Lely (manca "Numero vacca").')
  const sep = linee[iNomi].includes(';') ? ';' : ','
  const nomi = separaCsv(linee[iNomi], sep).map((x) => x.toLowerCase().trim())
  const col = (...alias: string[]) => nomi.findIndex((n) => alias.some((a) => n.startsWith(a)))
  const c = {
    vacca: col('numero vacca'), robot: col('robot'), ora: col('data e ora'), kg: col('resa di mungitura'),
    esito: col('risultato'), dim: col('giorni latt'), destinazione: col('destinazione del latte'),
  }
  // tempi di mungitura per quarto: le quattro colonne AS, AD, PS, PD (i quarti si mungono in parallelo)
  const quarti = ['as', 'ad', 'ps', 'pd'].map((q) => nomi.indexOf(q)).filter((i) => i >= 0)
  const mmss = (s: string | undefined) => { const p = (s ?? '').split(':').map(Number); return p.length === 2 && p.every(Number.isFinite) ? p[0] * 60 + p[1] : 0 }
  const mungiture: Mungitura[] = []
  let scartate = 0
  for (const l of linee.slice(iNomi + 1)) {
    if (!l.trim()) continue
    const r = separaCsv(l, sep)
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(r[c.ora] ?? '') ?? /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(r[c.ora] ?? '')
    if (!m || !r[c.vacca]) { scartate++; continue }
    const iso = m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    const kg = Number((r[c.kg] ?? '').replace(',', '.')) || 0
    const esito = (r[c.esito] ?? '').toLowerCase()
    const destinazione = (r[c.destinazione] ?? '').toLowerCase()
    mungiture.push({
      data: iso, ora: `${m[4].padStart(2, '0')}:${m[5]}`,
      vacca: r[c.vacca].trim(), gruppo: '', robot: r[c.robot] || '—',
      azione: kg > 0 ? 'Mungitura' : esito.startsWith('avvenuto') ? 'Mungitura' : 'Non riuscita',
      durataSec: Math.max(0, ...quarti.map((i) => mmss(r[i]))),
      kg,
      kickOff: false, // non presente nell'export Lely
      incompleta: esito.includes('tempi morti'),
      capezzoliNonTrovati: esito.includes('tentativi di collegamento'),
      allarmeAmd: false, // l'indice mastiti di Lely (MDi) non è nell'export
      separato: !!destinazione && !destinazione.startsWith('linea latte'),
      sangueMax: null,
      dim: c.dim >= 0 && r[c.dim] !== '' ? Number(r[c.dim]) : null,
    })
  }
  if (!mungiture.length) throw new Error('Nessuna visita trovata nel file.')
  return { fonte: 'Lely', mungiture, scartate }
}

/** Pausa senza mungiture oltre la quale un robot viene segnalato come fermo (minuti). */
export const SOGLIA_FERMO_MIN = 150

const munta = (m: Mungitura) => /^mungitura/i.test(m.azione) && m.kg > 0

/** Riepiloghi giornalieri per robot e per vacca. Un giorno è completo se il file prosegue oltre o arriva alle 23:30. */
export function riepiloga(mungiture: Mungitura[]): { giorni: GiornoRobot[]; vacche: GiornoVaccaRobot[] } {
  const ultimaData = mungiture.reduce((m, x) => (x.data > m ? x.data : m), '')
  const oraFine = mungiture.filter((x) => x.data === ultimaData).reduce((m, x) => (x.ora > m ? x.ora : m), '00:00')
  const completo = (data: string) => data < ultimaData || oraFine >= '23:30'

  const perRobot = new Map<string, Mungitura[]>()
  const perVacca = new Map<string, Mungitura[]>()
  for (const m of mungiture) {
    const k1 = `${m.data}|${m.robot}`, k2 = `${m.data}|${m.vacca}`
    perRobot.set(k1, [...(perRobot.get(k1) ?? []), m])
    perVacca.set(k2, [...(perVacca.get(k2) ?? []), m])
  }
  const giorni: GiornoRobot[] = [...perRobot.entries()].map(([k, ms]) => {
    const [data, robot] = k.split('|')
    const ok = ms.filter(munta)
    return {
      id: k, data, robot, completo: completo(data),
      oraUltima: ms.reduce((m, x) => (x.ora > m ? x.ora : m), '00:00'),
      vacche: new Set(ok.map((x) => x.vacca)).size,
      mungiture: ok.length,
      rifiutate: ms.filter((x) => /rifiut/i.test(x.azione)).length,
      nonMunte: ms.filter((x) => !/^mungitura/i.test(x.azione) && !/rifiut/i.test(x.azione)).length,
      kg: ok.reduce((s, x) => s + x.kg, 0),
      durataSec: ok.reduce((s, x) => s + x.durataSec, 0),
      kickOff: ok.filter((x) => x.kickOff).length,
      incomplete: ok.filter((x) => x.incompleta).length,
      capezzoliNonTrovati: ok.filter((x) => x.capezzoliNonTrovati).length,
      allarmiAmd: ok.filter((x) => x.allarmeAmd).length,
      kgSeparato: ok.filter((x) => x.separato).reduce((s, x) => s + x.kg, 0),
      ...pausaPiuLunga(ms.map((x) => x.ora), completo(data)),
    }
  })
  const vacche: GiornoVaccaRobot[] = [...perVacca.entries()].map(([k, ms]) => {
    const [data, vacca] = k.split('|')
    const ok = ms.filter(munta)
    const conteggio = new Map<string, number>()
    ok.forEach((x) => conteggio.set(x.robot, (conteggio.get(x.robot) ?? 0) + 1))
    const sangue = ok.map((x) => x.sangueMax).filter((x): x is number => x !== null)
    return {
      id: k, data, vacca,
      robot: [...conteggio.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ms[0].robot,
      mungiture: ok.length,
      rifiutate: ms.filter((x) => /rifiut/i.test(x.azione)).length,
      kg: ok.reduce((s, x) => s + x.kg, 0),
      kgSeparato: ok.filter((x) => x.separato).reduce((s, x) => s + x.kg, 0),
      allarmiAmd: ok.filter((x) => x.allarmeAmd).length,
      kickOff: ok.filter((x) => x.kickOff).length,
      incomplete: ok.filter((x) => x.incompleta).length,
      sangueMax: sangue.length ? Math.max(...sangue) : null,
      oraUltima: ok.reduce((m, x) => (x.ora > m ? x.ora : m), ''),
      dim: ms.map((x) => x.dim).filter((x): x is number => typeof x === 'number').pop() ?? null,
    }
  })
  return { giorni, vacche }
}

export interface Segnalazione { vacca: string; robot: string; motivi: string[]; gravita: number }

/** Vacche da controllare in un giorno, confrontate con la loro media dei 7 giorni completi precedenti. */
export function daControllare(vacche: GiornoVaccaRobot[], giorni: GiornoRobot[], data: string): Segnalazione[] {
  const giornoCompleto = giorni.some((g) => g.data === data && g.completo)
  const precedenti = [...new Set(giorni.filter((g) => g.data < data && g.completo).map((g) => g.data))].sort().slice(-7)
  const out: Segnalazione[] = []
  for (const v of vacche.filter((x) => x.data === data)) {
    const motivi: string[] = []
    let gravita = 0
    // un singolo allarme AMD è frequente: si segnala da 2 in su, o insieme ad altri motivi
    const amd = v.allarmiAmd ? `allarme mastite (AMD) in ${v.allarmiAmd} mungitur${v.allarmiAmd === 1 ? 'a' : 'e'}` : ''
    if (v.allarmiAmd >= 2) { motivi.push(amd); gravita += 3 }
    // nei primi giorni dopo il parto il latte (colostro) è separato di routine
    if (v.kgSeparato > 0 && !(typeof v.dim === 'number' && v.dim <= 5)) { motivi.push(`latte separato: ${v.kgSeparato.toFixed(1).replace('.', ',')} kg`); gravita += 2 }
    if (giornoCompleto) {
      // Con i robot il latte di un singolo giorno dipende da quante mungiture cadono prima della
      // mezzanotte: si confronta la media di oggi e ieri con i 7 giorni completi precedenti.
      const ieri = precedenti[precedenti.length - 1]
      const vIeri = vacche.find((x) => x.vacca === v.vacca && x.data === ieri)
      const storico = vacche.filter((x) => x.vacca === v.vacca && precedenti.includes(x.data) && x.data !== ieri)
      if (storico.length >= 3) {
        const media = storico.reduce((s, x) => s + x.kg, 0) / storico.length
        const recente = vIeri ? (v.kg + vIeri.kg) / 2 : v.kg
        if (media > 0 && recente < media * 0.75) { motivi.push(`latte in calo: ${Math.round(recente)} kg/giorno negli ultimi due giorni contro ${Math.round(media)} di media (−${Math.round((1 - recente / media) * 100)}%)`); gravita += 2 }
      }
      if (v.mungiture < 2) { motivi.push(`solo ${v.mungiture} mungitur${v.mungiture === 1 ? 'a' : 'e'} nel giorno`); gravita += 2 }
    }
    if (v.incomplete >= 2) { motivi.push(`${v.incomplete} mungiture incomplete`); gravita += 1 }
    // gravita >= 2 = da controllare; 1 = da tenere d'occhio
    if (v.kickOff >= 3) { motivi.push(`${v.kickOff} distacchi (kick-off)`); gravita += 1 }
    if (motivi.length && v.allarmiAmd === 1) { motivi.unshift(amd); gravita += 1 }
    if (motivi.length) out.push({ vacca: v.vacca, robot: v.robot, motivi, gravita })
  }
  return out.sort((a, b) => b.gravita - a.gravita || a.vacca.localeCompare(b.vacca, 'it', { numeric: true }))
}
