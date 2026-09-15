export type TipoAttivita = 'agricoltura_agroforestazione' | 'imboschimento' | 'zootecnia'

/** Metadati del fascicolo aziendale AGEA caricato per il cliente (il PDF vero e
 * proprio è salvato a parte, in IndexedDB, tramite src/lib/fileStore.ts). */
export interface FascicoloAgeaMeta {
  nomeFile: string
  dimensioneByte: number
  caricatoIl: string
}

export interface Cliente {
  id: string
  ragioneSociale: string
  referente?: string
  email?: string
  telefono?: string
  comune?: string
  provincia?: string
  note?: string
  fascicoloAgea?: FascicoloAgeaMeta
  createdAt: string
}

/** Checklist di ammissibilità/addizionalità — non entra nel calcolo numerico ma segnala la conformità. */
export interface ChecklistAmmissibilita {
  [chiave: string]: boolean
}

/** Dati comuni a qualunque tipo di attività, ripresi dal "piano di attività" (sezione 1.3.1). */
export interface DatiGenerali {
  nomeCalcolo: string
  areaAttivitaHa: number
  dataInizioPeriodoAttivita: string
  durataPeriodoCertificazioneAnni: number
  praticheDescrizione?: string
}

/**
 * Input della quantificazione secondo le equazioni 1 e 2 dell'allegato.
 * Per comodità d'uso i valori di assorbimento sono espressi come quantità positive
 * (tonnellate di CO2 rimosse), a differenza della convenzione "AC" del regolamento
 * (dove un assorbimento è un numero negativo): internamente il motore di calcolo
 * riconverte i segni in modo equivalente alle equazioni 1 e 2.
 */
export interface DatiQuantificazione {
  // Equazione 1 — assorbimenti di carbonio (biomassa vivente + suoli minerali)
  assorbimentiAttivitaTCO2: number
  assorbimentiRiferimentoTCO2: number

  // Equazione 2 — emissioni dal suolo in ambito LULUCF (ESL)
  emissioniSuoloAttivitaTCO2: number
  emissioniSuoloRiferimentoTCO2: number

  // Equazione 2 — emissioni dai suoli agricoli gestiti, N2O (ESA)
  emissioniAgricoleAttivitaTCO2: number
  emissioniAgricoleRiferimentoTCO2: number

  // GESassociati — aumento di altre emissioni (fertilizzanti, calcitazione/urea, combustione combustibili)
  gesAssociatiTCO2: number

  // Fattore di riduzione per incertezza (INC) — sezione 2.5: minimo 8%, o incertezza stimata se superiore
  fattoreIncertezza: number

  // Deficit di crediti riportato dal periodo di certificazione precedente (sezione 2.1, ultimo comma)
  deficitCreditiPrecedenteTCO2?: number
}

/** Un pacchetto di parametri/risultati RothC per uno dei due scenari (riferimento o
 * attività): conservato per poter mostrare in modo trasparente, nel report verso il
 * cliente, come si è arrivati al numero di tonnellate di CO2 assorbite. */
export interface DettaglioScenarioRothC {
  apportoResiduiTCHaAnno: number
  apportoAmmendantiTCHaAnno: number
  quotaCoperturaVegetativa: number
  socFinaleTCHa: number
  variazioneSocTCHa: number
  variazioneCO2eqTHa: number
}

/** Sintesi dei parametri e risultati della simulazione RothC usata per stimare gli
 * assorbimenti di carbonio (si veda lib/rothc.ts): conservata insieme al calcolo per
 * documentare, passo per passo, come sono stati ottenuti gli scenari di riferimento e
 * di attività — non solo il loro valore finale in t CO2. */
export interface DettaglioRothC {
  argillaPercento: number
  socInizialeTCHa: number
  durataAnni: number
  riferimento: DettaglioScenarioRothC
  attivita: DettaglioScenarioRothC
}

