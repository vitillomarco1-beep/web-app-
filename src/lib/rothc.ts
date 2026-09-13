/**
 * Modello RothC-26.3 (Rothamsted Carbon Model, Coleman & Jenkinson) a passo mensile,
 * per la stima della variazione dello stock di carbonio organico nel suolo (suoli
 * minerali). È tra i "modelli relativi al carbonio contenuto nel suolo" ammissibili
 * all'approccio 1 di quantificazione (allegato, sez. 2.4.1.1, lett. a).
 *
 * NOTA IMPORTANTE: questa è un'implementazione semplificata a supporto delle stime
 * preliminari del consulente. Per l'uso in sede di certificazione, il regolamento
 * richiede che il modello sia tarato e convalidato su misurazioni dirette della
 * specifica regione pedoclimatica (sez. 2.4.1.1, lett. c) e d)) — condizione che
 * questo strumento non attesta automaticamente. In particolare, i quattro comparti
 * organici attivi (DPM, RPM, BIO, HUM) sono qui inizializzati da proporzioni tipiche
 * di equilibrio riportate in letteratura, anziché da una simulazione di spin-up
 * pluriennale calibrata sui dati specifici del sito.
 */

export interface MeseClima {
  temperaturaC: number
  precipitazioniMm: number
  evaporazioneMm: number
}

export interface ScenarioRothCInput {
  apportoResiduiTCHaAnno: number
  apportoAmmendantiTCHaAnno: number
  rapportoDpmRpm: number
  quotaCoperturaVegetativa: number // 0-1
}

export interface InputRothC {
  argillaPercento: number
  socInizialeTCHa: number
  durataAnni: number
  climaMensile: MeseClima[] // 12 mesi
  riferimento: ScenarioRothCInput
  attivita: ScenarioRothCInput
}

interface PoolsRothC {
  dpm: number
  rpm: number
  bio: number
  hum: number
}

export interface RisultatoScenarioRothC {
  socFinaleTCHa: number
  variazioneSocTCHa: number
  variazioneCO2eqTHa: number
}

export interface RisultatoRothC {
  iomTCHa: number
  socOrganicoInizialeTCHa: number
  riferimento: RisultatoScenarioRothC
  attivita: RisultatoScenarioRothC
}

// Costanti di decomposizione annue dei comparti (Coleman & Jenkinson)
const K_DPM = 10
const K_RPM = 0.3
const K_BIO = 0.66
const K_HUM = 0.02

// Proporzioni tipiche di equilibrio (letteratura RothC) usate per inizializzare i
// comparti organici attivi a partire dallo stock organico misurato (SOC - IOM).
const QUOTA_DPM_EQUILIBRIO = 0.005
const QUOTA_RPM_EQUILIBRIO = 0.225
const QUOTA_BIO_EQUILIBRIO = 0.03
const QUOTA_HUM_EQUILIBRIO = 0.74

const CONVERSIONE_C_CO2 = 44 / 12

/** Materia organica inerte (IOM), equazione di Falloon et al. (1998). */
export function calcolaIOM(socTotaleTCHa: number): number {
  return 0.049 * Math.pow(socTotaleTCHa, 1.139)
}

function inizializzaPools(socOrganico: number): PoolsRothC {
  return {
    dpm: socOrganico * QUOTA_DPM_EQUILIBRIO,
    rpm: socOrganico * QUOTA_RPM_EQUILIBRIO,
    bio: socOrganico * QUOTA_BIO_EQUILIBRIO,
    hum: socOrganico * QUOTA_HUM_EQUILIBRIO,
  }
}

function fattoreTemperatura(temperaturaC: number): number {
  return 47.91 / (1 + Math.exp(106.06 / (temperaturaC + 18.27)))
}

/** Deficit idrico massimo del suolo (TSMD), riferito a una profondità di 23 cm. */
function tsmdMassimo(argillaPercento: number): number {
  return -(20 + 1.3 * argillaPercento - 0.01 * argillaPercento * argillaPercento)
}

function fattoreUmidita(tsmdAccumulato: number, tsmdMax: number): number {
  const soglia = 0.444 * tsmdMax
  if (tsmdAccumulato > soglia) return 1
  const min = 0.2
  return min + (1 - min) * (tsmdMax - tsmdAccumulato) / (tsmdMax - soglia)
}

function ripartizioneDecomposizione(argillaPercento: number) {
  const x = 1.67 * (1.85 + 1.6 * Math.exp(-0.0786 * argillaPercento))
  const quotaCO2 = x / (x + 1)
  const quotaBioHum = 1 / (x + 1)
  return { quotaCO2, quotaBio: quotaBioHum * 0.46, quotaHum: quotaBioHum * 0.54 }
}

/**
 * Simula uno scenario per la durata indicata, restituendo lo stock organico attivo
 * (DPM+RPM+BIO+HUM, esclusa la IOM) alla fine del periodo, in t C/ha.
 */
