/**
 * Stima, esplicitamente parziale e non certificabile, delle emissioni di
 * metano e protossido di azoto (dirette e indirette) legate ai reflui
 * zootecnici, dallo STOCCAGGIO fino allo SPANDIMENTO in campo, con il metodo
 * Tier 2 IPCC (2006 Guidelines for National Greenhouse Gas Inventories, Vol.
 * 4 Cap. 10 e Cap. 11) più i fattori tecnica-specifici EMEP/EEA per lo
 * spandimento. Non copre la lisciviazione/ruscellamento (Frac_LEACH-(H)):
 * un'estensione possibile, non ancora qui.
 *
 * METANO (CH4) dallo stoccaggio — equazioni 10.23/10.24 IPCC (2006):
 *
 *   VS (kg/anno) = [GEI × (1 − DE% / 100) + UE × GEI] × (1 − ASH) / 18,45
 *   CH4 (kg/anno) = VS × Bo × 0,67 (kg/m³) × MCF / 100
 *
 * dove:
 * - GEI = ingestione di energia lorda (MJ/anno), la stessa già calcolata per
 *   il metano enterico (si veda lib/metanoEnterico.ts) — stesso animale,
 *   stessa razione, due destini diversi (fermentazione vs. escrezione).
 * - DE% = digeribilità dell'energia della razione (% dell'energia lorda):
 *   qui approssimata con il TDN% medio della dieta (pesato sulla sostanza
 *   secca, dalle stesse analisi di laboratorio degli alimenti) — un'
 *   equivalenza numerica diffusa nella nutrizione animale (TDN% ≈ DE% del
 *   valore di GE), non una misura diretta.
 * - UE = energia urinaria, default IPCC 0,04 (frazione di GE) per la
 *   generalità del bestiame.
 * - ASH = ceneri del letame come frazione della sostanza secca ingerita,
 *   default IPCC 0,08.
 * - 18,45 MJ/kg = energia lorda di default dell'alimento (lo stesso valore
 *   usato per il metano enterico).
 * - Bo = capacità massima di produzione di metano (m³ CH4/kg VS): 0,24 per
 *   bovini da latte, 0,19 per altri bovini (IPCC 2006, valori Europa
 *   occidentale). Non verificato con la stessa sicurezza per suini/avicoli/
 *   ovicaprini: va inserito a mano da fonte verificata.
 * - 0,67 kg/m³ = densità del metano (valore IPCC).
 * - MCF = fattore di conversione del metano (% dell'energia del metano
 *   massima potenziale effettivamente rilasciata), dipende dal sistema di
 *   stoccaggio, dalla durata e dalla fascia climatica (Tabella 10.17 IPCC
 *   2006):
 *     Liquido/vasca, ≥1 mese:  10% (≤15°C) / 35% (15-25°C) / 65% (>25°C)
 *     Liquido/vasca, <1 mese:  15% (≤15°C) / 18% (15-25°C) / 33% (>25°C)
 *     Solido/letame palabile:   2% (fisso, IPCC 2019 Refinement)
 *   La durata di stoccaggio non è solo una scelta tecnica: nelle zone
 *   vulnerabili ai nitrati lo spandimento del liquame è vietato nei mesi
 *   invernali (Direttiva Nitrati 91/676/CEE, recepita a livello regionale),
 *   il che allunga di fatto la permanenza in vasca — da qui l'importanza di
 *   inserire la durata realistica del tuo cliente, non un valore di comodo.
 *
 * PROTOSSIDO DI AZOTO (N2O) diretto dallo stoccaggio (equazione 10.25 IPCC):
 *
 *   N2O (kg/anno) = N escreto (kg N/anno) × EF3 × 44/28
 *
 * dove EF3 (kg N2O-N/kg N) è, per il solo stoccaggio: 0 per il liquido senza
 * crosta naturale, 0,005 per il liquido con crosta naturale e per il solido
 * (IPCC 2006). L'azoto escreto va inserito direttamente (spesso già
 * disponibile dal Piano di Utilizzazione Agronomica in zona vulnerabile ai
 * nitrati) — non stimato qui da un bilancio proteico della razione, per
 * evitare di introdurre altri fattori (frazione di azoto trattenuta per
 * categoria animale) non ancora verificati con la stessa sicurezza.
 *
 * PROTOSSIDO DI AZOTO (N2O) indiretto dallo SPANDIMENTO in campo (volatilizzazione
 * di ammoniaca/NOx e successiva rideposizione — equazioni 11.9-11.10 IPCC):
 *
 *   N volatilizzato (kg N/anno) = N escreto × FracGASM_effettivo
 *   N2O indiretto (kg/anno) = N volatilizzato × EF4 × 44/28
 *
 * dove FracGASM (frazione di azoto che volatilizza come NH3/NOx) ha un
 * default IPCC di 0,20 per lo spandimento a spaglio senza interramento, EF4 =
 * 0,01 kg N2O-N per kg di NH3-N+NOx-N volatilizzato (IPCC 2006/2019). La
 * tecnica di spandimento riduce la quota di FracGASM_default che si
 * volatilizza, con fattori di riduzione da fonte ufficiale europea (EMEP/EEA
 * Air Pollutant Emission Inventory Guidebook, cap. 3.D, ed. 2023 — non IPCC,
 * ma la fonte europea di riferimento per le tecniche di spandimento):
 *   Spaglio senza interramento: 0% di riduzione (il default IPCC si applica
 *     per intero) — FracGASM_effettivo = 0,20.
 *   Spaglio con interramento entro pochi giorni: riduzione 60–80% (usato un
 *     valore centrale 70%) → FracGASM_effettivo ≈ 0,06.
 *   Iniezione diretta nel terreno: riduzione 62–99% a seconda del metodo
 *     (solco aperto vs. chiuso; usato un valore centrale conservativo 80%)
 *     → FracGASM_effettivo ≈ 0,04.
 * Questa stima usa lo stesso azoto escreto della quota N2O diretto da
 * stoccaggio, senza sottrarre le perdite già avvenute in stoccaggio — una
 * semplificazione dichiarata, non un bilancio azotato completo a cascata.
 *
 * Fonti: IPCC (2006) Guidelines for National Greenhouse Gas Inventories,
 * Vol. 4 Cap. 10 (equazioni 10.23-10.25, Bo Tabella 10.16, EF3 Tabella
 * 10.21) e Cap. 11 (equazioni 11.9-11.10, FracGASM, EF4); IPCC 2019
 * Refinement allo stesso capitolo (MCF solido 2%, Tabella 10.17 aggiornata);
 * EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023, cap. 3.D
 * (Agricultural soils) per i fattori di riduzione NH3 per tecnica di
 * spandimento (interramento/iniezione vs. spaglio).
 */

