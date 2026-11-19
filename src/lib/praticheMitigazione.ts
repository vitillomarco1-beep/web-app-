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
 * Due pratiche (rimozione frequente dei reflui, raffreddamento dei reflui)
 * hanno un dato di riduzione misurato solo su suini (fonte: Andersen et al.
 * 2024, Danimarca): applicarlo ad altre specie è un'estrapolazione non
 * verificata. Il report NON riporta alcuna voce quantificata per "inibitori/
 * additivi dei reflui" in senso stretto (es. inibitori della ureasi o della
 * nitrificazione): menziona solo il biochar come pratica promettente ma "non
 * ancora pronta per il mercato", senza un dato di riduzione/costo
 * consolidato — non inclusa qui per questo motivo, non perché inefficace.
 *
 * calcolaProgressoTargetUe2040() collega le pratiche segnate come adottate
 * nella checklist aziendale (ZootecniaForm) alla riduzione CONCITO
 * corrispondente, per un indicatore di monitoraggio rispetto all'obiettivo
 * UE non vincolante del 16% al 2040 (Strategia UE per la zootecnia, 7 luglio
 * 2026) — non una verifica di conformità, perché nessuna metodologia
 * ufficiale di calcolo per singola azienda esiste ancora.
 *
 * AMMISSIBILITÀ CRCF (campo crcfPilota di ciascuna pratica) — fonte diversa
 * dal report CONCITO sopra: il documento
 *
 *   "Pilot certification methodology for livestock activities under CRCF"
 *   WSP, Wageningen University & Research, Trinomics, Institute for
 *   European Environmental Policy (IEEP) — consorzio incaricato dalla
 *   Commissione Europea (DG CLIMA), su mandato dell'art. 18(3) del
 *   Regolamento CRCF (UE) 2024/3012.
 *
 * NON è una proposta normativa né una metodologia adottata: è dichiarato
 * esplicitamente nel documento stesso come "esercizio di riflessione" in
 * vista dell'eventuale revisione del CRCF (decisione attesa entro fine
 * 2026). Definisce però un elenco di pratiche ammissibili e criteri di
 * esclusione (in particolare: un additivo o una selezione genetica che
 * riduce il metano solo indirettamente, migliorando la performance animale
 * e quindi le emissioni per kg di prodotto, NON è ammissibile — lo è solo
 * se agisce direttamente sulla fermentazione). Il campo crcfPilota riporta
 * una valutazione di massima, non un giudizio di idoneità certo.
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

export type StatoCrcfPilota = 'ammissibile' | 'condizionata' | 'non_esplicita'

