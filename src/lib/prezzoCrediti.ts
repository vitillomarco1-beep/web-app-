/**
 * Stima di un possibile ricavo dalla vendita dei crediti di carbonio
 * certificati: prezzo di vendita ipotizzato dal consulente (nessun prezzo di
 * mercato ufficiale esiste oggi per i crediti CRCF — la banca/registro crediti
 * dell'UE non è ancora operativa), costo totale di certificazione (anch'esso
 * un'ipotesi del consulente, non un listino), e tre numeri derivati:
 *
 *   ricavo netto = ricavo lordo (crediti × prezzo) − costo di certificazione
 *   ricavo netto per ettaro = ricavo netto / area di attività
 *   prezzo di pareggio = costo di certificazione / numero di crediti
 *     (il prezzo minimo per cui il ricavo lordo copre il costo — sotto questo
 *     prezzo l'operazione è in perdita, sopra è in utile)
 *
 * Si applica solo dove un bilancio in crediti esiste già (agricoltura/
 * agroforestazione, imboschimento): per la zootecnia, dove non esiste ancora
 * una metodologia di certificazione, il numero di crediti è sempre zero e
 * questa sezione non ha nulla da mostrare.
 */

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v)
}

export interface InputPrezzoCrediti {
  numeroUnitaCredito: number
  areaAttivitaHa: number
  prezzoVenditaEuroPerTCO2?: number
  costoCertificazioneTotaleEuro?: number
}

export interface RisultatoPrezzoCrediti {
  numeroUnitaCredito: number
  prezzoVenditaEuroPerTCO2: number
  costoCertificazioneTotaleEuro: number
  ricavoLordoEuro: number
  formulaRicavoLordo: string
  ricavoNettoEuro: number
  formulaRicavoNetto: string
  ricavoNettoPerEttaroEuro: number | null
  formulaRicavoNettoPerEttaro: string
  /** null se non ci sono crediti (numeroUnitaCredito = 0): un prezzo di
   * pareggio non ha senso senza nulla da vendere. */
  prezzoDiPareggioEuroPerTCO2: number | null
  formulaPrezzoDiPareggio: string
}

export function calcolaPrezzoCrediti(input: InputPrezzoCrediti): RisultatoPrezzoCrediti {
  const prezzoVendita = input.prezzoVenditaEuroPerTCO2 ?? 0
  const costoCertificazione = input.costoCertificazioneTotaleEuro ?? 0

  const ricavoLordoEuro = input.numeroUnitaCredito * prezzoVendita
  const formulaRicavoLordo = `${n(input.numeroUnitaCredito)} crediti × ${n(prezzoVendita)} €/t CO2eq = ${n(ricavoLordoEuro)} €`

  const ricavoNettoEuro = ricavoLordoEuro - costoCertificazione
  const formulaRicavoNetto = `${n(ricavoLordoEuro)} € − ${n(costoCertificazione)} € (costo di certificazione) = ${n(ricavoNettoEuro)} €`

  const ricavoNettoPerEttaroEuro = input.areaAttivitaHa > 0 ? ricavoNettoEuro / input.areaAttivitaHa : null
  const formulaRicavoNettoPerEttaro =
    input.areaAttivitaHa > 0
      ? `${n(ricavoNettoEuro)} € / ${n(input.areaAttivitaHa)} ha = ${n(ricavoNettoPerEttaroEuro!)} €/ha`
      : 'Area di attività non inserita o pari a zero: impossibile calcolare il ricavo per ettaro.'

  const prezzoDiPareggioEuroPerTCO2 =
    input.numeroUnitaCredito > 0 ? costoCertificazione / input.numeroUnitaCredito : null
  const formulaPrezzoDiPareggio =
    input.numeroUnitaCredito > 0
      ? `${n(costoCertificazione)} € / ${n(input.numeroUnitaCredito)} crediti = ${n(prezzoDiPareggioEuroPerTCO2!)} €/t CO2eq`
      : 'Nessun credito certificabile: il prezzo di pareggio non è calcolabile.'

  return {
    numeroUnitaCredito: input.numeroUnitaCredito,
    prezzoVenditaEuroPerTCO2: prezzoVendita,
    costoCertificazioneTotaleEuro: costoCertificazione,
    ricavoLordoEuro,
    formulaRicavoLordo,
    ricavoNettoEuro,
    formulaRicavoNetto,
    ricavoNettoPerEttaroEuro,
    formulaRicavoNettoPerEttaro,
    prezzoDiPareggioEuroPerTCO2,
    formulaPrezzoDiPareggio,
  }
}
