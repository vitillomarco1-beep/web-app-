/**
 * Importa un elenco di appezzamenti da un CSV/Excel esportato dal gestionale
 * del quaderno di campagna digitale del cliente (SIAN, gestionali regionali o
 * privati) — invece di inserirli uno per uno a mano. Riconosce automaticamente
 * la virgola, il punto e virgola o il tab come separatore (Excel usa spesso il
 * punto e virgola nelle impostazioni italiane, o il tab quando si incolla
 * direttamente da un foglio di calcolo).
 *
 * Cerca tre colonne per nome (case-insensitive, tollerante a spazi/accenti):
 * nome dell'appezzamento, superficie in ettari, coltura principale. Non
 * inventa colonne mancanti: se una delle tre non si trova, l'importazione si
 * ferma con un errore esplicito invece di indovinare quale colonna usare.
 *
 * Una coltura scritta diversamente da COLTURE_RESIDUI (lib/residuiColturali.ts)
 * non viene scartata né forzata: resta così com'è nel CSV, e verrà
 * semplicemente esclusa dal calcolo automatico dell'apporto di residui finché
 * non viene corretta — lo stesso comportamento già previsto per un
 * appezzamento inserito a mano con un nome di coltura libero.
 */

import { COLTURE_RESIDUI } from './residuiColturali'

export interface RigaAppezzamentoImportata {
  nome: string
  superficieHa: number
  colturaPrincipale: string
  colturaRiconosciuta: boolean
}

export interface RisultatoImportazioneCsv {
  righe: RigaAppezzamentoImportata[]
  errori: string[]
}

const ALIAS_NOME = ['nome', 'appezzamento', 'particella', 'campo', 'nomeappezzamento']
const ALIAS_SUPERFICIE = ['superficie', 'ha', 'ettari', 'superficieha', 'sup']
const ALIAS_COLTURA = ['coltura', 'colturaprincipale', 'coltivazione', 'specie']

function normalizzaIntestazione(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove gli accenti
    .replace(/[^a-z0-9]/g, '')
}

function rilevaDelimitatore(primaRiga: string): string {
  const conta = (ch: string) => (primaRiga.match(new RegExp(`\\${ch}`, 'g')) || []).length
  const virgole = conta(',')
  const tab = (primaRiga.match(/\t/g) || []).length
  const puntoVirgola = conta(';')
  if (tab >= virgole && tab >= puntoVirgola && tab > 0) return '\t'
  if (puntoVirgola > virgole) return ';'
  return ','
}

export function importaAppezzamentiDaCsv(testo: string): RisultatoImportazioneCsv {
  const righeTesto = testo
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
  if (righeTesto.length === 0) {
    return { righe: [], errori: ['Nessun dato trovato: incolla o carica un file non vuoto.'] }
  }

  const delimitatore = rilevaDelimitatore(righeTesto[0])
  const intestazioni = righeTesto[0].split(delimitatore).map(normalizzaIntestazione)
  const idxNome = intestazioni.findIndex((h) => ALIAS_NOME.includes(h))
  const idxSuperficie = intestazioni.findIndex((h) => ALIAS_SUPERFICIE.includes(h))
  const idxColtura = intestazioni.findIndex((h) => ALIAS_COLTURA.includes(h))

  const errori: string[] = []
  if (idxNome === -1) errori.push('Colonna del nome appezzamento non trovata (es. "Nome", "Appezzamento", "Particella", "Campo").')
  if (idxSuperficie === -1) errori.push('Colonna della superficie non trovata (es. "Superficie", "Ha", "Ettari").')
  if (idxColtura === -1) errori.push('Colonna della coltura non trovata (es. "Coltura", "Coltivazione", "Specie").')
  if (errori.length > 0) return { righe: [], errori }

  const righe: RigaAppezzamentoImportata[] = []
  for (let i = 1; i < righeTesto.length; i++) {
    const celle = righeTesto[i].split(delimitatore)
    const nome = (celle[idxNome] ?? '').trim()
    if (!nome) continue
    const superficieTesto = (celle[idxSuperficie] ?? '0').trim().replace(',', '.')
    const superficieHa = parseFloat(superficieTesto) || 0
    const colturaPrincipale = (celle[idxColtura] ?? '').trim() || 'Altro'
    const colturaRiconosciuta = COLTURE_RESIDUI.some(
      (c) => c.nome.toLowerCase() === colturaPrincipale.toLowerCase(),
    )
    righe.push({ nome, superficieHa, colturaPrincipale, colturaRiconosciuta })
  }

  if (righe.length === 0) {
    return { righe: [], errori: ['Intestazioni riconosciute, ma nessuna riga di dati valida trovata sotto di esse.'] }
  }
  return { righe, errori: [] }
}
