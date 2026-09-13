import type {
  DatiAgricolturaAgroforestazione,
  DatiCalcolo,
  DatiImboschimento,
  RisultatoCalcolo,
} from '../types'

/**
 * Regolamento delegato (UE) .../... C(2026) 4666 final, allegato, sezione 2.5:
 * il fattore di riduzione per incertezza (INC) è pari almeno all'8%.
 */
export const FATTORE_INCERTEZZA_MINIMO = 0.08

export function fattoreIncertezzaEffettivo(inputPercentuale: number): number {
  const inc = isFinite(inputPercentuale) ? inputPercentuale : 0
  return Math.max(FATTORE_INCERTEZZA_MINIMO, inc)
}

function anniTrascorsiDa(dataIsoIniziale: string): number {
  if (!dataIsoIniziale) return 0
  const inizio = new Date(dataIsoIniziale).getTime()
  if (isNaN(inizio)) return 0
  const oggi = Date.now()
  const anni = (oggi - inizio) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.max(0, anni)
}

interface EquazioniInput {
  assorbimentiAttivita: number
  assorbimentiRiferimento: number
  emissioniSuoloAttivita: number
  emissioniSuoloRiferimento: number
  emissioniAgricoleAttivita: number
  emissioniAgricoleRiferimento: number
  gesAssociati: number
  inc: number
}

/**
 * Applica le equazioni 1 e 2 dell'allegato. Convenzione di segno "intuitiva":
 * un assorbimento di carbonio è positivo (a differenza della convenzione "AC" del
 * regolamento, dove è negativo) — matematicamente equivalente, con segni riordinati.
 * Il termine GESassociati viene ripartito fra i due benefici in proporzione al loro
 * valore lordo, come previsto dall'allegato, sezione 2.1, quando l'attività genera
 * sia assorbimenti di carbonio che riduzioni delle emissioni dal suolo.
 */
function applicaEquazioni1e2({
  assorbimentiAttivita,
  assorbimentiRiferimento,
  emissioniSuoloAttivita,
  emissioniSuoloRiferimento,
  emissioniAgricoleAttivita,
  emissioniAgricoleRiferimento,
  gesAssociati,
  inc,
}: EquazioniInput) {
  const beneficioLordoAssorbimento = (assorbimentiAttivita - assorbimentiRiferimento) * (1 - inc)
  const beneficioLordoRiduzioneEmissioni =
    (emissioniSuoloRiferimento -
      emissioniSuoloAttivita +
      (emissioniAgricoleRiferimento - emissioniAgricoleAttivita)) *
    (1 - inc)

  const totaleLordo = beneficioLordoAssorbimento + beneficioLordoRiduzioneEmissioni

  let gesPerAssorbimento = 0
  let gesPerRiduzione = 0

  const generaAssorbimento = beneficioLordoAssorbimento !== 0
  const generaRiduzione = beneficioLordoRiduzioneEmissioni !== 0

  if (generaAssorbimento && generaRiduzione && totaleLordo !== 0) {
    const peso = beneficioLordoAssorbimento / totaleLordo
    gesPerAssorbimento = gesAssociati * peso
    gesPerRiduzione = gesAssociati * (1 - peso)
  } else if (generaAssorbimento) {
    gesPerAssorbimento = gesAssociati
  } else {
    gesPerRiduzione = gesAssociati
  }

  return {
    beneficioNettoAssorbimentoTCO2: beneficioLordoAssorbimento - gesPerAssorbimento,
    beneficioNettoRiduzioneEmissioniTCO2: beneficioLordoRiduzioneEmissioni - gesPerRiduzione,
  }
}

