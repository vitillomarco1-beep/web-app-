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

/** Stalla (o gruppo di alimentazione) identificata dal numero usato nei messaggi. */
export interface Stalla {
  id: string
  numero: number
  nome: string
  capi: number // capi presenti, per calcolare i kg per capo
  gruppoDairyComp?: number // gruppo (PEN) corrispondente in DairyComp, per importare i capi
  robot?: { marca: string; numero: number; nomi?: string[] } // robot di mungitura del gruppo (nomi come nel software, es. VMS1)
}

/** Razione scaricata dal carro miscelatore in una stalla (peso tal quale). */
export interface Scarico {
  id: string
  data: string
  turno: Turno
  stalla: number // numero della stalla
  kg: number
  note?: string
}

/** Verifica settimanale degli scarichi di razione. */
export interface VerificaSettimana {
  id: string
  settimana: string // lunedì della settimana (yyyy-mm-dd)
  verificataIl: string // ISO datetime
  verificataDa: string
  totaleKg: number // totale al momento della verifica, per accorgersi di modifiche successive
  note?: string
}

/** Una vacca come risulta da un'esportazione di DairyComp. */
export interface AnimaleDC {
  id: string // numero/matricola in DairyComp
  gruppo: number | null // PEN
  lattazione: number | null // LACT
  dim: number | null // giorni di lattazione
  latte: number | null // kg/giorno
  grasso?: number | null // %
  proteine?: number | null // %
  cellule?: number | null // migliaia/ml
  scs?: number | null // punteggio lineare cellule (LGSCC)
  codiceRiproduttivo?: string | null // RC
  giorniGravidanza?: number | null // DCC
  extra?: Record<string, number | string> // tutte le altre colonne del file
}

/** Un'esportazione di DairyComp importata (fotografia della mandria a una data). */
export interface ImportDC {
  id: string
  data: string // data a cui si riferiscono i dati
  importatoIl: string
  nomeFile: string
  animali: AnimaleDC[]
}

/** Riepilogo giornaliero di un robot di mungitura (da export DeLaval/Lely). */
export interface GiornoRobot {
  id: string // `${data}|${robot}`
  data: string
  robot: string // nome nel software del robot, es. VMS1
  completo: boolean // false se il file si ferma a metà giornata
  oraUltima: string // HH:MM dell'ultimo evento del giorno
  vacche: number
  mungiture: number
  rifiutate: number
  nonMunte: number
  kg: number
  durataSec: number // tempo totale di mungitura
  kickOff: number // mungiture con almeno un gruppo staccato
  incomplete: number
  capezzoliNonTrovati: number
  allarmiAmd: number
  kgSeparato: number // latte non mandato al tank
  pausaMaxMin: number // intervallo più lungo senza mungiture (minuti), utile per vedere fermi del robot
  pausaDalle: string // HH:MM di inizio della pausa più lunga
}

/** Riepilogo giornaliero di una vacca ai robot. */
export interface GiornoVaccaRobot {
  id: string // `${data}|${vacca}`
  data: string
  vacca: string
  robot: string // robot più usato nel giorno
  mungiture: number
  rifiutate: number
  kg: number
  kgSeparato: number
  allarmiAmd: number
  kickOff: number
  incomplete: number
  sangueMax: number | null // ppm, massimo tra i quarti
  oraUltima: string // HH:MM dell'ultima mungitura
  dim?: number | null // giorni di lattazione (se il file li riporta)
}

export interface ImportRobot { id: string; fonte: string; nomeFile: string; importatoIl: string; dal: string; al: string }

export interface Dati {
  capi: Capo[]
  mungiture: Mungitura[]
  analisi: Analisi[]
  consegne: Consegna[]
  lavorazioni: Lavorazione[]
  uscite: UscitaForme[]
  stalle: Stalla[]
  scarichi: Scarico[]
  verifiche: VerificaSettimana[]
  importDC: ImportDC[]
  robotGiorni: GiornoRobot[]
  robotVacche: GiornoVaccaRobot[]
  importRobot: ImportRobot[]
  messaggi: Messaggio[]
}

export type Collezione = keyof Dati