export interface DatiAgricolturaAgroforestazione extends DatiGenerali, DatiQuantificazione {
  tipoAttivita: 'agricoltura_agroforestazione'
  /** sezione 1.1.1.1 lett. a)-c): pratiche selezionate, solo a scopo di riepilogo */
  pratiche: {
    gestioneColture: boolean
    lavorazioneConservativa: boolean
    conversionePratiTerreColt: boolean
    gestionePrati: boolean
    ammendantiOrganici: boolean
    agroforestazione: boolean
    riduzioneN2O: boolean
  }
  /** sezione 2.3.3: aggiornamento al ribasso del livello di riferimento per pratiche di riduzione N2O */
  applicaAggiornamentoRiferimentoN2O: boolean
  /** Presente solo se gli assorbimenti sono stati compilati tramite il simulatore
   * RothC integrato (pulsante "Usa questi valori nel calcolo"): assente se inseriti
   * manualmente o cancellato non appena l'utente modifica i due campi a mano, per non
   * mostrare un dettaglio non più corrispondente ai valori effettivi. */
  dettaglioRothC?: DettaglioRothC
  checklist: ChecklistAmmissibilita
}

export interface DatiImboschimento extends DatiGenerali, DatiQuantificazione {
  tipoAttivita: 'imboschimento'
  /** sezione 2.2: se durante l'imboschimento si lavorano prati permanenti, perdita forfettaria del 12% dello stock */
  applicaPerditaLavorazionePratiPermanenti: boolean
  stockCarbonioSueloPreesistenteTCO2?: number
  checklist: ChecklistAmmissibilita
}

/**
 * Metodologia "zootecnia" — a oggi non esiste ancora un atto delegato dell'UE che
 * stabilisca la metodologia di certificazione per le attività zootecniche nell'ambito
 * del regolamento (UE) 2024/3012 (il presente regolamento delegato copre solo
 * agricoltura/agroforestazione su suoli minerali, torbiere e imboschimento — allegato,
 * "Descrizione dell'attività di carboniocoltura"). Questa sezione raccoglie fin da ora
 * i dati aziendali e le pratiche di mitigazione più comuni (fermentazione enterica,
 * gestione degli effluenti, alimentazione, pascolo), in modo da avere il fascicolo del
 * cliente pronto: il motore di calcolo verrà completato non appena sarà pubblicata la
 * direttiva/atto delegato dedicato.
 */
export type TipologiaAllevamento =
  | 'bovini_da_latte'
  | 'bovini_da_carne'
  | 'suini'
  | 'ovicaprini'
  | 'avicoli'
  | 'misto'
  | 'altro'

/** Una voce di mangime ingerito dall'allevamento, per la simulazione facoltativa
 * del bilancio zootecnico (si veda SimulazioneZootecnia). */
export interface MangimeSimulazione {
  id: string
  nomeMangime: string
  quantitaTAnno: number
  /** true = coltivato sui terreni dell'azienda stessa; false = acquistato da un
   * altro produttore, il cui assorbimento è già suo (o a lui attribuibile) — per
   * evitare un doppio conteggio non entra nel bilancio simulato. */
  autoprodotto: boolean
}

/**
 * Simulazione facoltativa e NON CERTIFICABILE di un possibile bilancio tra
 * l'assorbimento di carbonio del mangime autoprodotto ingerito dagli animali e le
 * emissioni dirette dell'allevamento (fermentazione enterica + gestione reflui):
 * anticipa un'ipotesi di come una futura normativa UE per la zootecnia potrebbe
 * rendicontare questi due termini, ma nessun atto delegato la definisce oggi. Va
 * tenuta visivamente e concettualmente separata dal calcolo ufficiale.
 */
export interface SimulazioneZootecnia {
  mangimi: MangimeSimulazione[]
  /** t CO2eq per capo all'anno, default indicativo per tipologia ma sempre modificabile. */
  emissioniDirettePerCapoTCO2eqAnno: number
}

