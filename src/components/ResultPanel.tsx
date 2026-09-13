import type { RisultatoCalcolo } from '../types'
import { formatTCO2 } from '../lib/format'

export default function ResultPanel({ risultato }: { risultato: RisultatoCalcolo }) {
  return (
    <div className="card space-y-4 border-forest-200 bg-forest-50/50">
      <h3 className="font-semibold text-stone-900">Risultato del bilancio</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-4">
          <p className="text-xs uppercase text-stone-500">
            Beneficio netto — assorbimento di carbonio
          </p>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {formatTCO2(risultato.beneficioNettoAssorbimentoTCO2)} t CO₂eq
          </p>
        </div>
        <div className="rounded-lg bg-white p-4">
          <p className="text-xs uppercase text-stone-500">
            Beneficio netto — riduzione emissioni dal suolo
          </p>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {formatTCO2(risultato.beneficioNettoRiduzioneEmissioniTCO2)} t CO₂eq
          </p>
        </div>
      </div>

      {risultato.aggiustamentoLavorazionePratiTCO2 ? (
        <p className="text-sm text-amber-700">
          Applicata detrazione forfettaria del 12% per lavorazione di prati permanenti: −
          {formatTCO2(risultato.aggiustamentoLavorazionePratiTCO2)} t CO₂eq
        </p>
      ) : null}

      <div className="flex items-center justify-between rounded-lg bg-forest-600 p-4 text-white">
        <span className="font-medium">Bilancio netto totale certificabile</span>
        <span className="text-2xl font-bold">
          {formatTCO2(risultato.beneficioNettoTotaleTCO2)} t CO₂eq
        </span>
      </div>

      {risultato.deficitCreditiTCO2 > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ Il risultato è negativo: deficit di crediti di{' '}
          <strong>{formatTCO2(risultato.deficitCreditiTCO2)} t CO₂eq</strong> da riportare e
          sottrarre nel prossimo periodo di certificazione (allegato, sez. 2.1).
        </div>
      )}
    </div>
  )
}
