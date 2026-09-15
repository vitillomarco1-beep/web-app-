/**
 * Simulazione, esplicitamente NON CERTIFICABILE, di un possibile bilancio tra
 * l'assorbimento di carbonio dell'alimento autoprodotto ingerito dagli animali e le
 * emissioni dirette dell'allevamento, espresse come intensità emissiva per unità di
 * prodotto (latte, carne, uova) — la stessa logica "per unità di prodotto" su
 * entrambi i lati del bilancio.
 *
 * Nessun atto delegato dell'UE definisce oggi una metodologia per la zootecnia:
 * questo strumento anticipa un'ipotesi di come una futura normativa potrebbe
 * rendicontare questi due termini, a scopo di pianificazione — non sostituisce e
 * non entra nel calcolo ufficiale dei crediti (risultato.metodologiaDisponibile
 * resta false per la zootecnia finché non esiste una base normativa reale).
 *
 * NOTA DI TRASPARENZA SULLE FONTI: la frazione di carbonio degli alimenti (~45%
 * della sostanza secca, valore tipico generico della biomassa vegetale) resta una
 * stima indicativa non verificata contro una tabella specifica. Le intensità
 * emissive per tipologia di allevamento, invece, sono tratte da una rassegna
 * sistematica peer-reviewed:
 *
 *   Tsigkas, N.; Anestis, V.; Vatsanidou, A.; Maraveas, C. Measurement, Reporting,
 *   and Verification of Agricultural and Livestock Emissions: A Combined
 *   Systematic and Bibliometric Review. AgriEngineering 2026, 8, 110.
 *   https://doi.org/10.3390/agriengineering8030110
 *
 * Sono comunque intervalli di letteratura molto ampi (i sistemi di allevamento
 * intensivi ed estensivi, e le diverse aree geografiche, danno risultati anche di
 * un ordine di grandezza diversi): il default proposto è un valore centrale
 * indicativo, da sostituire con quello più vicino al sistema di allevamento reale
 * o con dati aziendali specifici prima di qualunque uso diverso dalla
 * pianificazione preliminare.
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

export interface IntensitaEmissivaRiferimento {
  prodotto: string
  rangeMinTCO2PerTProdotto: number
  rangeMaxTCO2PerTProdotto: number
  defaultTCO2PerTProdotto: number
  fonte: string
}

/** Intensità emissiva (t CO2eq per t di prodotto) per tipologia di allevamento, da
 * Tsigkas et al. 2026 (si veda l'intestazione del file per il riferimento
 * completo). Assente per "misto"/"altro": troppo eterogeneo per un default unico,
 * va inserito a mano. */
