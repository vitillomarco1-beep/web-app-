/**
 * Prezzi orientativi dei crediti di carbonio su piattaforme/indici/broker del
 * mercato volontario (VCM — Voluntary Carbon Market) mondiale, per dare al
 * consulente un termine di paragone quando inserisce un prezzo di vendita
 * ipotizzato (si veda lib/prezzoCrediti.ts).
 *
 * NESSUNO di questi è un prezzo del mercato CRCF: non esiste ancora una banca
 * o un registro crediti dell'UE operativo per i crediti certificati sotto il
 * Regolamento (UE) 2024/3012 — questi sono prezzi di un mercato diverso (il
 * mercato volontario globale, prevalentemente progetti extra-UE), riportati
 * qui solo come ordine di grandezza di riferimento, non come previsione del
 * prezzo che un credito CRCF italiano potrà avere.
 *
 * LIMITI DA LEGGERE PRIMA DELL'USO:
 * - Valuta originale della fonte (USD o EUR), non convertita: un confronto
 *   diretto tra righe in valute diverse va fatto con cautela.
 * - Il prezzo di un credito varia moltissimo per tipologia di progetto,
 *   rating di qualità, regione, permanenza/durata dello stoccaggio e
 *   annata (vintage): due fonti sullo stesso tipo di progetto possono
 *   differire anche di un fattore 2-3 per questi motivi, non per errore.
 * - Le fonti più solide (AlliedOffsets, Sylvera, Ecosystem Marketplace, MSCI,
 *   Puro.earth/Nasdaq) sono piattaforme di market intelligence o indici con
 *   metodologia pubblica; le altre (Nori, Xpansiv) sono prezzi di singole
 *   piattaforme/mercati, non medie di settore.
 * - Raccolti da ricerche web a novembre 2026: non riletti sulla fonte
 *   primaria originale in ogni caso (si veda il campo fonte di ciascuna voce
 *   per il dettaglio); da riverificare prima di un uso che non sia
 *   puramente indicativo.
 * - Le tipologie più comparabili alle attività di questa app sono: "Carbonio
 *   del suolo agricolo" (agricoltura/agroforestazione) e "Afforestazione/
 *   riforestazione (ARR)" (imboschimento). Il biochar e i crediti nature-
 *   based generici (REDD+/evitate emissioni) sono tipologie diverse,
 *   riportati solo per completezza del quadro di mercato.
 */

export interface PrezzoMercatoRiferimento {
  fonte: string
  tipologia: string
  prezzo: string
  dataRiferimento: string
  note: string
}

export const PREZZI_MERCATO_CARBONIO: PrezzoMercatoRiferimento[] = [
  {
    fonte: 'Nori (marketplace diretto)',
    tipologia: 'Carbonio del suolo agricolo (rimozione)',
    prezzo: 'USD 17,25/t CO2eq (USD 20/t su CIBO)',
    dataRiferimento: 'febbraio 2026',
    note: 'Prezzo di transazione reale su una piattaforma diretta produttore-acquirente, non una media di mercato. Tipologia più vicina alle attività agricoltura/agroforestazione di questa app.',
  },
  {
    fonte: 'Ecosystem Marketplace — State of the Voluntary Carbon Market',
    tipologia: 'Afforestazione/riforestazione/rivegetazione (ARR)',
    prezzo: 'media USD 20,44/t CO2eq',
    dataRiferimento: 'dati 2024 (report più recente reperito)',
    note: 'Fonte di riferimento storica del settore, metodologia pubblica. Tipologia più vicina all\'imboschimento di questa app.',
  },
  {
    fonte: 'MSCI Global ARR Index',
    tipologia: 'Afforestazione/riforestazione/rivegetazione (ARR)',
    prezzo: '~USD 15/t CO2eq',
    dataRiferimento: 'nota di luglio 2026, dati a giugno 2026',
    note: 'Indice con metodologia pubblica.',
  },
  {
    fonte: 'Sylvera (dati di mercato)',
    tipologia: 'Media di tutti i crediti volontari ritirati',
    prezzo: 'USD 6,92/t CO2eq',
    dataRiferimento: 'T3 2026',
    note: 'Media generale su tutte le tipologie, non specifica per carbon farming.',
  },
  {
    fonte: 'Sylvera (dati di mercato)',
    tipologia: 'ARR con rating di qualità BBB o superiore',
    prezzo: 'USD 23,47/t CO2eq',
    dataRiferimento: 'T3 2026',
    note: 'Mostra il premio pagato per i crediti di qualità più alta rispetto alla media generale sopra.',
  },
  {
    fonte: 'AlliedOffsets (via carboncredits.com)',
    tipologia: 'Media di mercato (tutte le tipologie, prezzo spot)',
    prezzo: '~USD 6,10/t CO2eq',
    dataRiferimento: '2025',
    note: 'Dato dell\'anno precedente, non un report 2026 diretto di AlliedOffsets.',
  },
  {
    fonte: 'AlliedOffsets (via carboncredits.com)',
    tipologia: 'ARR rating BBB+ / ARR rating inferiore',
    prezzo: '~USD 26/t CO2eq (BBB+) / ~USD 14/t CO2eq (rating inferiore)',
    dataRiferimento: '2025',
    note: 'Stesso premio qualità osservato da Sylvera sopra, fonte indipendente.',
  },
  {
    fonte: 'Puro.earth / indice Nasdaq CDR biochar',
    tipologia: 'Biochar (rimozione durevole, non carbonio del suolo)',
    prezzo: 'EUR 120–135/t CO2eq (progetti europei fino a EUR 189–210)',
    dataRiferimento: '2026',
    note: 'Tipologia diversa dal carbonio del suolo: il biochar è una rimozione molto più durevole, prezzata di conseguenza più alta. Non confrontare direttamente con le altre righe.',
  },
  {
    fonte: 'Xpansiv CBL — indice spot N-GEO',
    tipologia: 'Crediti nature-based generici (prevalentemente evitate emissioni/REDD+)',
    prezzo: '~USD 4,65/t CO2eq',
    dataRiferimento: '2026 (rilevazione non datata con precisione)',
    note: 'Tipologia di evitata emissione, non di rimozione: generalmente la più economica del gruppo.',
  },
  {
    fonte: 'AlliedOffsets (via Carbon Pulse) — progetti America Latina',
    tipologia: 'Crediti nature-based, principalmente America Latina',
    prezzo: 'sotto USD 16/t CO2eq',
    dataRiferimento: '2026 (dati da inizio anno)',
    note: 'Dato regionale, non generalizzabile all\'Europa.',
  },
]
