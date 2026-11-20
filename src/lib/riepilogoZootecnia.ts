/**
 * Riepilogo di sola lettura della simulazione zootecnica (metano enterico,
 * gestione reflui, mitigazione, bilancio alimento/emissioni) — stessa identica
 * catena di calcolo usata dallo strumento di modifica
 * (components/forms/SimulazioneZootecniaTool.tsx), estratta qui in una
 * funzione pura perché serva anche alla vista "a riposo" del calcolo
 * (ResultPanel) e al report, senza dover aprire il form di modifica solo per
 * rivedere un numero già inserito.
 *
 * NON ricalcola nulla di diverso da quanto già verificato in metanoEnterico.ts,
 * gestioneReflui.ts, praticheMitigazione.ts e simulazioneZootecnia.ts: è solo
 * la stessa sequenza di chiamate, selezioni di tier e fallback già presenti
 * nel form, spostata in un unico punto per evitare di duplicarla (e
 * farla disallineare) in una seconda vista.
 */

import type { DatiZootecnia, SimulazioneZootecnia, TipologiaAllevamento } from '../types'
import {
  calcolaSimulazioneZootecnia,
  risolviSostanzaSeccaPercento,
  type RisultatoSimulazioneZootecnia,
} from './simulazioneZootecnia'
import {
  calcolaMetanoEnterico,
  calcolaMetanoEntericoDaFattore,
  calcolaMetanoEntericoTier1PerStruttura,
  calcolaMetanoEntericoMisto,
  EF_TIER1_RIFERIMENTO,
  EF_TIER1_RIMONTA_PER_FASE,
  type RisultatoMetanoEntericoSemplice,
  type TierMetanoEnterico,
} from './metanoEnterico'
import {
  BO_RIFERIMENTO,
  SISTEMI_STOCCAGGIO,
  calcolaGestioneReflui,
  calcolaTdnMedioDieta,
  normalizzaGestioneReflui,
  type RisultatoGestioneReflui,
} from './gestioneReflui'
import {
  calcolaPotenzialeMitigazione,
  calcolaProgressoTargetUe2040,
  type RigaPotenzialeMitigazione,
  type RisultatoProgressoTargetUe,
} from './praticheMitigazione'

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

/** Etichetta leggibile per RisultatoSimulazioneZootecnia.fonteEmissioniUsata —
 * condivisa tra la vista a schermo (RiepilogoZootecnia.tsx) e il PDF
 * (reportPdf.ts), così restano testualmente identiche nei due posti. */
export const FONTE_EMISSIONI_BILANCIO_LABEL: Record<'auto' | 'letteratura' | 'specifiche_aziendali', string> = {
  auto: 'automatico (dato aziendale se disponibile, altrimenti media di letteratura)',
  letteratura: 'media di letteratura',
  specifiche_aziendali: 'dato specifico aziendale',
}

export interface RiepilogoZootecnia {
  /** false se non c'è alcuna simulazione inserita (nessun mangime, nessun
   * refluo, nessuna produzione): il riepilogo non ha nulla da mostrare. */
  haDati: boolean
  tierMetanoEntericoEtichetta: string
  metanoEnterico: RisultatoMetanoEntericoSemplice
  sistemaStoccaggioEtichetta: string
  reflui: RisultatoGestioneReflui
  emissioniDiretteTotaliTCO2eq: number
  righeMitigazione: RigaPotenzialeMitigazione[]
  progressoTargetUe: RisultatoProgressoTargetUe
  bilancioSimulato: RisultatoSimulazioneZootecnia
  fonteEmissioniBilancio: 'auto' | 'letteratura' | 'specifiche_aziendali'
}

function struttureMandriaSicura(struttura: DatiZootecnia['struttureMandria']) {
  return (
    struttura ?? {
      animaliLattazione: 0,
      animaliAsciutta: 0,
      manze12MesiParto: 0,
      manzette6_12Mesi: 0,
      vitelli0_3Mesi: 0,
      vitelli3_6Mesi: 0,
    }
  )
}

