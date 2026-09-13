import type { TipoAttivita } from '../types'

export interface AttivitaOpzione {
  tipo: TipoAttivita
  titolo: string
  descrizione: string
  icona: string
  inPreparazione?: boolean
}

/** I tre ambiti di riferimento del calcolatore, condivisi tra la Panoramica e la
 * creazione di un nuovo calcolo. */
export const ATTIVITA_OPZIONI: AttivitaOpzione[] = [
  {
    tipo: 'agricoltura_agroforestazione',
    titolo: 'Agricoltura e agroforestazione su suoli minerali',
    descrizione:
      'Pratiche su terre coltivate e prati: gestione colture, lavorazione conservativa, agroforestazione, riduzione N2O.',
    icona: '🌾',
  },
  {
    tipo: 'imboschimento',
    titolo: 'Imboschimento',
    descrizione:
      'Nuovo impianto boschivo su prati, terre coltivate o altri terreni con bassa copertura arborea preesistente.',
    icona: '🌳',
  },
  {
    tipo: 'zootecnia',
    titolo: 'Zootecnia',
    descrizione:
      'Fermentazione enterica, gestione effluenti, alimentazione e pascolo. Raccogli fin da ora i dati del cliente: il calcolo sarà attivato alla pubblicazione della metodologia UE dedicata.',
    icona: '🐄',
    inPreparazione: true,
  },
]
