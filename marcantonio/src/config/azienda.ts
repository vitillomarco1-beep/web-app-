// Dati anagrafici e testi del sito pubblico.
// ⚠️ I valori segnati "DA COMPLETARE" sono segnaposto: sostituirli con i dati reali
// dell'azienda prima della pubblicazione.

export const AZIENDA = {
  nome: 'Azienda Agricola Marcantonio',
  nomeBreve: 'Marcantonio',
  slogan: 'Latte bovino di qualità, dalla nostra stalla alla vostra tavola',
  indirizzo: 'Via DA COMPLETARE, 00000 Comune (PR)',
  telefono: '+39 000 000 0000',
  email: 'info@marcantonio.example',
  partitaIva: 'DA COMPLETARE',
  orari: 'Lun–Sab 8:00–12:30 / 15:00–18:30',
}

export interface Prodotto {
  nome: string
  descrizione: string
  dettagli: string[]
}

export const PRODOTTI: Prodotto[] = [
  {
    nome: 'Latte crudo vaccino',
    descrizione:
      'Latte appena munto, refrigerato in azienda e conferito ogni giorno ai caseifici e ai centri di trasformazione partner.',
    dettagli: ['Refrigerazione immediata a ≤ 4 °C', 'Analisi periodiche di qualità', 'Tracciabilità per lotto di consegna'],
  },
  {
    nome: 'Latte fresco intero',
    descrizione:
      'Latte intero pastorizzato, dal gusto pieno e naturale, ottenuto esclusivamente dalle vacche della nostra mandria.',
    dettagli: ['100% latte della nostra stalla', 'Filiera corta', 'Ideale per colazioni e preparazioni'],
  },
  {
    nome: 'Vendita diretta',
    descrizione:
      'Su richiesta è possibile acquistare direttamente in azienda. Contattateci per disponibilità e orari.',
    dettagli: ['Ritiro in azienda', 'Prenotazione tramite modulo contatti', 'Visite su appuntamento'],
  },
]

export const VALORI = [
  {
    titolo: 'Benessere animale',
    testo: 'Stalle ampie e ventilate, lettiere curate, alimentazione bilanciata e controlli veterinari regolari.',
  },
  {
    titolo: 'Qualità certificata',
    testo: 'Ogni consegna è accompagnata da analisi su grasso, proteine, cellule somatiche e carica batterica.',
  },
  {
    titolo: 'Filiera trasparente',
    testo: 'Dal foraggio alla mungitura fino alla consegna: ogni passaggio è registrato e tracciabile.',
  },
  {
    titolo: 'Rispetto del territorio',
    testo: 'Gestione attenta dei reflui, rotazioni colturali e produzione aziendale dei foraggi.',
  },
]

// Accesso all'area riservata (vedi README: è una protezione solo dimostrativa,
// lato browser; per l'uso reale serve un backend con autenticazione).
export const CREDENZIALI_DEMO = { utente: 'admin', password: 'marcantonio' }