/** Stessa selezione di tier (1/2/3/misto) già presente in
 * SimulazioneZootecniaTool.tsx, qui riapplicata senza stato React: prende i
 * dati già salvati in sim/numeroCapiMedio/struttureMandria, non valori
 * modificabili dall'utente in questa vista di sola lettura. */
function produzioneLatteKgCapoAnnoDa(
  sim: SimulazioneZootecnia,
  tipologiaAllevamento: TipologiaAllevamento,
): number | undefined {
  const mediaStallaKgCapoGiorno = sim.analisiLatte?.mediaStallaKgCapoGiorno ?? 0
  return tipologiaAllevamento === 'bovini_da_latte' && mediaStallaKgCapoGiorno > 0
    ? mediaStallaKgCapoGiorno * 365
    : undefined
}

function selezionaRisultatoMetanoEnterico(
  sim: SimulazioneZootecnia,
  righeDieta: Parameters<typeof calcolaMetanoEnterico>[0],
  tipologiaAllevamento: TipologiaAllevamento,
  numeroCapiMedio: number,
  struttureMandria: DatiZootecnia['struttureMandria'],
): { risultato: RisultatoMetanoEntericoSemplice; etichetta: string } {
  const produzioneLatteKgCapoAnno = produzioneLatteKgCapoAnnoDa(sim, tipologiaAllevamento)
  const risultatoMetano = calcolaMetanoEnterico(righeDieta, sim.ymMetanoEntericoPercento, produzioneLatteKgCapoAnno)
  const tier: TierMetanoEnterico = sim.tierMetanoEnterico ?? 'tier2'
  if (tier === 'tier2') return { risultato: risultatoMetano, etichetta: 'Tier 2' }

  const efTier1Riferimento = EF_TIER1_RIFERIMENTO[tipologiaAllevamento]
  const efTier1Usato = sim.efTier1ManualeKgPerCapoAnno ?? efTier1Riferimento?.valore ?? 0
  const fonteEfTier1 =
    sim.efTier1ManualeKgPerCapoAnno != null ? 'valore manuale' : efTier1Riferimento?.fonte ?? 'nessun riferimento disponibile'
  const haStrutturaMandria =
    struttureMandria != null &&
    struttureMandria.animaliLattazione +
      struttureMandria.animaliAsciutta +
      struttureMandria.manze12MesiParto +
      struttureMandria.manzette6_12Mesi +
      struttureMandria.vitelli0_3Mesi +
      struttureMandria.vitelli3_6Mesi >
      0

  if (tier === 'tier1') {
    const risultato =
      tipologiaAllevamento === 'bovini_da_latte' && haStrutturaMandria && struttureMandria
        ? calcolaMetanoEntericoTier1PerStruttura(struttureMandria, efTier1Usato, fonteEfTier1, EF_TIER1_RIMONTA_PER_FASE)
        : calcolaMetanoEntericoDaFattore(numeroCapiMedio, efTier1Usato, fonteEfTier1)
    return { risultato, etichetta: 'Tier 1' }
  }

  if (tier === 'tier3') {
    const efTier3Usato = sim.efTier3KgPerCapoAnno ?? 0
    return {
      risultato: calcolaMetanoEntericoDaFattore(numeroCapiMedio, efTier3Usato, 'misurazione diretta'),
      etichetta: 'Tier 3',
    }
  }

  // misto: Tier 2 per la lattazione, Tier 1 per il resto della mandria
  const struttura = struttureMandriaSicura(struttureMandria)
  const razioneMiscelata = sim.razioneMiscelata ?? { razioneCapoGiornoKg: 0, numeroCapiAlimentati: 0, analisiAlimento: {} }
  const analisiRazioneMiscelata = razioneMiscelata.analisiAlimento ?? {}
  const animaliLattazioneMisto = struttureMandria?.animaliLattazione ?? 0
  const quantitaTAnnoLattazioneMisto =
    Math.round(((razioneMiscelata.razioneCapoGiornoKg * animaliLattazioneMisto * 365) / 1000) * 100) / 100
  const righeDietaLattazioneMisto = [
    {
      nomeMangime: 'Razione miscelata (TMR) — lattazione',
      quantitaTAnno: quantitaTAnnoLattazioneMisto,
      sostanzaSeccaPercento: analisiRazioneMiscelata.sostanzaSeccaPercento ?? 0,
      andfomPercento: analisiRazioneMiscelata.andfomPercento,
      tdnPercento: analisiRazioneMiscelata.tdnPercento,
    },
  ]
  const risultatoLattazioneMisto = calcolaMetanoEnterico(
    righeDietaLattazioneMisto,
    sim.ymMetanoEntericoPercento,
    produzioneLatteKgCapoAnno,
  )
  const risultato = calcolaMetanoEntericoMisto(
    risultatoLattazioneMisto,
    struttura,
    efTier1Usato,
    fonteEfTier1,
    EF_TIER1_RIMONTA_PER_FASE,
  )
  return { risultato, etichetta: 'misto Tier 1+2' }
}

