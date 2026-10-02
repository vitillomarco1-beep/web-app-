/**
 * Numero minimo di unità di campionamento per le misure dirette nel piano di
 * monitoraggio dell'imboschimento/agroforestazione — quante unità (alberi,
 * filari, plot) misurare sul campo per stimare lo stock di carbonio con una
 * precisione statistica target, nelle verifiche di ricertificazione
 * successive al censimento iniziale (il censimento di avvio, conteggio
 * completo delle unità di impianto, non richiede campionamento).
 *
 * FORMULA PRINCIPALE — Atto Delegato UE C(2026) 4666, sez. 2.4.2.2.C, eq. 10
 * (così come ripresa in una slide del Master in Carbon Farming, Università
 * degli Studi della Tuscia — non ho potuto verificare il testo integrale
 * dell'atto delegato: numero di sezione/equazione da confermare sul testo
 * ufficiale quando disponibile):
 *
 *   n ≥ σ² × Zα² / E²
 *
 * dove σ² = varianza dello stock di carbonio (o della grandezza misurata)
 * nell'area campionata, Zα = valore critico della distribuzione normale per
 * il livello di confidenza richiesto (1,65 per confidenza 90%, il valore
 * indicato in slide), E = errore massimo accettabile, nelle stesse unità di
 * σ. È la stessa statistica classica del dimensionamento di un campione per
 * stimare una media con varianza nota — identica nella forma all'equazione 2
 * (caso semplificato, popolazione infinita) dello strumento UNFCCC CDM
 * "Calculation of the number of sample plots for measurements within A/R CDM
 * project activities" (v. 02.1.0): i valori Zα usati qui coincidono infatti
 * con i valori della t di Student a gradi di libertà infiniti dello stesso
 * strumento CDM (1,645 per confidenza 90%, due code).
 *
 * ESTENSIONE FACOLTATIVA — stratificazione e correzione per popolazione
 * finita (dallo strumento CDM citato sopra, non dall'Atto Delegato UE: fonte
 * del mercato volontario, riportata qui solo come raffinamento statistico
 * aggiuntivo per chi vuole suddividere l'area in più strati con variabilità
 * diversa):
 *
 *   n = N × t² × (Σ wᵢ×sᵢ)² / [N × E² + t² × Σ wᵢ×sᵢ²]           (eq. 1 CDM)
 *   nᵢ = n × (wᵢ×sᵢ) / Σⱼ(wⱼ×sⱼ)                                  (eq. 4 CDM, allocazione ottimale)
 *
 * dove N = numero totale di unità campionabili nell'area (area progetto /
 * area di un'unità), wᵢ = peso relativo dell'area dello strato i. Se n
 * risulta < 30 alla prima iterazione (t a gradi di libertà infiniti), lo
 * strumento CDM prevede una seconda e ultima iterazione con t ai gradi di
 * libertà (n−1).
 *
 * TRASPARENZA SULLE FONTI: la formula principale è attribuita all'Atto
 * Delegato UE sulla base di una slide di lezione che lo cita esplicitamente
 * (sez. 2.4.2.2.C, eq. 10) — non del testo normativo letto direttamente, che
 * non sono riuscito a recuperare (accesso bloccato dall'ambiente). Verificala
 * contro il testo ufficiale dell'atto delegato prima di un uso diverso dalla
 * pianificazione preliminare del piano di monitoraggio. L'estensione per
 * strati è dichiaratamente di fonte CDM (mercato volontario), non UE.
 */

export type LivelloConfidenza = 80 | 90 | 95 | 98 | 99

export const LIVELLI_CONFIDENZA: LivelloConfidenza[] = [80, 90, 95, 98, 99]

/** Valori critici della normale standard (Zα, due code) — coincidono con i
 * valori della t di Student a gradi di libertà infiniti. Fonte Zα=1,65 per
 * confidenza 90%: slide Master Carbon Farming (Università della Tuscia), che
 * cita l'Atto Delegato UE sez. 2.4.2.2.C; gli altri livelli da tavola
 * statistica standard (coerenti con la tavola t riportata nello strumento
 * CDM citato sopra, arrotondati a 2 decimali come in slide). */
export const Z_CONFIDENZA: Record<LivelloConfidenza, number> = {
  80: 1.28,
  90: 1.65,
  95: 1.96,
  98: 2.33,
  99: 2.58,
}

/** Valori t di Student a due code, gradi di libertà 1-30 (tavola completa,
 * 4 decimali) — usati solo dall'estensione facoltativa CDM per la seconda
 * iterazione quando n risulta inferiore a 30. Fonte: UNFCCC CDM Executive
 * Board, EB 58 Report Annex 15, "A/R Methodological Tool: Calculation of the
 * number of sample plots for measurements within A/R CDM project
 * activities" (v. 02.1.0, 26 novembre 2010). */
