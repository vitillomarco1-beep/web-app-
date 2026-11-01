export type StatoCapo = 'lattazione' | 'asciutta' | 'manza' | 'vitella' | 'uscita'

export interface Capo {
  id: string
  matricola: string
  nome: string
  razza: string
  dataNascita: string // ISO yyyy-mm-dd
  stato: StatoCapo
  numeroParti: number
  ultimoParto?: string
  note?: string
}

export type Turno = 'mattina' | 'sera'

export interface Mungitura {
  id: string
  data: string
  turno: Turno
  litri: number
  capiMunti: number
}

export interface Analisi {
  id: string
  data: string
  grasso: number // %
  proteine: number // %
  lattosio?: number // %
  cellule: number // migliaia di cellule/ml
  caricaBatterica: number // migliaia di UFC/ml
  inibenti: boolean // presenza di sostanze inibenti
  laboratorio?: string
}

export interface Consegna {
  id: string
  data: string
  acquirente: string
  litri: number
  prezzoLitro: number // €/l
  documento?: string // n. DDT
}

export interface Messaggio {
  id: string
  data: string // ISO datetime
  nome: string
  email: string
  telefono?: string
  oggetto: string
  testo: string
  letto: boolean
}

/** Una lavorazione in caseificio = un lotto di caciocavallo. */
export interface Lavorazione {
  id: string
  lotto: string // codice lotto, es. CC-20261031-1
  data: string // data di produzione
  litriLatte: number
  formeProdotte: number
  pesoFrescoKg: number // peso totale delle forme a fine lavorazione
  stagionaturaGiorni: number // stagionatura minima prevista prima della vendita
  note?: string
}

export type TipoUscita = 'vendita' | 'scarto' | 'omaggio'

/** Uscita di forme dal magazzino (vendita, scarto, omaggio/assaggi). */
export interface UscitaForme {
  id: string
  lavorazioneId: string
  data: string
  tipo: TipoUscita
  forme: number
  pesoKg: number // peso effettivo all'uscita (dopo il calo di stagionatura)
  cliente?: string
  prezzoKg?: number // €/kg, solo per le vendite
  documento?: string
}

export interface Dati {
  capi: Capo[]
  mungiture: Mungitura[]
  analisi: Analisi[]
  consegne: Consegna[]
  lavorazioni: Lavorazione[]
  uscite: UscitaForme[]
  messaggi: Messaggio[]
}

export type Collezione = keyof Dati
