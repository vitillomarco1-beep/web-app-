// Configurazione della versione dimostrativa: nessun dato dell'azienda reale e nessun utente.
export const AZIENDA = {
  nome: 'Azienda Agricola Demo',
  nomeBreve: 'Demo',
  fondazione: 2000,
  slogan: 'Gestionale di stalla su misura',
  descrizioneBreve: 'Versione dimostrativa con dati inventati.',
  indirizzo: '',
  telefono: '',
  email: '',
  partitaIva: '',
  orari: '',
}
export interface Prodotto { nome: string; descrizione: string; dettagli: string[]; inEvidenza?: boolean }
export const PRODOTTI: Prodotto[] = []
export const ROBOT = { totale: 0, descrizione: '' }
export const BENEFICI_ROBOT: { titolo: string; testo: string; icona: 'clock' | 'heart' | 'activity' | 'droplet' | 'wheat' | 'users' }[] = []
export const VALORI: { titolo: string; testo: string }[] = []
export type Ruolo = 'titolare' | 'collaboratore'
export const UTENTI_DEMO: { utente: string; password: string; ruolo: Ruolo; descrizione: string }[] = []