const T_STUDENT_DF: Record<number, Record<LivelloConfidenza, number>> = {
  1: { 80: 3.078, 90: 6.314, 95: 12.706, 98: 31.82, 99: 63.657 },
  2: { 80: 1.886, 90: 2.92, 95: 4.303, 98: 6.965, 99: 9.925 },
  3: { 80: 1.638, 90: 2.353, 95: 3.182, 98: 4.541, 99: 5.841 },
  4: { 80: 1.533, 90: 2.132, 95: 2.776, 98: 3.747, 99: 4.604 },
  5: { 80: 1.476, 90: 2.015, 95: 2.571, 98: 3.365, 99: 4.032 },
  6: { 80: 1.44, 90: 1.943, 95: 2.447, 98: 3.143, 99: 3.707 },
  7: { 80: 1.415, 90: 1.895, 95: 2.365, 98: 2.998, 99: 3.499 },
  8: { 80: 1.397, 90: 1.86, 95: 2.306, 98: 2.897, 99: 3.355 },
  9: { 80: 1.383, 90: 1.833, 95: 2.262, 98: 2.821, 99: 3.25 },
  10: { 80: 1.372, 90: 1.812, 95: 2.228, 98: 2.764, 99: 3.169 },
  11: { 80: 1.363, 90: 1.796, 95: 2.201, 98: 2.718, 99: 3.106 },
  12: { 80: 1.356, 90: 1.782, 95: 2.179, 98: 2.681, 99: 3.055 },
  13: { 80: 1.35, 90: 1.771, 95: 2.16, 98: 2.65, 99: 3.012 },
  14: { 80: 1.345, 90: 1.761, 95: 2.145, 98: 2.625, 99: 2.977 },
  15: { 80: 1.341, 90: 1.753, 95: 2.131, 98: 2.602, 99: 2.947 },
  16: { 80: 1.337, 90: 1.746, 95: 2.12, 98: 2.584, 99: 2.921 },
  17: { 80: 1.333, 90: 1.74, 95: 2.11, 98: 2.567, 99: 2.898 },
  18: { 80: 1.33, 90: 1.734, 95: 2.101, 98: 2.552, 99: 2.878 },
  19: { 80: 1.328, 90: 1.729, 95: 2.093, 98: 2.539, 99: 2.861 },
  20: { 80: 1.325, 90: 1.725, 95: 2.086, 98: 2.528, 99: 2.845 },
  21: { 80: 1.323, 90: 1.721, 95: 2.08, 98: 2.518, 99: 2.831 },
  22: { 80: 1.321, 90: 1.717, 95: 2.074, 98: 2.508, 99: 2.819 },
  23: { 80: 1.319, 90: 1.714, 95: 2.069, 98: 2.5, 99: 2.807 },
  24: { 80: 1.318, 90: 1.711, 95: 2.064, 98: 2.492, 99: 2.797 },
  25: { 80: 1.316, 90: 1.708, 95: 2.06, 98: 2.485, 99: 2.787 },
  26: { 80: 1.315, 90: 1.706, 95: 2.056, 98: 2.479, 99: 2.779 },
  27: { 80: 1.314, 90: 1.703, 95: 2.052, 98: 2.473, 99: 2.771 },
  28: { 80: 1.313, 90: 1.701, 95: 2.048, 98: 2.467, 99: 2.763 },
  29: { 80: 1.311, 90: 1.699, 95: 2.045, 98: 2.462, 99: 2.756 },
  30: { 80: 1.31, 90: 1.697, 95: 2.042, 98: 2.457, 99: 2.75 },
}
const T_INFINITO: Record<LivelloConfidenza, number> = { 80: 1.282, 90: 1.645, 95: 1.96, 98: 2.326, 99: 2.576 }

