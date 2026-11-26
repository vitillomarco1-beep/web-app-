// Dati inventati per la versione dimostrativa: una stalla da latte di circa 120 vacche in lattazione,
// con robot di mungitura oppure con sala di mungitura. Tutto è calcolato rispetto a oggi, così le liste
// di lavoro (vaccini, asciutte, fertilità, sincronizzazioni) sono sempre piene e credibili.
import type {
  AnimaleDC, Analisi, CasoClinico, Consegna, ControlloApa, Dati, Farmaco, GiornoRobot, GiornoVaccaRobot, ImportDC, Ingrediente,
  Mungitura, NotaVeloce, Razione, Scarico, Stalla, Vaccinazione,
} from './types'
import { DATI_VUOTI } from './seed'
import { aggiungiGiorni, giorniTra, isoGiorno, lunediDi } from './format'
import { aggiornaFoto, fotoDaLista } from './diagnosi'
import { calcolaFertilita, riassuntoStorico } from './fertilita'
import { partiDaMandria, type Sincronizzazione, type Evento } from './registro'
import { CRYPTIUM_60, LENZELTA_1, VACCINI_PREPARTO, aGiorniDalParto, idVaccinazione, partiPrevisti } from './parti'
import type { Scenario } from './demo'
import { VACCINI_VITELLI, finestra, idVacVitello } from './vitelli'

function rng(seme: number) {
  let s = seme
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
}

const TORI = ['ALBATROS', 'BRENNERO', 'CORSARO', 'DIAMANTE', 'ETNA', 'FALCO', 'GRANITO', 'LEVANTE']
const TORI_SESSATI = ['ALBATROS.S', 'DIAMANTE.S', 'LEVANTE.S']
// gruppi: 1 lattazione pluripare, 2 primipare, 22 asciutte, 23 close up, 8 vitelle, 9 manze da fecondare, 10 manze gravide
const G = { pluri: 1, primi: 2, asciutte: 22, closeUp: 23, vitelle: 8, manze: 9, manzeGravide: 10 }

interface V { id: string; matr: string; lact: number; dim: number; cod: string; nfec: number; guca: number; toro: string; gruppo: number; vita: number; liv: number; scc: number }

/** Curva di lattazione (Wood), kg al giorno. */
const curva = (dim: number, primipara: boolean) => {
  const d = Math.max(1, dim)
  return primipara ? 15.5 * d ** 0.2 * Math.exp(-0.0019 * d) : 21 * d ** 0.21 * Math.exp(-0.0031 * d)
}

