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
 * emissive per tipologia di allevamento erano inizialmente tratte da un'unica
 * rassegna sistematica peer-reviewed:
 *
 *   Tsigkas, N.; Anestis, V.; Vatsanidou, A.; Maraveas, C. Measurement, Reporting,
 *   and Verification of Agricultural and Livestock Emissions: A Combined
 *   Systematic and Bibliometric Review. AgriEngineering 2026, 8, 110.
 *   https://doi.org/10.3390/agriengineering8030110
 *
 * che cita studi da contesti molto diversi (Sud Africa, Brasile, Cina, Corea del
 * Sud...), non sempre rappresentativi di un allevamento italiano/europeo. Per i
 * bovini (da latte e da carne) i valori sono stati sostituiti con studi europei e
 * nordamericani specifici (si veda la fonte di ciascuna voce qui sotto); per
 * suini, ovicaprini e avicoli resta per ora la fonte Tsigkas et al. 2026 —
 * revisione non ancora fatta, in sospeso.
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
    rangeMinTCO2PerTProdotto: 0.6,
    rangeMaxTCO2PerTProdotto: 2.13,
    defaultTCO2PerTProdotto: 1.43,
    fonte:
      'Studi europei e nordamericani (sostituiti i valori extra-UE/NA della fonte generale usata in ' +
      "precedenza, Tsigkas et al. 2026): 1,43±0,30 t/t in Val Padana, Italia, 19 aziende conferenti a un " +
      "caseificio Grana Padano DOP — default, stesso contesto geografico delle aziende clienti " +
      "(Carbon Footprint Assessment of Dairy Milk and Grana Padano PDO Cheese and Improvement Scenarios: " +
      "A Case Study in the Po Valley (Italy), PMC11939476); 1,20 t/t media (range 0,60–2,13) su 221 " +
      "aziende irlandesi al pascolo (O'Brien, Hennessy, Moran, Shalloo 2015, J. Dairy Sci. 98(10):7394–7407). " +
      'Per un confronto con metodologia armonizzata su scala più ampia (non ristretto a UE/Nord America, ' +
      'range globale ricalcolato 0,74–5,99 t/t) si veda anche Mazzetto, Falconer, Ledgard 2022, J. Dairy ' +
      'Sci. 105(12):9713–9725. Scegli il valore più vicino al tuo sistema di allevamento.',
  },
  bovini_da_carne: {
    prodotto: 'carne (peso vivo o carcassa)',
    rangeMinTCO2PerTProdotto: 7.0,
    rangeMaxTCO2PerTProdotto: 45.7,
    defaultTCO2PerTProdotto: 20.5,
    fonte:
      'Studi europei e nordamericani (sostituiti i valori extra-UE/NA della fonte generale usata in ' +
      'precedenza, Tsigkas et al. 2026): media UE 20,5 t/t carcassa, range 7,0–45,7 — default (13,5 t/t ' +
      'per bovini da latte avviati a carne, 25,5 t/t per la linea vacca-vitello: scegli il valore più ' +
      'vicino al tuo sistema) — Pishgar-Komleh & Beldman 2022, Wageningen Livestock Research per SAI ' +
      'Platform/European Roundtable for Beef Sustainability; media USA 21,3±2,3 t/t carcassa, ' +
      'valutazione nazionale su 7 regioni (Rotz, Asem-Hiablie, Place, Thoma 2018, Agricultural Systems ' +
      '169:1–13); media Nord America 21,4 t/t (range 10,2–37,6), revisione di studi 2000-2023 (Wang, ' +
      'Kreuter, Davis, Cheye 2024, PNAS 121(31):e2321245121).',
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
  fonteEmissioniUsata: 'letteratura' | 'specifiche_aziendali'
  bilancioSimulatoTCO2: number
  formulaBilancio: string
}

/** Dato specifico aziendale alternativo alla media di letteratura per le
 * emissioni dirette del bilancio simulato — tipicamente la somma di metano
 * enterico e gestione reflui calcolati altrove (si veda
 * lib/metanoEnterico.ts e lib/gestioneReflui.ts) sui dati reali della
 * mandria, invece di un'intensità media presa da allevamenti di contesti
 * anche molto diversi (sistemi di allevamento e aree geografiche diverse). */
export interface EmissioniSpecificheAziendali {
  totaleTCO2: number
  formula: string
}

export function calcolaSimulazioneZootecnia(
  mangimi: MangimeRigaInput[],
  produzioneAnnuaTProdotto: number,
  intensitaEmissivaTCO2eqPerTProdotto: number,
  emissioniSpecificheAziendali?: EmissioniSpecificheAziendali,
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

  const fonteEmissioniUsata: 'letteratura' | 'specifiche_aziendali' =
    emissioniSpecificheAziendali != null ? 'specifiche_aziendali' : 'letteratura'
  const emissioniTotaliTCO2 =
    emissioniSpecificheAziendali != null
      ? emissioniSpecificheAziendali.totaleTCO2
      : produzioneAnnuaTProdotto * intensitaEmissivaTCO2eqPerTProdotto
  const formulaEmissioni =
    emissioniSpecificheAziendali != null
      ? emissioniSpecificheAziendali.formula
      : `${n(produzioneAnnuaTProdotto)} t prodotto × ${n(intensitaEmissivaTCO2eqPerTProdotto)} t CO2eq/t prodotto = ${n(emissioniTotaliTCO2)} t CO2eq`

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
    fonteEmissioniUsata,
    bilancioSimulatoTCO2,
    formulaBilancio,
  }
}