function simulaScenario(
  poolsIniziali: PoolsRothC,
  argillaPercento: number,
  climaMensile: MeseClima[],
  scenario: ScenarioRothCInput,
  durataAnni: number,
): number {
  let pools = { ...poolsIniziali }
  const tsmdMax = tsmdMassimo(argillaPercento)
  const tsmdMaxSuoloNudo = 0.556 * tsmdMax
  // Interpolazione tra suolo nudo e completamente coperto in base alla quota di
  // copertura vegetativa media dello scenario.
  const tsmdMaxEffettivo =
    tsmdMaxSuoloNudo + (tsmdMax - tsmdMaxSuoloNudo) * scenario.quotaCoperturaVegetativa

  const { quotaCO2: _quotaCO2, quotaBio, quotaHum } = ripartizioneDecomposizione(argillaPercento)
  void _quotaCO2 // la quota CO2 rappresenta il carbonio perso in atmosfera, non reinserito nei pool

  const fattoreCopertura = 0.6 * scenario.quotaCoperturaVegetativa + 1.0 * (1 - scenario.quotaCoperturaVegetativa)

  const apportoMensileResidui = scenario.apportoResiduiTCHaAnno / 12
  const apportoMensileAmmendanti = scenario.apportoAmmendantiTCHaAnno / 12
  const fracDpmResidui = scenario.rapportoDpmRpm / (scenario.rapportoDpmRpm + 1)
  const fracRpmResidui = 1 - fracDpmResidui

  let tsmd = 0
  const totaleMesi = Math.round(durataAnni * 12)

  for (let mese = 0; mese < totaleMesi; mese++) {
    const clima = climaMensile[mese % 12]

    // Aggiornamento del deficit idrico accumulato del suolo.
    const bilancioIdrico = clima.precipitazioniMm - clima.evaporazioneMm * 0.75
    tsmd = Math.min(0, Math.max(tsmdMaxEffettivo, tsmd + bilancioIdrico))

    const a = fattoreTemperatura(clima.temperaturaC)
    const b = fattoreUmidita(tsmd, tsmdMaxEffettivo)
    const c = fattoreCopertura
    const rm = a * b * c

    // Apporti di carbonio del mese (residui colturali + ammendanti organici).
    pools.dpm += apportoMensileResidui * fracDpmResidui + apportoMensileAmmendanti * 0.49
    pools.rpm += apportoMensileResidui * fracRpmResidui + apportoMensileAmmendanti * 0.49
    pools.hum += apportoMensileAmmendanti * 0.02

    const t = 1 / 12
    const dpmDopo = pools.dpm * Math.exp(-K_DPM * rm * t)
    const rpmDopo = pools.rpm * Math.exp(-K_RPM * rm * t)
    const bioDopo = pools.bio * Math.exp(-K_BIO * rm * t)
    const humDopo = pools.hum * Math.exp(-K_HUM * rm * t)

    const decomposto =
      pools.dpm - dpmDopo + (pools.rpm - rpmDopo) + (pools.bio - bioDopo) + (pools.hum - humDopo)

    pools = {
      dpm: dpmDopo,
      rpm: rpmDopo,
      bio: bioDopo + decomposto * quotaBio,
      hum: humDopo + decomposto * quotaHum,
    }
  }

  return pools.dpm + pools.rpm + pools.bio + pools.hum
}

export function simulaRothC(input: InputRothC): RisultatoRothC {
  if (input.climaMensile.length !== 12) {
    throw new Error('Sono richiesti esattamente 12 valori climatici mensili.')
  }

  const iom = calcolaIOM(input.socInizialeTCHa)
  const socOrganicoIniziale = Math.max(0, input.socInizialeTCHa - iom)
  const poolsIniziali = inizializzaPools(socOrganicoIniziale)

  const socFinaleRiferimento = simulaScenario(
    poolsIniziali,
    input.argillaPercento,
    input.climaMensile,
    input.riferimento,
    input.durataAnni,
  )
  const socFinaleAttivita = simulaScenario(
    poolsIniziali,
    input.argillaPercento,
    input.climaMensile,
    input.attivita,
    input.durataAnni,
  )

  function risultatoScenario(socOrganicoFinale: number): RisultatoScenarioRothC {
    const socFinaleTCHa = socOrganicoFinale + iom
    const variazioneSocTCHa = socFinaleTCHa - input.socInizialeTCHa
    return {
      socFinaleTCHa,
      variazioneSocTCHa,
      variazioneCO2eqTHa: variazioneSocTCHa * CONVERSIONE_C_CO2,
    }
  }

  return {
    iomTCHa: iom,
    socOrganicoInizialeTCHa: socOrganicoIniziale,
    riferimento: risultatoScenario(socFinaleRiferimento),
    attivita: risultatoScenario(socFinaleAttivita),
  }
}

export const RAPPORTO_DPM_RPM_DEFAULT = {
  seminativi: 1.44,
  pratiNonMigliorati: 0.67,
  residuiForestali: 0.25,
}
