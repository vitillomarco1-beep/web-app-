// Registro della mandria: per le aziende senza DairyComp l'app è il gestionale.
// Ogni evento (parto, fecondazione, diagnosi, asciutta…) aggiorna la lista Mandria dell'app,
// che resta la base di tutte le altre pagine (fertilità, parti e vaccini, asciutte, vitelli).
import type { AnimaleDC, ImportDC } from './types'
import { aggiungiGiorni, giorniTra, isoGiorno, nuovoId } from './format'
import { GESTAZIONE_GG } from './parti'

export type TipoEvento = 'parto' | 'fecondazione' | 'calore' | 'diagnosi' | 'asciutta' | 'spostamento' | 'nascita' | 'uscita' | 'nonFecondare'

export interface Evento {
  id: string
  data: string
  tipo: TipoEvento
  vacca: string
  testo: string // descrizione leggibile, per il registro
  dettagli?: Record<string, string | number | boolean>
}

/** Una vacca in un protocollo di sincronizzazione: ogni passo ha il suo giorno. */
export interface Sincronizzazione {
  id: string
  vacca: string
  protocollo: string // id in PROTOCOLLI
  inizio: string
  fatti: string[] // id dei passi fatti
  chiusa?: boolean
}

export interface PassoProtocollo { id: string; giorno: number; cosa: string; fecondazione?: boolean }
export interface Protocollo { id: string; nome: string; descrizione: string; passi: PassoProtocollo[] }

export const PROTOCOLLI: Protocollo[] = [
  { id: 'ovsynch', nome: 'Ovsynch', descrizione: 'GnRH, prostaglandina dopo 7 giorni, GnRH dopo altri 2, fecondazione il giorno dopo', passi: [
    { id: 'g1', giorno: 0, cosa: 'GnRH' }, { id: 'p', giorno: 7, cosa: 'Prostaglandina' }, { id: 'g2', giorno: 9, cosa: 'GnRH' }, { id: 'ia', giorno: 10, cosa: 'Fecondazione', fecondazione: true },
  ] },
  { id: 'presynch', nome: 'Presynch-Ovsynch', descrizione: 'due prostaglandine a 14 giorni, poi Ovsynch dopo 12 giorni', passi: [
    { id: 'p1', giorno: 0, cosa: 'Prostaglandina' }, { id: 'p2', giorno: 14, cosa: 'Prostaglandina' }, { id: 'g1', giorno: 26, cosa: 'GnRH' },
    { id: 'p3', giorno: 33, cosa: 'Prostaglandina' }, { id: 'g2', giorno: 35, cosa: 'GnRH' }, { id: 'ia', giorno: 36, cosa: 'Fecondazione', fecondazione: true },
  ] },
  { id: 'spirale', nome: 'Spirale 7 giorni', descrizione: 'GnRH e spirale, dopo 7 giorni prostaglandina e via la spirale, dopo 3 giorni GnRH e fecondazione', passi: [
    { id: 'g1', giorno: 0, cosa: 'GnRH + spirale' }, { id: 'p', giorno: 7, cosa: 'Prostaglandina + togliere la spirale' }, { id: 'ia', giorno: 10, cosa: 'GnRH + fecondazione', fecondazione: true },
  ] },
  { id: 'doppiaPgf', nome: 'Doppia prostaglandina', descrizione: 'due prostaglandine a 14 giorni, poi fecondare al calore', passi: [
    { id: 'p1', giorno: 0, cosa: 'Prostaglandina' }, { id: 'p2', giorno: 14, cosa: 'Prostaglandina, poi fecondare al calore' },
  ] },
]
export const protocollo = (id: string) => PROTOCOLLI.find((p) => p.id === id)

export interface PassoDaFare { s: Sincronizzazione; p: Protocollo; passo: PassoProtocollo; giorno: string; ritardo: number }

