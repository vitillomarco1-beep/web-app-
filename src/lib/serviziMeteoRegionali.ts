/**
 * Elenco, curato e verificato manualmente, dei servizi agrometeorologici
 * pubblici ufficiali delle regioni italiane: non un'API, solo un collegamento
 * diretto al portale giusto in base all'ubicazione del cliente, per evitare di
 * doverlo cercare ogni volta da zero. Ogni ente pubblica i propri dati storici
 * (di solito in Excel o CSV) scaricabili gratuitamente ma non richiamabili
 * direttamente dal browser di questa app (niente API con CORS abilitato,
 * spesso autenticazione o moduli di richiesta): il flusso resta "scarica tu il
 * file dal link, poi incollalo o inseriscilo qui" — coerente con il fatto che
 * l'app gira interamente nel browser, senza un server nostro che possa
 * custodire credenziali o fare da tramite.
 *
 * Trentino-Alto Adige è diviso nelle sue due province autonome, che gestiscono
 * servizi meteorologici distinti e separati (Trento e Bolzano).
 *
 * Questi sono siti istituzionali esterni che non controlliamo: indirizzi e
 * formati possono cambiare nel tempo senza preavviso.
 */

export interface ServizioMeteoRegionale {
  ente: string
  url: string
  nota?: string
}

export const SERVIZI_METEO_REGIONALI: Record<string, ServizioMeteoRegionale> = {
  Abruzzo: {
    ente: 'Servizio Agrometeorologico Regionale — Regione Abruzzo',
    url: 'https://www.regione.abruzzo.it/content/servizio-agrometeorologico',
  },
  Basilicata: {
    ente: 'ALSIA — Servizio Agrometeorologico Lucano (SAL)',
    url: 'https://www.alsia.it/opencms/opencms/Temi/dettaglio/Agrometeorologia/',
  },
  Calabria: {
    ente: 'ARSAC — Servizio Agrometeorologico Regionale',
    url: 'https://www.arsacweb.it/arsac-dati-meteorologici-e-climatici-regionali/',
    nota: 'Per dati meteo-idrologici generali vedi anche ARPACAL, Centro Funzionale Multirischi (cfd.calabria.it).',
  },
  Campania: {
    ente: 'Centro Agrometeorologico Regionale (C.A.R.) — Regione Campania, Assessorato Agricoltura',
    url: 'https://agricoltura.regione.campania.it/meteo/agrometeo.htm',
  },
  'Emilia-Romagna': {
    ente: 'ARPAE — sistema Dext3r (estrazione dati gratuita)',
    url: 'https://simc.arpae.it/dext3r/',
  },
  'Friuli-Venezia Giulia': {
    ente: 'OSMER — Osservatorio Meteorologico Regionale, ARPA FVG',
    url: 'https://www.osmer.fvg.it/',
  },
  Lazio: {
    ente: 'ARSIAL — SIARL, Servizio Integrato Agrometeorologico della Regione Lazio',
    url: 'https://siarl.arsial.it/',
  },
  Liguria: {
    ente: 'ARPAL — dati osservati',
    url: 'https://www.arpal.liguria.it/tematiche/meteo/dati-osservati.html',
  },
  Lombardia: {
    ente: 'ARPA Lombardia — Agrometeo e richiesta dati',
    url: 'https://www.arpalombardia.it/temi-ambientali/meteo-e-clima/form-richiesta-dati/',
  },
  Marche: {
    ente: 'AMAP (ex ASSAM) — Centro Operativo Agrometeorologia',
    url: 'https://meteo.regione.marche.it/',
    nota: "Il vecchio indirizzo agrometeo.assam.marche.it non è più aggiornato: il servizio è migrato all'URL qui indicato.",
  },
  Molise: {
    ente: 'ARSARP — servizio agrometeorologico regionale',
    url: 'https://www.regione.molise.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/10855',
  },
  Piemonte: {
    ente: 'ARPA Piemonte — Banca Dati Storica (rete agrometeorologica RAM)',
    url: 'https://www.arpa.piemonte.it/dato/banca-dati-storica-dati-giornalieri-mensili',
  },
  Puglia: {
    ente: 'ARIF Puglia — Agrometeopuglia',
    url: 'https://www.agrometeopuglia.it/',
  },
  Sardegna: {
    ente: 'ARPAS — Dipartimento Meteoclimatico',
    url: 'https://www.sar.sardegna.it/servizi/dati/datistazioni.asp',
  },
  Sicilia: {
    ente: 'SIAS — Servizio Informativo Agrometeorologico Siciliano',
    url: 'http://www.sias.regione.sicilia.it/',
  },
  Toscana: {
    ente: 'Consorzio LaMMA — dati stazioni',
    url: 'https://www.lamma.toscana.it/meteo/osservazioni-e-dati/dati-stazioni',
  },
  'Trentino-Alto Adige – Trento': {
    ente: 'Meteotrentino — Provincia Autonoma di Trento',
    url: 'https://www.meteotrentino.it/dati/',
  },
  'Trentino-Alto Adige – Bolzano': {
    ente: 'Ufficio Idrografico — Provincia Autonoma di Bolzano',
    url: 'https://wetter.provinz.bz.it/it/download-dati',
  },
  Umbria: {
    ente: 'Servizio Idrografico Regionale (SIR Umbria)',
    url: 'https://dati.regione.umbria.it/dataset/sir_stazioni_meteo',
  },
  "Valle d'Aosta": {
    ente: "Centro Funzionale — Regione Autonoma Valle d'Aosta",
    url: 'https://cf.regione.vda.it/it/agrometeorologia',
  },
  Veneto: {
    ente: 'ARPA Veneto — Agrometeo',
    url: 'https://www.arpa.veneto.it/temi-ambientali/agrometeo',
  },
}

export const REGIONI_ITALIANE = Object.keys(SERVIZI_METEO_REGIONALI)
