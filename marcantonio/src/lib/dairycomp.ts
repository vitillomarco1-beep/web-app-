// Importazione ed elaborazione dei dati esportati da DairyComp.
// Il formato esatto dipende da come viene esportata la lista: l'importatore accetta CSV
// (separati da virgola, punto e virgola o tabulazione) e testo a colonne separate da spazi,
// riconosce le intestazioni più comuni e permette di correggere l'abbinamento a mano.
import type { AnimaleDC, ImportDC } from './types'

export type Campo = 'id' | 'gruppo' | 'lattazione' | 'dim' | 'latte' | 'grasso' | 'proteine' | 'cellule' | 'scs' | 'codiceRiproduttivo' | 'giorniGravidanza'

export const CAMPI: { campo: Campo; etichetta: string; alias: string[] }[] = [
  { campo: 'id', etichetta: 'Numero vacca (ID)', alias: ['ID', 'COW', 'VACCA', 'MATRICOLA', 'MATR', 'BARN', 'NUMERO', 'ANIMALE'] },
  { campo: 'gruppo', etichetta: 'Gruppo (PEN)', alias: ['PEN', 'GR', 'GRUPPO', 'GRP', 'GROUP', 'BOX'] },
  { campo: 'lattazione', etichetta: 'Lattazione (LACT)', alias: ['LACT', 'LAT', 'LATT', 'NLAT', 'NLATT', 'LATTAZIONE', 'PARITY', 'PARTI'] },
  { campo: 'dim', etichetta: 'Giorni di lattazione (DIM)', alias: ['DIM', 'GLAT', 'GGL', 'GIORNILATTAZIONE', 'DAYSINMILK', 'GGLATT'] },
  { campo: 'latte', etichetta: 'Latte kg/giorno (MEDSE / MILK)', alias: ['MEDSE', 'MILK', 'LATTE', 'MLK', 'KGLATTE', 'KG', 'PRODUZIONE', 'PROD'] },
  { campo: 'grasso', etichetta: 'Grasso %', alias: ['PCTF', 'FAT', 'GRASSO', 'PCTFAT', 'GRAS', 'FATPCT'] },
  { campo: 'proteine', etichetta: 'Proteine %', alias: ['PCTP', 'PROT', 'PROTEINE', 'PCTPROT', 'PROTPCT'] },
  { campo: 'cellule', etichetta: 'Cellule somatiche (×1000/ml)', alias: ['SCC', 'CELLULE', 'CS', 'CCS'] },
  { campo: 'scs', etichetta: 'Punteggio lineare cellule (LGSCC)', alias: ['LGSCC', 'SCS', 'LS'] },
  { campo: 'codiceRiproduttivo', etichetta: 'Stato riproduttivo (RIPRO / RC)', alias: ['RIPRO', 'RC', 'RPRO', 'STATO', 'REPRO'] },
  { campo: 'giorniGravidanza', etichetta: 'Giorni di gravidanza (DCC)', alias: ['DCC', 'GGRA', 'GGRAV', 'DAYSPREG', 'GRAVIDANZA'] },
]

const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '')

export interface FileLetto { intestazioni: string[]; righe: string[][] }

function separa(riga: string, sep: string | RegExp): string[] {
  if (typeof sep !== 'string') return riga.trim().split(sep)
  // CSV con eventuali virgolette
  const out: string[] = []
  let cur = '', dentro = false
  for (const c of riga) {
    if (c === '"') dentro = !dentro
    else if (c === sep && !dentro) { out.push(cur.trim()); cur = '' }
    else cur += c
  }
  out.push(cur.trim())
  return out
}

