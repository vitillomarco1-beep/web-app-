/**
 * Simulazione, esplicitamente NON CERTIFICABILE, di un possibile bilancio tra
 * l'assorbimento di carbonio dell'alimento autoprodotto ingerito dagli animali e le
 * emissioni dirette dell'allevamento (fermentazione enterica + gestione reflui).
 *
 * Nessun atto delegato dell'UE definisce oggi una metodologia per la zootecnia:
 * questo strumento anticipa un'ipotesi di come una futura normativa potrebbe
 * rendicontare questi due termini, a scopo di pianificazione — non sostituisce e
 * non entra nel calcolo ufficiale dei crediti (risultato.metodologiaDisponibile
 * resta false per la zootecnia finché non esiste una base normativa reale).
 *
 * NOTA DI TRASPARENZA SULLE FONTI: i fattori di emissione diretta per tipologia di
 * allevamento (fermentazione enterica + gestione reflui) sono stime indicative,
 * costruite a partire da valori Tier 1 IPCC 2006 (Volume 4, cap. 10) reperiti per
 * via indiretta (motore di ricerca, non le tabelle originali) in una sessione con
 * accesso alla rete limitato: non sono stati verificati riga per riga contro la
 * tabella ufficiale. Stessa cautela per la frazione di carbonio degli alimenti (~45%
 * della sostanza secca, valore tipico generico della biomassa vegetale). Vanno
 * confermati o sostituiti dal consulente con dati verificati prima di qualunque
 * uso diverso dalla pianificazione preliminare.
 */

import type { TipologiaAllevamento } from '../types'

export const CONVERSIONE_C_CO2 = 44 / 12

export interface MangimeRiferimento {
  nome: string
  frazioneSostanzaSecca: number
  frazioneCarbonioSostanzaSecca: number
}

export const MANGIMI_RIFERIMENTO: MangimeRiferimento[] = [
  { nome: 'Mais (granella)', frazioneSostanzaSecca: 0.86, frazioneCarbonioSostanzaSecca: 0.45 },
  { nome: 'Mais (insilato, pianta intera)', frazioneSostanzaSecca: 0.33, frazioneCarbonioSostanzaSecca: 0.45 },
  { nome: 'Frumento/orzo (granella)', frazioneSostanzaSecca: 0.87, frazioneCarbonioSostanzaSecca: 0.45 },
  { nome: 'Soia (seme/farina)', frazioneSostanzaSecca: 0.9, frazioneCarbonioSostanzaSecca: 0.45 },
  { nome: 'Foraggio/fieno', frazioneSostanzaSecca: 0.85, frazioneCarbonioSostanzaSecca: 0.45 },
  { nome: 'Erba/pascolo fresco', frazioneSostanzaSecca: 0.2, frazioneCarbonioSostanzaSecca: 0.45 },
]

/** t CO2eq per capo all'anno — stima indicativa di fermentazione enterica (CH4) +
 * gestione reflui (CH4+N2O) combinate, GWP inclusi. Assente per "misto"/"altro":
 * troppo eterogeneo per un default unico, va inserito a mano. */
