/**
 * Potenziale di riduzione e costo indicativo (MAC, marginal abatement cost) di
 * alcune pratiche di mitigazione del metano zootecnico — applicato al metano
 * enterico e al metano da stoccaggio reflui già calcolati altrove (si veda
 * lib/metanoEnterico.ts e lib/gestioneReflui.ts).
 *
 * FONTE E LIMITI — DA LEGGERE PRIMA DELL'USO: i numeri vengono da
 *
 *   Flatz, J.; Fraas, E.; Højte, S.; Birk Rasmussen, M. From Farm to
 *   Framework: Designing CRCF Methodologies for Livestock Emissions.
 *   CONCITO, dicembre 2025.
 *
 * un report di policy di un think tank (CONCITO, Danimarca) presentato come
 * contributo allo sviluppo della metodologia pilota UE per la zootecnia nel
 * quadro CRCF — Regolamento (UE) 2024/3012. NON è un testo normativo
 * ufficiale, NON è ancora una metodologia di certificazione approvata: la
 * Commissione deciderà entro fine 2026 se e come includere la zootecnia nel
 * CRCF. I valori sono medie europee/indicative (fonti citate nel report:
 * OECD 2015, JRC 2025, Andersen et al. 2024, Ma et al. 2022, Wightman et al.
 * 2016), non specifiche per l'Italia né per una singola azienda. Il report
 * stesso segnala che la gestione della mandria (età al primo parto,
 * selezione genetica, fertilità) rischia l'esclusione dalla certificazione
 * per problemi di addizionalità e benessere animale: non inclusa qui.
 *
 * Copre solo la riduzione di METANO (non il protossido di azoto, N2O, già
 * calcolato a parte in gestioneReflui.ts e non toccato da queste pratiche
 * secondo i dati disponibili nel report). Il MAC (€ per t CO2eq evitata) può
 * essere negativo quando la pratica genera un ricavo (es. vendita del
 * biogas) superiore al suo costo.
 */

export type AmbitoPraticaMitigazione = 'enterico' | 'reflui'

export interface PraticaMitigazione {
  nome: string
  ambito: AmbitoPraticaMitigazione
  riduzioneMinPercento: number
  riduzioneMaxPercento: number
  macMinEuroPerTCO2: number
  macMaxEuroPerTCO2: number
  note: string
}

export const PRATICHE_MITIGAZIONE_METANO: PraticaMitigazione[] = [
  {
    nome: '3-NOP / Bovaer (additivo alimentare)',
    ambito: 'enterico',
    riduzioneMinPercento: 30,
    riduzioneMaxPercento: 30,
    macMinEuroPerTCO2: 80,
    macMaxEuroPerTCO2: 120,
    note:
      "Unico additivo anti-metano approvato sul mercato UE (Regolamento (UE) 2022/565). Dato su bovini da latte.",
  },
  {
    nome: 'Aumento del tenore di grasso nella razione (+1 punto percentuale)',
    ambito: 'enterico',
    riduzioneMinPercento: 4,
    riduzioneMaxPercento: 5,
    macMinEuroPerTCO2: -70,
    macMaxEuroPerTCO2: 262,
    note:
      'Riduzione riferita a +1 punto percentuale di grasso aggiunto alla razione: non verificata per quantità diverse.',
  },
  {
    nome: 'Acidificazione dei reflui',
    ambito: 'reflui',
    riduzioneMinPercento: 70,
    riduzioneMaxPercento: 79,
    macMinEuroPerTCO2: 28,
    macMaxEuroPerTCO2: 57,
    note: '% del metano di stoccaggio. Da verificare: può abbassare il pH del suolo se il refluo acidificato è poi spanto.',
  },
  {
    nome: 'Digestione anaerobica',
    ambito: 'reflui',
    riduzioneMinPercento: 75,
    riduzioneMaxPercento: 90,
    macMinEuroPerTCO2: -87,
    macMaxEuroPerTCO2: 617,
    note:
      'Costo fino a 617 €/tCO2e; può diventare un risparmio (fino a −87 €/tCO2e) se il biogas prodotto è valorizzato energeticamente.',
  },
  {
    nome: 'Flaring del metano',
    ambito: 'reflui',
    riduzioneMinPercento: 64,
    riduzioneMaxPercento: 64,
    macMinEuroPerTCO2: 11,
    macMaxEuroPerTCO2: 11,
    note: 'Non genera energia: riduce le emissioni quando valorizzare il biogas non è fattibile. Opzione più economica del gruppo.',
  },
]

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface RigaPotenzialeMitigazione {
  nome: string
  ambito: AmbitoPraticaMitigazione
  baseTCO2eq: number
  riduzioneMinTCO2eq: number
  riduzioneMaxTCO2eq: number
  costoMinEuro: number
  costoMaxEuro: number
  formula: string
}

/** Applica ciascuna pratica alla base pertinente (metano enterico o metano
 * da stoccaggio reflui, già calcolati sulla razione/sistema specifico
 * dell'azienda): stima un intervallo di riduzione e di costo, non un valore
 * unico, perché i dati di partenza sono essi stessi intervalli. */
export function calcolaPotenzialeMitigazione(
  entericoCh4TCO2eq: number,
  refluiCh4TCO2eq: number,
): RigaPotenzialeMitigazione[] {
  return PRATICHE_MITIGAZIONE_METANO.map((p) => {
    const base = p.ambito === 'enterico' ? entericoCh4TCO2eq : refluiCh4TCO2eq
    const riduzioneMinTCO2eq = base * (p.riduzioneMinPercento / 100)
    const riduzioneMaxTCO2eq = base * (p.riduzioneMaxPercento / 100)
    const costoA = riduzioneMinTCO2eq * p.macMinEuroPerTCO2
    const costoB = riduzioneMaxTCO2eq * p.macMaxEuroPerTCO2
    const costoMinEuro = Math.min(costoA, costoB)
    const costoMaxEuro = Math.max(costoA, costoB)
    const percentoLabel =
      p.riduzioneMinPercento === p.riduzioneMaxPercento
        ? `${n(p.riduzioneMinPercento)}%`
        : `${n(p.riduzioneMinPercento)}–${n(p.riduzioneMaxPercento)}%`
    const formula =
      `${n(base)} t CO2eq (${p.ambito === 'enterico' ? 'metano enterico' : 'metano da reflui'}) × ${percentoLabel} = ` +
      `${n(riduzioneMinTCO2eq)}–${n(riduzioneMaxTCO2eq)} t CO2eq evitate/anno; costo stimato ${n(costoMinEuro)}–${n(costoMaxEuro)} € ` +
      `(MAC ${n(p.macMinEuroPerTCO2)}–${n(p.macMaxEuroPerTCO2)} €/tCO2e)`
    return {
      nome: p.nome,
      ambito: p.ambito,
      baseTCO2eq: base,
      riduzioneMinTCO2eq,
      riduzioneMaxTCO2eq,
      costoMinEuro,
      costoMaxEuro,
      formula,
    }
  })
}