function calcolaAgricolturaAgroforestazione(
  dati: DatiAgricolturaAgroforestazione,
): RisultatoCalcolo {
  const inc = fattoreIncertezzaEffettivo(dati.fattoreIncertezza)

  // Sezione 2.3.3: aggiornamento al ribasso del livello di riferimento ESA per le
  // pratiche che riducono le emissioni N2O dai suoli agricoli gestiti (1%/anno).
  let emissioniAgricoleRiferimento = dati.emissioniAgricoleRiferimentoTCO2
  if (dati.applicaAggiornamentoRiferimentoN2O) {
    const anni = anniTrascorsiDa(dati.dataInizioPeriodoAttivita)
    const riduzione = Math.min(1, 0.01 * anni)
    emissioniAgricoleRiferimento = dati.emissioniAgricoleRiferimentoTCO2 * (1 - riduzione)
  }

  const { beneficioNettoAssorbimentoTCO2, beneficioNettoRiduzioneEmissioniTCO2 } =
    applicaEquazioni1e2({
      assorbimentiAttivita: dati.assorbimentiAttivitaTCO2,
      assorbimentiRiferimento: dati.assorbimentiRiferimentoTCO2,
      emissioniSuoloAttivita: dati.emissioniSuoloAttivitaTCO2,
      emissioniSuoloRiferimento: dati.emissioniSuoloRiferimentoTCO2,
      emissioniAgricoleAttivita: dati.emissioniAgricoleAttivitaTCO2,
      emissioniAgricoleRiferimento,
      gesAssociati: dati.gesAssociatiTCO2,
      inc,
    })

  return finalizzaRisultato(
    beneficioNettoAssorbimentoTCO2,
    beneficioNettoRiduzioneEmissioniTCO2,
    dati.deficitCreditiPrecedenteTCO2 ?? 0,
  )
}

function calcolaImboschimento(dati: DatiImboschimento): RisultatoCalcolo {
  const inc = fattoreIncertezzaEffettivo(dati.fattoreIncertezza)

  // Sezione 2.3.2: agli assorbimenti da imboschimento si applica un livello di
  // riferimento pari a zero.
  const { beneficioNettoAssorbimentoTCO2, beneficioNettoRiduzioneEmissioniTCO2 } =
    applicaEquazioni1e2({
      assorbimentiAttivita: dati.assorbimentiAttivitaTCO2,
      assorbimentiRiferimento: 0,
      emissioniSuoloAttivita: dati.emissioniSuoloAttivitaTCO2,
      emissioniSuoloRiferimento: dati.emissioniSuoloRiferimentoTCO2,
      emissioniAgricoleAttivita: dati.emissioniAgricoleAttivitaTCO2,
      emissioniAgricoleRiferimento: dati.emissioniAgricoleRiferimentoTCO2,
      gesAssociati: dati.gesAssociatiTCO2,
      inc,
    })

  // Sezione 2.2: lavorazioni su prati permanenti nel contesto dell'imboschimento
  // comportano una perdita forfettaria del 12% dello stock di carbonio esistente.
  let aggiustamentoLavorazionePratiTCO2 = 0
  if (dati.applicaPerditaLavorazionePratiPermanenti && dati.stockCarbonioSueloPreesistenteTCO2) {
    aggiustamentoLavorazionePratiTCO2 = 0.12 * dati.stockCarbonioSueloPreesistenteTCO2
  }

  const risultato = finalizzaRisultato(
    beneficioNettoAssorbimentoTCO2 - aggiustamentoLavorazionePratiTCO2,
    beneficioNettoRiduzioneEmissioniTCO2,
    dati.deficitCreditiPrecedenteTCO2 ?? 0,
  )
  risultato.aggiustamentoLavorazionePratiTCO2 = aggiustamentoLavorazionePratiTCO2
  return risultato
}

function finalizzaRisultato(
  beneficioNettoAssorbimentoTCO2: number,
  beneficioNettoRiduzioneEmissioniTCO2: number,
  deficitPrecedente: number,
): RisultatoCalcolo {
  // Allegato, sezione 2.1, ultimo comma: un beneficio negativo diventa un deficit
  // di crediti da sottrarre nel periodo di certificazione successivo.
  const totaleGrezzo =
    beneficioNettoAssorbimentoTCO2 + beneficioNettoRiduzioneEmissioniTCO2 - deficitPrecedente

  const beneficioNettoTotaleTCO2 = Math.max(0, totaleGrezzo)
  const deficitCreditiTCO2 = totaleGrezzo < 0 ? -totaleGrezzo : 0

  return {
    beneficioNettoAssorbimentoTCO2,
    beneficioNettoRiduzioneEmissioniTCO2,
    beneficioNettoTotaleTCO2,
    deficitCreditiTCO2,
  }
}

export function calcolaBilancio(dati: DatiCalcolo): RisultatoCalcolo {
  switch (dati.tipoAttivita) {
    case 'agricoltura_agroforestazione':
      return calcolaAgricolturaAgroforestazione(dati)
    case 'imboschimento':
      return calcolaImboschimento(dati)
  }
}