export const INTENSITA_EMISSIVA_RIFERIMENTO: Partial<Record<TipologiaAllevamento, IntensitaEmissivaRiferimento>> = {
  bovini_da_latte: {
    prodotto: 'latte (FPCM, corretto per grasso e proteina)',
    rangeMinTCO2PerTProdotto: 0.9,
    rangeMaxTCO2PerTProdotto: 4.0,
    defaultTCO2PerTProdotto: 1.36,
    fonte:
      'Tsigkas et al. 2026: 0,90–1,10 t/t in media generale; 1,36 t/t in allevamenti da ' +
      'pascolo (Sud Africa, 82 aziende); 2,19–2,41 t/t in piccole aziende familiari (Brasile); ' +
      '2,73–3,99 t/t in sistemi estensivi (Grecia, Tier II IPCC). Scegli il valore più vicino ' +
      'al tuo sistema di allevamento.',
  },
  bovini_da_carne: {
    prodotto: 'carne (peso vivo o carcassa)',
    rangeMinTCO2PerTProdotto: 8.6,
    rangeMaxTCO2PerTProdotto: 50.9,
    defaultTCO2PerTProdotto: 15.3,
    fonte:
      'Tsigkas et al. 2026: 15,3 t/t di peso vivo (Australia occidentale); intervallo ' +
      '8,63–50,88 t/t di carcassa a seconda del sistema (studi basati su IPCC). Intervallo ' +
      'molto ampio: verifica quale estremo si avvicina di più al tuo allevamento.',
  },
  suini: {
    prodotto: 'carne (peso vivo)',
    rangeMinTCO2PerTProdotto: 1.55,
    rangeMaxTCO2PerTProdotto: 9.48,
    defaultTCO2PerTProdotto: 3.0,
    fonte:
      'Tsigkas et al. 2026: 1,55–1,78 t/t in Cina (da piccola a grande scala); 2,80–3,89 t/t ' +
      'per suinetto (USA); media 6,75 t/t, intervallo 4,74–9,48 t/t, in allevamenti familiari ' +
      'cinesi.',
  },
  ovicaprini: {
    prodotto: 'carne (carcassa) o latte (FPCM) — scegli in base al tuo allevamento',
    rangeMinTCO2PerTProdotto: 2.12,
    rangeMaxTCO2PerTProdotto: 23.54,
    defaultTCO2PerTProdotto: 3.5,
    fonte:
      'Tsigkas et al. 2026: allevamenti da latte 2,12–3,99 t/t di FPCM (Grecia, Tier I/II ' +
      'IPCC); allevamenti da carne 18,9–23,54 t/t di carcassa (Cina, steppa eurasiatica). ' +
      "Verifica se il tuo allevamento è da latte o da carne prima di usare il default.",
  },
  avicoli: {
    prodotto: 'carne o uova',
    rangeMinTCO2PerTProdotto: 3.7,
    rangeMaxTCO2PerTProdotto: 5.4,
    defaultTCO2PerTProdotto: 4.08,
    fonte:
      'Tsigkas et al. 2026: 4,08 t/t per carne di pollo prodotta in Corea del Sud (56,8% ' +
      "dalle emissioni deriva dalla fase di produzione del mangime); altre fonti citate " +
      'nello stesso studio: 5,4 t/t per carne e 3,7 t/t per uova.',
  },
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface RigaMangimeCalcolata {
  nomeMangime: string
  quantitaTAnno: number
  autoprodotto: boolean
  /** true se i valori di sostanza secca/frazione C usati sono un'analisi di
   * laboratorio specifica dell'alimento (riga), false se è il default indicativo
   * di MANGIMI_RIFERIMENTO (o se manca del tutto, per un alimento personalizzato
   * senza analisi). */
  daAnalisiSpecifica: boolean
  formula: string
  assorbimentoTCO2: number
}

export type MangimeRigaInput = {
  nomeMangime: string
  quantitaTAnno: number
  autoprodotto: boolean
  analisiAlimento?: {
    sostanzaSeccaPercento?: number
    carbonioSostanzaSeccaPercento?: number
  }
}

/** Risolve la sostanza secca (%) di una riga di alimento: l'analisi di
 * laboratorio specifica se presente, altrimenti il default indicativo di
 * MANGIMI_RIFERIMENTO (0 per un alimento personalizzato senza analisi). Usata
 * sia per il calcolo di assorbimento CO2 sia per la stima del metano enterico
 * dalla razione (si veda lib/metanoEnterico.ts), che deve ripartire sulla
 * stessa base di sostanza secca. */
export function risolviSostanzaSeccaPercento(
  nomeMangime: string,
  analisiAlimento?: { sostanzaSeccaPercento?: number },
): number {
  if (analisiAlimento?.sostanzaSeccaPercento != null) return analisiAlimento.sostanzaSeccaPercento
  const rif = MANGIMI_RIFERIMENTO.find((r) => r.nome === nomeMangime)
  return rif ? rif.frazioneSostanzaSecca * 100 : 0
}

/** Calcola, riga per riga, l'assorbimento di CO2 stimato nell'alimento autoprodotto
 * (l'alimento acquistato è escluso dal conteggio ma resta visibile in tabella, con
 * la formula che ne mostra il motivo). Usa l'analisi di laboratorio specifica
 * dell'alimento quando presente in riga, altrimenti il default indicativo di
 * MANGIMI_RIFERIMENTO — per un alimento personalizzato senza analisi il calcolo
 * resta onestamente a zero, invece di applicare in silenzio i valori di un altro
 * alimento. */
export function calcolaRigheMangimi(mangimi: MangimeRigaInput[]): RigaMangimeCalcolata[] {
  return mangimi.map((m) => {
    const rif = MANGIMI_RIFERIMENTO.find((r) => r.nome === m.nomeMangime)
    const c = m.analisiAlimento?.carbonioSostanzaSeccaPercento
    const daAnalisiSpecifica = m.analisiAlimento?.sostanzaSeccaPercento != null && c != null
    const frazioneSostanzaSecca = risolviSostanzaSeccaPercento(m.nomeMangime, m.analisiAlimento) / 100
    const frazioneCarbonioSostanzaSecca = daAnalisiSpecifica ? c! / 100 : (rif?.frazioneCarbonioSostanzaSecca ?? 0)

    if (!m.autoprodotto) {
      return {
        nomeMangime: m.nomeMangime,
        quantitaTAnno: m.quantitaTAnno,
        autoprodotto: false,
        daAnalisiSpecifica,
        formula: 'Acquistato da fuori: assorbimento già attribuito (o attribuibile) a chi l\'ha coltivato — escluso qui per evitare un doppio conteggio.',
        assorbimentoTCO2: 0,
      }
    }
    if (!rif && !daAnalisiSpecifica) {
      return {
        nomeMangime: m.nomeMangime,
        quantitaTAnno: m.quantitaTAnno,
        autoprodotto: true,
        daAnalisiSpecifica: false,
        formula:
          'Alimento personalizzato senza analisi di sostanza secca/frazione di carbonio: inseriscile nella riga per calcolare l\'assorbimento (nessun valore di riferimento disponibile).',
        assorbimentoTCO2: 0,
      }
    }
    const sostanzaSeccaTAnno = m.quantitaTAnno * frazioneSostanzaSecca
    const carbonioTAnno = sostanzaSeccaTAnno * frazioneCarbonioSostanzaSecca
    const assorbimentoTCO2 = carbonioTAnno * CONVERSIONE_C_CO2
    return {
      nomeMangime: m.nomeMangime,
      quantitaTAnno: m.quantitaTAnno,
      autoprodotto: true,
      daAnalisiSpecifica,
      formula:
        `${n(m.quantitaTAnno)} t × ${n(frazioneSostanzaSecca)} (sostanza secca${daAnalisiSpecifica ? ', da analisi' : ', default'}) × ` +
        `${n(frazioneCarbonioSostanzaSecca)} (frazione C${daAnalisiSpecifica ? ', da analisi' : ', default'}) × 44/12 = ${n(assorbimentoTCO2)} t CO2`,
      assorbimentoTCO2,
    }
  })
}

export interface RisultatoSimulazioneZootecnia {
  righeMangimi: RigaMangimeCalcolata[]
  assorbimentoTotaleTCO2: number
  formulaAssorbimento: string
  produzioneAnnuaTProdotto: number
  intensitaEmissivaTCO2eqPerTProdotto: number
  emissioniTotaliTCO2: number
  formulaEmissioni: string
  bilancioSimulatoTCO2: number
  formulaBilancio: string
}

export function calcolaSimulazioneZootecnia(
  mangimi: MangimeRigaInput[],
  produzioneAnnuaTProdotto: number,
  intensitaEmissivaTCO2eqPerTProdotto: number,
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

  const emissioniTotaliTCO2 = produzioneAnnuaTProdotto * intensitaEmissivaTCO2eqPerTProdotto
  const formulaEmissioni = `${n(produzioneAnnuaTProdotto)} t prodotto × ${n(intensitaEmissivaTCO2eqPerTProdotto)} t CO2eq/t prodotto = ${n(emissioniTotaliTCO2)} t CO2eq`

  const bilancioSimulatoTCO2 = assorbimentoTotaleTCO2 - emissioniTotaliTCO2
  const formulaBilancio = `${n(assorbimentoTotaleTCO2)} − ${n(emissioniTotaliTCO2)} = ${n(bilancioSimulatoTCO2)} t CO2eq`

  return {
    righeMangimi,
    assorbimentoTotaleTCO2,
    formulaAssorbimento,
    produzioneAnnuaTProdotto,
    intensitaEmissivaTCO2eqPerTProdotto,
    emissioniTotaliTCO2,
    formulaEmissioni,
    bilancioSimulatoTCO2,
    formulaBilancio,
  }
}