/** Passi da fare oggi o in ritardo (non fatti), più quelli dei prossimi `avanti` giorni. */
export function passiDaFare(sinc: Sincronizzazione[], oggi = isoGiorno(), avanti = 0): PassoDaFare[] {
  const out: PassoDaFare[] = []
  for (const s of sinc) {
    const p = protocollo(s.protocollo)
    if (!p || s.chiusa) continue
    for (const passo of p.passi) {
      if (s.fatti.includes(passo.id)) continue
      const giorno = aggiungiGiorni(s.inizio, passo.giorno)
      const ritardo = giorniTra(giorno, oggi)
      if (ritardo >= -avanti) out.push({ s, p, passo, giorno, ritardo })
      break // solo il primo passo non fatto di ogni vacca
    }
  }
  return out.sort((a, b) => a.giorno.localeCompare(b.giorno) || a.s.vacca.localeCompare(b.s.vacca, 'it', { numeric: true }))
}

/* ---------- lista Mandria come gestionale ---------- */
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Porta la lista alla data di oggi: giorni di lattazione, dall'ultimo calore e di vita avanzano. */
export function allinea(lista: ImportDC, oggi = isoGiorno()): ImportDC {
  const d = giorniTra(lista.data, oggi)
  if (d <= 0) return lista
  return {
    ...lista, data: oggi,
    animali: lista.animali.map((a) => ({
      ...a,
      dim: (a.lattazione ?? 0) >= 1 && a.dim !== null ? a.dim + d : a.dim,
      giorniVita: typeof a.giorniVita === 'number' ? a.giorniVita + d : a.giorniVita,
      extra: { ...a.extra, ...(num(a.extra?.GUCA) > 0 ? { GUCA: num(a.extra?.GUCA) + d } : {}) },
    })),
  }
}

/** Lista dei parti previsti ricavata dalla mandria: gravide con i giorni dall'ultimo calore (= fecondazione che ha preso). */
export function partiDaMandria(lista: ImportDC): ImportDC {
  const animali: AnimaleDC[] = []
  for (const a of lista.animali) {
    const c = (a.codiceRiproduttivo ?? '').toUpperCase()
    const g = num(a.extra?.GUCA)
    if (!(c.startsWith('GRAV') || c.startsWith('ASC')) || g <= 0) continue
    const parto = aggiungiGiorni(lista.data, GESTAZIONE_GG - g)
    const [y, m, d] = parto.split('-')
    animali.push({ id: a.id, gruppo: a.gruppo, lattazione: a.lattazione, dim: null, latte: null, codiceRiproduttivo: null, giorniGravidanza: g, dataPartoPrevista: `${d}/${m}/${y.slice(2)}`, extra: {} })
  }
  return { id: `parti-${lista.data}`, data: lista.data, importatoIl: new Date().toISOString(), nomeFile: 'Registro della mandria', animali }
}

export interface DatiEvento {
  tipo: TipoEvento; vacca: string; data: string
  toro?: string; esito?: 'positiva' | 'negativa'; gruppo?: number | null
  vitelli?: { id: string; sesso: 'F' | 'M' }[]; facilita?: string; matricola?: string; nota?: string
  nascitaGiorni?: number // per un animale acquistato: giorni di vita
  gruppoVitelli?: number | null // gruppo dove vanno i vitelli nati
}

const NOMI_TIPO: Record<TipoEvento, string> = {
  parto: 'Parto', fecondazione: 'Fecondazione', calore: 'Calore', diagnosi: 'Diagnosi di gravidanza', asciutta: 'Messa in asciutta',
  spostamento: 'Cambio gruppo', nascita: 'Nascita o ingresso', uscita: 'Uscita', nonFecondare: 'Da non fecondare',
}
export const nomeTipo = (t: TipoEvento) => NOMI_TIPO[t]

