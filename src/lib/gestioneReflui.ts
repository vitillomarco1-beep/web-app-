/**
 * Stima, esplicitamente parziale e non certificabile, delle emissioni di
 * metano e protossido di azoto (dirette e indirette) legate ai reflui
 * zootecnici, dallo STOCCAGGIO fino allo SPANDIMENTO in campo, con il metodo
 * Tier 2 IPCC (2006 Guidelines for National Greenhouse Gas Inventories, Vol.
 * 4 Cap. 10 §10.4-10.5) più i fattori tecnica-specifici EMEP/EEA per lo
 * spandimento. Non copre la lisciviazione/ruscellamento verso le acque
 * (EF5, Cap. 11): un'estensione possibile, non ancora qui.
 *
 * Tutte le tabelle IPCC citate sotto sono state verificate direttamente sul
 * PDF ufficiale 2006 IPCC Guidelines, Vol. 4 Cap. 10, caricato dall'utente
 * (non più da fonti secondarie, a differenza di una versione precedente di
 * questo file).
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
 *   generalità del bestiame (0,02 per diete ≥85% grano o per i suini).
 * - ASH = ceneri del letame come frazione della sostanza secca ingerita,
 *   default IPCC 0,08 per i bovini.
 * - 18,45 MJ/kg = energia lorda di default dell'alimento (lo stesso valore
 *   usato per il metano enterico).
 * - Bo = capacità massima di produzione di metano (m³ CH4/kg VS): 0,24 per
 *   bovini da latte, 0,19 per altri bovini (IPCC 2006, valori Europa
 *   occidentale, da Annex 10A.4/10A.5 — non riletti in questo giro di
 *   verifica). Non verificato con la stessa sicurezza per suini/avicoli/
 *   ovicaprini: va inserito a mano da fonte verificata.
 * - 0,67 kg/m³ = densità del metano (valore IPCC).
 * - MCF = fattore di conversione del metano (% della capacità massima Bo
 *   effettivamente rilasciata), dalla Tabella 10.17 IPCC (2006) — dipende dal
 *   SISTEMA di gestione del refluo (Tabella 10.18) e, per la maggior parte
 *   dei sistemi, dalla temperatura media annua esatta (non da 3 fasce
 *   generiche): si veda determinaMcfPercento più sotto per i valori per
 *   sistema. La durata di stoccaggio conta solo per fossa a fessurato e
 *   lettiera profonda (sotto/sopra 1 mese — per tutti gli altri sistemi la
 *   tabella non la considera). La durata di stoccaggio non è comunque solo
 *   una scelta tecnica: nelle zone vulnerabili ai nitrati lo spandimento del
 *   liquame è vietato nei mesi invernali (Direttiva Nitrati 91/676/CEE,
 *   recepita a livello regionale), il che allunga di fatto la permanenza in
 *   vasca — da qui l'importanza di inserire la durata realistica del tuo
 *   cliente, non un valore di comodo.
 *
 * PROTOSSIDO DI AZOTO (N2O) diretto dallo stoccaggio (equazione 10.25 IPCC):
 *
 *   N2O (kg/anno) = N escreto (kg N/anno) × EF3 × 44/28
 *
 * dove EF3 (kg N2O-N/kg N) dipende dal sistema di gestione (Tabella 10.21
 * IPCC 2006) — si veda EF3_PER_SISTEMA più sotto.
 *
 * PROTOSSIDO DI AZOTO (N2O) indiretto — DUE fonti distinte, entrambe stimate:
 *
 * 1) Dalla VOLATILIZZAZIONE DURANTE LO STOCCAGGIO (equazioni 10.26-10.27
 *    IPCC, Tabella 10.22 "FracGasMS"): l'azoto che volatilizza come NH3/NOx
 *    mentre il refluo è ancora in stoccaggio, prima dello spandimento.
 *
 *      N volatilizzato in stoccaggio = N escreto × FracGasMS / 100
 *      N2O indiretto da stoccaggio = N volatilizzato × EF4 × 44/28
 *
 *    FracGasMS varia per tipologia di allevamento e sistema di gestione
 *    (Tabella 10.22: coperta solo per bovini da latte e "altri bovini", non
 *    per tutti i sistemi — si veda FRAC_GASMS_BOVINI_* più sotto; dove non
 *    disponibile, va inserita a mano o si omette questa componente,
 *    dichiarandolo esplicitamente).
 *
 *    L'azoto che arriva allo spandimento è quindi ridotto dalle perdite
 *    totali di stoccaggio (equazione 10.34 IPCC, Tabella 10.23 "FracLossMS"
 *    — perdita totale: volatilizzazione + lisciviazione + ruscellamento
 *    durante lo stoccaggio, un valore più ampio di FracGasMS da solo):
 *
 *      N disponibile per spandimento = N escreto × (1 − FracLossMS / 100)
 *
 * 2) Dalla volatilizzazione ALLO SPANDIMENTO in campo (capitolo 11 IPCC,
 *    equazioni 11.9-11.10 — un parametro diverso, anch'esso chiamato
 *    "FracGASM" da IPCC ma specifico per l'azoto organico applicato ai
 *    suoli, non quello perso in stoccaggio):
 *
 *      N volatilizzato allo spandimento = N disponibile per spandimento ×
 *        FracGASM_effettivo / 100
 *      N2O indiretto da spandimento = N volatilizzato × EF4 × 44/28
 *
 *    con un default IPCC di 0,20 per lo spandimento a spaglio senza
 *    interramento, ridotto dalla tecnica di spandimento con fattori di
 *    riduzione da fonte ufficiale europea (EMEP/EEA Air Pollutant Emission
 *    Inventory Guidebook, cap. 3.D, ed. 2023 — non IPCC, ma la fonte europea
 *    di riferimento per le tecniche di spandimento):
 *      Spaglio senza interramento: 0% di riduzione — FracGASM_effettivo = 0,20.
 *      Spaglio con interramento entro pochi giorni: riduzione 60–80%
 *        (valore centrale 70%) → FracGASM_effettivo ≈ 0,06.
 *      Iniezione diretta nel terreno: riduzione 62–99% (valore centrale
 *        conservativo 80%) → FracGASM_effettivo ≈ 0,04.
 *
 * In entrambi i casi EF4 = 0,01 kg N2O-N per kg di NH3-N+NOx-N volatilizzato
 * (IPCC 2006/2019, Cap. 11 Tabella 11.3).
 *
 * Fonti: IPCC (2006) Guidelines for National Greenhouse Gas Inventories,
 * Vol. 4 Cap. 10 — equazioni 10.23-10.27 e 10.34, Tabella 10.17 (MCF per
 * sistema e temperatura), Tabella 10.18 (definizioni dei sistemi), Tabella
 * 10.21 (EF3 per sistema), Tabella 10.22 (FracGasMS, volatilizzazione in
 * stoccaggio), Tabella 10.23 (FracLossMS, perdita totale in stoccaggio) —
 * tutte verificate sul PDF ufficiale caricato dall'utente. Cap. 11 (EF4,
 * FracGASM allo spandimento — non riletto in questo giro di verifica);
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
export const EF4 = 0.01

export interface BoRiferimento {
  valore: number
  fonte: string
}

/** Bo — capacità massima di produzione di metano (m³ CH4/kg VS), IPCC (2006)
 * Annex 10A.4/10A.5, valori Europa occidentale. Assente per le tipologie non
 * ancora verificate: va inserito a mano da fonte verificata. */