import { GWP_VALORI } from './reportSteps'
import type { TipologiaAllevamento } from '../types'

const GWP_CH4 = GWP_VALORI.find((g) => g.formula === 'CH4')!.gwp
const GWP_N2O = GWP_VALORI.find((g) => g.formula === 'N2O')!.gwp

export const URINARY_ENERGY_FRAZIONE = 0.04
export const ASH_FRAZIONE = 0.08
export const DENSITA_METANO_KG_PER_M3 = 0.67

export interface BoRiferimento {
  valore: number
  fonte: string
}

/** Bo — capacità massima di produzione di metano (m³ CH4/kg VS), IPCC (2006)
 * Tabella 10.16, valori Europa occidentale. Assente per le tipologie non
 * ancora verificate: va inserito a mano da fonte verificata. */
export const BO_RIFERIMENTO: Partial<Record<TipologiaAllevamento, BoRiferimento>> = {
  bovini_da_latte: { valore: 0.24, fonte: 'IPCC (2006), bovini da latte, Europa occidentale' },
  bovini_da_carne: { valore: 0.19, fonte: 'IPCC (2006), altri bovini, Europa occidentale' },
}

type FasciaClimatica = 'fredda' | 'temperata' | 'calda'

const MCF_LIQUIDO: Record<FasciaClimatica, { menoDi1Mese: number; unMeseOPiu: number }> = {
  fredda: { menoDi1Mese: 15, unMeseOPiu: 10 },
  temperata: { menoDi1Mese: 18, unMeseOPiu: 35 },
  calda: { menoDi1Mese: 33, unMeseOPiu: 65 },
}
const MCF_SOLIDO = 2

export const EF3_LIQUIDO_SENZA_CROSTA = 0
export const EF3_LIQUIDO_CON_CROSTA = 0.005
export const EF3_SOLIDO = 0.005

export const FRAC_GASM_DEFAULT = 0.2
export const EF4 = 0.01

export type TecnicaSpandimento = 'spaglio' | 'spaglio_interrato' | 'iniezione'

export interface RiduzioneSpandimento {
  label: string
  riduzionePercento: number
  fonte: string
}

