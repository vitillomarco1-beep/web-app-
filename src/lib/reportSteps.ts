import type {
  DatiAgricolturaAgroforestazione,
  DatiCalcolo,
  DatiImboschimento,
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
  'Tutti i valori sono espressi in tonnellate di CO2 equivalente (t CO2eq): le eventuali ' +
  'emissioni di CH4 e N2O incluse nei dati di input si intendono già convertite in CO2eq ' +
  'utilizzando i potenziali di riscaldamento globale (GWP) del regolamento delegato (UE) ' +
  "2020/1044 o dell'ultima relazione di valutazione IPCC, come richiesto dall'allegato, " +
  'sez. 2.2. Documento generato automaticamente dal Carbon Farming Calculator sulla base dei ' +
  "dati inseriti dal consulente. È uno strumento di supporto professionale: non sostituisce " +
  'la verifica di un organismo di certificazione accreditato ai sensi del regolamento ' +
  '(UE) 2024/3012.'