/** Legge il testo del file: trova la riga di intestazione e il separatore. */
export function leggiFile(testo: string): FileLetto {
  const linee = testo.replace(/\r/g, '').split('\n').filter((l) => l.trim() && !/^[-=_\s]+$/.test(l))
  const tuttiAlias = new Set(CAMPI.flatMap((c) => c.alias))
  // intestazione = riga con più nomi di colonna conosciuti e meno parole estranee
  // (scarta ad esempio una riga di titolo tipo "LIST ID PEN LACT ..." con il nome dell'azienda)
  let iHeader = 0, migliore = -Infinity
  linee.slice(0, 30).forEach((l, i) => {
    const token = l.trim().split(/[\s,;\t]+/).filter(Boolean)
    const noti = token.filter((t) => tuttiAlias.has(norm(t))).length
    const punteggio = noti - (token.length - noti) * 0.5
    if (noti >= 2 && punteggio > migliore) { migliore = punteggio; iHeader = i }
  })
  const h = linee[iHeader] ?? ''
  const sep = h.includes('\t') ? '\t' : h.includes(';') ? ';' : h.includes(',') ? ',' : null
  const dati = linee.slice(iHeader + 1)
  if (sep) {
    const intestazioni = separa(h, sep).map((x) => x.trim())
    return { intestazioni, righe: dati.map((l) => separa(l, sep)).filter((r) => r.some((c) => c !== '')) }
  }
  // Testo a colonne (stampa di DairyComp): ogni valore va alla colonna la cui intestazione
  // finisce più vicino alla fine del valore, così i campi vuoti non spostano le colonne.
  const spans = [...h.matchAll(/\S+/g)].map((m) => ({ nome: m[0], inizio: m.index!, fine: m.index! + m[0].length }))
  const righe = dati.map((l) => {
    const riga = new Array<string>(spans.length).fill('')
    for (const m of l.matchAll(/\S+/g)) {
      const fine = m.index! + m[0].length, inizio = m.index!
      let col = 0, dist = Infinity
      spans.forEach((sp, i) => {
        const d = Math.min(Math.abs(sp.fine - fine), Math.abs(sp.inizio - inizio))
        if (d < dist) { dist = d; col = i }
      })
      riga[col] = riga[col] ? `${riga[col]} ${m[0]}` : m[0]
    }
    return riga
  }).filter((r) => r.some((c) => c !== ''))
  return { intestazioni: spans.map((x) => x.nome), righe }
}

/** Abbinamento automatico colonna → campo. */
export function abbinaColonne(intestazioni: string[]): Partial<Record<Campo, number>> {
  const m: Partial<Record<Campo, number>> = {}
  const norme = intestazioni.map(norm)
  for (const c of CAMPI) {
    for (const a of c.alias) {
      const i = norme.indexOf(a)
      if (i >= 0) { m[c.campo] = i; break }
    }
  }
  return m
}

export function numero(v: string | undefined): number | null {
  if (v === undefined) return null
  const t = v.trim()
  if (!t || t === '-' || t === '.') return null
  const s = t.includes(',') && !t.includes('.') ? t.replace(',', '.') : t.replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function costruisciAnimali(f: FileLetto, m: Partial<Record<Campo, number>>): AnimaleDC[] {
  const usate = new Set(Object.values(m))
  const valore = (r: string[], c: Campo) => (m[c] === undefined ? undefined : r[m[c]!])
  return f.righe
    .map((r) => {
      const extra: Record<string, number | string> = {}
      f.intestazioni.forEach((h, i) => {
        if (usate.has(i) || !h) return
        const n = numero(r[i])
        if (n !== null) extra[h] = n
        else if (r[i]?.trim()) extra[h] = r[i].trim()
      })
      return {
        id: (valore(r, 'id') ?? '').trim(),
        gruppo: numero(valore(r, 'gruppo')),
        lattazione: numero(valore(r, 'lattazione')),
        dim: numero(valore(r, 'dim')),
        latte: numero(valore(r, 'latte')),
        grasso: numero(valore(r, 'grasso')),
        proteine: numero(valore(r, 'proteine')),
        cellule: numero(valore(r, 'cellule')),
        scs: numero(valore(r, 'scs')),
        codiceRiproduttivo: valore(r, 'codiceRiproduttivo')?.trim() || null,
        giorniGravidanza: numero(valore(r, 'giorniGravidanza')),
        extra,
      } as AnimaleDC
    })
    .filter((a) => a.id && !/^(TOT|MEDIA|AVG|TOTAL)/i.test(a.id))
}

// ---- Elaborazioni

const media = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === 'number')
  return n.length ? n.reduce((s, x) => s + x, 0) / n.length : null
}
const mediaGeom = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === 'number' && x > 0)
  return n.length ? Math.exp(n.reduce((s, x) => s + Math.log(x), 0) / n.length) : null
}