/** Applica un evento alla lista Mandria (già allineata a oggi). Restituisce la nuova lista e la riga del registro, o un errore. */
export function applicaEvento(lista: ImportDC, e: DatiEvento): { lista: ImportDC; evento: Evento } | { errore: string } {
  const id = e.vacca.trim()
  const animali = [...lista.animali]
  const i = animali.findIndex((a) => a.id === id)
  const giorniFa = Math.max(0, giorniTra(e.data, lista.data)) // evento registrato con qualche giorno di ritardo
  if (e.tipo === 'nascita') {
    if (!id) return { errore: 'Scrivi il numero del nuovo animale.' }
    if (i >= 0) return { errore: `Il numero ${id} c'è già in mandria.` }
    animali.push({ id, gruppo: e.gruppo ?? null, lattazione: 0, dim: 0, latte: null, codiceRiproduttivo: 'MANZA', giorniVita: (e.nascitaGiorni ?? 0) + giorniFa, extra: { ...(e.matricola ? { MATR: e.matricola } : {}), NFEC: 0, GUCA: 0 } })
    return { lista: { ...lista, animali }, evento: { id: nuovoId(), data: e.data, tipo: e.tipo, vacca: id, testo: e.nascitaGiorni ? `Ingresso, ${e.nascitaGiorni} giorni di vita` : 'Nascita' } }
  }
  if (i < 0) return { errore: `La vacca ${id || '?'} non è in mandria.` }
  const a = { ...animali[i], extra: { ...animali[i].extra } }
  let testo = ''
  switch (e.tipo) {
    case 'parto': {
      a.lattazione = (a.lattazione ?? 0) + 1
      a.dim = giorniFa
      a.codiceRiproduttivo = 'PARTO'
      a.extra.NFEC = 0; a.extra.GUCA = 0
      if (e.gruppo != null) a.gruppo = e.gruppo
      const nati = (e.vitelli ?? []).filter((v) => v.id.trim())
      for (const v of nati) {
        if (animali.some((x) => x.id === v.id.trim())) return { errore: `Il numero ${v.id} del vitello c'è già in mandria.` }
        animali.push({ id: v.id.trim(), gruppo: e.gruppoVitelli ?? null, lattazione: 0, dim: 0, latte: null, codiceRiproduttivo: v.sesso === 'M' ? 'MASCHIO' : 'MANZA', giorniVita: giorniFa, extra: { NFEC: 0, GUCA: 0, MADRE: id } })
      }
      testo = `${a.lattazione}ª lattazione${e.facilita ? `, ${e.facilita}` : ''}${nati.length ? `, vitelli: ${nati.map((v) => `${v.id} (${v.sesso === 'M' ? 'maschio' : 'femmina'})`).join(', ')}` : ''}`
      break
    }
    case 'fecondazione':
      a.codiceRiproduttivo = 'FEC'
      a.extra.NFEC = num(a.extra.NFEC) + 1
      a.extra.GUCA = giorniFa
      if (e.toro) a.extra.UTOR = e.toro.toUpperCase()
      testo = `${a.extra.NFEC}ª fecondazione${e.toro ? `, toro ${e.toro.toUpperCase()}` : ''}`
      break
    case 'calore':
      a.extra.GUCA = giorniFa
      testo = 'Calore visto, non fecondata'
      break
    case 'diagnosi':
      if (e.esito === 'positiva') { a.codiceRiproduttivo = 'GRAV'; testo = `Gravida (${num(a.extra.GUCA)} giorni)` }
      else { a.codiceRiproduttivo = 'OK/VUOT'; testo = 'Vuota' }
      break
    case 'asciutta':
      a.codiceRiproduttivo = 'ASC'
      if (e.gruppo != null) a.gruppo = e.gruppo
      testo = `In asciutta${e.nota ? `, ${e.nota}` : ''}`
      break
    case 'spostamento':
      testo = `Dal gruppo ${a.gruppo ?? '—'} al gruppo ${e.gruppo ?? '—'}`
      a.gruppo = e.gruppo ?? null
      break
    case 'nonFecondare':
      a.codiceRiproduttivo = 'NO FEC'
      testo = 'Da non fecondare più'
      break
    case 'uscita':
      animali.splice(i, 1)
      return { lista: { ...lista, animali }, evento: { id: nuovoId(), data: e.data, tipo: e.tipo, vacca: id, testo: e.nota ? `Uscita: ${e.nota}` : 'Uscita' } }
  }
  if (e.nota && e.tipo !== 'asciutta') testo += ` · ${e.nota}`
  animali[i] = a
  return { lista: { ...lista, animali }, evento: { id: nuovoId(), data: e.data, tipo: e.tipo, vacca: id, testo } }
}
