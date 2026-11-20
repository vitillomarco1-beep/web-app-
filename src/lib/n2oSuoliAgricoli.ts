/**
 * Emissioni di N2O (dirette e indirette) dall'azoto applicato ai suoli agricoli
 * tramite fertilizzazione — IPCC (2006) Guidelines for National Greenhouse Gas
 * Inventories, Vol. 4, Cap. 11 (N2O Emissions From Managed Soils), Tier 1.
 *
 * Tabelle ed equazioni verificate direttamente sul PDF ufficiale IPCC
 * (www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_11_Ch11_N2O&CO2.pdf),
 * non da fonti secondarie.
 *
 * N2O DIRETTO — Equazione 11.1 (semplificata: solo i termini FSN e FON, i più
 * rilevanti e gli unici quantificabili dal quaderno di campagna; esclusi FCR —
 * azoto dei residui colturali restituiti — e FSOM — azoto mineralizzato da
 * perdita di sostanza organica del suolo — perché nessuna fonte verificata di
 * contenuto di azoto dei residui è ancora disponibile in questa versione):
 *
 *   N2O diretto-N (kg/anno) = (FSN + FON) × EF1
 *   N2O diretto (kg/anno) = N2O diretto-N × 44/28
 *
 * dove FSN = azoto da fertilizzanti minerali (kg N/anno), FON = azoto da
 * ammendanti organici (kg N/anno), EF1 = 0,01 kg N2O-N/kg N (Tabella 11.1,
 * valore di default, intervallo di incertezza 0,003-0,03).
 *
 * N2O INDIRETTO — due componenti (Equazioni 11.9 e 11.10):
 *
 * 1) Da volatilizzazione e rideposizione atmosferica (NH3/NOx):
 *      N volatilizzato (kg/anno) = FSN × FracGASF + FON × FracGASM
 *      N2O indiretto volat.-N (kg/anno) = N volatilizzato × EF4
 *    dove FracGASF = 0,10 (fertilizzanti minerali), FracGASM = 0,20
 *    (fertilizzanti/ammendanti organici), EF4 = 0,010 kg N2O-N/kg N
 *    volatilizzato (tutti Tabella 11.3).
 *
 * 2) Da lisciviazione/ruscellamento — si applica SOLO nelle regioni dove le
 *    precipitazioni (nella stagione delle piogge) superano la capacità di
 *    ritenzione idrica del suolo, o dove si irriga (tranne che a goccia):
 *    altrimenti FracLEACH-(H) è per definizione zero (nota della Tabella 11.3):
 *      N lisciviato (kg/anno) = (FSN + FON) × FracLEACH-(H)
 *      N2O indiretto lisciv.-N (kg/anno) = N lisciviato × EF5
 *    dove FracLEACH-(H) = 0,30 (solo se applicabile), EF5 = 0,0075 kg N2O-N/kg
 *    N lisciviato (entrambi Tabella 11.3).
 *
 * La massa di N2O-N si converte in N2O moltiplicando per 44/28 (rapporto tra i
 * pesi molecolari di N2O e dei due atomi di azoto).
 */

import { GWP_VALORI } from './reportSteps'

const GWP_N2O = GWP_VALORI.find((g) => g.formula === 'N2O')!.gwp

export const EF1_N2O_DIRETTO = 0.01
export const EF4_VOLATILIZZAZIONE = 0.01
export const EF5_LISCIVIAZIONE = 0.0075
export const FRAC_GASF_MINERALE = 0.1
export const FRAC_GASM_ORGANICO = 0.2
export const FRAC_LEACH_H = 0.3

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface InputN2oSuoliAgricoli {
  /** FSN — azoto da fertilizzanti minerali applicato nel periodo, kg N/anno. */
  fsnKgAnno: number
  /** FON — azoto da ammendanti/fertilizzanti organici applicato nel periodo, kg N/anno. */
  fonKgAnno: number
  /** true solo se la zona ha un clima dove le piogge superano la capacità di
   * ritenzione idrica del suolo, o si irriga (tranne a goccia) — altrimenti
   * FracLEACH-(H) è zero per definizione IPCC (Tabella 11.3, nota). */
  lisciviazioneApplicabile: boolean
}

export interface RisultatoN2oSuoliAgricoli {
  n2oDirettoKgAnno: number
  formulaDiretto: string
  n2oIndirettoVolatilizzazioneKgAnno: number
  formulaVolatilizzazione: string
  n2oIndirettoLisciviazioneKgAnno: number
  formulaLisciviazione: string
  totaleKgAnno: number
  totaleTCO2eq: number
  formulaTotale: string
}

