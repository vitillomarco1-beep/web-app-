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

export interface Dati {
  capi: Capo[]
  mungiture: Mungitura[]
  analisi: Analisi[]
  consegne: Consegna[]
  messaggi: Messaggio[]
}

export type Collezione = keyof Dati
