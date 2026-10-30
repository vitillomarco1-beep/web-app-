/**
 * Stima, esplicitamente parziale e non certificabile, dell'emissione di metano
 * enterico — con tre livelli di accuratezza (Tier 1/2/3 IPCC), da scegliere in
 * base ai dati realmente disponibili in azienda:
 *
 *   Tier 1 (bassa accuratezza): fattore di emissione di default per area
 *     geografica × numero di capi — nessun dato aziendale richiesto.
 *   Tier 2 (media accuratezza): stima dell'energia lorda ingerita dalla
 *     razione, con dati specifici dell'azienda (sostanza secca, fibra) — il
 *     metodo già implementato qui sotto (calcolaMetanoEnterico).
 *   Tier 3 (alta accuratezza): fattore di emissione azienda/animale
 *     specifico, da misurazione diretta (camera respiratoria, GreenFeed,
 *     Sniffer) — inserito a mano dall'utente quando disponibile.
 *   Misto: Tier 2 solo per la mandria in lattazione (il caso comune in cui
 *     il referto di laboratorio della TMR copre solo le vacche in
 *     lattazione) + Tier 1 per il resto della mandria senza analisi di
 *     dieta (asciutta, manze, manzette, vitelli) — calcolaMetanoEntericoMisto.
 *
 * TIER 1 — CH4 (kg/anno) = numero di capi × EF (kg CH4/capo/anno di default)
 *
 * Per i bovini da latte, se è disponibile la struttura della mandria per
 * categoria (lattazione, asciutta, manze, manzette, vitelli — si veda
 * types.ts, DatiZootecnia.struttureMandria), il Tier 1 si raffina applicando
 * l'EF "bovini da latte" solo alla mandria adulta (lattazione+asciutta) e
 * l'EF "altri bovini" alla rimonta non ancora in lattazione (manze,
 * manzette, vitelli) — calcolaMetanoEntericoTier1PerStruttura. Senza quella
 * struttura, il Tier 1 resta un unico EF applicato a tutti i capi
 * (calcolaMetanoEntericoDaFattore), che sovrastima la rimonta (l'EF da latte
 * applicato anche a manze/vitelli non lattiferi).
 *
 * Fonte EF Tier 1: IPCC 2019 Refinement to the 2006 Guidelines, Vol. 4 Cap.
 * 10, Tabella 10.11 (aggiornata), Europa occidentale — 126 kg CH4/capo/anno
 * per bovini da latte, 52 per altri bovini (valori 2006 originali: 117 e 57,
 * aggiornati dal 2019 Refinement ai valori correnti). Verificati direttamente
 * sulla Tabella 10.11 (Updated) del PDF ufficiale IPCC 2019 Refinement,
 * caricata dall'utente.
 *
 * TIER 3 — stessa formula del Tier 1, ma con un fattore di emissione
 * misurato specifico dell'azienda o della categoria animale al posto del
 * default regionale: CH4 (kg/anno) = numero di capi × EF misurato
 * (kg CH4/capo/anno).
 *
 * TIER 2 (metodo principale, già in uso):
 *
 *   CH4 (kg/anno) = (GEI (MJ/anno) × Ym / 100) / 55,65
 *
 * dove:
 * - GEI = ingestione di energia lorda (Gross Energy Intake) = sostanza secca
 *   totale ingerita (kg/anno) × 18,45 MJ/kg s.s. — il valore di default IPCC per
 *   l'energia lorda dell'alimento, usato in assenza di una misura diretta (bomba
 *   calorimetrica) per ciascun alimento della razione.
 * - Ym = fattore di conversione del metano (% dell'energia lorda ingerita
 *   convertita in CH4), dalla Tabella 10.12 (Updated) del 2019 Refinement to
 *   the 2006 IPCC Guidelines, Vol. 4 Cap. 10 — verificata direttamente sul PDF
 *   ufficiale caricato dall'utente. La tabella classifica le vacche da latte
 *   PRIMA per livello produttivo, non per NDF da solo:
 *     Alta produzione (>8.500 kg/capo/anno): NDF dieta ≤35% → Ym 5,7%; NDF
 *       dieta ≥35% → Ym 6,0%. (In questa sola fascia l'NDF disambigua.)
 *     Media produzione (5.000-8.500 kg/capo/anno) → Ym 6,3%
 *     Bassa produzione (<5.000 kg/capo/anno) → Ym 6,5%
 *   Per le vacche in asciutta la Tabella 10.12 (nota 4) assegna il valore
 *   "non da latte, foraggio di qualità" invece di quello di lattazione:
 *   Ym 6,3% per aziende ad alta/media produzione, Ym 7,0% per quelle a bassa
 *   produzione — non ancora applicato in questo strumento (richiederebbe un
 *   dato di ingestione separato per l'asciutta, che le aziende tipicamente non
 *   hanno: si veda calcolaMetanoEntericoMisto più sotto).
 *   Per bovini non da latte (categoria "Non dairy and multi-purpose Cattle",
 *   stessa tabella), quando non è nota la produzione di latte per capo, si usa
 *   il TDN medio della dieta come proxy della digeribilità DE% (i due valori
 *   sono numericamente vicini in pratica, ma non identici — approssimazione
 *   dichiarata):
 *     TDN/DE ≥ 75% → Ym 3,0% (feedlot, mais fioccato a vapore, 0-10% foraggio)
 *     TDN/DE ≥ 72% → Ym 4,0% (feedlot, altri cereali, 0-15% foraggio)
 *     TDN/DE ≥ 62% → Ym 6,3% (foraggio di qualità o razione mista)
 *     TDN/DE < 62% → Ym 7,0% (>75% foraggio di bassa qualità)
 *   Se non è disponibile né la produzione di latte né il TDN, si ricade
 *   sull'NDF medio della razione con le stesse soglie usate finora (5,7/6,0/
 *   7,0%): un'approssimazione dichiarata, perché l'NDF da solo non è l'asse
 *   di classificazione usato dalla Tabella 10.12 (lo è solo come criterio
 *   secondario per le alte produttrici da latte). In assenza di qualunque
 *   dato si usa il default generico IPCC (2006) per bovini, Ym = 6,5%
 *   (±1,0%).
 * - 55,65 MJ/kg = contenuto energetico del metano (valore IPCC).
 *
 * L'NDF e il TDN medi di dieta pesano TUTTO l'alimento ingerito, autoprodotto
 * e acquistato: ai fini del metano prodotto dall'animale non conta chi ha
 * coltivato l'alimento, solo cosa mangia (a differenza del calcolo di
 * assorbimento di CO2 in lib/simulazioneZootecnia.ts, che considera solo
 * l'alimento autoprodotto per evitare un doppio conteggio).
 *
 * Fonti: IPCC (2006) Guidelines for National Greenhouse Gas Inventories, Vol. 4
 * Ch. 10 (equazione, GE default 18,45 MJ/kg); 2019 Refinement to the 2006
 * IPCC Guidelines, Vol. 4 Cap. 10, Tabella 10.11 (Updated) e Tabella 10.12
 * (Updated) — entrambe verificate sul PDF ufficiale caricato dall'utente.
 *
 * QUESTA STIMA COPRE SOLO IL METANO ENTERICO — una componente delle emissioni
 * dirette dell'allevamento, non tutte (manca la gestione reflui e le emissioni
 * a monte della produzione dell'alimento): resta un valore parziale, mostrato
 * come approfondimento accanto all'intensità emissiva complessiva per unità di
 * prodotto usata nella simulazione (che, da letteratura, copre l'intero
 * sistema) — non la sostituisce e non entra nel bilancio simulato.
 */

