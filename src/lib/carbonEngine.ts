import type {
  DatiAgricolturaAgroforestazione,
  DatiCalcolo,
  DatiImboschimento,
  DettaglioCalcolo,
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

interface EquazioniOutput {
  beneficioNettoAssorbimentoTCO2: number
  beneficioNettoRiduzioneEmissioniTCO2: number
  beneficioLordoAssorbimentoTCO2: number
  beneficioLordoRiduzioneEmissioniTCO2: number
  pesoAssorbimentoPerGes: number
  gesAssociatiQuotaAssorbimentoTCO2: number
  gesAssociatiQuotaRiduzioneTCO2: number
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
}: EquazioniInput): EquazioniOutput {
  const beneficioLordoAssorbimento = (assorbimentiAttivita - assorbimentiRiferimento) * (1 - inc)
  const beneficioLordoRiduzioneEmissioni =
    (emissioniSuoloRiferimento -
      emissioniSuoloAttivita +
      (emissioniAgricoleRiferimento - emissioniAgricoleAttivita)) *
    (1 - inc)

  const totaleLordo = beneficioLordoAssorbimento + beneficioLordoRiduzioneEmissioni

  let gesPerAssorbimento = 0
  let gesPerRiduzione = 0
  let peso = 0

  const generaAssorbimento = beneficioLordoAssorbimento !== 0
  const generaRiduzione = beneficioLordoRiduzioneEmissioni !== 0

  if (generaAssorbimento && generaRiduzione && totaleLordo !== 0) {
    peso = beneficioLordoAssorbimento / totaleLordo
    gesPerAssorbimento = gesAssociati * peso
    gesPerRiduzione = gesAssociati * (1 - peso)
  } else if (generaAssorbimento) {
    peso = 1
    gesPerAssorbimento = gesAssociati
  } else {
    gesPerRiduzione = gesAssociati
  }

  return {
    beneficioNettoAssorbimentoTCO2: beneficioLordoAssorbimento - gesPerAssorbimento,
    beneficioNettoRiduzioneEmissioniTCO2: beneficioLordoRiduzioneEmissioni - gesPerRiduzione,
    beneficioLordoAssorbimentoTCO2: beneficioLordoAssorbimento,
    beneficioLordoRiduzioneEmissioniTCO2: beneficioLordoRiduzioneEmissioni,
    pesoAssorbimentoPerGes: peso,
    gesAssociatiQuotaAssorbimentoTCO2: gesPerAssorbimento,
    gesAssociatiQuotaRiduzioneTCO2: gesPerRiduzione,
  }
}

function calcolaAgricolturaAgroforestazione(
  dati: DatiAgricolturaAgroforestazione,
): RisultatoCalcolo {
  const inc = fattoreIncertezzaEffettivo(dati.fattoreIncertezza)

  // Sezione 2.3.3: aggiornamento al ribasso del livello di riferimento ESA per le
  // pratiche che riducono le emissioni N2O dai suoli agricoli gestiti (1%/anno).
  let emissioniAgricoleRiferimento = dati.emissioniAgricoleRiferimentoTCO2
  let emissioniAgricoleRiferimentoAggiornatoTCO2: number | undefined
  if (dati.applicaAggiornamentoRiferimentoN2O) {
    const anni = anniTrascorsiDa(dati.dataInizioPeriodoAttivita)
    const riduzione = Math.min(1, 0.01 * anni)
    emissioniAgricoleRiferimento = dati.emissioniAgricoleRiferimentoTCO2 * (1 - riduzione)
    emissioniAgricoleRiferimentoAggiornatoTCO2 = emissioniAgricoleRiferimento
  }

  const eq = applicaEquazioni1e2({
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
    eq,
    dati.deficitCreditiPrecedenteTCO2 ?? 0,
    inc,
    emissioniAgricoleRiferimentoAggiornatoTCO2,
  )
}

function calcolaImboschimento(dati: DatiImboschimento): RisultatoCalcolo {
  const inc = fattoreIncertezzaEffettivo(dati.fattoreIncertezza)

  // Sezione 2.3.2: agli assorbimenti da imboschimento si applica un livello di
  // riferimento pari a zero.
  const eq = applicaEquazioni1e2({
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
    { ...eq, beneficioNettoAssorbimentoTCO2: eq.beneficioNettoAssorbimentoTCO2 - aggiustamentoLavorazionePratiTCO2 },
    dati.deficitCreditiPrecedenteTCO2 ?? 0,
    inc,
    undefined,
  )
  risultato.aggiustamentoLavorazionePratiTCO2 = aggiustamentoLavorazionePratiTCO2
  return risultato
}

function finalizzaRisultato(
  eq: EquazioniOutput,
  deficitPrecedente: number,
  inc: number,
  emissioniAgricoleRiferimentoAggiornatoTCO2: number | undefined,
): RisultatoCalcolo {
  const { beneficioNettoAssorbimentoTCO2, beneficioNettoRiduzioneEmissioniTCO2 } = eq

  // Allegato, sezione 2.1, ultimo comma: un beneficio negativo diventa un deficit
  // di crediti da sottrarre nel periodo di certificazione successivo.
  const totaleGrezzo =
    beneficioNettoAssorbimentoTCO2 + beneficioNettoRiduzioneEmissioniTCO2 - deficitPrecedente

  const beneficioNettoTotaleTCO2 = Math.max(0, totaleGrezzo)
  const deficitCreditiTCO2 = totaleGrezzo < 0 ? -totaleGrezzo : 0

  const dettaglio: DettaglioCalcolo = {
    fattoreIncertezzaEffettivo: inc,
    emissioniAgricoleRiferimentoAggiornatoTCO2,
    beneficioLordoAssorbimentoTCO2: eq.beneficioLordoAssorbimentoTCO2,
    beneficioLordoRiduzioneEmissioniTCO2: eq.beneficioLordoRiduzioneEmissioniTCO2,
    pesoAssorbimentoPerGes: eq.pesoAssorbimentoPerGes,
    gesAssociatiQuotaAssorbimentoTCO2: eq.gesAssociatiQuotaAssorbimentoTCO2,
    gesAssociatiQuotaRiduzioneTCO2: eq.gesAssociatiQuotaRiduzioneTCO2,
  }

  return {
    beneficioNettoAssorbimentoTCO2,
    beneficioNettoRiduzioneEmissioniTCO2,
    beneficioNettoTotaleTCO2,
    deficitCreditiTCO2,
    metodologiaDisponibile: true,
    dettaglio,
  }
}

/**
 * Nessun atto delegato UE definisce ancora una metodologia di certificazione per le
 * attività zootecniche: restituiamo un risultato "vuoto" segnalato come non
 * disponibile, in attesa che la normativa venga pubblicata.
 */
function calcolaZootecnia(): RisultatoCalcolo {
  return {
    beneficioNettoAssorbimentoTCO2: 0,
    beneficioNettoRiduzioneEmissioniTCO2: 0,
    beneficioNettoTotaleTCO2: 0,
    deficitCreditiTCO2: 0,
    metodologiaDisponibile: false,
  }
}

export function calcolaBilancio(dati: DatiCalcolo): RisultatoCalcolo {
  switch (dati.tipoAttivita) {
    case 'agricoltura_agroforestazione':
      return calcolaAgricolturaAgroforestazione(dati)
    case 'imboschimento':
      return calcolaImboschimento(dati)
    case 'zootecnia':
      return calcolaZootecnia()
  }
}
