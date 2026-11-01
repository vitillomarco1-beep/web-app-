import type { Analisi, Capo, Consegna, Dati, Mungitura } from './types'
import { aggiungiGiorni, isoGiorno, nuovoId } from './format'

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
  let accumulato = 0
  for (let g = 44; g >= 1; g--) {
    const data = aggiungiGiorni(oggi, -g)
    const capiMunti = 46 + Math.floor(r() * 4)
    const perCapo = 29 + r() * 4
    const totale = capiMunti * perCapo
    const mattina = Math.round(totale * (0.52 + r() * 0.03))
    mungiture.push({ id: nuovoId(), data, turno: 'mattina', litri: mattina, capiMunti })
    mungiture.push({ id: nuovoId(), data, turno: 'sera', litri: Math.round(totale) - mattina, capiMunti })
    accumulato += Math.round(totale)
    // Ritiro ogni due giorni da parte del caseificio
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
  for (let g = 88; g >= 1; g -= 7) {
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

  return {
    capi,
    mungiture,
    analisi,
    consegne,
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

export const DATI_VUOTI: Dati = { capi: [], mungiture: [], analisi: [], consegne: [], messaggi: [] }
