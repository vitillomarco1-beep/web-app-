import type {
  DatiAgricolturaAgroforestazione,
  DatiCalcolo,
  DatiImboschimento,
  DettaglioRothC,
  RisultatoCalcolo,
} from '../types'
import { formatTCO2 } from './format'
import { CHECKLIST_AGRICOLTURA, CHECKLIST_IMBOSCHIMENTO, CHECKLIST_ZOOTECNIA } from './checklist'
import type { ChecklistItemDef } from './checklist'

export interface RigaReport {
  etichetta: string
  valore: string
}

/** Logica condivisa tra il report PDF (jsPDF) e l'anteprima a schermo (HTML), così
 * che le due rappresentazioni mostrino sempre esattamente gli stessi passaggi e
 * numeri: un'unica fonte di verità per la trasparenza del calcolo verso il cliente. */
export function haQuantificazione(
  dati: DatiCalcolo,
): dati is DatiAgricolturaAgroforestazione | DatiImboschimento {
  return dati.tipoAttivita !== 'zootecnia'
}

export function checklistPer(
  dati: DatiCalcolo,
): { items: ChecklistItemDef[]; valori: Record<string, boolean> } | null {
  switch (dati.tipoAttivita) {
    case 'agricoltura_agroforestazione':
      return { items: CHECKLIST_AGRICOLTURA, valori: dati.checklist }
    case 'imboschimento':
      return { items: CHECKLIST_IMBOSCHIMENTO, valori: dati.checklist }
    case 'zootecnia':
      return { items: CHECKLIST_ZOOTECNIA, valori: dati.checklist }
  }
}

export function calcolaPassaggi(dati: DatiCalcolo, risultato: RisultatoCalcolo): RigaReport[] {
  const d = risultato.dettaglio
  if (!d) return []
  const passaggi: RigaReport[] = []

  passaggi.push({
    etichetta: 'Fattore di riduzione per incertezza (INC) applicato',
    valore: `${(d.fattoreIncertezzaEffettivo * 100).toFixed(1)}%`,
  })
  if (d.emissioniAgricoleRiferimentoAggiornatoTCO2 !== undefined) {
    passaggi.push({
      etichetta: 'Livello di riferimento ESA aggiornato (sez. 2.3.3, -1%/anno)',
      valore: `${formatTCO2(d.emissioniAgricoleRiferimentoAggiornatoTCO2)} t CO2eq`,
    })
  }
  passaggi.push({
    etichetta: 'Beneficio lordo — assorbimento di carbonio',
    valore: `${formatTCO2(d.beneficioLordoAssorbimentoTCO2)} t CO2eq`,
  })
  passaggi.push({
    etichetta: 'Beneficio lordo — riduzione emissioni dal suolo',
    valore: `${formatTCO2(d.beneficioLordoRiduzioneEmissioniTCO2)} t CO2eq`,
  })
  if (d.gesAssociatiQuotaAssorbimentoTCO2 !== 0) {
    passaggi.push({
      etichetta: 'GES associati sottratti — quota assorbimento',
      valore: `-${formatTCO2(d.gesAssociatiQuotaAssorbimentoTCO2)} t CO2eq`,
    })
  }
  if (d.gesAssociatiQuotaRiduzioneTCO2 !== 0) {
    passaggi.push({
      etichetta: 'GES associati sottratti — quota riduzione emissioni',
      valore: `-${formatTCO2(d.gesAssociatiQuotaRiduzioneTCO2)} t CO2eq`,
    })
  }
  passaggi.push({
    etichetta: 'Beneficio netto — assorbimento di carbonio',
    valore: `${formatTCO2(risultato.beneficioNettoAssorbimentoTCO2)} t CO2eq`,
  })
  passaggi.push({
    etichetta: 'Beneficio netto — riduzione emissioni dal suolo',
    valore: `${formatTCO2(risultato.beneficioNettoRiduzioneEmissioniTCO2)} t CO2eq`,
  })
  if (risultato.aggiustamentoLavorazionePratiTCO2) {
    passaggi.push({
      etichetta: 'Detrazione per lavorazione di prati permanenti (12%, sez. 2.2)',
      valore: `-${formatTCO2(risultato.aggiustamentoLavorazionePratiTCO2)} t CO2eq`,
    })
  }
  if (
    risultato.deficitCreditiTCO2 > 0 ||
    (dati as DatiAgricolturaAgroforestazione).deficitCreditiPrecedenteTCO2
  ) {
    const deficitPrecedente =
      'deficitCreditiPrecedenteTCO2' in dati ? (dati.deficitCreditiPrecedenteTCO2 ?? 0) : 0
    if (deficitPrecedente > 0) {
      passaggi.push({
        etichetta: 'Deficit di crediti riportato dal periodo precedente',
        valore: `-${formatTCO2(deficitPrecedente)} t CO2eq`,
      })
    }
  }
  return passaggi
}