export function datiDemo(scenario: Scenario, oggi = isoGiorno()): Dati {
  const r = rng(scenario === 'robot' ? 7 : 11)
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const scegli = <T,>(x: T[]) => x[Math.floor(r() * x.length)]
  const L = lunediDi(oggi) // data della lista Mandria: il lunedì delle diagnosi
  let numero = 100
  const nuovoNumero = () => String(numero += int(1, 3))
  const matr = (id: string) => `IT0999${String(4400000 + Number(id) * 7).padStart(8, '0')}`
  const sccBase = () => { const x = r(); return x < 0.68 ? int(20, 140) : x < 0.9 ? int(160, 420) : x < 0.97 ? int(450, 900) : int(1100, 2600) }

  const mandria: V[] = []
  // ---- vacche in lattazione
  for (let k = 0; k < 120; k++) {
    const x = r()
    const lact = x < 0.37 ? 1 : x < 0.65 ? 2 : x < 0.85 ? 3 : int(4, 6)
    const dim = Math.min(430, Math.floor(r() ** 1.15 * 400) + 2)
    const id = nuovoNumero()
    let cod = 'PARTO', nfec = 0, guca = 0
    if (dim > 60) {
      const y = r()
      if (dim <= 95) { if (y < 0.55) { cod = 'FEC'; nfec = 1; guca = int(1, Math.min(34, dim - 58)) } else cod = 'OK/VUOT' }
      else if (y < 0.56) { cod = 'GRAV'; nfec = int(1, 3); guca = int(35, Math.max(36, Math.min(210, dim - 62))) }
      else if (y < 0.78) { cod = 'FEC'; nfec = int(1, 4); guca = int(1, 34) }
      else if (y < 0.92 || dim < 200) { cod = 'OK/VUOT'; nfec = int(0, 3); guca = nfec ? int(22, 70) : 0 }
      else { cod = 'NO FEC'; nfec = int(3, 6); guca = int(40, 120) }
    }
    mandria.push({ id, matr: matr(id), lact, dim, cod, nfec, guca, toro: nfec ? scegli(TORI) : '', gruppo: lact === 1 ? G.primi : G.pluri, vita: 690 + lact * 395 + dim + int(0, 60), liv: 0.85 + r() * 0.3, scc: sccBase() })
  }
  // ---- asciutte e close up (gravide da 220 a 278 giorni)
  for (let k = 0; k < 22; k++) {
    const id = nuovoNumero(), lact = int(1, 5), guca = int(222, 278)
    mandria.push({ id, matr: matr(id), lact, dim: guca + int(60, 110), cod: 'ASC', nfec: int(1, 3), guca, toro: scegli(TORI), gruppo: guca >= 255 ? G.closeUp : G.asciutte, vita: 690 + lact * 395 + guca + 80, liv: 1, scc: sccBase() })
  }
  // ---- manze e vitelle (numeri a parte, come spesso in azienda)
  numero = 500
  for (let k = 0; k < 20; k++) { const id = nuovoNumero(), guca = int(30, 275); mandria.push({ id, matr: matr(id), lact: 0, dim: 0, cod: 'GRAV', nfec: int(1, 2), guca, toro: scegli(TORI_SESSATI), gruppo: guca >= 255 ? G.closeUp : G.manzeGravide, vita: 410 + guca + int(0, 50), liv: 1, scc: 0 }) }
  for (let k = 0; k < 16; k++) { const id = nuovoNumero(), vita = int(370, 470), fec = r() < 0.55; mandria.push({ id, matr: matr(id), lact: 0, dim: 0, cod: fec ? 'FEC' : 'MANZA', nfec: fec ? int(1, 2) : 0, guca: fec ? int(2, 34) : 0, toro: fec ? scegli(TORI_SESSATI) : '', gruppo: G.manze, vita, liv: 1, scc: 0 }) }
  for (let k = 0; k < 34; k++) { const id = nuovoNumero(), vita = k < 14 ? int(1, 90) : int(91, 360); mandria.push({ id, matr: matr(id), lact: 0, dim: 0, cod: 'MANZA', nfec: 0, guca: 0, toro: '', gruppo: G.vitelle, vita, liv: 1, scc: 0 }) }

  const animale = (v: V, data: string, latte?: number | null): AnimaleDC => ({
    id: v.id, gruppo: v.gruppo, lattazione: v.lact, dim: v.lact ? v.dim : 0, latte: latte ?? null, grasso: null, proteine: null, cellule: null, scs: null,
    codiceRiproduttivo: v.cod, giorniGravidanza: null, dataPartoPrevista: null, giorniVita: v.vita, dataNascita: null,
    extra: { MATR: v.matr, NFEC: v.nfec, GUCA: v.guca, UTOR: v.toro || '-' },
  })
  const kgDi = (v: V, dim: number) => (v.lact >= 1 && dim >= 0 && v.cod !== 'ASC' ? Math.round(curva(dim, v.lact === 1) * v.liv * 10) / 10 : null)

  // ---- com'era la mandria `d` giorni fa (per le liste dei lunedì precedenti)
  const passato = (v: V, d: number): V | null => {
    if (v.vita - d < 0) return null
    const p: V = { ...v, vita: v.vita - d }
    if (v.lact >= 1 && v.cod !== 'ASC') {
      p.dim = v.dim - d
      if (p.dim < 0) { // non aveva ancora partorito: era in close up
        return { ...p, lact: v.lact - 1, dim: 300 + int(0, 60), cod: v.lact - 1 ? 'ASC' : 'GRAV', nfec: 1, guca: 280 + p.dim, gruppo: G.closeUp }
      }
    }
    const gucaPrima = v.guca - d
    if (v.cod === 'GRAV' || v.cod === 'ASC') {
      if (v.cod === 'ASC' && gucaPrima < 220 && v.lact >= 1) { p.cod = 'GRAV'; p.gruppo = v.lact === 1 ? G.primi : G.pluri; p.dim = v.dim - d }
      if (gucaPrima < 0) { p.nfec = v.nfec - 1; p.cod = p.nfec > 0 ? 'FEC' : p.dim <= 60 && v.lact ? 'PARTO' : v.lact ? 'OK/VUOT' : 'MANZA'; p.guca = p.nfec > 0 ? Math.max(1, gucaPrima + 21) : 0 }
      else { p.guca = gucaPrima; if (gucaPrima < 35) p.cod = 'FEC' }
    } else if (v.cod === 'FEC') {
      if (gucaPrima < 0) { p.nfec = v.nfec - 1; p.guca = p.nfec > 0 ? Math.max(1, gucaPrima + 22) : 0; p.cod = p.nfec > 0 ? 'FEC' : v.lact ? (p.dim <= 60 ? 'PARTO' : 'OK/VUOT') : 'MANZA' }
      else p.guca = gucaPrima
    } else if (v.cod === 'OK/VUOT' && v.nfec > 0) {
      if (gucaPrima >= 0 && gucaPrima < 35) { p.cod = 'FEC'; p.guca = gucaPrima } else p.guca = Math.max(0, gucaPrima)
    } else if (v.cod === 'NO FEC') { p.cod = 'OK/VUOT'; p.guca = Math.max(0, gucaPrima) }
    else p.guca = Math.max(0, gucaPrima)
    return p
  }
  const listaAl = (data: string, conLatte: boolean): ImportDC => {
    const d = giorniTra(data, L)
    const animali = mandria.map((v) => passato(v, d)).filter((v): v is V => v !== null).map((v) => animale(v, data, conLatte ? kgDi(v, v.dim) : null))
    return { id: `demo-${data}`, data, importatoIl: `${data}T08:00:00.000Z`, nomeFile: 'Lista Mandria (dati inventati)', animali }
  }

  const listaOggi = listaAl(L, false)
  // liste dei lunedì: foto per le diagnosi e storico degli indici di fertilità
  let fotoRipro = [] as Dati['fotoRipro']
  const storicoFertilita: Dati['storicoFertilita'] = []
  for (let w = 10; w >= 0; w--) {
    const l = listaAl(aggiungiGiorni(L, -7 * w), false)
    if (w <= 6) fotoRipro = aggiornaFoto(fotoRipro, fotoDaLista(l))
    storicoFertilita.push(riassuntoStorico(calcolaFertilita(l)))
  }
  // liste del latte per vacca (come le esporta il gestionale della sala o di DairyComp), ogni lunedì
  const importDC: ImportDC[] = []
  for (let w = 7; w >= 0; w--) {
    const data = aggiungiGiorni(L, -7 * w)
    const l = listaAl(data, true)
    importDC.push({ ...l, id: `latte-${data}`, nomeFile: 'Produzioni per vacca (dati inventati)', animali: l.animali.map((a) => ({ ...a, latte: a.latte === null ? null : Math.round(a.latte * (0.95 + r() * 0.1) * 10) / 10 })) })
  }

  const lattanti = (g: number) => mandria.filter((v) => v.gruppo === g && v.lact >= 1 && v.cod !== 'ASC')
  const stalle: Stalla[] = [
    { id: 'st1', numero: 1, nome: 'Stalla 1 · pluripare', capi: lattanti(G.pluri).length, gruppoDairyComp: G.pluri, ...(scenario === 'robot' ? { robot: { marca: 'DeLaval', numero: 2, nomi: ['VMS1', 'VMS2'] } } : {}) },
    { id: 'st2', numero: 2, nome: 'Stalla 2 · primipare', capi: lattanti(G.primi).length, gruppoDairyComp: G.primi, ...(scenario === 'robot' ? { robot: { marca: 'Lely', numero: 1, nomi: ['Lely1'] } } : {}) },
  ]

  // ---- robot: ultimi 21 giorni completi
  const robotGiorni: GiornoRobot[] = [], robotVacche: GiornoVaccaRobot[] = []
  if (scenario === 'robot') {
    const malate = new Set(lattanti(G.pluri).filter((v) => v.scc > 1000).slice(0, 2).map((v) => v.id))
    for (let d = 21; d >= 1; d--) {
      const data = aggiungiGiorni(oggi, -d)
      const perRobot = new Map<string, GiornoVaccaRobot[]>()
      for (const v of mandria) {
        const dimG = v.dim - d
        if (v.lact < 1 || v.cod === 'ASC' || dimG < 0) continue
        const robot = v.gruppo === G.primi ? 'Lely1' : Number(v.id) % 2 ? 'VMS1' : 'VMS2'
        const calo = malate.has(v.id) && d <= 3 ? 0.72 : 1
        const kg = Math.round((kgDi(v, dimG) ?? 0) * (0.93 + r() * 0.14) * calo * 10) / 10
        const mung = dimG < 30 ? int(3, 4) : kg > 38 ? int(3, 4) : int(2, 3)
        const riga: GiornoVaccaRobot = {
          id: `${data}|${v.id}`, data, vacca: v.id, robot, mungiture: mung, rifiutate: r() < 0.25 ? int(1, 3) : 0, kg,
          kgSeparato: dimG < 5 || (malate.has(v.id) && d <= 3) ? Math.round(kg * 0.9 * 10) / 10 : 0,
          allarmiAmd: malate.has(v.id) && d <= 3 ? 2 : r() < 0.02 ? 1 : 0, kickOff: r() < 0.04 ? 1 : 0, incomplete: r() < 0.05 ? 1 : 0,
          sangueMax: malate.has(v.id) && d <= 3 ? int(600, 1400) : null, oraUltima: `${String(int(18, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`, dim: dimG,
        }
        robotVacche.push(riga)
        perRobot.set(robot, [...(perRobot.get(robot) ?? []), riga])
      }
      for (const [robot, righe] of perRobot) {
        const somma = (k: keyof GiornoVaccaRobot) => righe.reduce((t, x) => t + (Number(x[k]) || 0), 0)
        const pausa = int(18, 55)
        robotGiorni.push({
          id: `${data}|${robot}`, data, robot, completo: true, oraUltima: `23:${String(int(30, 59))}`, vacche: righe.length, mungiture: somma('mungiture'), rifiutate: somma('rifiutate'),
          nonMunte: r() < 0.3 ? int(1, 2) : 0, kg: Math.round(somma('kg')), durataSec: somma('mungiture') * int(380, 460), kickOff: somma('kickOff'), incomplete: somma('incomplete'),
          capezzoliNonTrovati: int(0, 3), allarmiAmd: somma('allarmiAmd'), kgSeparato: Math.round(somma('kgSeparato')), pausaMaxMin: pausa, pausaDalle: `${String(int(1, 5)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`,
        })
      }
    }
  }

  // ---- alimentazione
  const ing = (id: string, nome: string, prezzoQ: number, ss: number): Ingrediente => ({ id, nome, prezzoQ, fonte: 'fornitore', aggiornatoIl: aggiungiGiorni(oggi, -12), analisi: { ss } })
  const ingredienti: Ingrediente[] = [
    ing('silomais', 'Silomais', 5.2, 34), ing('medica', 'Fieno di erba medica', 19, 88), ing('polifita', 'Fieno polifita', 15, 87), ing('paglia', 'Paglia', 9, 89),
    ing('mais', 'Farina di mais', 26.5, 87), ing('soia', 'Farina di estrazione di soia 48', 44, 88), ing('polpe', 'Polpe di bietola', 27, 89),
    ing('mangime', 'Mangime lattazione', 38, 88), ing('nucleo', 'Nucleo vitaminico-minerale', 95, 95), ing('robot', 'Mangime per robot', 40, 88),
  ]
  const voci = (x: [string, number][]) => x.map(([ingredienteId, kgCapo]) => ({ ingredienteId, kgCapo }))
  const robotSi = scenario === 'robot'
  const razioni: Razione[] = [
    { id: 'r1', nome: 'Lattazione pluripare', categoria: 'lattazione', gruppi: [G.pluri], voci: voci([['silomais', 31], ['medica', 4], ['paglia', 0.6], ['mais', robotSi ? 4.2 : 5.5], ['soia', 2.8], ['polpe', 1.5], ['mangime', robotSi ? 2.5 : 4.5], ['nucleo', 0.25]]), ...(robotSi ? { robot: { ingredienteId: 'robot', kgCapo: 4.5 } } : {}) },
    { id: 'r2', nome: 'Lattazione primipare', categoria: 'lattazione', gruppi: [G.primi], voci: voci([['silomais', 28], ['medica', 3.5], ['paglia', 0.8], ['mais', robotSi ? 3.6 : 4.8], ['soia', 2.5], ['polpe', 1.2], ['mangime', robotSi ? 2 : 3.6], ['nucleo', 0.22]]), ...(robotSi ? { robot: { ingredienteId: 'robot', kgCapo: 3.5 } } : {}) },
    { id: 'r3', nome: 'Asciutte', categoria: 'asciutta', gruppi: [G.asciutte], voci: voci([['silomais', 8], ['polifita', 5.5], ['paglia', 4.5], ['soia', 0.5], ['nucleo', 0.2]]) },
    { id: 'r4', nome: 'Close up', categoria: 'closeup', gruppi: [G.closeUp], voci: voci([['silomais', 12], ['polifita', 3], ['paglia', 3], ['mais', 1.5], ['soia', 1.2], ['nucleo', 0.3]]) },
    { id: 'r5', nome: 'Manze', categoria: 'manze', gruppi: [G.manze, G.manzeGravide], voci: voci([['silomais', 12], ['polifita', 4], ['paglia', 1.5], ['soia', 0.6], ['nucleo', 0.1]]) },
  ]
  const scarichi: Scarico[] = []
  for (let d = 21; d >= 1; d--) {
    const data = aggiungiGiorni(oggi, -d)
    for (const s of stalle) {
      const kgCapo = s.numero === 1 ? 46.65 : 42.6
      for (const turno of ['mattina', 'sera'] as const) scarichi.push({ id: `${data}|${s.numero}|${turno}`, data, turno, stalla: s.numero, kg: Math.round((s.capi * kgCapo * (turno === 'mattina' ? 0.55 : 0.45) * (0.97 + r() * 0.06)) / 10) * 10 })
    }
  }
  const analisiPmr = stalle.map((s) => ({ id: `pmr${s.numero}`, data: aggiungiGiorni(oggi, -9), stalla: s.numero, ss: s.numero === 1 ? 45.2 : 44.1, pg: 15.8, ndf: 31.5, adf: 20.4, amido: 25.6, grassi: 3.5, ceneri: 7.4, ufl: 0.96, laboratorio: 'Laboratorio analisi (esempio)' }))

  // ---- latte di massa, consegne e qualità
  const latteGiorno = (d: number) => mandria.reduce((t, v) => t + (kgDi(v, v.dim - d) ?? 0), 0)
  const mungiture: Mungitura[] = [], consegne: Consegna[] = [], analisi: Analisi[] = []
  for (let d = 60; d >= 1; d--) {
    const data = aggiungiGiorni(oggi, -d)
    const litri = latteGiorno(d) * (0.97 + r() * 0.05) / 1.03
    const capi = mandria.filter((v) => v.lact >= 1 && v.cod !== 'ASC' && v.dim - d >= 0).length
    const mattina = Math.round(litri * 0.53)
    mungiture.push({ id: `m${data}`, data, turno: 'mattina', litri: mattina, capiMunti: capi }, { id: `s${data}`, data, turno: 'sera', litri: Math.round(litri) - mattina, capiMunti: capi })
    if (d % 2 === 0) consegne.push({ id: `c${data}`, data, acquirente: 'Caseificio sociale (esempio)', litri: Math.round(litri * 2 / 10) * 10, prezzoLitro: 0.56, documento: `DDT ${1000 + d}` })
    if (d % 7 === 3) analisi.push({ id: `a${data}`, data, grasso: Math.round((3.72 + r() * 0.2) * 100) / 100, proteine: Math.round((3.38 + r() * 0.12) * 100) / 100, lattosio: Math.round((4.82 + r() * 0.1) * 100) / 100, cellule: int(170, 260), caricaBatterica: int(12, 38), inibenti: false, laboratorio: 'Laboratorio latte (esempio)' })
  }

  // ---- controlli funzionali APA (due, a circa un mese di distanza)
  const controlliApa: ControlloApa[] = [40, 9].map((d, n) => {
    const data = aggiungiGiorni(oggi, -d)
    const vacche: ControlloApa['vacche'] = {}
    for (const v of mandria) {
      const dimC = v.dim - d
      if (v.lact < 1 || v.cod === 'ASC' || dimC < 6) continue
      const kg = Math.round((kgDi(v, dimC) ?? 0) * (0.94 + r() * 0.12) * 10) / 10
      const grasso = Math.round((3.25 + dimC / 600 + (r() - 0.45) * 0.7) * 100) / 100
      const proteine = Math.round((3.05 + dimC / 900 + r() * 0.35) * 100) / 100
      const cellule = Math.max(8, Math.round(v.scc * (n ? 0.75 + r() * 0.6 : 0.8 + r() * 0.5)))
      const lattosio = Math.round((5.0 - Math.min(0.5, cellule / 2500) - r() * 0.15) * 100) / 100
      vacche[v.matr] = [kg, grasso, proteine, cellule, lattosio, Math.round((24 + r() * 12 + (v.lact === 1 && n ? 3 : 0)) * 10) / 10, Math.round((proteine * 0.77) * 100) / 100]
    }
    return { id: data, data, nomeFile: 'Controllo APA (dati inventati)', importatoIl: `${data}T10:00:00.000Z`, vacche }
  })

  // ---- salute e farmaci
  const farmaci: Farmaco[] = [
    { id: 'f1', nome: 'Bovilis Rotavec Corona', unita: 'ml', unitaPerConfezione: 10, prezzoConfezione: 48, giacenza: 30, scortaMinima: 10, note: 'Vaccino pre-parto, 2 ml a capo' },
    { id: 'f2', nome: 'Bovilis Cryptium', unita: 'ml', unitaPerConfezione: 40, prezzoConfezione: 210, giacenza: 56, scortaMinima: 20, note: 'Vaccino pre-parto, 2 ml a capo' },
    { id: 'f3', nome: 'Lenzelta', unita: 'ml', unitaPerConfezione: 10, prezzoConfezione: 62, giacenza: 40, scortaMinima: 10, note: 'Vaccino mastite, 2 ml intramuscolo' },
    { id: 'f4', nome: 'Bovalto Respi Intranasal', unita: 'ml', unitaPerConfezione: 10, prezzoConfezione: 55, giacenza: 18 },
    { id: 'f5', nome: 'Bovalto Respi 4', unita: 'ml', unitaPerConfezione: 20, prezzoConfezione: 60, giacenza: 26 },
    { id: 'f6', nome: 'Intramammario lattazione (cefalosporina)', unita: 'tubetto', unitaPerConfezione: 24, prezzoConfezione: 96, giacenza: 30, scortaMinima: 24, sospensioneLatte: 4 },
    { id: 'f7', nome: 'Sigillante per asciutta', unita: 'tubetto', unitaPerConfezione: 60, prezzoConfezione: 120, giacenza: 44 },
    { id: 'f8', nome: 'Prostaglandina (PGF)', unita: 'ml', unitaPerConfezione: 20, prezzoConfezione: 38, giacenza: 34, scortaMinima: 10 },
    { id: 'f9', nome: 'GnRH', unita: 'ml', unitaPerConfezione: 50, prezzoConfezione: 45, giacenza: 9, scortaMinima: 20 },
    { id: 'f10', nome: 'Spirale al progesterone', unita: 'dose', unitaPerConfezione: 10, prezzoConfezione: 95, giacenza: 7 },
    { id: 'f11', nome: 'Antinfiammatorio (meloxicam)', unita: 'ml', unitaPerConfezione: 100, prezzoConfezione: 42, giacenza: 120, sospensioneLatte: 5 },
    { id: 'f12', nome: 'Bolo di calcio', unita: 'dose', unitaPerConfezione: 48, prezzoConfezione: 110, giacenza: 30 },
  ]
  const fresche = mandria.filter((v) => v.lact >= 1 && v.dim < 40 && v.cod === 'PARTO')
  const alteCell = mandria.filter((v) => v.lact >= 1 && v.scc > 600 && v.cod !== 'ASC')
  const caso = (id: string, v: V, patologia: string, giorni: number, durata: number | null, trattamento: string, f: [string, number][], quarti?: string[]): CasoClinico => ({
    id, vacca: v.id, patologia, dataInizio: aggiungiGiorni(oggi, -giorni), ...(durata !== null ? { dataFine: aggiungiGiorni(oggi, -giorni + durata) } : {}),
    severita: giorni < 5 ? 'moderata' : 'lieve', trattamento, ...(quarti ? { quarti } : {}),
    farmaci: f.map(([farmacoId, quantita]) => ({ farmacoId, quantita, costoUnitario: (() => { const x = farmaci.find((y) => y.id === farmacoId)!; return x.prezzoConfezione / x.unitaPerConfezione })() })),
  })
  const casi: CasoClinico[] = [
    caso('c1', alteCell[0], 'mastite', 2, null, 'Intramammario 3 giorni + antinfiammatorio', [['f6', 2], ['f11', 15]], ['PD']),
    caso('c2', alteCell[1], 'mastite', 16, 6, 'Intramammario 3 giorni', [['f6', 3]], ['AS']),
    caso('c3', fresche[0], 'placenta', fresche[0].dim, 5, 'Controllo veterinario, antinfiammatorio', [['f11', 20]]),
    caso('c4', fresche[1], 'chetosi', Math.max(1, fresche[1].dim - 6), null, 'Glicole propilenico per 4 giorni', []),
    caso('c5', fresche[2], 'ipocalcemia', fresche[2].dim, 1, 'Bolo di calcio', [['f12', 2]]),
    caso('c6', mandria[30], 'zoppia', 9, null, 'Pareggio, bendaggio unghione posteriore destro', [['f11', 15]]),
    caso('c7', mandria[44], 'metrite', 28, 10, 'Trattamento uterino', []),
    caso('c8', alteCell[2] ?? mandria[50], 'mastite', 33, 7, 'Intramammario 3 giorni', [['f6', 3]], ['PS']),
  ]

  // ---- vaccini già fatti: liste delle settimane scorse
  const listaParti = partiDaMandria(listaOggi)
  const parti = partiPrevisti(listaParti, oggi)
  const vaccinazioni: Vaccinazione[] = []
  for (const sp of [-3, -2, -1]) {
    const t = aggiungiGiorni(lunediDi(oggi), 1 + 7 * sp)
    for (const { p } of aGiorniDalParto(parti, 51, 57, oggi, sp).animali) if (r() < 0.95) vaccinazioni.push({ id: idVaccinazione(p, LENZELTA_1.id), vacca: p.vacca, dataParto: p.dataParto, vaccino: LENZELTA_1.id, fattaIl: t })
    for (const { p } of aGiorniDalParto(parti, 58, 65, oggi, sp).animali) vaccinazioni.push({ id: idVaccinazione(p, CRYPTIUM_60.id), vacca: p.vacca, dataParto: p.dataParto, vaccino: CRYPTIUM_60.id, fattaIl: t })
    for (const { p } of aGiorniDalParto(parti, 33, 39, oggi, sp).animali) for (const v of VACCINI_PREPARTO) vaccinazioni.push({ id: idVaccinazione(p, v.id), vacca: p.vacca, dataParto: p.dataParto, vaccino: v.id, fattaIl: t })
  }

  // ---- vaccini dei vitelli già fatti (finestre passate)
  const vaccinazioniVitelli: Dati['vaccinazioniVitelli'] = []
  for (const v of mandria.filter((x) => x.gruppo === G.vitelle && x.vita <= 120)) {
    for (const vac of VACCINI_VITELLI) {
      const w = finestra(vac)
      const giorniDaFinestra = v.vita + giorniTra(L, oggi) - w.a // giorni da quando la finestra è finita
      if (giorniDaFinestra > 0 && r() < 0.94) vaccinazioniVitelli.push({ id: idVacVitello(v.id, vac.id), vitello: v.id, vaccino: vac.id, fattaIl: aggiungiGiorni(oggi, -giorniDaFinestra), eta: vac.obiettivo })
    }
  }

  // ---- sincronizzazioni in corso (vacche vuote oltre i 70 giorni)
  const vuote = mandria.filter((v) => v.cod === 'OK/VUOT' && v.dim > 70)
  // i passi già passati risultano fatti: oggi c'è qualcosa da fare, altre vacche hanno il passo nei prossimi giorni
  const sinc = (v: V | undefined, protocollo: string, giorniFa: number, fatti: string[]): Sincronizzazione[] => (v ? [{ id: `s${v.id}`, vacca: v.id, protocollo, inizio: aggiungiGiorni(oggi, -giorniFa), fatti }] : [])
  const sincronizzazioni: Sincronizzazione[] = [
    ...sinc(vuote[0], 'ovsynch', 7, ['g1']), ...sinc(vuote[1], 'ovsynch', 9, ['g1', 'p']), ...sinc(vuote[2], 'ovsynch', 2, ['g1']),
    ...sinc(vuote[3], 'spirale', 7, ['g1']), ...sinc(vuote[4], 'spirale', 3, ['g1']), ...sinc(vuote[5], 'presynch', 14, ['p1']),
  ]
  const eventi: Evento[] = [
    ...fresche.slice(0, 6).map((v, i) => ({ id: `e-p${i}`, data: aggiungiGiorni(L, -v.dim), tipo: 'parto' as const, vacca: v.id, testo: `${v.lact}ª lattazione, ${i % 3 ? 'facile' : 'aiutato'}` })),
    ...mandria.filter((v) => v.cod === 'FEC' && v.guca <= 10).slice(0, 6).map((v, i) => ({ id: `e-f${i}`, data: aggiungiGiorni(L, -v.guca), tipo: 'fecondazione' as const, vacca: v.id, testo: `${v.nfec}ª fecondazione, toro ${v.toro}` })),
  ].sort((a, b) => b.data.localeCompare(a.data))

  const nota = (id: string, giorni: number, testo: string, categoria: string, vacca?: string): NotaVeloce => ({ id, testo, creataIl: `${aggiungiGiorni(oggi, -giorni)}T07:${String(10 + giorni).padStart(2, '0')}:00.000Z`, categoria, ...(vacca ? { vacca } : {}) })
  const note: NotaVeloce[] = [
    nota('n1', 0, `Vacca ${mandria[30].id} zoppica posteriore destro`, 'salute', mandria[30].id),
    nota('n2', 1, 'Ordinare GnRH, ne restano poche dosi', 'farmaci'),
    nota('n3', 2, 'Abbeveratoio stalla 2 da pulire', 'altro'),
    nota('n4', 3, `Calore visto sulla ${vuote[6]?.id ?? mandria[60].id}, da fecondare`, 'riproduzione', vuote[6]?.id),
  ]

  return {
    ...DATI_VUOTI,
    stalle, mandriaDC: [listaOggi], partiDC: [listaParti], importDC, fotoRipro, storicoFertilita, controlliApa,
    robotGiorni, robotVacche, importRobot: scenario === 'robot' ? [{ id: 'ir1', fonte: 'DeLaval e Lely', nomeFile: 'Esportazioni robot (dati inventati)', importatoIl: `${aggiungiGiorni(oggi, -1)}T09:00:00.000Z`, dal: aggiungiGiorni(oggi, -21), al: aggiungiGiorni(oggi, -1) }] : [],
    ingredienti, razioni, scarichi, analisiPmr, mungiture, consegne, analisi, farmaci, casi, vaccinazioni, vaccinazioniVitelli, sincronizzazioni, eventi, note,
    nomiGruppi: [
      { id: String(G.pluri), nome: 'Lattazione pluripare' }, { id: String(G.primi), nome: 'Lattazione primipare' }, { id: String(G.asciutte), nome: 'Asciutte' },
      { id: String(G.closeUp), nome: 'Close up · sala parto' }, { id: String(G.vitelle), nome: 'Vitelle e manzette' }, { id: String(G.manze), nome: 'Manze da fecondare' }, { id: String(G.manzeGravide), nome: 'Manze gravide' },
    ],
    parametri: [{ id: 'prezzoLatte', valore: 0.56 }],
  }
}