export function calcolaN2oSuoliAgricoli(input: InputN2oSuoliAgricoli): RisultatoN2oSuoliAgricoli {
  const { fsnKgAnno, fonKgAnno, lisciviazioneApplicabile } = input

  const n2oDirettoNKgAnno = (fsnKgAnno + fonKgAnno) * EF1_N2O_DIRETTO
  const n2oDirettoKgAnno = n2oDirettoNKgAnno * (44 / 28)
  const formulaDiretto =
    `(${n(fsnKgAnno)} kg N minerale + ${n(fonKgAnno)} kg N organico) × ${EF1_N2O_DIRETTO} (EF1) = ` +
    `${n(n2oDirettoNKgAnno)} kg N2O-N × 44/28 = ${n(n2oDirettoKgAnno)} kg N2O/anno`

  const nVolatilizzatoKgAnno = fsnKgAnno * FRAC_GASF_MINERALE + fonKgAnno * FRAC_GASM_ORGANICO
  const n2oIndirettoVolatilizzazioneNKgAnno = nVolatilizzatoKgAnno * EF4_VOLATILIZZAZIONE
  const n2oIndirettoVolatilizzazioneKgAnno = n2oIndirettoVolatilizzazioneNKgAnno * (44 / 28)
  const formulaVolatilizzazione =
    `${n(fsnKgAnno)} kg N minerale × ${FRAC_GASF_MINERALE} (FracGASF) + ${n(fonKgAnno)} kg N organico × ` +
    `${FRAC_GASM_ORGANICO} (FracGASM) = ${n(nVolatilizzatoKgAnno)} kg N volatilizzato × ${EF4_VOLATILIZZAZIONE} (EF4) = ` +
    `${n(n2oIndirettoVolatilizzazioneNKgAnno)} kg N2O-N × 44/28 = ${n(n2oIndirettoVolatilizzazioneKgAnno)} kg N2O/anno`

  let n2oIndirettoLisciviazioneKgAnno = 0
  let formulaLisciviazione: string
  if (lisciviazioneApplicabile) {
    const nLisciviatoKgAnno = (fsnKgAnno + fonKgAnno) * FRAC_LEACH_H
    const n2oIndirettoLisciviazioneNKgAnno = nLisciviatoKgAnno * EF5_LISCIVIAZIONE
    n2oIndirettoLisciviazioneKgAnno = n2oIndirettoLisciviazioneNKgAnno * (44 / 28)
    formulaLisciviazione =
      `(${n(fsnKgAnno)} + ${n(fonKgAnno)}) kg N × ${FRAC_LEACH_H} (FracLEACH-(H)) = ${n(nLisciviatoKgAnno)} kg N lisciviato × ` +
      `${EF5_LISCIVIAZIONE} (EF5) = ${n(n2oIndirettoLisciviazioneNKgAnno)} kg N2O-N × 44/28 = ${n(n2oIndirettoLisciviazioneKgAnno)} kg N2O/anno`
  } else {
    formulaLisciviazione =
      'FracLEACH-(H) = 0 per definizione IPCC: si applica solo dove le piogge superano la capacità di ritenzione idrica del suolo o si irriga (tranne a goccia) — componente omessa.'
  }

  const totaleKgAnno = n2oDirettoKgAnno + n2oIndirettoVolatilizzazioneKgAnno + n2oIndirettoLisciviazioneKgAnno
  const totaleTCO2eq = (totaleKgAnno / 1000) * GWP_N2O
  const formulaTotale =
    `${n(n2oDirettoKgAnno)} (diretto) + ${n(n2oIndirettoVolatilizzazioneKgAnno)} (indiretto volatilizzazione) + ` +
    `${n(n2oIndirettoLisciviazioneKgAnno)} (indiretto lisciviazione) = ${n(totaleKgAnno)} kg N2O/anno × ${GWP_N2O} (GWP) / 1000 = ` +
    `${n(totaleTCO2eq)} t CO2eq/anno`

  return {
    n2oDirettoKgAnno,
    formulaDiretto,
    n2oIndirettoVolatilizzazioneKgAnno,
    formulaVolatilizzazione,
    n2oIndirettoLisciviazioneKgAnno,
    formulaLisciviazione,
    totaleKgAnno,
    totaleTCO2eq,
    formulaTotale,
  }
}
