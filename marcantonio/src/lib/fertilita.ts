// Indici di fertilità calcolati dalla lista completa di DairyComp (sezione Mandria).
// Servono le colonne LATT, GLAT (giorni di lattazione), RIPRO (stato riproduttivo), NFEC (numero di
// fecondazioni), GUCA (giorni dall'ultimo calore), GDNAS (giorni di vita) e, se c'è, UTOR (ultimo toro).
// Per le gravide e le fecondate l'ultimo calore è quello della fecondazione: GUCA vale come giorni dalla fecondazione.
// È una fotografia del giorno della lista: gli indici "a 21 giorni" richiederebbero lo storico degli eventi.
import type { AnimaleDC, ImportDC } from './types'
import { isCloseUp } from './dairycomp'

/** Periodo di attesa volontario dopo il parto, prima della prima fecondazione. */
export const PERIODO_ATTESA = 60
/** Oltre questi giorni senza gravidanza la vacca è "vuota da troppo". */
export const DIM_VUOTA_PROBLEMA = 150
/** Diagnosi di gravidanza dall'ecografia: da questi giorni dopo il calore della fecondazione. */
export const GG_DIAGNOSI = 30
/** Finestra in cui osservare il ritorno in calore (un ciclo dura circa 21 giorni). */
export const RITORNO_CALORE = { da: 18, a: 24 }
/** Età (giorni) da cui una manza va fecondata (12 mesi). */
export const ETA_FECONDAZIONE_MANZE = 365
/** Gruppi esclusi dagli indici: il gruppo 11 sono animali da carne. */
export const GRUPPI_ESCLUSI = [11]
const GG_MESE = 30.44
const GESTAZIONE = 280

export type StatoRipro = 'gravida' | 'fecondata' | 'vuota' | 'attesa' | 'nonFecondare' | 'manza' | 'maschio' | 'altro'

const codice = (a: AnimaleDC) => (a.codiceRiproduttivo ?? '').toUpperCase().replace(/[^A-Z]/g, '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Numero di fecondazioni (NFEC / NF / TBRD). */
export const fecondazioni = (a: AnimaleDC) => num(a.extra?.NFEC) ?? num(a.extra?.NF) ?? num(a.extra?.TBRD) ?? 0
/** Giorni dall'ultimo calore (GUCA); nelle liste vecchie la colonna era finita nei giorni di gravidanza. */
export const giorniUltimoCalore = (a: AnimaleDC) => num(a.extra?.GUCA) ?? num(a.extra?.DSLH) ?? a.giorniGravidanza ?? null
export const toro = (a: AnimaleDC) => {
  const t = a.extra?.UTOR ?? a.extra?.SIRC
  return typeof t === 'string' && t !== '-' ? t : null
}
export const eMaschio = (a: AnimaleDC) => /^(MASCHIO|TORO|TORELLO|BULL)/.test(codice(a))
export const eVacca = (a: AnimaleDC) => (a.lattazione ?? 0) >= 1 && !eMaschio(a)
export const eManza = (a: AnimaleDC) => a.lattazione === 0 && !eMaschio(a)

/** Stato riproduttivo leggibile, dal codice RIPRO di DairyComp. */
export function statoRipro(a: AnimaleDC): StatoRipro {
  const c = codice(a)
  const g = giorniUltimoCalore(a) ?? 0
  if (eMaschio(a)) return 'maschio'
  if (/^(GRAV|PREG|GRAVIDA)/.test(c)) return 'gravida'
  if (/^(ASC|DRY)/.test(c)) return g > 0 || a.lattazione === 0 ? 'gravida' : 'altro'
  if (/^(NOFEC|DNB|NONFEC)/.test(c)) return 'nonFecondare'
  if (/^(FEC|BRED|INS)/.test(c)) return 'fecondata'
  if (/^(OKVUOT|VUOT|OPEN|OK)/.test(c)) return 'vuota'
  if (/^(PARTO|FRESH|FRESCA)/.test(c)) return (a.dim ?? 0) > PERIODO_ATTESA ? 'vuota' : 'attesa'
  if (/^(MANZA|HEIFER)/.test(c)) return isCloseUp(a.gruppo) ? 'gravida' : 'manza' // manze in sala parto: gravide
  return 'altro'
}

export const NOMI_STATO: Record<StatoRipro, string> = {
  gravida: 'Gravide', fecondata: 'Fecondate, in attesa di diagnosi', vuota: 'Vuote da fecondare',
  attesa: `Fresche (meno di ${PERIODO_ATTESA} giorni)`, nonFecondare: 'Non fecondare', manza: 'Manze non fecondate', maschio: 'Maschi', altro: 'Altro',
}

const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)
const quota = (a: number, b: number) => (b > 0 ? a / b : null)