export const FATTORE_EMISSIONE_DIRETTA_TIPOLOGIA: Partial<Record<TipologiaAllevamento, number>> = {
  bovini_da_latte: 4.1,
  bovini_da_carne: 1.8,
  suini: 0.43,
  ovicaprini: 0.19,
  avicoli: 0.02,
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface RigaMangimeCalcolata {
  nomeMangime: string
  quantitaTAnno: number
  autoprodotto: boolean
  formula: string
  assorbimentoTCO2: number
}

/** Calcola, riga per riga, l'assorbimento di CO2 stimato nell'alimento autoprodotto
 * (l'alimento acquistato è escluso dal conteggio ma resta visibile in tabella, con
 * la formula che ne mostra il motivo). */
export function calcolaRigheMangimi(
  mangimi: { nomeMangime: string; quantitaTAnno: number; autoprodotto: boolean }[],
): RigaMangimeCalcolata[] {
  return mangimi.map((m) => {
    const rif = MANGIMI_RIFERIMENTO.find((r) => r.nome === m.nomeMangime) ?? MANGIMI_RIFERIMENTO[0]
    if (!m.autoprodotto) {
      return {
        nomeMangime: m.nomeMangime,
        quantitaTAnno: m.quantitaTAnno,
        autoprodotto: false,
        formula: 'Acquistato da fuori: assorbimento già attribuito (o attribuibile) a chi l\'ha coltivato — escluso qui per evitare un doppio conteggio.',
        assorbimentoTCO2: 0,
      }
    }
    const sostanzaSeccaTAnno = m.quantitaTAnno * rif.frazioneSostanzaSecca
    const carbonioTAnno = sostanzaSeccaTAnno * rif.frazioneCarbonioSostanzaSecca
    const assorbimentoTCO2 = carbonioTAnno * CONVERSIONE_C_CO2
    return {
      nomeMangime: m.nomeMangime,
      quantitaTAnno: m.quantitaTAnno,
      autoprodotto: true,
      formula:
        `${n(m.quantitaTAnno)} t × ${n(rif.frazioneSostanzaSecca)} (sostanza secca) × ` +
        `${n(rif.frazioneCarbonioSostanzaSecca)} (frazione C) × 44/12 = ${n(assorbimentoTCO2)} t CO2`,
      assorbimentoTCO2,
    }
  })
}

export interface RisultatoSimulazioneZootecnia {
  righeMangimi: RigaMangimeCalcolata[]
  assorbimentoTotaleTCO2: number
  formulaAssorbimento: string
  emissioniDirettePerCapoTCO2eqAnno: number
  numeroCapiMedio: number
  emissioniTotaliTCO2: number
  formulaEmissioni: string
  bilancioSimulatoTCO2: number
  formulaBilancio: string
}

export function calcolaSimulazioneZootecnia(
  mangimi: { nomeMangime: string; quantitaTAnno: number; autoprodotto: boolean }[],
  emissioniDirettePerCapoTCO2eqAnno: number,
  numeroCapiMedio: number,
): RisultatoSimulazioneZootecnia {
  const righeMangimi = calcolaRigheMangimi(mangimi)
  const assorbimentoTotaleTCO2 = righeMangimi.reduce((tot, r) => tot + r.assorbimentoTCO2, 0)
  const formulaAssorbimento =
    righeMangimi.filter((r) => r.autoprodotto).length > 0
      ? righeMangimi
          .filter((r) => r.autoprodotto)
          .map((r) => n(r.assorbimentoTCO2))
          .join(' + ') + ` = ${n(assorbimentoTotaleTCO2)} t CO2`
      : 'Nessun alimento autoprodotto inserito = 0 t CO2'

  const emissioniTotaliTCO2 = emissioniDirettePerCapoTCO2eqAnno * numeroCapiMedio
  const formulaEmissioni = `${n(emissioniDirettePerCapoTCO2eqAnno)} t CO2eq/capo/anno × ${n(numeroCapiMedio)} capi = ${n(emissioniTotaliTCO2)} t CO2eq`

  const bilancioSimulatoTCO2 = assorbimentoTotaleTCO2 - emissioniTotaliTCO2
  const formulaBilancio = `${n(assorbimentoTotaleTCO2)} − ${n(emissioniTotaliTCO2)} = ${n(bilancioSimulatoTCO2)} t CO2eq`

  return {
    righeMangimi,
    assorbimentoTotaleTCO2,
    formulaAssorbimento,
    emissioniDirettePerCapoTCO2eqAnno,
    numeroCapiMedio,
    emissioniTotaliTCO2,
    formulaEmissioni,
    bilancioSimulatoTCO2,
    formulaBilancio,
  }
}