export const DISCLAIMER_REPORT =
  'Documento generato automaticamente dal Carbon Farming Calculator sulla base dei dati ' +
  "inseriti dal consulente. È uno strumento di supporto professionale: non sostituisce la " +
  'verifica di un organismo di certificazione accreditato ai sensi del regolamento (UE) ' +
  '2024/3012.'

/** Come si interpretano i due scenari quantificati (equazioni 1 e 2 dell'allegato):
 * il significato — e il modo in cui si arriva ai due numeri — cambia secondo la
 * metodologia, quindi il testo è specifico per tipo di attività. */
export function descrizioneScenari(dati: DatiCalcolo): string {
  if (dati.tipoAttivita === 'imboschimento') {
    return (
      "Lo scenario di riferimento per l'assorbimento nella biomassa vivente è fissato per " +
      "convenzione a zero (allegato, sez. 2.3.2): si assume cioè che, senza l'attività di " +
      'imboschimento, l\'area non avrebbe accumulato nuovo carbonio in biomassa forestale. Lo ' +
      'scenario di attività — quantificato a fine periodo di certificazione — è la stima o ' +
      "misurazione dell'assorbimento realmente conseguito con l'imboschimento realizzato " +
      '(rilievi dendrometrici, modelli di crescita forestale o telerilevamento).'
    )
  }
  return (
    "Lo scenario di riferimento rappresenta l'evoluzione del carbonio nel suolo e nella " +
    'biomassa che si sarebbe avuta continuando le pratiche di gestione precedenti (baseline, ' +
    "senza l'attività di carboniocoltura): si stima con misurazioni storiche, fattori di " +
    'emissione o modelli (es. il simulatore RothC), fatti girare con le pratiche di gestione ' +
    'pre-esistenti. Lo scenario di attività rappresenta la stessa evoluzione, quantificata a ' +
    'fine periodo di certificazione, con le pratiche effettivamente adottate. La differenza ' +
    'tra i due scenari (equazioni 1 e 2 dell\'allegato) è il beneficio climatico netto ' +
    "attribuibile all'attività."
  )
}

/** Potenziali di riscaldamento globale (GWP a 100 anni, IPCC AR5) fissati dal
 * regolamento delegato (UE) 2020/1044 per la conversione dei gas serra in CO2eq: la
 * stessa fonte richiamata dall'allegato del regolamento (UE) 2024/3012, sez. 2.2. */
export const GWP_VALORI: { gas: string; formula: string; gwp: number; nota: string }[] = [
  { gas: 'Anidride carbonica', formula: 'CO2', gwp: 1, nota: 'unità di riferimento, per definizione' },
  { gas: 'Metano', formula: 'CH4', gwp: 28, nota: 'GWP a 100 anni, IPCC AR5' },
  { gas: 'Protossido di azoto', formula: 'N2O', gwp: 265, nota: 'GWP a 100 anni, IPCC AR5' },
]