export const TECNICHE_SPANDIMENTO: Record<TecnicaSpandimento, RiduzioneSpandimento> = {
  spaglio: {
    label: 'Spaglio superficiale, senza interramento',
    riduzionePercento: 0,
    fonte: 'Tecnica di riferimento: nessuna riduzione, si applica il default IPCC per intero.',
  },
  spaglio_interrato: {
    label: 'Spaglio con interramento entro pochi giorni',
    riduzionePercento: 70,
    fonte: 'EMEP/EEA (2023): riduzione NH3 60–80%, qui il valore centrale 70%.',
  },
  iniezione: {
    label: 'Iniezione diretta nel terreno',
    riduzionePercento: 80,
    fonte: 'EMEP/EEA (2023): riduzione NH3 62–99% secondo il metodo (solco aperto/chiuso), qui un valore centrale conservativo 80%.',
  },
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface RigaDietaTdnInput {
  quantitaTAnno: number
  sostanzaSeccaPercento: number
  tdnPercento?: number
}

export interface RisultatoTdnDieta {
  tdnPercento: number | null
  quotaCopertaPercento: number
  formula: string
}

/** Media del TDN% della razione, pesata sulla sostanza secca — stesso schema
 * di calcolaMetanoEnterico() per l'NDF, riusato qui come proxy della
 * digeribilità (DE%) della dieta. */
export function calcolaTdnMedioDieta(righe: RigaDietaTdnInput[]): RisultatoTdnDieta {
  const righeConSS = righe.map((r) => ({ ...r, ssTAnno: r.quantitaTAnno * (r.sostanzaSeccaPercento / 100) }))
  const totaleSS = righeConSS.reduce((tot, r) => tot + r.ssTAnno, 0)
  const righeConTdn = righeConSS.filter((r) => r.tdnPercento != null && r.ssTAnno > 0)
  const ssConTdn = righeConTdn.reduce((tot, r) => tot + r.ssTAnno, 0)
  const quotaCopertaPercento = totaleSS > 0 ? (ssConTdn / totaleSS) * 100 : 0

  if (ssConTdn === 0) {
    return {
      tdnPercento: null,
      quotaCopertaPercento: 0,
      formula: "Nessuna voce ha un valore di TDN inserito nell'analisi di laboratorio completa.",
    }
  }
  const tdnPercento = righeConTdn.reduce((tot, r) => tot + r.ssTAnno * (r.tdnPercento ?? 0), 0) / ssConTdn
  const formula =
    righeConTdn.map((r) => `${n(r.ssTAnno)}×${n(r.tdnPercento ?? 0)}`).join(' + ') +
    ` ⁄ ${n(ssConTdn)} = ${n(tdnPercento)} % (copre ${n(quotaCopertaPercento)}% della sostanza secca totale)`
  return { tdnPercento, quotaCopertaPercento, formula }
}

export interface InputGestioneReflui {
  geiMJAnno: number
  digeribilitaPercento: number
  boM3PerKgVs: number
  fonteBo: string | null
  sistemaStoccaggio: 'liquido' | 'solido'
  durataStoccaggioMesi: number
  fasciaClimatica: FasciaClimatica
  crostaNaturale: boolean
  azotoEscretoKgAnno: number
  tecnicaSpandimento: TecnicaSpandimento
  mcfManualePercento?: number
  fracGasmManualePercento?: number
}

export interface RisultatoGestioneReflui {
  vsKgAnno: number
  formulaVs: string
  mcfPercento: number
  formulaMcf: string
  ch4KgAnno: number
  formulaCh4: string
  ch4TCO2eq: number
  ef3: number
  n2oDirettoKgAnno: number
  formulaN2oDiretto: string
  n2oDirettoTCO2eq: number
  fracGasmEffettivoPercento: number
  formulaFracGasm: string
  n2oIndirettoKgAnno: number
  formulaN2oIndiretto: string
  n2oIndirettoTCO2eq: number
  totaleTCO2eq: number
  formulaTotale: string
}

export function calcolaGestioneReflui(input: InputGestioneReflui): RisultatoGestioneReflui {
  const { geiMJAnno, digeribilitaPercento: de, boM3PerKgVs: bo } = input

  const vsKgAnno =
    (geiMJAnno * (1 - de / 100) + URINARY_ENERGY_FRAZIONE * geiMJAnno) * (1 - ASH_FRAZIONE) / 18.45
  const formulaVs =
    `${n(geiMJAnno)} MJ/anno × [(1 − ${n(de)}%/100) + ${URINARY_ENERGY_FRAZIONE}] × ` +
    `(1 − ${ASH_FRAZIONE}) / 18,45 = ${n(vsKgAnno)} kg VS/anno`

  let mcfPercento: number
  let formulaMcf: string
  if (input.mcfManualePercento != null) {
    mcfPercento = input.mcfManualePercento
    formulaMcf = `Valore inserito manualmente: ${n(mcfPercento)}%.`
  } else if (input.sistemaStoccaggio === 'solido') {
    mcfPercento = MCF_SOLIDO
    formulaMcf = `Stoccaggio solido: MCF fisso = ${MCF_SOLIDO}% (IPCC 2019 Refinement).`
  } else {
    const banda = MCF_LIQUIDO[input.fasciaClimatica]
    const sottoUnMese = input.durataStoccaggioMesi < 1
    mcfPercento = sottoUnMese ? banda.menoDi1Mese : banda.unMeseOPiu
    formulaMcf =
      `Stoccaggio liquido, ${n(input.durataStoccaggioMesi)} mesi (${sottoUnMese ? '<1 mese' : '≥1 mese'}), ` +
      `clima ${input.fasciaClimatica} → MCF = ${mcfPercento}% (IPCC 2006, Tabella 10.17).`
  }

  const ch4KgAnno = vsKgAnno * bo * DENSITA_METANO_KG_PER_M3 * (mcfPercento / 100)
  const formulaCh4 = `${n(vsKgAnno)} kg VS × ${n(bo)} m³/kg × ${DENSITA_METANO_KG_PER_M3} kg/m³ × ${n(mcfPercento)}% = ${n(ch4KgAnno)} kg CH4/anno`
  const ch4TCO2eq = (ch4KgAnno / 1000) * GWP_CH4

  const ef3 =
    input.sistemaStoccaggio === 'solido'
      ? EF3_SOLIDO
      : input.crostaNaturale
        ? EF3_LIQUIDO_CON_CROSTA
        : EF3_LIQUIDO_SENZA_CROSTA

  const n2oDirettoKgAnno = input.azotoEscretoKgAnno * ef3 * (44 / 28)
  const formulaN2oDiretto = `${n(input.azotoEscretoKgAnno)} kg N × ${ef3} (EF3) × 44/28 = ${n(n2oDirettoKgAnno)} kg N2O/anno`
  const n2oDirettoTCO2eq = (n2oDirettoKgAnno / 1000) * GWP_N2O

  let fracGasmEffettivoPercento: number
  let formulaFracGasm: string
  if (input.fracGasmManualePercento != null) {
    fracGasmEffettivoPercento = input.fracGasmManualePercento
    formulaFracGasm = `Valore inserito manualmente: ${n(fracGasmEffettivoPercento)}%.`
  } else {
    const tecnica = TECNICHE_SPANDIMENTO[input.tecnicaSpandimento]
    fracGasmEffettivoPercento = FRAC_GASM_DEFAULT * 100 * (1 - tecnica.riduzionePercento / 100)
    formulaFracGasm =
      `${n(FRAC_GASM_DEFAULT * 100)}% (default IPCC, spaglio) × (1 − ${tecnica.riduzionePercento}%) = ` +
      `${n(fracGasmEffettivoPercento)}%. ${tecnica.fonte}`
  }
  const nVolatilizzatoKgAnno = input.azotoEscretoKgAnno * (fracGasmEffettivoPercento / 100)
  const n2oIndirettoKgAnno = nVolatilizzatoKgAnno * EF4 * (44 / 28)
  const formulaN2oIndiretto =
    `${n(input.azotoEscretoKgAnno)} kg N × ${n(fracGasmEffettivoPercento)}% (volatilizzato) = ${n(nVolatilizzatoKgAnno)} kg N ` +
    `→ × ${EF4} (EF4) × 44/28 = ${n(n2oIndirettoKgAnno)} kg N2O/anno`
  const n2oIndirettoTCO2eq = (n2oIndirettoKgAnno / 1000) * GWP_N2O

  const totaleTCO2eq = ch4TCO2eq + n2oDirettoTCO2eq + n2oIndirettoTCO2eq
  const formulaTotale =
    `${n(ch4TCO2eq)} (CH4 stoccaggio) + ${n(n2oDirettoTCO2eq)} (N2O diretto stoccaggio) + ` +
    `${n(n2oIndirettoTCO2eq)} (N2O indiretto spandimento) = ${n(totaleTCO2eq)} t CO2eq`

  return {
    vsKgAnno,
    formulaVs,
    mcfPercento,
    formulaMcf,
    ch4KgAnno,
    formulaCh4,
    ch4TCO2eq,
    ef3,
    n2oDirettoKgAnno,
    formulaN2oDiretto,
    n2oDirettoTCO2eq,
    fracGasmEffettivoPercento,
    formulaFracGasm,
    n2oIndirettoKgAnno,
    formulaN2oIndiretto,
    n2oIndirettoTCO2eq,
    totaleTCO2eq,
    formulaTotale,
  }
}
