/**
 * Stima, esplicitamente parziale e non certificabile, dell'emissione di metano
 * enterico a partire dalla composizione della razione — perché al variare della
 * fibra (NDF) della dieta variano le emissioni di CH4 in fermentazione ruminale,
 * un meccanismo ben documentato in letteratura zootecnica.
 *
 * Metodo Tier 2 IPCC (2006 Guidelines for National Greenhouse Gas Inventories,
 * Vol. 4 Cap. 10):
 *
 *   CH4 (kg/anno) = (GEI (MJ/anno) × Ym / 100) / 55,65
 *
 * dove:
 * - GEI = ingestione di energia lorda (Gross Energy Intake) = sostanza secca
 *   totale ingerita (kg/anno) × 18,45 MJ/kg s.s. — il valore di default IPCC per
 *   l'energia lorda dell'alimento, usato in assenza di una misura diretta (bomba
 *   calorimetrica) per ciascun alimento della razione.
 * - Ym = fattore di conversione del metano (% dell'energia lorda ingerita
 *   convertita in CH4). Il 2019 Refinement to the 2006 IPCC Guidelines
 *   differenzia Ym in base alla qualità della dieta (NDF%, energia digeribile%,
 *   quota di foraggio): qui approssimato con l'NDF (aNDFom) medio della razione,
 *   pesato sulla sostanza secca ingerita di ciascun alimento — la grandezza
 *   direttamente misurabile da un referto di laboratorio (si veda
 *   lib/analisiAlimenti.ts):
 *     NDF dieta ≤ 35% → Ym = 5,7% (dieta ad alta digeribilità/basso NDF)
 *     35% < NDF dieta ≤ 65% → Ym = 6,0% (dieta mista)
 *     NDF dieta > 65% → Ym = 7,0% (dieta a base di solo foraggio)
 *   In assenza di qualunque dato di NDF si usa il default generico IPCC (2006)
 *   per bovini, Ym = 6,5% (±1,0%). Per diete da ingrasso intensivo ad alto
 *   concentrato (≥90% concentrato in sostanza secca) la letteratura riporta un
 *   Ym molto più basso, 3,0% (±1,0%): qui non riconosciuto automaticamente (non
 *   si traccia la quota foraggio/concentrato della razione), va impostato a mano
 *   sostituendo il valore proposto.
 * - 55,65 MJ/kg = contenuto energetico del metano (valore IPCC).
 *
 * L'NDF medio di dieta pesa TUTTO l'alimento ingerito, autoprodotto e
 * acquistato: ai fini del metano prodotto dall'animale non conta chi ha
 * coltivato l'alimento, solo cosa mangia (a differenza del calcolo di
 * assorbimento di CO2 in lib/simulazioneZootecnia.ts, che considera solo
 * l'alimento autoprodotto per evitare un doppio conteggio).
 *
 * Fonti: IPCC (2006) Guidelines for National Greenhouse Gas Inventories, Vol. 4
 * Ch. 10 (equazione, GE default 18,45 MJ/kg, Ym generico 6,5%±1,0% per bovini,
 * 3,0%±1,0% per bovini da ingrasso ad alto concentrato); 2019 Refinement allo
 * stesso capitolo (Ym differenziato per qualità della dieta), nelle soglie qui
 * usate come ripreso da applicazioni Tier 2 paese-specifiche per bovini da
 * latte (es. Yang et al., "Developing country specific enteric methane
 * emission factor of the South Korean dairy cattle production using the 2019
 * refined IPCC Tier 2 methodology", J. Anim. Sci. 2020, 98(Suppl. 4):157).
 *
 * QUESTA STIMA COPRE SOLO IL METANO ENTERICO — una componente delle emissioni
 * dirette dell'allevamento, non tutte (manca la gestione reflui e le emissioni
 * a monte della produzione dell'alimento): resta un valore parziale, mostrato
 * come approfondimento accanto all'intensità emissiva complessiva per unità di
 * prodotto usata nella simulazione (che, da letteratura, copre l'intero
 * sistema) — non la sostituisce e non entra nel bilancio simulato.
 */

import { GWP_VALORI } from './reportSteps'

export const GE_DEFAULT_MJ_PER_KG_SS = 18.45
export const ENERGIA_METANO_MJ_PER_KG = 55.65
const GWP_CH4 = GWP_VALORI.find((g) => g.formula === 'CH4')!.gwp

export interface RigaDietaInput {
  nomeMangime: string
  quantitaTAnno: number
  sostanzaSeccaPercento: number
  andfomPercento?: number
}

