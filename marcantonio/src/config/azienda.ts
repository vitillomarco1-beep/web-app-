// Dati anagrafici e testi del sito pubblico.
// ⚠️ I valori segnati "DA COMPLETARE" sono segnaposto: sostituirli con i dati reali
// dell'azienda prima della pubblicazione.

export const AZIENDA = {
  nome: 'Fratelli Marcantonio',
  nomeBreve: 'Marcantonio',
  fondazione: 1900,
  slogan: 'Dal 1900 il caciocavallo di Castelfranco in Miscano',
  descrizioneBreve: 'Allevamento di bovine da latte e produzione di caciocavallo a Castelfranco in Miscano, dal 1900.',
  indirizzo: 'Via DA COMPLETARE, 82022 Castelfranco in Miscano (BN)',
  telefono: '+39 000 000 0000', // DA COMPLETARE
  email: 'info@marcantonio.example', // DA COMPLETARE
  partitaIva: 'DA COMPLETARE',
  orari: 'Lun–Sab 8:00–12:30 / 15:00–18:30', // DA VERIFICARE
}

export interface Prodotto {
  nome: string
  descrizione: string
  dettagli: string[]
  inEvidenza?: boolean
}

// Descrizioni generiche: verificare stagionature, formati e disponibilità reali.
export const PRODOTTI: Prodotto[] = [
  {
    nome: 'Caciocavallo di Castelfranco in Miscano',
    descrizione:
      'Il nostro formaggio simbolo: un caciocavallo a pasta filata lavorato secondo la ricetta di famiglia, tramandata dal 1900, con il latte delle nostre vacche.',
    dettagli: ['Latte bovino della nostra stalla', 'Pasta filata lavorata a mano', 'Stagionato appeso, secondo tradizione'],
    inEvidenza: true,
  },
  {
    nome: 'Latte bovino',
    descrizione:
      'Latte munto dai nostri robot quando è la vacca a deciderlo, da una mandria allevata con cura. È la materia prima di tutti i nostri formaggi.',
    dettagli: ['Mungitura robotizzata, controllo a ogni mungitura', 'Refrigerazione immediata a ≤ 4 °C', 'Tracciabilità dalla stalla al formaggio'],
  },
  {
    nome: 'Vendita diretta',
    descrizione:
      'I nostri prodotti si possono acquistare direttamente in azienda. Contattateci per disponibilità, ordini e orari di ritiro.',
    dettagli: ['Ritiro in azienda', 'Ordini tramite il modulo contatti', 'Visite su appuntamento'],
  },
]

// Mungitura robotizzata: 4 robot (3 DeLaval, 1 Lely)
export const ROBOT = { totale: 4, descrizione: '3 robot DeLaval e 1 robot Lely' }

export const BENEFICI_ROBOT: { titolo: string; testo: string; icona: 'clock' | 'heart' | 'activity' | 'droplet' | 'wheat' | 'users' }[] = [
  {
    titolo: 'La vacca sceglie quando',
    testo: 'Niente orari fissi: ogni vacca entra nel robot quando vuole, di giorno o di notte, seguendo i propri ritmi naturali.',
    icona: 'clock',
  },
  {
    titolo: 'Più benessere, meno stress',
    testo: 'Niente attese in gruppo né spostamenti forzati: la stalla resta tranquilla e le vacche si muovono liberamente.',
    icona: 'heart',
  },
  {
    titolo: 'Salute controllata a ogni mungitura',
    testo: 'Sensori misurano quantità e caratteristiche del latte quarto per quarto, aiutandoci a riconoscere presto i segnali di un problema.',
    icona: 'activity',
  },
  {
    titolo: 'Igiene sempre uguale',
    testo: 'Pulizia dei capezzoli e attacco dei gruppi avvengono ogni volta nello stesso modo, con il latte che va subito in refrigerazione.',
    icona: 'droplet',
  },
  {
    titolo: 'Alimentazione su misura',
    testo: "Durante la mungitura ogni vacca riceve la sua integrazione, calibrata sulla produzione e sulla fase di lattazione.",
    icona: 'wheat',
  },
  {
    titolo: 'Più tempo per gli animali',
    testo: 'I dati di ogni mungitura arrivano al nostro gestionale: il tempo risparmiato lo dedichiamo a osservare e curare la mandria.',
    icona: 'users',
  },
]

export const VALORI = [
  {
    titolo: 'Tradizione dal 1900',
    testo: 'Da oltre un secolo la famiglia Marcantonio trasforma il latte in caciocavallo a Castelfranco in Miscano.',
  },
  {
    titolo: 'Latte della nostra stalla',
    testo: 'Il formaggio nasce dal latte delle nostre vacche: sappiamo come sono allevate, alimentate e munte.',
  },
  {
    titolo: 'Benessere animale',
    testo: 'Stalle ampie e ventilate, alimentazione bilanciata e controlli veterinari regolari.',
  },
  {
    titolo: 'Qualità controllata',
    testo: 'Il latte viene analizzato regolarmente: grasso, proteine, cellule somatiche e carica batterica.',
  },
]

// Accesso all'area riservata (vedi README: è una protezione solo dimostrativa,
// lato browser; per l'uso reale serve un backend con autenticazione).
export type Ruolo = 'titolare' | 'collaboratore'

/** Utenti dimostrativi: il titolare vede tutto, il collaboratore solo la schermata "Pesata". */
export const UTENTI_DEMO: { utente: string; password: string; ruolo: Ruolo; descrizione: string }[] = [
  { utente: 'admin', password: 'marcantonio', ruolo: 'titolare', descrizione: 'titolare (tutto il gestionale)' },
  { utente: 'stalla', password: 'stalla', ruolo: 'collaboratore', descrizione: 'collaboratore (solo pesate)' },
]