export interface Riepilogo {
  capi: number
  dimMedio: number | null
  latteMedio: number | null // kg/capo/giorno
  latteTotale: number // kg/giorno
  primipare: number // n. capi in prima lattazione
  lattazioneMedia: number | null
  grasso: number | null // media ponderata sul latte
  proteine: number | null
  cellule: number | null // media geometrica
  scs: number | null
  gravide: number // capi con giorni di gravidanza > 0
  extra: Record<string, number> // medie delle altre colonne numeriche
}

/** Media ponderata sul latte (come il latte di massa); se manca il latte, media semplice. */
function ponderata(animali: AnimaleDC[], k: 'grasso' | 'proteine') {
  const conLatte = animali.filter((a) => typeof a[k] === 'number' && typeof a.latte === 'number' && a.latte! > 0)
  if (conLatte.length) {
    const kg = conLatte.reduce((s, a) => s + a.latte!, 0)
    return conLatte.reduce((s, a) => s + a[k]! * a.latte!, 0) / kg
  }
  return media(animali.map((a) => a[k]))
}

export function riepilogo(animali: AnimaleDC[]): Riepilogo {
  const extraChiavi = [...new Set(animali.flatMap((a) => Object.keys(a.extra ?? {})))]
  const extra: Record<string, number> = {}
  for (const k of extraChiavi) {
    const v = animali.map((a) => a.extra?.[k]).filter((x): x is number => typeof x === 'number')
    if (v.length >= Math.max(1, animali.length * 0.3)) extra[k] = v.reduce((s, x) => s + x, 0) / v.length
  }
  return {
    capi: animali.length,
    dimMedio: media(animali.map((a) => a.dim)),
    latteMedio: media(animali.map((a) => a.latte)),
    latteTotale: animali.reduce((s, a) => s + (a.latte ?? 0), 0),
    primipare: animali.filter((a) => a.lattazione === 1).length,
    lattazioneMedia: media(animali.map((a) => a.lattazione)),
    grasso: ponderata(animali, 'grasso'),
    proteine: ponderata(animali, 'proteine'),
    cellule: mediaGeom(animali.map((a) => a.cellule)),
    scs: media(animali.map((a) => a.scs)),
    gravide: animali.filter((a) => (a.giorniGravidanza ?? 0) > 0).length,
    extra,
  }
}

/** Nomi leggibili delle colonne DairyComp più comuni (le altre restano con la sigla). */
const ETICHETTE: Record<string, string> = {
  MEDSE: 'Media settimanale (kg)',
  MATR: 'Matricola', ETA: 'Età (anni-mesi)', PPR: 'Parto previsto', DASPR: 'Asciutta prevista',
  SOML2: 'Somma L1P–L3P (kg)',
  L1P: 'L1P (kg)', L2P: 'L2P (kg)', L3P: 'L3P (kg)',
  AGE: 'Età (anni)',
}
export const etichettaColonna = (k: string) => ETICHETTE[norm(k)] ?? k

/** In lattazione: ha i giorni di lattazione o produce latte (alcune liste non hanno i DIM). */
export const inLattazione = (a: AnimaleDC) => a.dim !== null || (a.latte ?? 0) > 0

export const FASI = [
  { nome: 'Fresche', da: 0, a: 30 },
  { nome: 'Inizio', da: 31, a: 100 },
  { nome: 'Metà', da: 101, a: 200 },
  { nome: 'Fine', da: 201, a: Infinity },
]
export const faseDi = (dim: number | null) => (dim === null ? null : FASI.find((f) => dim >= f.da && dim <= f.a)?.nome ?? null)

export function perGruppo(animali: AnimaleDC[]) {
  const m = new Map<number | null, AnimaleDC[]>()
  for (const a of animali) m.set(a.gruppo, [...(m.get(a.gruppo) ?? []), a])
  return [...m.entries()].sort((a, b) => (a[0] ?? 9999) - (b[0] ?? 9999))
}

export const ultimoImport = (imp: ImportDC[]) => [...imp].sort((a, b) => b.data.localeCompare(a.data))[0]

/** Import più recente con data ≤ alla data indicata. */
export const importAllaData = (imp: ImportDC[], data: string) =>
  [...imp].filter((i) => i.data <= data).sort((a, b) => b.data.localeCompare(a.data))[0]
