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
  dataPartoPrevista?: string | null // DUE, come scritta nel file
  giorniVita?: number | null // età in giorni (lista vitelli)
  dataNascita?: string | null // come scritta nel file
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

/** Nome dato a un gruppo DairyComp (id = numero del gruppo). */
export interface NomeGruppo { id: string; nome: string }

/** Parametro dell'azienda (es. prezzo del latte). */
export interface Parametro { id: string; valore: number }

/** Farmaco in magazzino. Il costo per unità è prezzoConfezione / unitaPerConfezione. */
export interface Farmaco {
  id: string
  nome: string
  principioAttivo?: string
  unita: string // ml, tubetto, dose, g, compressa, flacone…
  unitaPerConfezione: number
  prezzoConfezione: number // €
  giacenza: number // in unità
  scortaMinima?: number // in unità
  sospensioneLatte?: number // giorni di sospensione del latte
  note?: string
}

/** Farmaco usato in un caso, con il costo per unità al momento del trattamento. */
export interface UsoFarmaco { farmacoId: string; quantita: number; costoUnitario: number }

export type Severita = 'lieve' | 'moderata' | 'grave'

/** Un caso di malattia registrato per una vacca. */
export interface CasoClinico {
  id: string
  vacca: string
  patologia: string // id della patologia (vedi lib/salute.ts)
  dataInizio: string
  dataFine?: string // guarigione; vuoto = ancora in corso
  severita: Severita
  trattamento: string
  quarti?: string[] // mastite: AS, AD, PS, PD
  note?: string
  farmaci?: UsoFarmaco[]
  costoAltro?: number // veterinario, manodopera, altro (€)
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
  mandriaDC: ImportDC[] // ultima lista completa di DairyComp (tutti i gruppi) per la sezione Mandria
  nomiGruppi: NomeGruppo[]
  casi: CasoClinico[]
  parametri: Parametro[]
  farmaci: Farmaco[]
  robotGiorni: GiornoRobot[]
  robotVacche: GiornoVaccaRobot[]
  importRobot: ImportRobot[]
  messaggi: Messaggio[]
  partiDC: ImportDC[] // ultima lista dei parti previsti di DairyComp
  vaccinazioni: Vaccinazione[]
  ingredienti: Ingrediente[]
  razioni: Razione[]
  analisiPmr: AnalisiPmr[]
  vitelliDC: ImportDC[] // ultima lista vitelli di DairyComp
  vaccinazioniVitelli: VaccinazioneVitello[]
  quotazioniClal: QuotazioneClal[]
  note: NotaVeloce[]
}

/** Nota veloce dettata dal cruscotto, da riportare poi nella sezione giusta. */
export interface NotaVeloce { id: string; testo: string; creataIl: string; categoria: string; vacca?: string; fatta?: boolean; fattaIl?: string; casoId?: string /* caso di Salute creato in automatico */ }

/** Quotazione mensile CLAL (Borsa Merci di Milano), id = nome del prodotto. */
export interface QuotazioneClal { id: string; nome: string; mese: string /* AAAA-MM */; prezzoT: number /* €/t */; importataIl: string }

/** Vaccino fatto a un vitello. id = `${vitello}|${vaccino}` */
export interface VaccinazioneVitello { id: string; vitello: string; vaccino: string; fattaIl: string; eta?: number; scarico?: { farmacoId: string; quantita: number } }

/** Analisi di laboratorio del PMR (unifeed). Percentuali sulla sostanza secca, tranne ss (sul tal quale). */
export interface AnalisiPmr {
  id: string
  data: string // data del prelievo
  stalla?: number // undefined = vale per tutte le stalle
  ss: number // sostanza secca % sul tal quale
  pg?: number // proteina grezza % ss
  ndf?: number
  adf?: number
  amido?: number
  grassi?: number
  ceneri?: number
  ufl?: number // UFL per kg di ss
  laboratorio?: string
  note?: string
  allegato?: { id: string; url: string; nome: string } // file del laboratorio (archivio condiviso)
}

/** Alimento della razione con il prezzo (tal quale). */
export interface Ingrediente {
  id: string
  nome: string
  prezzoQ: number // €/quintale, il prezzo usato nei calcoli
  note?: string
  analisi?: AnalisiMangime
  fonte?: 'fornitore' | 'aziendale' | 'clal' // da dove viene il prezzo usato
  aggiornatoIl?: string // data dell'ultimo prezzo
  clal?: { prezzoQ: number; data: string; voce: string } // ultima quotazione CLAL importata (riferimento di mercato)
}

/** Componenti analitici di un mangime come sul cartellino: % sul tal quale. */
export interface AnalisiMangime {
  ss?: number // sostanza secca % (se il cartellino non la riporta si usa un valore tipico)
  ssStimata?: boolean
  pg?: number // proteina grezza
  grassi?: number
  fibra?: number // fibra grezza
  ceneri?: number
  sodio?: number
  amido?: number
}

export type CategoriaRazione = 'lattazione' | 'asciutta' | 'closeup' | 'manze' | 'altro'

/** Razione di un gruppo di animali: kg tal quale per capo al giorno. */
export interface Razione {
  id: string
  nome: string
  categoria: CategoriaRazione
  gruppi: number[] // gruppi DairyComp che la mangiano (per le stalle di lattazione: il gruppo della stalla)
  voci: { ingredienteId: string; kgCapo: number }[]
  robot?: { ingredienteId: string; kgCapo: number } // concentrato dato al robot (solo lattazione)
  note?: string
}

/** Vaccino pre-parto segnato come fatto. id = `${vacca}|${dataParto}|${vaccino}` */
export interface Vaccinazione {
  id: string
  vacca: string
  dataParto: string
  vaccino?: string // id in VACCINI_PREPARTO
  fattaIl: string
  scarico?: { farmacoId: string; quantita: number } // dose tolta dal magazzino farmaci
}

export type Collezione = keyof Dati