/** Concepimento: fecondazioni con esito noto e gravidanze ottenute (l'ultima fecondazione di una "fecondata" è ancora senza esito).
 *  Le "non fecondare" sono escluse. */
function concepimento(animali: AnimaleDC[]) {
  let gravidanze = 0, servizi = 0, primaOk = 0, primaNote = 0
  for (const a of animali) {
    const n = fecondazioni(a)
    if (n < 1) continue
    const s = statoRipro(a)
    if (s === 'nonFecondare') continue // destinate alla riforma: non contano nel tasso (come se fossero uscite)
    if (s === 'gravida') { gravidanze++; servizi += n; primaNote++; if (n === 1) primaOk++ }
    else if (s === 'fecondata') { servizi += n - 1; if (n >= 2) primaNote++ }
    else { servizi += n; primaNote++ }
  }
  return { gravidanze, servizi, tasso: quota(gravidanze, servizi), primaFec: quota(primaOk, primaNote), primaNote }
}

export interface RigaLista { a: AnimaleDC; nota: string }

export interface IndiciFertilita {
  data: string
  vacche: number
  perStato: { stato: StatoRipro; n: number }[]
  gravidePct: number | null // vacche gravide / vacche presenti
  gravideA150: number | null // % gravide tra le vacche oltre 150 giorni di lattazione
  oltre150: number
  giorniAperti: number | null // giorni dal parto al concepimento (vacche gravide)
  interparto: number | null // interparto previsto = giorni aperti + gestazione
  serviziPerGravidanza: number | null // vacche gravide
  tassoConcepimento: number | null // gravidanze / fecondazioni con esito noto
  primaFecondazione: number | null // % gravide alla prima fecondazione
  fecondazioniNote: number
  // manze
  manze: number
  manzeGravide: number
  etaConcepimento: number | null // mesi
  etaPrimoParto: number | null // mesi, previsto per le manze gravide
  etaPrimoPartoPrimipare: number | null // mesi, primipare partorite nell'ultimo anno
  serviziManze: number | null
  tassoManze: number | null
  // liste di lavoro
  daVisitare: RigaLista[] // fecondate con l'ultimo calore da più di 30 giorni: ecografia
  ritornoCalore: RigaLista[] // fecondate con l'ultimo calore 18–24 giorni fa
  daFecondare: RigaLista[] // oltre il periodo d'attesa, vuote
  vuoteProblema: RigaLista[] // vuote oltre 150 giorni
  nonFecondare: RigaLista[]
  manzeDaFecondare: RigaLista[]
  tori: { toro: string; vacche: number; manze: number; inAttesa: number }[] // gravidanze in corso e fecondazioni in attesa, per ultimo toro
}

const contato = (a: AnimaleDC) => a.gruppo === null || !GRUPPI_ESCLUSI.includes(a.gruppo)

