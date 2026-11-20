/**
 * Aggrega le operazioni del quaderno di campagna (Appezzamento + OperazioneCampo,
 * si veda types.ts) negli input già richiesti dal simulatore RothC
 * (lib/rothc.ts) e dal calcolo delle emissioni N2O da fertilizzazione
 * (lib/n2oSuoliAgricoli.ts) — al posto di stimare questi totali a occhio per
 * l'intera azienda.
 *
 * Per i residui colturali riusa lib/residuiColturali.ts (COLTURE_RESIDUI,
 * calcolaApportoResiduiColturali): se la coltura di un appezzamento non è in
 * quell'elenco, l'operazione di raccolta viene esclusa dall'apporto residui e
 * segnalata esplicitamente nella formula, invece di stimarla in silenzio.
 */

import type { Appezzamento, OperazioneCampo, ScenarioOperazione } from '../types'
import { COLTURE_RESIDUI, calcolaApportoResiduiColturali } from './residuiColturali'

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

export interface AggregatoRothCDaRegistro {
  apportoResiduiTCHaAnno: number
  formulaResidui: string
  apportoAmmendantiTCHaAnno: number
  formulaAmmendanti: string
  coltureNonRiconosciute: string[]
}

/** areaTotaleHa e anni vengono dal calcolo per cui si sta compilando il RothC
 * (area di attività e durata del periodo di certificazione): gli apporti del
 * quaderno, specifici per appezzamento, si ripartiscono su tutta l'area per
 * ottenere la media per ettaro/anno richiesta dal simulatore. */
export function aggregaInputRothC(
  operazioni: OperazioneCampo[],
  appezzamenti: Appezzamento[],
  scenario: ScenarioOperazione,
  areaTotaleHa: number,
  anni: number,
): AggregatoRothCDaRegistro {
  const operazioniScenario = operazioni.filter((o) => o.scenario === scenario)
  const appezzamentoDi = (id: string) => appezzamenti.find((a) => a.id === id)

  let totaleResiduiTC = 0
  const dettagliResidui: string[] = []
  const coltureNonRiconosciute: string[] = []
  for (const op of operazioniScenario) {
    if (op.tipo !== 'raccolta' || op.resaTHaTalQuale == null) continue
    const appezzamento = appezzamentoDi(op.appezzamentoId)
    if (!appezzamento) continue
    const coltura = COLTURE_RESIDUI.find((c) => c.nome === appezzamento.colturaPrincipale)
    if (!coltura) {
      if (!coltureNonRiconosciute.includes(appezzamento.colturaPrincipale)) {
        coltureNonRiconosciute.push(appezzamento.colturaPrincipale)
      }
      continue
    }
    const quota = (op.quotaResiduoRestituitaAlSuoloPercento ?? 100) / 100
    const r = calcolaApportoResiduiColturali({
      resaTHaTalQuale: op.resaTHaTalQuale,
      coltura,
      quotaResiduoRestituitaAlSuolo: quota,
    })
    const tC = r.apportoCarbonioTHa * appezzamento.superficieHa
    totaleResiduiTC += tC
    dettagliResidui.push(
      `${appezzamento.nome} (${coltura.nome}): ${n(r.apportoCarbonioTHa)} t C/ha × ${n(appezzamento.superficieHa)} ha = ${n(tC)} t C`,
    )
  }
  const apportoResiduiTCHaAnno = areaTotaleHa > 0 && anni > 0 ? totaleResiduiTC / areaTotaleHa / anni : 0
  const formulaResidui =
    dettagliResidui.length > 0
      ? `${dettagliResidui.join('; ')} → ${n(totaleResiduiTC)} t C totali / ${n(areaTotaleHa)} ha / ${anni} anni = ${n(apportoResiduiTCHaAnno)} t C/ha/anno` +
        (coltureNonRiconosciute.length > 0
          ? ` (escluse raccolte su colture non in elenco: ${coltureNonRiconosciute.join(', ')} — inserisci il loro apporto a mano)`
          : '')
      : 'Nessuna operazione di raccolta registrata per questo scenario: apporto residui da inserire a mano.'

  let totaleAmmendantiTC = 0
  const dettagliAmmendanti: string[] = []
  for (const op of operazioniScenario) {
    if (op.tipo !== 'ammendante_organico' || op.quantitaKgProdotto == null) continue
    const ss = (op.sostanzaSeccaPercento ?? 0) / 100
    const c = (op.carbonioSostanzaSeccaPercento ?? 0) / 100
    const tC = (op.quantitaKgProdotto * ss * c) / 1000
    totaleAmmendantiTC += tC
    dettagliAmmendanti.push(
      `${n(op.quantitaKgProdotto)} kg × ${n(ss * 100)}% SS × ${n(c * 100)}% C = ${n(tC)} t C (${op.data})`,
    )
  }
  const apportoAmmendantiTCHaAnno = areaTotaleHa > 0 && anni > 0 ? totaleAmmendantiTC / areaTotaleHa / anni : 0
  const formulaAmmendanti =
    dettagliAmmendanti.length > 0
      ? `${dettagliAmmendanti.join('; ')} → ${n(totaleAmmendantiTC)} t C totali / ${n(areaTotaleHa)} ha / ${anni} anni = ${n(apportoAmmendantiTCHaAnno)} t C/ha/anno`
      : 'Nessun ammendante organico registrato per questo scenario: apporto da inserire a mano.'

  return {
    apportoResiduiTCHaAnno,
    formulaResidui,
    apportoAmmendantiTCHaAnno,
    formulaAmmendanti,
    coltureNonRiconosciute,
  }
}

