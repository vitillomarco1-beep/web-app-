import type { AnimaleDC, Analisi, Capo, ImportDC, Consegna, Dati, Lavorazione, Mungitura, Scarico, Stalla, UscitaForme, VerificaSettimana } from './types'
import { aggiungiGiorni, isoGiorno, lunediDi, nuovoId } from './format'

// Generatore pseudo-casuale deterministico, così i dati dimostrativi sono stabili.
function rng(seme: number) {
  let s = seme
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const NOMI = [
  'Bella', 'Stella', 'Luna', 'Rosina', 'Margherita', 'Viola', 'Perla', 'Nuvola',
  'Gemma', 'Dalia', 'Fiorella', 'Bianca', 'Camilla', 'Giada', 'Olivia', 'Serena',
]
const RAZZE = ['Frisona Italiana', 'Frisona Italiana', 'Frisona Italiana', 'Bruna Italiana', 'Pezzata Rossa']

/** Dati di esempio relativi a "oggi", utili per provare il gestionale. */
export function datiDimostrativi(oggi = isoGiorno()): Dati {
  const r = rng(42)

  const capi: Capo[] = NOMI.map((nome, i) => {
    const stato: Capo['stato'] =
      i < 10 ? 'lattazione' : i < 12 ? 'asciutta' : i < 14 ? 'manza' : 'vitella'
    const etaGiorni =
      stato === 'vitella' ? 60 + Math.floor(r() * 200) : stato === 'manza' ? 420 + Math.floor(r() * 200) : 900 + Math.floor(r() * 1500)
    const parti = stato === 'lattazione' || stato === 'asciutta' ? 1 + Math.floor(r() * 4) : 0
    return {
      id: nuovoId(),
      matricola: `IT0${String(3400000000 + Math.floor(r() * 99999999)).slice(0, 12)}`,
      nome,
      razza: RAZZE[Math.floor(r() * RAZZE.length)],
      dataNascita: aggiungiGiorni(oggi, -etaGiorni),
      stato,
      numeroParti: parti,
      // le vacche in asciutta hanno partorito ~10-11 mesi fa (parto successivo imminente)
      ultimoParto: parti > 0 ? aggiungiGiorni(oggi, -(stato === 'asciutta' ? 305 + Math.floor(r() * 45) : 20 + Math.floor(r() * 260))) : undefined,
    }
  })

  // Mandria complessiva di esempio: ~48 capi in lattazione (l'anagrafica sopra è un estratto)
  const mungiture: Mungitura[] = []
  const consegne: Consegna[] = []
  const lavorazioni: Lavorazione[] = []
  let accumulato = 0
  for (let g = 100; g >= 1; g--) {
    const data = aggiungiGiorni(oggi, -g)
    const capiMunti = 46 + Math.floor(r() * 4)
    const perCapo = 29 + r() * 4
    const totale = capiMunti * perCapo
    const mattina = Math.round(totale * (0.52 + r() * 0.03))
    mungiture.push({ id: nuovoId(), data, turno: 'mattina', litri: mattina, capiMunti })
    mungiture.push({ id: nuovoId(), data, turno: 'sera', litri: Math.round(totale) - mattina, capiMunti })
    // Circa il 40% del latte viene trasformato in caciocavallo nel caseificio aziendale
    // (riposo un giorno a settimana); il resto viene conferito.
    let trasformato = 0
    if (g % 7 !== 0) {
      trasformato = Math.round((totale * (0.36 + r() * 0.08)) / 10) * 10
      const resa = 9.6 + r() * 1.0 // kg di formaggio fresco ogni 100 l
      const kg = Math.round(trasformato * resa) / 100
      const stagionatura = [30, 60, 90][g % 3]
      lavorazioni.push({
        id: nuovoId(),
        lotto: `CC-${data.replace(/-/g, '')}-1`,
        data,
        litriLatte: trasformato,
        formeProdotte: Math.round(kg / (1.9 + r() * 0.3)),
        pesoFrescoKg: kg,
        stagionaturaGiorni: stagionatura,
      })
    }
    accumulato += Math.round(totale) - trasformato
    // Ritiro del latte non trasformato ogni due giorni
    if (g % 2 === 1) {
      consegne.push({
        id: nuovoId(),
        data,
        acquirente: g % 6 === 1 ? 'Centro Latte Valle Verde' : 'Caseificio Sociale San Martino',
        litri: accumulato - Math.round(r() * 20),
        prezzoLitro: 0.55 + Math.round(r() * 4) / 100,
        documento: `DDT ${1000 + consegne.length}`,
      })
      accumulato = 0
    }
  }

  const analisi: Analisi[] = []
  for (let g = 102; g >= 1; g -= 7) {
    analisi.push({
      id: nuovoId(),
      data: aggiungiGiorni(oggi, -g),
      grasso: Math.round((3.7 + r() * 0.4) * 100) / 100,
      proteine: Math.round((3.3 + r() * 0.25) * 100) / 100,
      lattosio: Math.round((4.75 + r() * 0.2) * 100) / 100,
      cellule: Math.round(180 + r() * 170),
      caricaBatterica: Math.round(15 + r() * 55),
      inibenti: false,
      laboratorio: 'Laboratorio ARA',
    })
  }

  // Uscite dal magazzino per i lotti che hanno completato la stagionatura
  const CLIENTI = ['Vendita diretta in azienda', 'Alimentari Di Lorenzo', 'Ristorante Il Tratturo', 'Gastronomia Sannita']
  const uscite: UscitaForme[] = []
  for (const l of lavorazioni) {
    const pronto = aggiungiGiorni(l.data, l.stagionaturaGiorni)
    if (pronto > oggi) continue
    let rimaste = l.formeProdotte
    const pesoMedio = l.pesoFrescoKg / l.formeProdotte
    for (let k = 0; k < 2 && rimaste > 0; k++) {
      const giorniDisponibili = Math.max(0, Math.round((new Date(oggi).getTime() - new Date(pronto).getTime()) / 86_400_000))
      const data = aggiungiGiorni(pronto, Math.floor(r() * (giorniDisponibili + 1)))
      const forme = Math.min(rimaste, Math.max(1, Math.round(l.formeProdotte * (0.25 + r() * 0.3))))
      const calo = l.stagionaturaGiorni >= 90 ? 0.84 : l.stagionaturaGiorni >= 60 ? 0.87 : 0.9
      const scarto = r() < 0.05
      uscite.push({
        id: nuovoId(),
        lavorazioneId: l.id,
        data,
        tipo: scarto ? 'scarto' : 'vendita',
        forme: scarto ? 1 : forme,
        pesoKg: Math.round((scarto ? 1 : forme) * pesoMedio * calo * 10) / 10,
        cliente: scarto ? undefined : CLIENTI[Math.floor(r() * CLIENTI.length)],
        prezzoKg: scarto ? undefined : 13 + Math.round(r() * 8) / 2 + (l.stagionaturaGiorni >= 90 ? 2 : 0),
      })
      rimaste -= scarto ? 1 : forme
    }
  }

  // Alimentazione: 3 stalle, scarico del carro miscelatore mattina e sera
  const stalle: Stalla[] = [
    // tutte e tre le stalle ospitano vacche in lattazione
    { id: nuovoId(), numero: 1, nome: 'Lattazione', capi: 18, gruppoDairyComp: 1, robot: { marca: 'DeLaval', numero: 2, nomi: ['VMS1', 'VMS2'] } },
    { id: nuovoId(), numero: 2, nome: 'Lattazione', capi: 16, gruppoDairyComp: 21, robot: { marca: 'DeLaval', numero: 1 } },
    { id: nuovoId(), numero: 3, nome: 'Primipare', capi: 14, gruppoDairyComp: 4, robot: { marca: 'Lely', numero: 1 } },
  ]
  const kgCapo: Record<number, number> = { 1: 48, 2: 47, 3: 46 } // kg t.q./capo/giorno indicativi
  const scarichi: Scarico[] = []
  for (let g = 60; g >= 1; g--) {
    const data = aggiungiGiorni(oggi, -g)
    for (const s of stalle) {
      const giorno = s.capi * kgCapo[s.numero] * (0.96 + r() * 0.08)
      const quotaMattina = 0.55
      scarichi.push({ id: nuovoId(), data, turno: 'mattina', stalla: s.numero, kg: Math.round((giorno * quotaMattina) / 5) * 5 })
      scarichi.push({ id: nuovoId(), data, turno: 'sera', stalla: s.numero, kg: Math.round((giorno * (1 - quotaMattina)) / 5) * 5 })
    }
  }

  // Settimane complete già verificate, tranne l'ultima (da verificare)
  const verifiche: VerificaSettimana[] = []
  const lunCorrente = lunediDi(oggi)
  for (let w = 8; w >= 2; w--) {
    const lun = aggiungiGiorni(lunCorrente, -7 * w)
    const dom = aggiungiGiorni(lun, 6)
    const tot = scarichi.filter((s) => s.data >= lun && s.data <= dom).reduce((t, s) => t + s.kg, 0)
    if (tot === 0) continue
    verifiche.push({ id: nuovoId(), settimana: lun, verificataIl: aggiungiGiorni(dom, 1) + 'T09:00:00.000Z', verificataDa: 'admin', totaleKg: tot })
  }

  // DairyComp: esportazioni di esempio ogni 3 giorni. Gruppo 1 (2 robot DeLaval) e gruppo 21
  // (1 robot DeLaval) = pluripare, gruppo 4 (1 robot Lely) = sole primipare, gruppo 30 = asciutte.
  const curva = (dim: number, primipara: boolean) =>
    primipara ? 16 * dim ** 0.17 * Math.exp(-0.0025 * dim) : 20 * dim ** 0.2 * Math.exp(-0.004 * dim)
  const mandria: { id: string; gruppo: number; lact: number; dim0: number; liv: number; scc: number }[] = []
  let num = 1100
  const aggiungiVacche = (gruppo: number, n: number, lact: () => number, dim: () => number) => {
    for (let i = 0; i < n; i++) mandria.push({ id: String(num += 7), gruppo, lact: lact(), dim0: dim(), liv: 0.9 + r() * 0.2, scc: 60 + Math.round(r() * 250) })
  }
  aggiungiVacche(1, 18, () => 2 + Math.floor(r() * 4), () => 15 + Math.floor(r() * 150))
  aggiungiVacche(21, 16, () => 2 + Math.floor(r() * 3), () => 120 + Math.floor(r() * 200))
  aggiungiVacche(4, 14, () => 1, () => 10 + Math.floor(r() * 220))
  aggiungiVacche(30, 6, () => 2 + Math.floor(r() * 3), () => 0)
  const importDC: ImportDC[] = []
  for (let g = 30; g >= 1; g -= 3) {
    const data = aggiungiGiorni(oggi, -g)
    const animali: AnimaleDC[] = mandria.map((v) => {
      const asciutta = v.gruppo === 30
      const dim = asciutta ? null : v.dim0 + (30 - g)
      const latte = asciutta || dim === null ? null : Math.round(curva(dim, v.lact === 1) * v.liv * (0.95 + r() * 0.1) * 10) / 10
      return {
        id: v.id, gruppo: v.gruppo, lattazione: v.lact, dim, latte,
        grasso: asciutta ? null : Math.round((3.5 + (dim ?? 0) / 400 + r() * 0.3) * 100) / 100,
        proteine: asciutta ? null : Math.round((3.15 + (dim ?? 0) / 600 + r() * 0.2) * 100) / 100,
        cellule: asciutta ? null : Math.round(v.scc * (0.8 + r() * 0.4)),
        codiceRiproduttivo: asciutta ? '7' : dim !== null && dim > 120 ? '5' : '3',
        giorniGravidanza: asciutta ? 230 + Math.floor(r() * 40) : dim !== null && dim > 120 ? Math.max(0, dim - 110) : 0,
        extra: {},
      }
    })
    importDC.push({ id: nuovoId(), data, importatoIl: data + 'T08:00:00.000Z', nomeFile: `dairycomp-${data}.csv (esempio)`, animali })
  }

  return {
    robotGiorni: [], robotVacche: [], importRobot: [], mandriaDC: [], nomiGruppi: [], casi: [], parametri: [],
    importDC,
    stalle,
    scarichi,
    verifiche,
    capi,
    mungiture,
    analisi,
    consegne,
    lavorazioni,
    uscite,
    messaggi: [
      {
        id: nuovoId(),
        data: new Date().toISOString(),
        nome: 'Giulia Rossi',
        email: 'giulia.rossi@example.com',
        oggetto: 'Visita didattica',
        testo: 'Buongiorno, sarebbe possibile organizzare una visita in stalla per una classe di scuola primaria?',
        letto: false,
      },
    ],
  }
}

export const DATI_VUOTI: Dati = { capi: [], mungiture: [], analisi: [], consegne: [], lavorazioni: [], uscite: [], stalle: [], scarichi: [], verifiche: [], importDC: [], mandriaDC: [], nomiGruppi: [], casi: [], parametri: [], robotGiorni: [], robotVacche: [], importRobot: [], messaggi: [] }
