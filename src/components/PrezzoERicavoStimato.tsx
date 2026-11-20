import type { DatiCalcolo, RisultatoCalcolo } from '../types'
import { calcolaPrezzoCrediti } from '../lib/prezzoCrediti'
import { formatTCO2 } from '../lib/format'

interface Props {
  dati: DatiCalcolo
  risultato: RisultatoCalcolo
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v)
}

/** Sezione prezzo/ricavo stimato, condivisa tra la vista a schermo
 * (ResultPanel) e il report (ReportPreview/reportPdf): mostra solo se il
 * consulente ha inserito almeno un'ipotesi di prezzo o di costo, per non
 * riempire di zeri un calcolo dove questi dati non sono ancora stati
 * valutati. */
export default function PrezzoERicavoStimato({ dati, risultato }: Props) {
  const prezzoCrediti = dati.prezzoCrediti
  if (prezzoCrediti?.prezzoVenditaEuroPerTCO2 == null && prezzoCrediti?.costoCertificazioneTotaleEuro == null) {
    return null
  }

  const r = calcolaPrezzoCrediti({
    numeroUnitaCredito: Math.floor(risultato.beneficioNettoTotaleTCO2),
    areaAttivitaHa: dati.areaAttivitaHa,
    prezzoVenditaEuroPerTCO2: prezzoCrediti?.prezzoVenditaEuroPerTCO2,
    costoCertificazioneTotaleEuro: prezzoCrediti?.costoCertificazioneTotaleEuro,
  })

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
      <p className="font-semibold text-stone-800">
        💶 Prezzo e ricavo stimato (ipotesi del consulente, non un prezzo di mercato)
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-stone-500">Ricavo lordo stimato</p>
          <p className="mt-0.5 text-lg font-bold text-stone-900">{formatEuro(r.ricavoLordoEuro)} €</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-500">Ricavo netto stimato</p>
          <p className="mt-0.5 text-lg font-bold text-stone-900">{formatEuro(r.ricavoNettoEuro)} €</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-500">Ricavo netto per ettaro</p>
          <p className="mt-0.5 text-lg font-bold text-stone-900">
            {r.ricavoNettoPerEttaroEuro != null ? `${formatEuro(r.ricavoNettoPerEttaroEuro)} €/ha` : '—'}
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-stone-50 p-2 text-xs text-stone-500">
        <p>Prezzo di vendita ipotizzato: {formatEuro(r.prezzoVenditaEuroPerTCO2)} €/t CO2eq</p>
        <p>Costo totale di certificazione: {formatEuro(r.costoCertificazioneTotaleEuro)} €</p>
        <p className="mt-1 font-medium text-stone-700">
          Prezzo di pareggio:{' '}
          {r.prezzoDiPareggioEuroPerTCO2 != null ? (
            <>{formatEuro(r.prezzoDiPareggioEuroPerTCO2)} €/t CO2eq</>
          ) : (
            'non calcolabile'
          )}
        </p>
        <p className="mt-1">{r.formulaPrezzoDiPareggio}</p>
      </div>
      <div className="mt-2 space-y-1 font-mono text-xs text-stone-400">
        <p>{r.formulaRicavoLordo}</p>
        <p>{r.formulaRicavoNetto}</p>
        <p>{r.formulaRicavoNettoPerEttaro}</p>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        Numero di crediti usato: {formatTCO2(r.numeroUnitaCredito)} (stesso valore del "Numero di
        unità di credito certificabili" sopra). Nessun prezzo di mercato ufficiale esiste oggi per
        i crediti CRCF: questi numeri dipendono interamente dalle ipotesi inserite, non da un
        listino o un registro.
      </p>
    </div>
  )
}