import { GWP_VALORI } from './reportSteps'
import type { TipologiaAllevamento } from '../types'

export const GE_DEFAULT_MJ_PER_KG_SS = 18.45
export const ENERGIA_METANO_MJ_PER_KG = 55.65
const GWP_CH4 = GWP_VALORI.find((g) => g.formula === 'CH4')!.gwp

export type TierMetanoEnterico = 'tier1' | 'tier2' | 'tier3' | 'misto'

export interface EfTier1Riferimento {
  valore: number
  fonte: string
}

/** EF Tier 1 (kg CH4/capo/anno), Europa occidentale — si veda la nota di
 * trasparenza sulle fonti nell'intestazione del file. */
export const EF_TIER1_RIFERIMENTO: Partial<Record<TipologiaAllevamento, EfTier1Riferimento>> = {
  bovini_da_latte: {
    valore: 126,
    fonte:
      'IPCC 2019 Refinement, Vol.4 Cap.10, Tabella 10.11 (aggiornata), bovini da latte, Europa occidentale (valore 2006 originale: 117).',
  },
  bovini_da_carne: {
    valore: 52,
    fonte:
      'IPCC 2019 Refinement, Vol.4 Cap.10, Tabella 10.11 (aggiornata), altri bovini, Europa occidentale (valore 2006 originale: 57).',
  },
}