function tStudent(gradiLiberta: number, confidenza: LivelloConfidenza): number {
  const df = Math.max(1, Math.min(30, Math.round(gradiLiberta)))
  return T_STUDENT_DF[df][confidenza]
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface RisultatoNumeroPlotUE {
  numeroPlotMinimo: number
  formula: string
}

/** Formula principale (Atto Delegato UE, eq. 10): n ≥ σ²×Zα²/E², senza
 * stratificazione né correzione per popolazione finita — il caso d'uso più
 * diretto, un solo valore di deviazione standard per l'intera area o per uno
 * stesso stratum omogeneo. */
export function calcolaNumeroPlotUE(
  deviazioneStandard: number,
  margineErroreE: number,
  confidenza: LivelloConfidenza,
): RisultatoNumeroPlotUE {
  const z = Z_CONFIDENZA[confidenza]
  const nCampioni = margineErroreE > 0 ? (deviazioneStandard * deviazioneStandard * z * z) / (margineErroreE * margineErroreE) : 0
  const numeroPlotMinimo = Math.ceil(nCampioni)
  const formula =
    `${n(deviazioneStandard)}² × ${n(z)}² (Zα, confidenza ${confidenza}%) / ${n(margineErroreE)}² = ` +
    `${n(nCampioni)} → arrotondato per eccesso a ${numeroPlotMinimo} unità di campionamento`
  return { numeroPlotMinimo, formula }
}

export interface StratoCampionamento {
  nome: string
  areaHa: number
  deviazioneStandard: number
}

export interface RigaStratoCalcolata {
  nome: string
  areaHa: number
  pesoRelativo: number
  deviazioneStandard: number
  numeroPlotAllocati: number
}

export interface RisultatoCampionamentoStratificatoCdm {
  areaTotaleHa: number
  numeroPlotTotaliPossibili: number
  formulaN: string
  tValueIterazione1: number
  nIterazione1: number
  formulaIterazione1: string
  haRichiestoSecondaIterazione: boolean
  tValueIterazione2?: number
  nIterazione2?: number
  formulaIterazione2?: string
  numeroPlotFinale: number
  righeStrati: RigaStratoCalcolata[]
  formulaAllocazione: string
}

function areaTotale(strati: StratoCampionamento[]): number {
  return strati.reduce((tot, s) => tot + s.areaHa, 0)
}

function sommaWS(strati: StratoCampionamento[], area: number): number {
  return strati.reduce((tot, s) => tot + (s.areaHa / area) * s.deviazioneStandard, 0)
}

function sommaWS2(strati: StratoCampionamento[], area: number): number {
  return strati.reduce((tot, s) => tot + (s.areaHa / area) * (s.deviazioneStandard * s.deviazioneStandard), 0)
}

function calcolaNEq1(N: number, t: number, ws: number, ws2: number, E: number): number {
  return E > 0 ? (N * t * t * ws * ws) / (N * E * E + t * t * ws2) : 0
}

/** Estensione facoltativa (fonte CDM, non UE): stratificazione con
 * correzione per popolazione finita e allocazione ottimale tra strati — per
 * chi vuole suddividere l'area di imboschimento in più zone con variabilità
 * diversa della biomassa, invece di un unico valore di deviazione standard. */
export function calcolaCampionamentoStratificatoCdm(
  strati: StratoCampionamento[],
  dimensionePlotHa: number,
  margineErroreE: number,
  confidenza: LivelloConfidenza,
): RisultatoCampionamentoStratificatoCdm {
  const area = areaTotale(strati)
  const N = dimensionePlotHa > 0 ? area / dimensionePlotHa : 0
  const formulaN = `${n(area)} ha ÷ ${n(dimensionePlotHa)} ha/unità = ${n(N)} unità possibili (N)`

  const ws = sommaWS(strati, area)
  const ws2 = sommaWS2(strati, area)

  const t1 = T_INFINITO[confidenza]
  const n1 = calcolaNEq1(N, t1, ws, ws2, margineErroreE)
  const formulaIterazione1 =
    `N=${n(N)}, t=${n(t1)} (gradi di libertà infiniti, confidenza ${confidenza}%), Σwᵢsᵢ=${n(ws)}, Σwᵢsᵢ²=${n(ws2)}, E=${n(margineErroreE)} → ` +
    `n = (${n(N)}×${n(t1)}²×${n(ws)}²) / (${n(N)}×${n(margineErroreE)}²+${n(t1)}²×${n(ws2)}) = ${n(n1)}`

  let tFinale = t1
  let nFinale = n1
  const haRichiestoSecondaIterazione = n1 < 30
  let tValueIterazione2: number | undefined
  let nIterazione2: number | undefined
  let formulaIterazione2: string | undefined

  if (haRichiestoSecondaIterazione) {
    const df2 = Math.max(1, Math.ceil(n1) - 1)
    const t2 = tStudent(df2, confidenza)
    const n2 = calcolaNEq1(N, t2, ws, ws2, margineErroreE)
    tValueIterazione2 = t2
    nIterazione2 = n2
    formulaIterazione2 = `n < 30 alla prima iterazione: si ricalcola con t ai gradi di libertà (n−1) = ${df2} → t = ${n(t2)} → n = ${n(n2)}`
    tFinale = t2
    nFinale = n2
  }
  void tFinale

  const numeroPlotFinale = Math.ceil(nFinale)

  const righeStrati: RigaStratoCalcolata[] = strati.map((s) => {
    const peso = s.areaHa / area
    const quota = ws > 0 ? (peso * s.deviazioneStandard) / ws : 0
    return {
      nome: s.nome,
      areaHa: s.areaHa,
      pesoRelativo: peso,
      deviazioneStandard: s.deviazioneStandard,
      numeroPlotAllocati: Math.ceil(numeroPlotFinale * quota),
    }
  })
  const formulaAllocazione = righeStrati
    .map(
      (r) =>
        `${r.nome}: ${numeroPlotFinale} × (${n(r.pesoRelativo)}×${n(r.deviazioneStandard)}) / ${n(ws)} ≈ ${r.numeroPlotAllocati}`,
    )
    .join(' — ')

  return {
    areaTotaleHa: area,
    numeroPlotTotaliPossibili: N,
    formulaN,
    tValueIterazione1: t1,
    nIterazione1: n1,
    formulaIterazione1,
    haRichiestoSecondaIterazione,
    tValueIterazione2,
    nIterazione2,
    formulaIterazione2,
    numeroPlotFinale,
    righeStrati,
    formulaAllocazione,
  }
}