export interface DatiZootecnia extends DatiGenerali {
  tipoAttivita: 'zootecnia'
  tipologiaAllevamento: TipologiaAllevamento
  numeroCapiMedio: number
  /** pratiche di mitigazione previste/adottate, in attesa dei fattori di calcolo ufficiali */
  pratiche: {
    additiviAlimentari: boolean
    gestioneEffluentiDigestione: boolean
    stoccaggioCopertoEffluenti: boolean
    pascoloRotazionale: boolean
    geneticaEfficienza: boolean
    alimentazionePrecisione: boolean
  }
  noteMetodologiche?: string
  simulazioneZootecnia?: SimulazioneZootecnia
  checklist: ChecklistAmmissibilita
}

export type DatiCalcolo = DatiAgricolturaAgroforestazione | DatiImboschimento | DatiZootecnia

/** Passaggi intermedi del calcolo, esposti per la trasparenza verso il cliente
 * (es. nel report PDF): non servono al motore di calcolo, solo a documentarlo. */
export interface DettaglioCalcolo {
  fattoreIncertezzaEffettivo: number
  emissioniAgricoleRiferimentoAggiornatoTCO2?: number
  beneficioLordoAssorbimentoTCO2: number
  beneficioLordoRiduzioneEmissioniTCO2: number
  pesoAssorbimentoPerGes: number
  gesAssociatiQuotaAssorbimentoTCO2: number
  gesAssociatiQuotaRiduzioneTCO2: number
}

export interface RisultatoCalcolo {
  beneficioNettoAssorbimentoTCO2: number
  beneficioNettoRiduzioneEmissioniTCO2: number
  beneficioNettoTotaleTCO2: number
  deficitCreditiTCO2: number
  aggiustamentoLavorazionePratiTCO2?: number
  /** false finché per questa attività non esiste ancora una metodologia di calcolo ufficiale */
  metodologiaDisponibile: boolean
  dettaglio?: DettaglioCalcolo
}

export interface Calcolo {
  id: string
  clientId: string
  dati: DatiCalcolo
  risultato: RisultatoCalcolo
  createdAt: string
  updatedAt: string
}

/** Un'azienda partecipante a un gruppo di gestori, con la quota facoltativa di
 * riparto dei crediti (e quindi, indicativamente, dei costi di certificazione). */
export interface MembroGruppo {
  clienteId: string
  quotaPercento?: number
}

/**
 * Gruppo di gestori (allegato, varie sezioni: "i gestori o i gruppi di gestori...").
 * Il regolamento consente a più aziende di certificarsi insieme, con
 * quantificazione e monitoraggio effettuati a livello di gruppo — utile per
 * ripartire i costi di certificazione tra più aziende collaboranti.
 */
export interface Gruppo {
  id: string
  nome: string
  referente?: string
  note?: string
  membri: MembroGruppo[]
  createdAt: string
}

/** Calcolo condiviso di un gruppo di gestori: stessa struttura del calcolo di un
 * singolo cliente, ma riferito all'intero gruppo (area di attività complessiva). */
export interface CalcoloGruppo {
  id: string
  gruppoId: string
  dati: DatiCalcolo
  risultato: RisultatoCalcolo
  createdAt: string
  updatedAt: string
}

export type StatoNormativa = 'da_valutare' | 'in_implementazione' | 'implementato' | 'monitorato'

export type AmbitoNormativa = TipoAttivita | 'trasversale' | 'nuovo_ambito'

/**
 * Traccia le novità normative (nuovi regolamenti/direttive UE, bozze, atti delegati)
 * rilevanti per il calcolo dei crediti di carbonio, con le note su cosa comportano
 * per l'app e lo stato di recepimento. Il documento ufficiale (PDF), se presente, è
 * salvato in IndexedDB tramite src/lib/fileStore.ts.
 */
export interface AggiornamentoNormativo {
  id: string
  titolo: string
  riferimentoNormativo?: string
  dataPubblicazione?: string
  ambito: AmbitoNormativa
  sintesi?: string
  impattoSulCalcolo?: string
  stato: StatoNormativa
  documento?: FascicoloAgeaMeta
  createdAt: string
  updatedAt: string
}