export interface RisultatoMetanoEntericoSemplice {
  ch4KgAnno: number
  formulaCh4: string
  ch4TCO2eq: number
  formulaCh4CO2eq: string
}

function formulaCh4CO2eqDa(ch4KgAnno: number): { ch4TCO2eq: number; formulaCh4CO2eq: string } {
  const ch4TCO2eq = (ch4KgAnno / 1000) * GWP_CH4
  const formulaCh4CO2eq = `${n(ch4KgAnno / 1000)} t CH4 × ${GWP_CH4} (GWP) = ${n(ch4TCO2eq)} t CO2eq`
  return { ch4TCO2eq, formulaCh4CO2eq }
}

/** Tier 1 (default regionale) o Tier 3 (misurazione diretta): stessa
 * formula, numero di capi × fattore di emissione per capo — cambia solo la
 * provenienza del fattore (tabella IPCC vs. misura aziendale), passata come
 * stringa fonte per la trasparenza. */
export function calcolaMetanoEntericoDaFattore(
  numeroCapi: number,
  efKgPerCapoAnno: number,
  fonteEf: string,
): RisultatoMetanoEntericoSemplice {
  const ch4KgAnno = numeroCapi * efKgPerCapoAnno
  const formulaCh4 = `${n(numeroCapi)} capi × ${n(efKgPerCapoAnno)} kg CH4/capo/anno (${fonteEf}) = ${n(ch4KgAnno)} kg CH4/anno`
  const { ch4TCO2eq, formulaCh4CO2eq } = formulaCh4CO2eqDa(ch4KgAnno)
  return { ch4KgAnno, formulaCh4, ch4TCO2eq, formulaCh4CO2eq }
}

export interface StrutturaMandriaInput {
  animaliLattazione: number
  animaliAsciutta: number
  manze12MesiParto: number
  manzette6_12Mesi: number
  vitelli0_6Mesi: number
}

/** Tier 1 per bovini da latte, raffinato per struttura di mandria: la
 * mandria adulta (lattazione+asciutta) usa l'EF "bovini da latte", la
 * rimonta (manze, manzette, vitelli — non ancora in lattazione) usa l'EF
 * "altri bovini", perché l'EF Tier 1 di default IPCC non distingue età
 * all'interno della rimonta (solo Tier 2/3 lo farebbero) ma distingue
 * nettamente mandria da latte matura da giovane bestiame non lattifero.
 * Più preciso del Tier 1 "piatto" (un solo EF per l'intera mandria, inclusa
 * la rimonta) perché non applica l'EF da latte anche ai vitelli. */
export function calcolaMetanoEntericoTier1PerStruttura(
  struttura: StrutturaMandriaInput,
  efMandriaAdulta: number,
  fonteEfMandriaAdulta: string,
  efRimonta: number,
  fonteEfRimonta: string,
): RisultatoMetanoEntericoSemplice {
  const capiMandriaAdulta = struttura.animaliLattazione + struttura.animaliAsciutta
  const capiRimonta = struttura.manze12MesiParto + struttura.manzette6_12Mesi + struttura.vitelli0_6Mesi
  const ch4MandriaAdulta = capiMandriaAdulta * efMandriaAdulta
  const ch4Rimonta = capiRimonta * efRimonta
  const ch4KgAnno = ch4MandriaAdulta + ch4Rimonta
  const formulaCh4 =
    `Mandria adulta (lattazione+asciutta): ${n(capiMandriaAdulta)} capi × ${n(efMandriaAdulta)} kg CH4/capo/anno ` +
    `(${fonteEfMandriaAdulta}) = ${n(ch4MandriaAdulta)} kg; rimonta (manze+manzette+vitelli): ${n(capiRimonta)} capi × ` +
    `${n(efRimonta)} kg CH4/capo/anno (${fonteEfRimonta}) = ${n(ch4Rimonta)} kg → totale ${n(ch4KgAnno)} kg CH4/anno`
  const { ch4TCO2eq, formulaCh4CO2eq } = formulaCh4CO2eqDa(ch4KgAnno)
  return { ch4KgAnno, formulaCh4, ch4TCO2eq, formulaCh4CO2eq }
}

