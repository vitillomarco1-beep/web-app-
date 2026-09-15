/**
 * Standardizzazione della produzione di latte "tal quale" (misurata) su una base
 * comparabile a composizione fissa, a partire dalle analisi del latte (grasso,
 * proteina, lattosio %) — dati facilmente reperibili da un'azienda zootecnica
 * (bollettino qualità latte, analisi periodiche del caseificio/cooperativa, ecc.).
 *
 * Due misure standard, con fonti diverse:
 *
 * - FPCM (Fat and Protein Corrected Milk), standard IDF (International Dairy
 *   Federation), riferito a 4,0% grasso e 3,3% proteina:
 *     FPCM (kg) = latte (kg) × (0,1226 × grasso% + 0,0776 × proteina% + 0,2534)
 *
 * - ECM (Energy Corrected Milk), formula nordica di Sjaunja et al. (1990), basata
 *   sul contenuto energetico di grasso, proteina e lattosio (g/kg):
 *     ECM (kg) = latte (kg) × (38,3 × grasso_g/kg + 24,2 × proteina_g/kg +
 *                16,54 × lattosio_g/kg + 20,7) / 3140
 *
 * - FCM 3,5% (Fat Corrected Milk), formula storica di Gaines (1928), basata solo
 *   sul grasso, riferita al 3,5% di grasso:
 *     FCM 3,5% (kg) = 0,4324 × latte (kg) + 16,216 × grasso (kg)
 *   dove grasso (kg) = latte (kg) × grasso% / 100. In funzione della percentuale:
 *     FCM 3,5% (kg) = latte (kg) × (0,4324 + 0,16216 × grasso%)
 *
 * Le tre misure sono simili ma non identiche: FCM 3,5% considera solo il grasso
 * (nessuna correzione per la proteina), FPCM considera grasso e proteina, ECM
 * include anche il lattosio (energia totale del latte). L'intensità emissiva di
 * riferimento per bovini da latte (Tsigkas et al. 2026, si veda
 * lib/simulazioneZootecnia.ts) è espressa in t CO2eq per t di FPCM: per restare
 * coerenti con quella fonte conviene usare il valore FPCM nella simulazione. ECM e
 * FCM 3,5% restano comunque utili come riferimento/confronto: sono le misure più
 * diffuse rispettivamente nei bollettini di qualità del latte nordeuropei (ECM) e
 * nella tradizione statunitense/storica (FCM 3,5%).
 */

export interface AnalisiLatte {
  produzioneTalQualeTAnno: number
  grassoPercento: number
  proteinaPercento: number
  lattosioPercento: number
}

export interface RisultatoStandardizzazioneLatte {
  fattoreFpcm: number
  fpcmTAnno: number
  formulaFpcm: string
  fattoreEcm: number
  ecmTAnno: number
  formulaEcm: string
  fattoreFcm35: number
  fcm35TAnno: number
  formulaFcm35: string
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 4 }).format(v)
}

export function calcolaStandardizzazioneLatte(analisi: AnalisiLatte): RisultatoStandardizzazioneLatte {
  const { produzioneTalQualeTAnno: p, grassoPercento: g, proteinaPercento: pr, lattosioPercento: l } = analisi

  const fattoreFpcm = 0.1226 * g + 0.0776 * pr + 0.2534
  const fpcmTAnno = p * fattoreFpcm
  const formulaFpcm =
    `${n(p)} t × (0,1226 × ${n(g)} + 0,0776 × ${n(pr)} + 0,2534) = ` +
    `${n(p)} × ${n(fattoreFpcm)} = ${n(fpcmTAnno)} t FPCM`

  const gGkg = g * 10
  const prGkg = pr * 10
  const lGkg = l * 10
  const fattoreEcm = (38.3 * gGkg + 24.2 * prGkg + 16.54 * lGkg + 20.7) / 3140
  const ecmTAnno = p * fattoreEcm
  const formulaEcm =
    `${n(p)} t × (38,3×${n(gGkg)} + 24,2×${n(prGkg)} + 16,54×${n(lGkg)} + 20,7) / 3140 = ` +
    `${n(p)} × ${n(fattoreEcm)} = ${n(ecmTAnno)} t ECM`

  const fattoreFcm35 = 0.4324 + 0.16216 * g
  const fcm35TAnno = p * fattoreFcm35
  const formulaFcm35 =
    `${n(p)} t × (0,4324 + 0,16216 × ${n(g)}) = ` +
    `${n(p)} × ${n(fattoreFcm35)} = ${n(fcm35TAnno)} t FCM 3,5%`

  return {
    fattoreFpcm,
    fpcmTAnno,
    formulaFpcm,
    fattoreEcm,
    ecmTAnno,
    formulaEcm,
    fattoreFcm35,
    fcm35TAnno,
    formulaFcm35,
  }
}