export interface RisultatoMetanoEnterico {
  sostanzaSeccaTotaleTAnno: number
  quotaCopertaDaAnalisiNdfPercento: number
  ndfDietaPercento: number | null
  formulaNdf: string
  ymPercento: number
  formulaYm: string
  geiMJAnno: number
  formulaGei: string
  ch4KgAnno: number
  formulaCh4: string
  ch4TCO2eq: number
  formulaCh4CO2eq: string
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export function calcolaMetanoEnterico(
  righe: RigaDietaInput[],
  ymManualePercento?: number,
): RisultatoMetanoEnterico {
  const righeConSS = righe.map((r) => ({ ...r, ssTAnno: r.quantitaTAnno * (r.sostanzaSeccaPercento / 100) }))
  const sostanzaSeccaTotaleTAnno = righeConSS.reduce((tot, r) => tot + r.ssTAnno, 0)

  const righeConNdf = righeConSS.filter((r) => r.andfomPercento != null && r.ssTAnno > 0)
  const ssConNdfTAnno = righeConNdf.reduce((tot, r) => tot + r.ssTAnno, 0)
  const quotaCopertaDaAnalisiNdfPercento =
    sostanzaSeccaTotaleTAnno > 0 ? (ssConNdfTAnno / sostanzaSeccaTotaleTAnno) * 100 : 0

  let ndfDietaPercento: number | null = null
  let formulaNdf: string
  if (ssConNdfTAnno > 0) {
    ndfDietaPercento =
      righeConNdf.reduce((tot, r) => tot + r.ssTAnno * (r.andfomPercento ?? 0), 0) / ssConNdfTAnno
    formulaNdf =
      righeConNdf.map((r) => `${n(r.ssTAnno)}×${n(r.andfomPercento ?? 0)}`).join(' + ') +
      ` ⁄ ${n(ssConNdfTAnno)} = ${n(ndfDietaPercento)} % s.s. ` +
      `(copre ${n(quotaCopertaDaAnalisiNdfPercento)}% della sostanza secca totale ingerita)`
  } else {
    formulaNdf =
      "Nessuna voce di alimento ha un valore di NDF (aNDFom) inserito nell'analisi di laboratorio completa."
  }

  let ymPercento: number
  let formulaYm: string
  if (ymManualePercento != null) {
    ymPercento = ymManualePercento
    formulaYm = `Valore inserito manualmente: ${n(ymPercento)}%.`
  } else if (ndfDietaPercento == null) {
    ymPercento = 6.5
    formulaYm = 'Nessun dato di fibra disponibile: default generico IPCC (2006) per bovini, Ym = 6,5%.'
  } else if (ndfDietaPercento <= 35) {
    ymPercento = 5.7
    formulaYm = `NDF dieta ${n(ndfDietaPercento)}% ≤ 35% → Ym = 5,7% (dieta ad alta digeribilità, 2019 Refinement IPCC).`
  } else if (ndfDietaPercento <= 65) {
    ymPercento = 6.0
    formulaYm = `NDF dieta ${n(ndfDietaPercento)}% tra 35% e 65% → Ym = 6,0% (dieta mista, 2019 Refinement IPCC).`
  } else {
    ymPercento = 7.0
    formulaYm = `NDF dieta ${n(ndfDietaPercento)}% > 65% → Ym = 7,0% (dieta a base di solo foraggio, 2019 Refinement IPCC).`
  }

  const geiMJAnno = sostanzaSeccaTotaleTAnno * 1000 * GE_DEFAULT_MJ_PER_KG_SS
  const formulaGei = `${n(sostanzaSeccaTotaleTAnno)} t s.s. × 1000 × ${GE_DEFAULT_MJ_PER_KG_SS} MJ/kg = ${n(geiMJAnno)} MJ/anno`

  const ch4KgAnno = (geiMJAnno * (ymPercento / 100)) / ENERGIA_METANO_MJ_PER_KG
  const formulaCh4 = `(${n(geiMJAnno)} × ${n(ymPercento)}%) / ${ENERGIA_METANO_MJ_PER_KG} = ${n(ch4KgAnno)} kg CH4/anno`

  const ch4TCO2eq = (ch4KgAnno / 1000) * GWP_CH4
  const formulaCh4CO2eq = `${n(ch4KgAnno / 1000)} t CH4 × ${GWP_CH4} (GWP) = ${n(ch4TCO2eq)} t CO2eq`

  return {
    sostanzaSeccaTotaleTAnno,
    quotaCopertaDaAnalisiNdfPercento,
    ndfDietaPercento,
    formulaNdf,
    ymPercento,
    formulaYm,
    geiMJAnno,
    formulaGei,
    ch4KgAnno,
    formulaCh4,
    ch4TCO2eq,
    formulaCh4CO2eq,
  }
}