export function calcolaRiepilogoZootecnia(dati: DatiZootecnia): RiepilogoZootecnia | null {
  const sim = dati.simulazioneZootecnia
  if (!sim) return null

  const modalitaMetano = sim.modalitaMetano ?? 'daAlimenti'
  const razioneMiscelata = sim.razioneMiscelata ?? { razioneCapoGiornoKg: 0, numeroCapiAlimentati: 0, analisiAlimento: {} }
  const analisiRazioneMiscelata = razioneMiscelata.analisiAlimento ?? {}
  const quantitaTAnnoRazione =
    Math.round(((razioneMiscelata.razioneCapoGiornoKg * razioneMiscelata.numeroCapiAlimentati * 365) / 1000) * 100) / 100

  const righeDieta =
    modalitaMetano === 'daRazioneMiscelata'
      ? [
          {
            nomeMangime: 'Razione miscelata (TMR)',
            quantitaTAnno: quantitaTAnnoRazione,
            sostanzaSeccaPercento: analisiRazioneMiscelata.sostanzaSeccaPercento ?? 0,
            andfomPercento: analisiRazioneMiscelata.andfomPercento,
            tdnPercento: analisiRazioneMiscelata.tdnPercento,
          },
        ]
      : sim.mangimi.map((m) => ({
          nomeMangime: m.nomeMangime,
          quantitaTAnno: m.quantitaTAnno,
          sostanzaSeccaPercento: risolviSostanzaSeccaPercento(m.nomeMangime, m.analisiAlimento),
          andfomPercento: m.analisiAlimento?.andfomPercento,
          tdnPercento: m.analisiAlimento?.tdnPercento,
        }))

  const produzioneLatteKgCapoAnno = produzioneLatteKgCapoAnnoDa(sim, dati.tipologiaAllevamento)
  const risultatoMetanoBaseTier2 = calcolaMetanoEnterico(righeDieta, sim.ymMetanoEntericoPercento, produzioneLatteKgCapoAnno)
  const risultatoTdn = calcolaTdnMedioDieta(righeDieta)

  const { risultato: metanoEnterico, etichetta: tierMetanoEntericoEtichetta } = selezionaRisultatoMetanoEnterico(
    sim,
    righeDieta,
    dati.tipologiaAllevamento,
    dati.numeroCapiMedio,
    dati.struttureMandria,
  )

  const gestioneRefluiInput = (normalizzaGestioneReflui(
    sim.gestioneReflui as Record<string, unknown> | undefined,
  ) as typeof sim.gestioneReflui) ?? {
    sistemaStoccaggio: 'liquido_senza_crosta' as const,
    temperaturaMediaAnnuaC: 15,
    durataStoccaggioMesi: 6,
    azotoEscretoKgAnno: 0,
    tecnicaSpandimento: 'spaglio' as const,
  }
  const boRiferimento = BO_RIFERIMENTO[dati.tipologiaAllevamento]
  const digeribilitaPercento = gestioneRefluiInput.digeribilitaManualePercento ?? risultatoTdn.tdnPercento ?? 0
  const boUsato = gestioneRefluiInput.boManualeM3PerKgVs ?? boRiferimento?.valore ?? 0
  const reflui = calcolaGestioneReflui({
    geiMJAnno: risultatoMetanoBaseTier2.geiMJAnno,
    digeribilitaPercento,
    boM3PerKgVs: boUsato,
    fonteBo: boRiferimento?.fonte ?? null,
    tipologiaAllevamento: dati.tipologiaAllevamento,
    sistemaStoccaggio: gestioneRefluiInput.sistemaStoccaggio,
    temperaturaMediaAnnuaC: gestioneRefluiInput.temperaturaMediaAnnuaC,
    durataStoccaggioMesi: gestioneRefluiInput.durataStoccaggioMesi,
    miscelazioneAttivaLettiera: gestioneRefluiInput.miscelazioneAttivaLettiera,
    azotoEscretoKgAnno: gestioneRefluiInput.azotoEscretoKgAnno,
    tecnicaSpandimento: gestioneRefluiInput.tecnicaSpandimento,
    mcfManualePercento: gestioneRefluiInput.mcfManualePercento,
    fracGasMsStoccaggioManualePercento: gestioneRefluiInput.fracGasMsStoccaggioManualePercento,
    fracLossMsManualePercento: gestioneRefluiInput.fracLossMsManualePercento,
    fracGasmManualePercento: gestioneRefluiInput.fracGasmManualePercento,
  })

  const righeMitigazione = calcolaPotenzialeMitigazione(metanoEnterico.ch4TCO2eq, reflui.ch4TCO2eq)
  const progressoTargetUe = calcolaProgressoTargetUe2040(dati.pratiche, metanoEnterico.ch4TCO2eq, reflui.ch4TCO2eq)

  const emissioniSpecificheTotaleTCO2 = metanoEnterico.ch4TCO2eq + reflui.totaleTCO2eq
  const datiSpecificiDisponibili = emissioniSpecificheTotaleTCO2 > 0
  const fonteEmissioniBilancio = sim.fonteEmissioniBilancio ?? 'auto'
  const usaEmissioniSpecifiche =
    fonteEmissioniBilancio === 'specifiche_aziendali' ||
    (fonteEmissioniBilancio === 'auto' && datiSpecificiDisponibili)
  const emissioniSpecificheOverride = usaEmissioniSpecifiche
    ? {
        totaleTCO2: emissioniSpecificheTotaleTCO2,
        formula:
          `Metano enterico (${n(metanoEnterico.ch4TCO2eq)}) + gestione reflui (${n(reflui.totaleTCO2eq)}) ` +
          `= ${n(emissioniSpecificheTotaleTCO2)} t CO2eq — dato specifico aziendale (${tierMetanoEntericoEtichetta} IPCC), parziale: non include ` +
          `l'alimentazione a monte del mangime, l'energia, i capi di rimonta.`,
      }
    : undefined

  const bilancioSimulato = calcolaSimulazioneZootecnia(
    sim.mangimi,
    sim.produzioneAnnuaTProdotto,
    sim.intensitaEmissivaTCO2eqPerTProdotto,
    emissioniSpecificheOverride,
  )

  const haDati =
    sim.mangimi.length > 0 ||
    gestioneRefluiInput.azotoEscretoKgAnno > 0 ||
    sim.produzioneAnnuaTProdotto > 0 ||
    razioneMiscelata.numeroCapiAlimentati > 0

  return {
    haDati,
    tierMetanoEntericoEtichetta,
    metanoEnterico,
    sistemaStoccaggioEtichetta: SISTEMI_STOCCAGGIO[gestioneRefluiInput.sistemaStoccaggio],
    reflui,
    emissioniDiretteTotaliTCO2eq: metanoEnterico.ch4TCO2eq + reflui.totaleTCO2eq,
    righeMitigazione,
    progressoTargetUe,
    bilancioSimulato,
    fonteEmissioniBilancio,
  }
}