export const BO_RIFERIMENTO: Partial<Record<TipologiaAllevamento, BoRiferimento>> = {
  bovini_da_latte: { valore: 0.24, fonte: 'IPCC (2006), bovini da latte, Europa occidentale' },
  bovini_da_carne: { valore: 0.19, fonte: 'IPCC (2006), altri bovini, Europa occidentale' },
}

/** Sistemi di gestione del refluo (Tabella 10.18 IPCC 2006) — solo quelli
 * rilevanti per reflui effettivamente stoccati (esclusi "Pascolo/Paddock" e
 * "Spandimento quotidiano", dove il refluo non passa da una fase di
 * stoccaggio, e "Digestore anaerobico", che richiederebbe dati aggiuntivi su
 * produzione/recupero/flaring del biogas — Formula 1 della Tabella 10.17,
 * non implementata). */
export type SistemaStoccaggio =
  | 'solido'
  | 'platea_scoperta'
  | 'liquido_con_crosta'
  | 'liquido_senza_crosta'
  | 'lagone_scoperto'
  | 'fessurato'
  | 'lettiera_profonda'
  | 'compost_statico'
  | 'compost_intensivo'
  | 'compost_passivo'
  | 'avicolo_lettiera'

export const SISTEMI_STOCCAGGIO: Record<SistemaStoccaggio, string> = {
  solido: 'Stoccaggio solido (letame palabile, in cumulo)',
  platea_scoperta: 'Platea scoperta (dry lot)',
  liquido_con_crosta: 'Liquido/slurry in vasca o cisterna, con crosta naturale',
  liquido_senza_crosta: 'Liquido/slurry in vasca o cisterna, senza crosta naturale',
  lagone_scoperto: 'Lagone anaerobico scoperto',
  fessurato: 'Fossa di stoccaggio sotto stalla a fessurato',
  lettiera_profonda: 'Lettiera profonda (bedded pack)',
  compost_statico: 'Compostaggio in cumulo statico o in-vessel',
  compost_intensivo: 'Compostaggio in andana, rivoltamento intensivo',
  compost_passivo: 'Compostaggio in andana, rivoltamento passivo',
  avicolo_lettiera: 'Lettiera avicola (con o senza lettiera)',
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

/** Valore per temperatura esatta (°C) da una tabella a 19 punti (≤10°C, 11,
 * 12, …, 27, ≥28°C) della Tabella 10.17 IPCC. Non si interpola tra i punti
 * interi: si arrotonda alla temperatura intera più vicina. Le temperature
 * fuori range (<10°C o >28°C) sono troncate agli estremi della tabella, come
 * indicato dal testo IPCC stesso. */
function valoreDaGradiente19Punti(temperaturaC: number, valori19: number[]): number {
  const clamped = Math.max(10, Math.min(28, Math.round(temperaturaC)))
  return valori19[clamped - 10]
}

const LIQUIDO_CON_CROSTA_GRADIENTE = [10, 11, 13, 14, 15, 17, 18, 20, 22, 24, 26, 29, 31, 34, 37, 41, 44, 48, 50]
const LIQUIDO_SENZA_CROSTA_GRADIENTE = [17, 19, 20, 22, 25, 27, 29, 32, 35, 39, 42, 46, 50, 55, 60, 65, 71, 78, 80]
const LAGONE_SCOPERTO_GRADIENTE = [66, 68, 70, 71, 73, 74, 75, 76, 77, 77, 78, 78, 78, 79, 79, 79, 79, 80, 80]

function fasciaDaTemperatura(temperaturaC: number): 'fredda' | 'temperata' | 'calda' {
  if (temperaturaC <= 14) return 'fredda'
  if (temperaturaC <= 25) return 'temperata'
  return 'calda'
}

/** MCF (%) per sistema di gestione, Tabella 10.17 IPCC (2006) — si veda
 * l'intestazione del file per i dettagli di quali sistemi dipendono dalla
 * temperatura esatta e quali dalla durata di stoccaggio. */
export function determinaMcfPercento(
  sistema: SistemaStoccaggio,
  temperaturaC: number,
  durataStoccaggioMesi: number,
): { mcfPercento: number; formula: string } {
  const fascia = fasciaDaTemperatura(temperaturaC)
  switch (sistema) {
    case 'solido': {
      const v = fascia === 'fredda' ? 2 : fascia === 'temperata' ? 4 : 5
      return { mcfPercento: v, formula: `Stoccaggio solido, clima ${fascia} (${n(temperaturaC)}°C) → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'platea_scoperta': {
      const v = fascia === 'fredda' ? 1.0 : fascia === 'temperata' ? 1.5 : 2.0
      return { mcfPercento: v, formula: `Platea scoperta, clima ${fascia} (${n(temperaturaC)}°C) → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'liquido_con_crosta': {
      const v = valoreDaGradiente19Punti(temperaturaC, LIQUIDO_CON_CROSTA_GRADIENTE)
      return { mcfPercento: v, formula: `Liquido/slurry con crosta naturale, ${n(temperaturaC)}°C → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'liquido_senza_crosta': {
      const v = valoreDaGradiente19Punti(temperaturaC, LIQUIDO_SENZA_CROSTA_GRADIENTE)
      return { mcfPercento: v, formula: `Liquido/slurry senza crosta naturale, ${n(temperaturaC)}°C → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'lagone_scoperto': {
      const v = valoreDaGradiente19Punti(temperaturaC, LAGONE_SCOPERTO_GRADIENTE)
      return { mcfPercento: v, formula: `Lagone anaerobico scoperto, ${n(temperaturaC)}°C → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'fessurato': {
      if (durataStoccaggioMesi < 1) {
        const v = fascia === 'calda' ? 30 : 3
        return {
          mcfPercento: v,
          formula: `Fossa a fessurato, <1 mese, clima ${fascia} → MCF = ${v}% (IPCC 2006, Tabella 10.17).`,
        }
      }
      const v = valoreDaGradiente19Punti(temperaturaC, LIQUIDO_SENZA_CROSTA_GRADIENTE)
      return {
        mcfPercento: v,
        formula: `Fossa a fessurato, ≥1 mese, ${n(temperaturaC)}°C → MCF = ${v}% (IPCC 2006, Tabella 10.17 — stessa curva del liquido senza crosta).`,
      }
    }
    case 'lettiera_profonda': {
      if (durataStoccaggioMesi < 1) {
        const v = fascia === 'calda' ? 30 : 3
        return {
          mcfPercento: v,
          formula: `Lettiera profonda, <1 mese, clima ${fascia} → MCF = ${v}% (IPCC 2006, Tabella 10.17).`,
        }
      }
      const v = valoreDaGradiente19Punti(temperaturaC, LIQUIDO_SENZA_CROSTA_GRADIENTE)
      return {
        mcfPercento: v,
        formula: `Lettiera profonda, ≥1 mese, ${n(temperaturaC)}°C → MCF = ${v}% (IPCC 2006, Tabella 10.17 — stessa curva del liquido senza crosta).`,
      }
    }
    case 'compost_statico':
      return { mcfPercento: 0.5, formula: 'Compostaggio statico/in-vessel → MCF = 0,5% (fisso, IPCC 2006, Tabella 10.17).' }
    case 'compost_intensivo': {
      const v = fascia === 'fredda' ? 0.5 : fascia === 'temperata' ? 1.0 : 1.5
      return { mcfPercento: v, formula: `Compostaggio in andana intensiva, clima ${fascia} → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'compost_passivo': {
      const v = fascia === 'fredda' ? 0.5 : fascia === 'temperata' ? 1.0 : 1.5
      return { mcfPercento: v, formula: `Compostaggio in andana passiva, clima ${fascia} → MCF = ${v}% (IPCC 2006, Tabella 10.17).` }
    }
    case 'avicolo_lettiera':
      return { mcfPercento: 1.5, formula: 'Lettiera avicola → MCF = 1,5% (fisso, IPCC 2006, Tabella 10.17).' }
  }
}

/** EF3 (kg N2O-N/kg N escreto) per sistema, Tabella 10.21 IPCC (2006). La
 * lettiera profonda ha due varianti (senza/con mescolazione attiva): si veda
 * il parametro miscelazioneAttiva di calcolaEf3. */
export function calcolaEf3(sistema: SistemaStoccaggio, miscelazioneAttivaLettiera: boolean): { ef3: number; fonte: string } {
  const tabella: Record<Exclude<SistemaStoccaggio, 'lettiera_profonda'>, number> = {
    solido: 0.005,
    platea_scoperta: 0.02,
    liquido_con_crosta: 0.005,
    liquido_senza_crosta: 0,
    lagone_scoperto: 0,
    fessurato: 0.002,
    compost_statico: 0.006,
    compost_intensivo: 0.1,
    compost_passivo: 0.01,
    avicolo_lettiera: 0.001,
  }
  if (sistema === 'lettiera_profonda') {
    const ef3 = miscelazioneAttivaLettiera ? 0.07 : 0.01
    return { ef3, fonte: `IPCC 2006, Tabella 10.21, lettiera profonda (${miscelazioneAttivaLettiera ? 'con' : 'senza'} mescolazione attiva).` }
  }
  return { ef3: tabella[sistema], fonte: `IPCC 2006, Tabella 10.21, ${SISTEMI_STOCCAGGIO[sistema]}.` }
}

/** FracGasMS (%) — azoto che volatilizza come NH3/NOx DURANTE LO STOCCAGGIO,
 * Tabella 10.22 IPCC (2006). Coperta solo per bovini da latte e "altri
 * bovini", solo per alcuni sistemi: le combinazioni assenti restituiscono
 * undefined (va inserito a mano, o si omette questa componente). */
export const FRAC_GASMS_BOVINI_DA_LATTE: Partial<Record<SistemaStoccaggio, number>> = {
  lagone_scoperto: 35,
  liquido_con_crosta: 40,
  liquido_senza_crosta: 40,
  fessurato: 28,
  platea_scoperta: 20,
  solido: 30,
}
export const FRAC_GASMS_BOVINI_DA_CARNE: Partial<Record<SistemaStoccaggio, number>> = {
  platea_scoperta: 30,
  solido: 45,
  lettiera_profonda: 30,
}

/** FracLossMS (%) — perdita TOTALE di azoto durante lo stoccaggio
 * (volatilizzazione + lisciviazione + ruscellamento), Tabella 10.23 IPCC
 * (2006). Stessa copertura limitata di FracGasMS. */
export const FRAC_LOSSMS_BOVINI_DA_LATTE: Partial<Record<SistemaStoccaggio, number>> = {
  lagone_scoperto: 77,
  liquido_con_crosta: 40,
  liquido_senza_crosta: 40,
  fessurato: 28,
  platea_scoperta: 30,
  solido: 40,
}
export const FRAC_LOSSMS_BOVINI_DA_CARNE: Partial<Record<SistemaStoccaggio, number>> = {
  platea_scoperta: 40,
  solido: 50,
  lettiera_profonda: 35,
}

function fracGasMsRiferimento(tipologia: TipologiaAllevamento, sistema: SistemaStoccaggio): number | undefined {
  if (tipologia === 'bovini_da_latte') return FRAC_GASMS_BOVINI_DA_LATTE[sistema]
  if (tipologia === 'bovini_da_carne') return FRAC_GASMS_BOVINI_DA_CARNE[sistema]
  return undefined
}

function fracLossMsRiferimento(tipologia: TipologiaAllevamento, sistema: SistemaStoccaggio): number | undefined {
  if (tipologia === 'bovini_da_latte') return FRAC_LOSSMS_BOVINI_DA_LATTE[sistema]
  if (tipologia === 'bovini_da_carne') return FRAC_LOSSMS_BOVINI_DA_CARNE[sistema]
  return undefined
}

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

export const FRAC_GASM_DEFAULT = 0.2

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
  tipologiaAllevamento: TipologiaAllevamento
  sistemaStoccaggio: SistemaStoccaggio
  temperaturaMediaAnnuaC: number
  durataStoccaggioMesi: number
  miscelazioneAttivaLettiera?: boolean
  azotoEscretoKgAnno: number
  tecnicaSpandimento: TecnicaSpandimento
  mcfManualePercento?: number
  fracGasMsStoccaggioManualePercento?: number
  fracLossMsManualePercento?: number
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
  fonteEf3: string
  n2oDirettoKgAnno: number
  formulaN2oDiretto: string
  n2oDirettoTCO2eq: number
  fracGasMsStoccaggioPercento: number | null
  n2oIndirettoStoccaggioKgAnno: number
  formulaN2oIndirettoStoccaggio: string
  n2oIndirettoStoccaggioTCO2eq: number
  fracLossMsPercento: number | null
  nDisponibilePerSpandimentoKgAnno: number
  formulaNDisponibile: string
  fracGasmEffettivoPercento: number
  formulaFracGasm: string
  n2oIndirettoSpandimentoKgAnno: number
  formulaN2oIndirettoSpandimento: string
  n2oIndirettoSpandimentoTCO2eq: number
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
  } else {
    const r = determinaMcfPercento(input.sistemaStoccaggio, input.temperaturaMediaAnnuaC, input.durataStoccaggioMesi)
    mcfPercento = r.mcfPercento
    formulaMcf = r.formula
  }

  const ch4KgAnno = vsKgAnno * bo * DENSITA_METANO_KG_PER_M3 * (mcfPercento / 100)
  const formulaCh4 = `${n(vsKgAnno)} kg VS × ${n(bo)} m³/kg × ${DENSITA_METANO_KG_PER_M3} kg/m³ × ${n(mcfPercento)}% = ${n(ch4KgAnno)} kg CH4/anno`
  const ch4TCO2eq = (ch4KgAnno / 1000) * GWP_CH4

  const { ef3, fonte: fonteEf3 } = calcolaEf3(input.sistemaStoccaggio, input.miscelazioneAttivaLettiera ?? false)
  const n2oDirettoKgAnno = input.azotoEscretoKgAnno * ef3 * (44 / 28)
  const formulaN2oDiretto = `${n(input.azotoEscretoKgAnno)} kg N × ${ef3} (EF3) × 44/28 = ${n(n2oDirettoKgAnno)} kg N2O/anno`
  const n2oDirettoTCO2eq = (n2oDirettoKgAnno / 1000) * GWP_N2O

  const fracGasMsRif = fracGasMsRiferimento(input.tipologiaAllevamento, input.sistemaStoccaggio)
  const fracGasMsStoccaggioPercento = input.fracGasMsStoccaggioManualePercento ?? fracGasMsRif ?? null
  let n2oIndirettoStoccaggioKgAnno = 0
  let formulaN2oIndirettoStoccaggio: string
  if (fracGasMsStoccaggioPercento != null) {
    const nVolatilizzatoStoccaggio = input.azotoEscretoKgAnno * (fracGasMsStoccaggioPercento / 100)
    n2oIndirettoStoccaggioKgAnno = nVolatilizzatoStoccaggio * EF4 * (44 / 28)
    formulaN2oIndirettoStoccaggio =
      `${n(input.azotoEscretoKgAnno)} kg N × ${n(fracGasMsStoccaggioPercento)}% (FracGasMS${input.fracGasMsStoccaggioManualePercento != null ? ', manuale' : ', Tabella 10.22'}) ` +
      `= ${n(nVolatilizzatoStoccaggio)} kg N → × ${EF4} (EF4) × 44/28 = ${n(n2oIndirettoStoccaggioKgAnno)} kg N2O/anno`
  } else {
    formulaN2oIndirettoStoccaggio =
      "Nessun valore di FracGasMS (Tabella 10.22) disponibile per questa combinazione tipologia/sistema: componente omessa. Inseriscila a mano se disponibile da fonte verificata."
  }
  const n2oIndirettoStoccaggioTCO2eq = (n2oIndirettoStoccaggioKgAnno / 1000) * GWP_N2O

  const fracLossMsRif = fracLossMsRiferimento(input.tipologiaAllevamento, input.sistemaStoccaggio)
  const fracLossMsPercento = input.fracLossMsManualePercento ?? fracLossMsRif ?? null
  const nDisponibilePerSpandimentoKgAnno =
    fracLossMsPercento != null
      ? input.azotoEscretoKgAnno * (1 - fracLossMsPercento / 100)
      : input.azotoEscretoKgAnno
  const formulaNDisponibile =
    fracLossMsPercento != null
      ? `${n(input.azotoEscretoKgAnno)} kg N × (1 − ${n(fracLossMsPercento)}%/100) (FracLossMS${input.fracLossMsManualePercento != null ? ', manuale' : ', Tabella 10.23'}) = ${n(nDisponibilePerSpandimentoKgAnno)} kg N/anno`
      : `Nessun valore di FracLossMS (Tabella 10.23) disponibile per questa combinazione tipologia/sistema: si usa l'intero azoto escreto (${n(input.azotoEscretoKgAnno)} kg N/anno) senza ridurlo per le perdite di stoccaggio — inseriscilo a mano se disponibile da fonte verificata.`

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
  const nVolatilizzatoSpandimentoKgAnno = nDisponibilePerSpandimentoKgAnno * (fracGasmEffettivoPercento / 100)
  const n2oIndirettoSpandimentoKgAnno = nVolatilizzatoSpandimentoKgAnno * EF4 * (44 / 28)
  const formulaN2oIndirettoSpandimento =
    `${n(nDisponibilePerSpandimentoKgAnno)} kg N disponibile × ${n(fracGasmEffettivoPercento)}% (volatilizzato) = ${n(nVolatilizzatoSpandimentoKgAnno)} kg N ` +
    `→ × ${EF4} (EF4) × 44/28 = ${n(n2oIndirettoSpandimentoKgAnno)} kg N2O/anno`
  const n2oIndirettoSpandimentoTCO2eq = (n2oIndirettoSpandimentoKgAnno / 1000) * GWP_N2O

  const totaleTCO2eq = ch4TCO2eq + n2oDirettoTCO2eq + n2oIndirettoStoccaggioTCO2eq + n2oIndirettoSpandimentoTCO2eq
  const formulaTotale =
    `${n(ch4TCO2eq)} (CH4 stoccaggio) + ${n(n2oDirettoTCO2eq)} (N2O diretto stoccaggio) + ` +
    `${n(n2oIndirettoStoccaggioTCO2eq)} (N2O indiretto stoccaggio) + ` +
    `${n(n2oIndirettoSpandimentoTCO2eq)} (N2O indiretto spandimento) = ${n(totaleTCO2eq)} t CO2eq`

  return {
    vsKgAnno,
    formulaVs,
    mcfPercento,
    formulaMcf,
    ch4KgAnno,
    formulaCh4,
    ch4TCO2eq,
    ef3,
    fonteEf3,
    n2oDirettoKgAnno,
    formulaN2oDiretto,
    n2oDirettoTCO2eq,
    fracGasMsStoccaggioPercento,
    n2oIndirettoStoccaggioKgAnno,
    formulaN2oIndirettoStoccaggio,
    n2oIndirettoStoccaggioTCO2eq,
    fracLossMsPercento,
    nDisponibilePerSpandimentoKgAnno,
    formulaNDisponibile,
    fracGasmEffettivoPercento,
    formulaFracGasm,
    n2oIndirettoSpandimentoKgAnno,
    formulaN2oIndirettoSpandimento,
    n2oIndirettoSpandimentoTCO2eq,
    totaleTCO2eq,
    formulaTotale,
  }
}
