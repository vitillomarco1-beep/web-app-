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
 *
 * calcolaProgressoTargetUe2040() collega le pratiche segnate come adottate
 * nella checklist aziendale (ZootecniaForm) alla riduzione CONCITO
 * corrispondente, per un indicatore di monitoraggio rispetto all'obiettivo
 * UE non vincolante del 16% al 2040 (Strategia UE per la zootecnia, 7 luglio
 * 2026) — non una verifica di conformità, perché nessuna metodologia
 * ufficiale di calcolo per singola azienda esiste ancora.
 */

export type AmbitoPraticaMitigazione = 'enterico' | 'reflui'

/** Chiave della checklist "Pratiche di mitigazione previste/adottate" nella
 * descrizione aziendale (ZootecniaForm.tsx, DatiZootecnia['pratiche']) che
 * corrisponde a questa pratica quantificata — collega la dichiarazione
 * dell'azienda ("ho adottato questo") al dato CONCITO (quanto riduce
 * davvero), per il monitoraggio rispetto all'obiettivo UE (si veda
 * calcolaProgressoTargetUe2040 più sotto). Assente per le pratiche senza una
 * voce di checklist corrispondente univoca. */
export type ChiaveChecklistPratiche =
  | 'additiviAlimentari'
  | 'gestioneEffluentiDigestione'
  | 'stoccaggioCopertoEffluenti'
  | 'pascoloRotazionale'
  | 'geneticaEfficienza'
  | 'alimentazionePrecisione'

export interface PraticaMitigazione {
  nome: string
  ambito: AmbitoPraticaMitigazione
  riduzioneMinPercento: number
  riduzioneMaxPercento: number
  macMinEuroPerTCO2: number
  macMaxEuroPerTCO2: number
  note: string
  chiaveChecklist?: ChiaveChecklistPratiche
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
    chiaveChecklist: 'additiviAlimentari',
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
    chiaveChecklist: 'gestioneEffluentiDigestione',
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

/** Pratiche della checklist aziendale senza una voce quantificata in questa
 * tabella: adottarle è comunque positivo, ma non entrano nella stima di
 * riduzione (si veda calcolaProgressoTargetUe2040) perché il report CONCITO
 * non riporta per loro un intervallo di riduzione/MAC consolidato quanto per
 * le altre — non per un giudizio di minore efficacia. */
export const CHIAVI_CHECKLIST_NON_QUANTIFICATE: ChiaveChecklistPratiche[] = [
  'stoccaggioCopertoEffluenti',
  'pascoloRotazionale',
  'geneticaEfficienza',
  'alimentazionePrecisione',
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

/** Obiettivo dell'UE, non vincolante, dalla Strategia per la zootecnia della
 * Commissione Europea (7 luglio 2026): ridurre le emissioni zootecniche di
 * almeno il 16% entro il 2040 tramite tecnologia e sostegno mirato alle
 * aziende — non un obbligo di legge. Non esiste ancora un anno di
 * riferimento (baseline) né una metodologia di calcolo per singola azienda a
 * livello UE: il confronto qui sotto è quindi indicativo (riduzione
 * potenziale rispetto alle emissioni di metano attuali dell'azienda, non
 * rispetto a un anno base ufficiale) e serve a tenere sotto controllo
 * l'ordine di grandezza, non a dimostrare conformità a un obbligo che oggi
 * non esiste. */
export const TARGET_UE_RIDUZIONE_PERCENTO_2040 = 16
export const TARGET_UE_FONTE =
  "Strategia UE per la zootecnia, Commissione Europea, 7 luglio 2026 — obiettivo non vincolante, nessun anno di riferimento (baseline) né metodologia di calcolo per azienda ancora definiti a livello UE."

export interface RisultatoProgressoTargetUe {
  riduzioneStimataTCO2eq: number
  riduzioneStimataPercento: number
  baseTotaleTCO2eq: number
  formula: string
  pratichenonQuantificateAdottate: ChiaveChecklistPratiche[]
  raggiungeTarget: boolean
}

/** Stima quanto le pratiche di mitigazione segnate come adottate nella
 * checklist aziendale (ZootecniaForm, "Pratiche di mitigazione previste/
 * adottate") riducono il metano totale (enterico + reflui) dell'azienda,
 * usando il valore medio dell'intervallo di riduzione CONCITO per ciascuna
 * pratica quantificata — e confronta il risultato con l'obiettivo UE non
 * vincolante del 16% al 2040. Non è una verifica di conformità normativa:
 * nessuna metodologia ufficiale esiste oggi per la zootecnia. */
export function calcolaProgressoTargetUe2040(
  pratiche: Record<ChiaveChecklistPratiche, boolean> | undefined,
  entericoCh4TCO2eq: number,
  refluiCh4TCO2eq: number,
): RisultatoProgressoTargetUe {
  const baseTotaleTCO2eq = entericoCh4TCO2eq + refluiCh4TCO2eq
  const dettagli: string[] = []
  let riduzioneStimataTCO2eq = 0
  for (const p of PRATICHE_MITIGAZIONE_METANO) {
    if (p.chiaveChecklist == null || !pratiche?.[p.chiaveChecklist]) continue
    const base = p.ambito === 'enterico' ? entericoCh4TCO2eq : refluiCh4TCO2eq
    const riduzioneMediaTCO2eq = base * ((p.riduzioneMinPercento + p.riduzioneMaxPercento) / 2 / 100)
    riduzioneStimataTCO2eq += riduzioneMediaTCO2eq
    dettagli.push(`${p.nome}: ${n(riduzioneMediaTCO2eq)} t CO2eq`)
  }
  const riduzioneStimataPercento = baseTotaleTCO2eq > 0 ? (riduzioneStimataTCO2eq / baseTotaleTCO2eq) * 100 : 0
  const pratichenonQuantificateAdottate = CHIAVI_CHECKLIST_NON_QUANTIFICATE.filter((k) => pratiche?.[k])
  const formula =
    dettagli.length > 0
      ? `${dettagli.join('; ')} → ${n(riduzioneStimataTCO2eq)} t CO2eq su ${n(baseTotaleTCO2eq)} t CO2eq di metano totale (enterico + reflui) = ${n(riduzioneStimataPercento)}%`
      : `Nessuna pratica quantificabile risulta adottata nella checklist aziendale: riduzione stimata 0% su ${n(baseTotaleTCO2eq)} t CO2eq di metano totale.`
  return {
    riduzioneStimataTCO2eq,
    riduzioneStimataPercento,
    baseTotaleTCO2eq,
    formula,
    pratichenonQuantificateAdottate,
    raggiungeTarget: riduzioneStimataPercento >= TARGET_UE_RIDUZIONE_PERCENTO_2040,
  }
}
