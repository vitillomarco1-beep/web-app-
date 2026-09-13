export interface ChecklistItemDef {
  key: string
  label: string
  riferimento: string
}

export const CHECKLIST_AGRICOLTURA: ChecklistItemDef[] = [
  {
    key: 'no_rimozione_alberi',
    label: "L'attività non comporta la rimozione di alberi o altri elementi legnosi esistenti",
    riferimento: 'Allegato, sez. 1.1.1.2, lett. a)',
  },
  {
    key: 'no_drenaggio_2023',
    label:
      "L'area non ha subito un abbassamento artificiale della falda con nuovi sistemi di drenaggio dopo il 1° gennaio 2023",
    riferimento: 'Allegato, sez. 1.1.1.2, lett. b)',
  },
  {
    key: 'lavorazione_conservativa_combinata',
    label:
      'Le pratiche di lavorazione conservativa (se presenti) sono combinate con pratiche che aumentano il carbonio nel suolo',
    riferimento: 'Allegato, sez. 1.1.1.2, lett. c)',
  },
  {
    key: 'no_conversione_prati_2023',
    label:
      'Nessuna conversione di prati permanenti in terre coltivate dopo il 1° gennaio 2023 (se pertinente)',
    riferimento: 'Allegato, sez. 1.1.1.2, lett. d)',
  },
  {
    key: 'fasce_tampone',
    label: "L'attività mantiene le zone tampone riparie lungo i corsi d'acqua",
    riferimento: 'Allegato, sez. 1.1.1.2, lett. i)',
  },
  {
    key: 'prova_normativa',
    label: "Il beneficio climatico netto non deriva da un obbligo giuridico (prova normativa)",
    riferimento: 'Allegato, sez. 3.1',
  },
  {
    key: 'effetto_incentivazione',
    label:
      'I lavori legati alla attività non erano iniziati alla presentazione della domanda di certificazione (effetto di incentivazione)',
    riferimento: 'Allegato, sez. 3.2.1',
  },
  {
    key: 'sostenibilita_finanziaria',
    label:
      "È dimostrato che l'attività non è finanziariamente sostenibile senza i proventi della certificazione",
    riferimento: 'Allegato, sez. 3.2.2',
  },
]

export const CHECKLIST_IMBOSCHIMENTO: ChecklistItemDef[] = [
  {
    key: 'superficie_minima',
    label: "La superficie dell'area di attività è di almeno 0,5 ha",
    riferimento: 'Allegato, sez. 1.1.3.2, lett. c)',
  },
  {
    key: 'no_rimozione_alberi',
    label:
      "L'attività non comporta la rimozione di alberi esistenti (salvo specie esotiche invasive o fitosanitarie)",
    riferimento: 'Allegato, sez. 1.1.3.2, lett. b)',
  },
  {
    key: 'copertura_arborea_bassa',
    label:
      'La copertura arborea preesistente era inferiore al 10% dopo il 1° gennaio 2023 (per prati/terre coltivate)',
    riferimento: 'Allegato, sez. 1.1.3.2, lett. a)',
  },
  {
    key: 'composizione_specie',
    label: 'Composizione mista delle specie, coerente con le condizioni naturali locali',
    riferimento: 'Allegato, sez. 1.1.3.2, lett. f), g)',
  },
  {
    key: 'densita_impianto',
    label: 'La densità di impianto è conforme ai requisiti nazionali applicabili',
    riferimento: 'Allegato, sez. 1.1.3.2, lett. h)',
  },
  {
    key: 'prova_normativa',
    label: "Il beneficio climatico netto non deriva da un obbligo giuridico (prova normativa)",
    riferimento: 'Allegato, sez. 3.1',
  },
  {
    key: 'effetto_incentivazione',
    label:
      'I lavori legati alla attività non erano iniziati alla presentazione della domanda di certificazione (effetto di incentivazione)',
    riferimento: 'Allegato, sez. 3.2.1',
  },
  {
    key: 'sostenibilita_finanziaria',
    label:
      "È dimostrato che l'attività non è finanziariamente sostenibile senza i proventi della certificazione",
    riferimento: 'Allegato, sez. 3.2.2',
  },
]
