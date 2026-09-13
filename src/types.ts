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
export interface DatiZootecnia extends DatiGenerali {
  tipoAttivita: 'zootecnia'
  tipologiaAllevamento:
    | 'bovini_da_latte'
    | 'bovini_da_carne'
    | 'suini'
    | 'ovicaprini'
    | 'avicoli'
    | 'misto'
    | 'altro'
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
  checklist: ChecklistAmmissibilita
}

export type DatiCalcolo = DatiAgricolturaAgroforestazione | DatiImboschimento | DatiZootecnia

export interface RisultatoCalcolo {
  beneficioNettoAssorbimentoTCO2: number
  beneficioNettoRiduzioneEmissioniTCO2: number
  beneficioNettoTotaleTCO2: number
  deficitCreditiTCO2: number
  aggiustamentoLavorazionePratiTCO2?: number
  /** false finché per questa attività non esiste ancora una metodologia di calcolo ufficiale */
  metodologiaDisponibile: boolean
}

export interface Calcolo {
  id: string
  clientId: string
  dati: DatiCalcolo
  risultato: RisultatoCalcolo
  createdAt: string
  updatedAt: string
}