export interface AggregatoAzotoDaRegistro {
  fsnKgAnno: number
  formulaFsn: string
  fonKgAnno: number
  formulaFon: string
}

export function aggregaAzoto(
  operazioni: OperazioneCampo[],
  scenario: ScenarioOperazione,
  anni: number,
): AggregatoAzotoDaRegistro {
  const operazioniScenario = operazioni.filter((o) => o.scenario === scenario)

  let fsnTotaleKg = 0
  const dettagliFsn: string[] = []
  for (const op of operazioniScenario) {
    if (op.tipo !== 'fertilizzazione_minerale' || op.quantitaKgProdotto == null) continue
    const kgN = op.quantitaKgProdotto * ((op.azotoPercentoProdotto ?? 0) / 100)
    fsnTotaleKg += kgN
    dettagliFsn.push(`${n(op.quantitaKgProdotto)} kg × ${n(op.azotoPercentoProdotto ?? 0)}% N = ${n(kgN)} kg N (${op.data})`)
  }
  const fsnKgAnno = anni > 0 ? fsnTotaleKg / anni : 0
  const formulaFsn =
    dettagliFsn.length > 0
      ? `${dettagliFsn.join('; ')} → ${n(fsnTotaleKg)} kg N totali / ${anni} anni = ${n(fsnKgAnno)} kg N/anno`
      : 'Nessuna fertilizzazione minerale registrata per questo scenario.'

  let fonTotaleKg = 0
  const dettagliFon: string[] = []
  for (const op of operazioniScenario) {
    if (op.tipo !== 'ammendante_organico' || op.quantitaKgProdotto == null) continue
    const kgN = op.quantitaKgProdotto * ((op.azotoPercentoTalQuale ?? 0) / 100)
    fonTotaleKg += kgN
    dettagliFon.push(`${n(op.quantitaKgProdotto)} kg × ${n(op.azotoPercentoTalQuale ?? 0)}% N = ${n(kgN)} kg N (${op.data})`)
  }
  const fonKgAnno = anni > 0 ? fonTotaleKg / anni : 0
  const formulaFon =
    dettagliFon.length > 0
      ? `${dettagliFon.join('; ')} → ${n(fonTotaleKg)} kg N totali / ${anni} anni = ${n(fonKgAnno)} kg N/anno`
      : 'Nessun ammendante organico registrato per questo scenario.'

  return { fsnKgAnno, formulaFsn, fonKgAnno, formulaFon }
}