export interface PraticaMitigazione {
  nome: string
  ambito: AmbitoPraticaMitigazione
  riduzioneMinPercento: number
  riduzioneMaxPercento: number
  macMinEuroPerTCO2: number
  macMaxEuroPerTCO2: number
  note: string
  chiaveChecklist?: ChiaveChecklistPratiche
  crcfPilota?: { stato: StatoCrcfPilota; nota: string }
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
    crcfPilota: {
      stato: 'ammissibile',
      nota: 'Il documento pilota CRCF elenca la "manipolazione ruminale, inclusi additivi alimentari che riducono la conversione di carboidrati in CH4" tra le pratiche ammissibili sulla fermentazione enterica, poiché agisce direttamente sulla fermentazione e non solo migliorando la performance animale.',
    },
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
    crcfPilota: {
      stato: 'condizionata',
      nota: 'Non citata esplicitamente nel documento pilota CRCF. Il criterio di esclusione riguarda gli additivi che riducono il metano solo indirettamente migliorando la performance animale (emissioni per kg di prodotto): da verificare caso per caso se il supplemento di grasso rientri in questa esclusione o agisca direttamente sulla fermentazione ruminale.',
    },
  },
  {
    nome: 'Acidificazione dei reflui',
    ambito: 'reflui',
    riduzioneMinPercento: 70,
    riduzioneMaxPercento: 79,
    macMinEuroPerTCO2: 28,
    macMaxEuroPerTCO2: 57,
    note: '% del metano di stoccaggio. Da verificare: può abbassare il pH del suolo se il refluo acidificato è poi spanto.',
    crcfPilota: {
      stato: 'ammissibile',
      nota: 'Elencata esplicitamente tra le pratiche ammissibili sulla gestione dei reflui ("acidification of slurry") nel documento pilota CRCF.',
    },
  },
  {
    nome: 'Digestione anaerobica',
    ambito: 'reflui',
    riduzioneMinPercento: 75,
    riduzioneMaxPercento: 90,
    macMinEuroPerTCO2: -10,
    macMaxEuroPerTCO2: 617,
    note:
      'Senza valorizzazione del biogas: 77–617 €/tCO2e. Con valorizzazione energetica del biogas: da un risparmio di 10 €/tCO2e a un costo di 87 €/tCO2e. Qui riportato l\'intervallo complessivo delle due situazioni (correzione rispetto a una precedente trascrizione che riportava erroneamente −87 invece di −10 come risparmio massimo).',
    chiaveChecklist: 'gestioneEffluentiDigestione',
    crcfPilota: {
      stato: 'ammissibile',
      nota: 'Elencata esplicitamente ("production of biogas/biomethane by anaerobic digestion of livestock manures"). Requisito minimo di sostenibilità nel documento pilota: il digestore deve essere alimentato principalmente da reflui/residui agricoli (non colture energetiche dedicate) e includere cattura del metano e monitoraggio delle perdite.',
    },
  },
  {
    nome: 'Rimozione frequente dei reflui dalla stalla (rapid discharge)',
    ambito: 'reflui',
    riduzioneMinPercento: 4,
    riduzioneMaxPercento: 17,
    macMinEuroPerTCO2: 2,
    macMaxEuroPerTCO2: 200,
    note:
      'Dato solo su suini (Andersen et al. 2024, Danimarca): trasferimento rapido del refluo dalla stalla allo stoccaggio, per rimozione più frequente o scarico automatico. Costo molto variabile (stima degli autori del report, non una media consolidata): basso se è solo un cambio gestionale, alto se richiede di adeguare le stalle esistenti con un impianto automatico. Il beneficio si realizza pienamente solo se lo stoccaggio a valle ha già una tecnologia di riduzione del metano: altrimenti l\'emissione si sposta dalla stalla allo stoccaggio invece di ridursi.',
    crcfPilota: {
      stato: 'ammissibile',
      nota: 'Corrisponde a "frequent removal/scraping" tra le pratiche ammissibili sulla gestione dei reflui nel documento pilota CRCF.',
    },
  },
  {
    nome: 'Raffreddamento dei reflui in stoccaggio',
    ambito: 'reflui',
    riduzioneMinPercento: 2,
    riduzioneMaxPercento: 7,
    macMinEuroPerTCO2: 130,
    macMaxEuroPerTCO2: 130,
    note:
      'Dato solo su suini (Andersen et al. 2024, Danimarca). Costo stimato per la sola Danimarca (SEGES, 2024): nessuno studio a livello europeo. La riduzione dipende fortemente dal clima locale (non lineare con la temperatura): il dato non è una media europea.',
    crcfPilota: {
      stato: 'ammissibile',
      nota: 'Corrisponde a "cooling/storage temperature" tra le pratiche ammissibili sulla gestione dei reflui nel documento pilota CRCF.',
    },
  },
  {
    nome: 'Flaring del metano',
    ambito: 'reflui',
    riduzioneMinPercento: 64,
    riduzioneMaxPercento: 64,
    macMinEuroPerTCO2: 11,
    macMaxEuroPerTCO2: 11,
    note: 'Non genera energia: riduce le emissioni quando valorizzare il biogas non è fattibile. Opzione più economica del gruppo.',
    crcfPilota: {
      stato: 'non_esplicita',
      nota: 'Non elencata esplicitamente tra le pratiche di gestione reflui del documento pilota CRCF (che cita digestione anaerobica, raffreddamento/temperatura di stoccaggio, acidificazione, coperture, separazione solido-liquido, rimozione frequente, inibitori/additivi): da verificare se rientrerebbe come variante della digestione anaerobica senza valorizzazione energetica.',
    },
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
  crcfPilota?: { stato: StatoCrcfPilota; nota: string }
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
      crcfPilota: p.crcfPilota,
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
/** Documento pilota sulla certificazione zootecnica nel CRCF — si veda il
 * docstring in cima al file per status e limiti. Fonte diversa dal report
 * CONCITO: qui serve solo per il campo crcfPilota di ciascuna pratica. */
export const METODOLOGIA_PILOTA_CRCF_TITOLO =
  'Pilot certification methodology for livestock activities under CRCF'
export const METODOLOGIA_PILOTA_CRCF_FONTE =
  "WSP, Wageningen University & Research, Trinomics, Institute for European Environmental Policy (IEEP) — documento pilota/esplorativo commissionato dalla Commissione Europea (DG CLIMA) ai sensi dell'art. 18(3) del Regolamento CRCF (UE) 2024/3012. NON è una metodologia adottata né una proposta normativa: è dichiarato nel documento stesso come esercizio di riflessione in vista dell'eventuale revisione del CRCF (decisione attesa entro fine 2026)."

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