/** `gruppi`: solo gli animali di questi gruppi DairyComp (per esempio quelli di una stalla). */
export function calcolaFertilita(lista: ImportDC, gruppi?: number[]): IndiciFertilita {
  const tutti = lista.animali.filter((a) => contato(a) && (!gruppi || (a.gruppo !== null && gruppi.includes(a.gruppo))))
  const vacche = tutti.filter(eVacca)
  const manze = tutti.filter(eManza)
  const conta = new Map<StatoRipro, number>()
  vacche.forEach((a) => conta.set(statoRipro(a), (conta.get(statoRipro(a)) ?? 0) + 1))
  const gravide = vacche.filter((a) => statoRipro(a) === 'gravida')
  const oltre150 = vacche.filter((a) => (a.dim ?? 0) > DIM_VUOTA_PROBLEMA)

  // giorni dal parto al concepimento: solo dove i numeri sono coerenti (gravidanza della lattazione in corso)
  const aperti = gravide
    .map((a) => { const g = giorniUltimoCalore(a); return a.dim !== null && g !== null && g > 0 && g <= GESTAZIONE && a.dim - g >= 20 ? a.dim - g : null })
    .filter((x): x is number => x !== null)
  const cv = concepimento(vacche)
  const cm = concepimento(manze)

  const manzeGravide = manze.filter((a) => statoRipro(a) === 'gravida')
  const etaConc = manzeGravide
    .map((a) => { const g = giorniUltimoCalore(a); return a.giorniVita != null && g !== null && g > 0 && g <= GESTAZIONE ? a.giorniVita - g : null })
    .filter((x): x is number => x !== null && x > 200)
  const primipare = vacche.filter((a) => a.lattazione === 1 && a.dim !== null && a.dim <= 365 && a.giorniVita != null)
    .map((a) => a.giorniVita! - a.dim!).filter((x) => x > 500)

  const nota = (a: AnimaleDC) => `${a.dim ?? '—'} gg di latt. · ${fecondazioni(a)} fec.`
  const ord = (x: RigaLista[], k: (a: AnimaleDC) => number) => x.sort((p, q) => k(q.a) - k(p.a))
  const g = (a: AnimaleDC) => giorniUltimoCalore(a) ?? 0

  const fecondate = tutti.filter((a) => statoRipro(a) === 'fecondata')
  const daVisitare = ord(fecondate.filter((a) => g(a) >= GG_DIAGNOSI).map((a) => ({ a, nota: `ultimo calore ${g(a)} giorni fa · ${fecondazioni(a)}ª fec.${toro(a) ? ` · ${toro(a)}` : ''}` })), g)
  const ritornoCalore = ord(fecondate.filter((a) => g(a) >= RITORNO_CALORE.da && g(a) <= RITORNO_CALORE.a).map((a) => ({ a, nota: `ultimo calore ${g(a)} giorni fa` })), g)
  const vuoteVacche = vacche.filter((a) => statoRipro(a) === 'vuota')
  const daFecondare = ord(vuoteVacche.filter((a) => (a.dim ?? 0) <= DIM_VUOTA_PROBLEMA).map((a) => ({ a, nota: nota(a) })), (a) => a.dim ?? 0)
  const vuoteProblema = ord(vacche.filter((a) => ['vuota', 'fecondata'].includes(statoRipro(a)) && (a.dim ?? 0) > DIM_VUOTA_PROBLEMA)
    .map((a) => ({ a, nota: `${nota(a)}${statoRipro(a) === 'fecondata' ? ` · ultimo calore ${g(a)} gg fa` : ''}` })), (a) => a.dim ?? 0)
  const nonFecondare = ord(tutti.filter((a) => statoRipro(a) === 'nonFecondare' && !eMaschio(a))
    .map((a) => ({ a, nota: a.lattazione === 0 ? `manza · ${Math.round((a.giorniVita ?? 0) / GG_MESE)} mesi` : nota(a) })), (a) => a.dim ?? 0)
  const manzeDaFecondare = ord(manze.filter((a) => statoRipro(a) === 'manza' && (a.giorniVita ?? 0) >= ETA_FECONDAZIONE_MANZE)
    .map((a) => ({ a, nota: `${Math.round((a.giorniVita ?? 0) / GG_MESE)} mesi` })), (a) => a.giorniVita ?? 0)

  // tori: la lista ha solo l'ultimo toro, quindi non si può calcolare il tasso di concepimento per toro
  // (le fecondazioni fallite con un toro spariscono se la vacca viene rifecondata con un altro).
  // Dato sicuro: per le gravide l'ultimo toro è quello della gravidanza; per le fecondate, quello in attesa di diagnosi.
  const perToro = new Map<string, { vacche: number; manze: number; inAttesa: number }>()
  for (const a of tutti) {
    const t = toro(a), s = statoRipro(a)
    if (!t || (s !== 'gravida' && s !== 'fecondata')) continue
    const r = perToro.get(t) ?? { vacche: 0, manze: 0, inAttesa: 0 }
    if (s === 'fecondata') r.inAttesa++
    else if (a.lattazione === 0) r.manze++
    else r.vacche++
    perToro.set(t, r)
  }
  const tori = [...perToro.entries()].map(([t, r]) => ({ toro: t, ...r }))
    .sort((a, b) => b.vacche + b.manze - a.vacche - a.manze || b.inAttesa - a.inAttesa || a.toro.localeCompare(b.toro))

  const am = media(aperti)
  return {
    data: lista.data,
    vacche: vacche.length,
    perStato: (['gravida', 'fecondata', 'vuota', 'attesa', 'nonFecondare', 'altro'] as StatoRipro[]).map((s) => ({ stato: s, n: conta.get(s) ?? 0 })).filter((x) => x.n > 0),
    gravidePct: quota(gravide.length, vacche.length),
    gravideA150: quota(oltre150.filter((a) => statoRipro(a) === 'gravida').length, oltre150.length),
    oltre150: oltre150.length,
    giorniAperti: am,
    interparto: am === null ? null : am + GESTAZIONE,
    serviziPerGravidanza: media(gravide.map(fecondazioni).filter((n) => n > 0)),
    tassoConcepimento: cv.tasso,
    primaFecondazione: cv.primaFec,
    fecondazioniNote: cv.servizi,
    manze: manze.length,
    manzeGravide: manzeGravide.length,
    etaConcepimento: etaConc.length ? media(etaConc)! / GG_MESE : null,
    etaPrimoParto: etaConc.length ? (media(etaConc)! + GESTAZIONE) / GG_MESE : null,
    etaPrimoPartoPrimipare: primipare.length ? media(primipare)! / GG_MESE : null,
    serviziManze: media(manzeGravide.map(fecondazioni).filter((n) => n > 0)),
    tassoManze: cm.tasso,
    daVisitare, ritornoCalore, daFecondare, vuoteProblema, nonFecondare, manzeDaFecondare, tori,
  }
}