/** Modalità "mista": Tier 2 (dalla razione) solo per la mandria in
 * lattazione — il caso comune in cui il referto di laboratorio della TMR
 * copre solo le vacche in lattazione — più Tier 1 (EF "altri bovini") per
 * il resto della mandria (asciutta, manze, manzette, vitelli), che non ha
 * un'analisi di dieta specifica disponibile. Approssimazione dichiarata per
 * le vacche in asciutta: non essendo alimentate con la TMR analizzata né
 * coperte da un EF Tier 1 "vacca asciutta" dedicato (l'EF "bovini da latte"
 * IPCC è un valore medio annuo già comprensivo del periodo di asciutta di
 * una lattifera media, quindi non va sommato separatamente), vengono stimate
 * con lo stesso EF "altri bovini" della rimonta. */
export function calcolaMetanoEntericoMisto(
  risultatoLattazione: RisultatoMetanoEntericoSemplice,
  capiRestoMandria: number,
  efRestoMandria: number,
  fonteEfRestoMandria: string,
): RisultatoMetanoEntericoSemplice {
  const restoMandria = calcolaMetanoEntericoDaFattore(capiRestoMandria, efRestoMandria, fonteEfRestoMandria)
  const ch4KgAnno = risultatoLattazione.ch4KgAnno + restoMandria.ch4KgAnno
  const formulaCh4 =
    `Lattazione (Tier 2, dalla razione): ${n(risultatoLattazione.ch4KgAnno)} kg CH4/anno; ` +
    `resto mandria (Tier 1): ${restoMandria.formulaCh4} → totale ${n(ch4KgAnno)} kg CH4/anno`
  const { ch4TCO2eq, formulaCh4CO2eq } = formulaCh4CO2eqDa(ch4KgAnno)
  return { ch4KgAnno, formulaCh4, ch4TCO2eq, formulaCh4CO2eq }
}