function n2(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v)
}

/** Riepilogo testuale di come sono stati ottenuti gli scenari con la simulazione
 * RothC, per introdurre la tabella di confronto riferimento/attività. */
export function introduzioneRothC(d: DettaglioRothC): string {
  return (
    'Gli assorbimenti di carbonio dei due scenari sono stati stimati con il simulatore RothC ' +
    `integrato, a partire da un SOC (stock di carbonio organico nel suolo) iniziale misurato di ` +
    `${n2(d.socInizialeTCHa)} t C/ha, un contenuto di argilla del ${n2(d.argillaPercento)}% e una ` +
    `simulazione di ${d.durataAnni} anni. Il modello stima mese per mese la decomposizione della ` +
    "sostanza organica sotto clima, apporti di carbonio e copertura del suolo di ciascuno scenario: " +
    'la variazione di SOC tra inizio e fine periodo, convertita in CO2eq (fattore 44/12, rapporto ' +
    'tra i pesi molecolari di CO2 e carbonio), dà l\'assorbimento per ettaro, poi moltiplicato per ' +
    "l'area di attività per ottenere le tonnellate totali riportate nei dati di input."
  )
}

export interface RigaConfronto {
  etichetta: string
  riferimento: string
  attivita: string
}

/** Righe della tabella di confronto riferimento/attività della simulazione RothC:
 * dagli apporti di carbonio in ingresso fino al risultato finale in t CO2eq/ha,
 * passo per passo. */
export function righeConfrontoRothC(d: DettaglioRothC): RigaConfronto[] {
  return [
    {
      etichetta: 'Apporto di carbonio da residui colturali (t C/ha/anno)',
      riferimento: n2(d.riferimento.apportoResiduiTCHaAnno),
      attivita: n2(d.attivita.apportoResiduiTCHaAnno),
    },
    {
      etichetta: 'Apporto di carbonio da ammendanti organici (t C/ha/anno)',
      riferimento: n2(d.riferimento.apportoAmmendantiTCHaAnno),
      attivita: n2(d.attivita.apportoAmmendantiTCHaAnno),
    },
    {
      etichetta: 'Copertura vegetativa media (%)',
      riferimento: n2(d.riferimento.quotaCoperturaVegetativa * 100),
      attivita: n2(d.attivita.quotaCoperturaVegetativa * 100),
    },
    {
      etichetta: 'SOC finale simulato (t C/ha)',
      riferimento: n2(d.riferimento.socFinaleTCHa),
      attivita: n2(d.attivita.socFinaleTCHa),
    },
    {
      etichetta: "Variazione di SOC rispetto all'inizio (t C/ha)",
      riferimento: n2(d.riferimento.variazioneSocTCHa),
      attivita: n2(d.attivita.variazioneSocTCHa),
    },
    {
      etichetta: 'Variazione convertita in CO2eq (t CO2eq/ha) — × 44/12',
      riferimento: n2(d.riferimento.variazioneCO2eqTHa),
      attivita: n2(d.attivita.variazioneCO2eqTHa),
    },
  ]
}

export const SPIEGAZIONE_CONVERSIONE_CO2EQ =
  'I diversi gas serra si sommano convertendo la massa di ciascuno in un\'unica unità comune, ' +
  'la tonnellata di CO2 equivalente: massa del gas (t) moltiplicata per il suo GWP (potenziale ' +
  'di riscaldamento globale a 100 anni) dà le t CO2eq corrispondenti. Esempio: 0,01 t di N2O ' +
  'emesse equivalgono a 0,01 × 265 = 2,65 t CO2eq. Tutti i valori di input di questo calcolo ' +
  '(assorbimenti, ESL, ESA, GES associati) sono già espressi in t CO2eq secondo questa ' +
  'conversione: il consulente li quantifica a monte a partire dalle masse dei singoli gas.'