/** La lista ha le colonne che servono per gli indici? */
export function listaAdatta(lista: ImportDC | undefined) {
  if (!lista) return { ok: false, manca: ['lista Mandria'] }
  const a = lista.animali
  const manca: string[] = []
  if (!a.some((x) => x.codiceRiproduttivo)) manca.push('RIPRO')
  if (!a.some((x) => x.extra?.NFEC !== undefined || x.extra?.NF !== undefined || x.extra?.TBRD !== undefined)) manca.push('NFEC')
  if (!a.some((x) => giorniUltimoCalore(x) !== null)) manca.push('GUCA')
  if (!a.some((x) => x.dim !== null)) manca.push('GLAT')
  return { ok: manca.length === 0, manca }
}

/** Obiettivi indicativi per una stalla da latte con robot (valori di riferimento comuni). */
export const OBIETTIVI = {
  gravidePct: { buono: 0.5, scarso: 0.4, testo: 'obiettivo ≥ 50%' },
  gravideA150: { buono: 0.7, scarso: 0.55, testo: 'obiettivo ≥ 70%' },
  giorniAperti: { buono: 120, scarso: 150, testo: 'obiettivo ≤ 120 giorni' },
  interparto: { buono: 400, scarso: 430, testo: 'obiettivo ≤ 400 giorni' },
  serviziPerGravidanza: { buono: 2.5, scarso: 3.2, testo: 'obiettivo ≤ 2,5' },
  tassoConcepimento: { buono: 0.38, scarso: 0.3, testo: 'obiettivo ≥ 38%' },
  primaFecondazione: { buono: 0.38, scarso: 0.3, testo: 'obiettivo ≥ 38%' },
  etaPrimoParto: { buono: 24, scarso: 26, testo: 'obiettivo 22–24 mesi' },
  etaConcepimento: { buono: 15, scarso: 17, testo: 'obiettivo 13–15 mesi' },
  serviziManze: { buono: 1.8, scarso: 2.3, testo: 'obiettivo ≤ 1,8' },
  tassoManze: { buono: 0.5, scarso: 0.4, testo: 'obiettivo ≥ 50%' },
} as const
export type ChiaveObiettivo = keyof typeof OBIETTIVI