export interface RigaDietaInput {
  nomeMangime: string
  quantitaTAnno: number
  sostanzaSeccaPercento: number
  andfomPercento?: number
  tdnPercento?: number
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

/** Tier 2 IPCC — metodo principale, basato sulla composizione della razione.
 *
 * produzioneLatteKgCapoAnno: produzione media di latte per capo in
 * lattazione (kg/capo/anno) — se nota, classifica il Ym per livello
 * produttivo secondo la Tabella 10.12 (Updated), l'asse primario usato da
 * IPCC per le vacche da latte (si veda l'intestazione del file). */
export function calcolaMetanoEnterico(
  righe: RigaDietaInput[],
  ymManualePercento?: number,
  produzioneLatteKgCapoAnno?: number,
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

  const righeConTdn = righeConSS.filter((r) => r.tdnPercento != null && r.ssTAnno > 0)
  const ssConTdnTAnno = righeConTdn.reduce((tot, r) => tot + r.ssTAnno, 0)
  const tdnDietaPercento =
    ssConTdnTAnno > 0
      ? righeConTdn.reduce((tot, r) => tot + r.ssTAnno * (r.tdnPercento ?? 0), 0) / ssConTdnTAnno
      : null

  let ymPercento: number
  let formulaYm: string
  if (ymManualePercento != null) {
    ymPercento = ymManualePercento
    formulaYm = `Valore inserito manualmente: ${n(ymPercento)}%.`
  } else if (produzioneLatteKgCapoAnno != null && produzioneLatteKgCapoAnno > 0) {
    // Vacche da latte — Tabella 10.12 (Updated), 2019 Refinement: classificazione
    // primaria per livello produttivo, NDF come criterio secondario solo per le
    // alte produttrici (si veda l'intestazione del file).
    if (produzioneLatteKgCapoAnno > 8500) {
      if (ndfDietaPercento != null && ndfDietaPercento >= 35) {
        ymPercento = 6.0
        formulaYm = `Alta produzione (${n(produzioneLatteKgCapoAnno)} kg/capo/anno > 8.500) con NDF dieta ${n(ndfDietaPercento)}% ≥ 35% → Ym = 6,0% (Tabella 10.12 Updated, 2019 Refinement IPCC).`
      } else {
        ymPercento = 5.7
        formulaYm = `Alta produzione (${n(produzioneLatteKgCapoAnno)} kg/capo/anno > 8.500) con NDF dieta ${ndfDietaPercento != null ? `${n(ndfDietaPercento)}% ≤ 35%` : 'non disponibile'} → Ym = 5,7% (Tabella 10.12 Updated, 2019 Refinement IPCC).`
      }
    } else if (produzioneLatteKgCapoAnno >= 5000) {
      ymPercento = 6.3
      formulaYm = `Media produzione (${n(produzioneLatteKgCapoAnno)} kg/capo/anno, 5.000-8.500) → Ym = 6,3% (Tabella 10.12 Updated, 2019 Refinement IPCC).`
    } else {
      ymPercento = 6.5
      formulaYm = `Bassa produzione (${n(produzioneLatteKgCapoAnno)} kg/capo/anno < 5.000) → Ym = 6,5% (Tabella 10.12 Updated, 2019 Refinement IPCC).`
    }
  } else if (tdnDietaPercento != null) {
    // Bovini non da latte (o produzione di latte per capo non nota) — Tabella
    // 10.12 (Updated), riga "Non dairy and multi-purpose Cattle", classificata
    // per digeribilità DE%, qui approssimata con il TDN medio della dieta.
    if (tdnDietaPercento >= 75) {
      ymPercento = 3.0
      formulaYm = `TDN dieta ${n(tdnDietaPercento)}% ≥ 75% (proxy DE%) → Ym = 3,0% (feedlot, mais fioccato a vapore — Tabella 10.12 Updated, bovini non da latte).`
    } else if (tdnDietaPercento >= 72) {
      ymPercento = 4.0
      formulaYm = `TDN dieta ${n(tdnDietaPercento)}% ≥ 72% (proxy DE%) → Ym = 4,0% (feedlot, altri cereali — Tabella 10.12 Updated, bovini non da latte).`
    } else if (tdnDietaPercento >= 62) {
      ymPercento = 6.3
      formulaYm = `TDN dieta ${n(tdnDietaPercento)}% tra 62% e 71% (proxy DE%) → Ym = 6,3% (foraggio di qualità/razione mista — Tabella 10.12 Updated, bovini non da latte).`
    } else {
      ymPercento = 7.0
      formulaYm = `TDN dieta ${n(tdnDietaPercento)}% < 62% (proxy DE%) → Ym = 7,0% (>75% foraggio di bassa qualità — Tabella 10.12 Updated, bovini non da latte).`
    }
  } else if (ndfDietaPercento != null) {
    // Fallback: né produzione di latte né TDN noti. L'NDF da solo non è l'asse
    // di classificazione della Tabella 10.12 (lo è solo come criterio
    // secondario per le alte produttrici da latte): approssimazione dichiarata.
    if (ndfDietaPercento <= 35) {
      ymPercento = 5.7
      formulaYm = `Nessun dato di produzione di latte o TDN: approssimazione da NDF dieta ${n(ndfDietaPercento)}% ≤ 35% → Ym = 5,7% (non è l'asse primario della Tabella 10.12 — indicativo).`
    } else if (ndfDietaPercento <= 65) {
      ymPercento = 6.0
      formulaYm = `Nessun dato di produzione di latte o TDN: approssimazione da NDF dieta ${n(ndfDietaPercento)}% tra 35% e 65% → Ym = 6,0% (non è l'asse primario della Tabella 10.12 — indicativo).`
    } else {
      ymPercento = 7.0
      formulaYm = `Nessun dato di produzione di latte o TDN: approssimazione da NDF dieta ${n(ndfDietaPercento)}% > 65% → Ym = 7,0% (non è l'asse primario della Tabella 10.12 — indicativo).`
    }
  } else {
    ymPercento = 6.5
    formulaYm = 'Nessun dato di produzione di latte, TDN o NDF disponibile: default generico IPCC (2006) per bovini, Ym = 6,5%.'
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