/** 'buono' | 'medio' | 'scarso' rispetto all'obiettivo (più alto è meglio, salvo i giorni, i servizi e le età). */
export function giudizio(k: ChiaveObiettivo, v: number | null): 'buono' | 'medio' | 'scarso' | null {
  if (v === null) return null
  const o = OBIETTIVI[k]
  const alto = o.buono > o.scarso
  if (alto ? v >= o.buono : v <= o.buono) return 'buono'
  if (alto ? v < o.scarso : v > o.scarso) return 'scarso'
  return 'medio'
}

/** Riassunto da salvare nello storico, una riga per lista caricata. */
export const riassuntoStorico = (f: IndiciFertilita) => ({
  id: f.data, data: f.data, vacche: f.vacche, gravidePct: f.gravidePct, gravideA150: f.gravideA150, giorniAperti: f.giorniAperti,
  serviziPerGravidanza: f.serviziPerGravidanza, tassoConcepimento: f.tassoConcepimento, primaFecondazione: f.primaFecondazione, etaPrimoParto: f.etaPrimoParto,
})

export interface IndiciCategoria {
  nome: string
  n: number // animali contati (manze: solo quelle con almeno una fecondazione)
  gravidePct: number | null
  giorniAperti: number | null // vacche: parto → concepimento; manze: età al concepimento in giorni
  serviziPerGravidanza: number | null
  tassoConcepimento: number | null
  primaFecondazione: number | null
}

/** Confronto manze / primipare / pluripare: dove conviene lavorare. */
export function perCategoria(lista: ImportDC): IndiciCategoria[] {
  const tutti = lista.animali.filter((a) => contato(a) && !eMaschio(a))
  // manze: tutte quelle con almeno una fecondazione segnata (alcune si fecondano già a 11 mesi), più le gravide
  const manze = tutti.filter((a) => a.lattazione === 0 && (fecondazioni(a) >= 1 || statoRipro(a) === 'gravida'))
  const cat = (nome: string, animali: AnimaleDC[], manza: boolean): IndiciCategoria => {
    const grav = animali.filter((a) => statoRipro(a) === 'gravida')
    const c = concepimento(animali)
    const giorni = grav.map((a) => {
      const g = giorniUltimoCalore(a)
      if (g === null || g <= 0 || g > GESTAZIONE) return null
      if (manza) return a.giorniVita != null && a.giorniVita - g > 200 ? a.giorniVita - g : null
      return a.dim !== null && a.dim - g >= 20 ? a.dim - g : null
    }).filter((x): x is number => x !== null)
    return { nome, n: animali.length, gravidePct: quota(grav.length, animali.length), giorniAperti: media(giorni),
      serviziPerGravidanza: media(grav.map(fecondazioni).filter((n) => n > 0)), tassoConcepimento: c.tasso, primaFecondazione: c.primaFec }
  }
  return [
    cat('Manze', manze, true),
    cat('Primipare', tutti.filter((a) => a.lattazione === 1), false),
    cat('Pluripare', tutti.filter((a) => (a.lattazione ?? 0) >= 2), false),
  ]
}
