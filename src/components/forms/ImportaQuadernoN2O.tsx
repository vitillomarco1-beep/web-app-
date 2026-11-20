import { useState } from 'react'
import { Link } from 'react-router-dom'
import { appezzamentiStore, operazioniCampoStore } from '../../lib/storage'
import { aggregaAzoto } from '../../lib/registroCampagna'
import { calcolaN2oSuoliAgricoli } from '../../lib/n2oSuoliAgricoli'
import { formatTCO2 } from '../../lib/format'

interface Props {
  clienteId: string
  durataPeriodoCertificazioneAnni: number
  onImporta: (attivitaTCO2: number, riferimentoTCO2: number) => void
}

/** Calcola le emissioni N2O da fertilizzazione (lib/n2oSuoliAgricoli.ts) dalle
 * operazioni registrate nel quaderno di campagna del cliente (lib/storage.ts,
 * lib/registroCampagna.ts) e permette di importarle direttamente nei campi
 * ESA del calcolo, invece di copiarle a mano dalla pagina del quaderno. */
export default function ImportaQuadernoN2O({ clienteId, durataPeriodoCertificazioneAnni, onImporta }: Props) {
  const [aperto, setAperto] = useState(false)
  const [lisciviazioneApplicabile, setLisciviazioneApplicabile] = useState(false)

  const operazioni = operazioniCampoStore.byClient(clienteId)
  const haOperazioniFertilizzazione = operazioni.some(
    (o) => o.tipo === 'fertilizzazione_minerale' || o.tipo === 'ammendante_organico',
  )
  const anni = durataPeriodoCertificazioneAnni > 0 ? durataPeriodoCertificazioneAnni : 1

  const azotoAttivita = aggregaAzoto(operazioni, 'attivita', anni)
  const azotoRiferimento = aggregaAzoto(operazioni, 'riferimento', anni)
  const n2oAttivita = calcolaN2oSuoliAgricoli({
    fsnKgAnno: azotoAttivita.fsnKgAnno,
    fonKgAnno: azotoAttivita.fonKgAnno,
    lisciviazioneApplicabile,
  })
  const n2oRiferimento = calcolaN2oSuoliAgricoli({
    fsnKgAnno: azotoRiferimento.fsnKgAnno,
    fonKgAnno: azotoRiferimento.fonKgAnno,
    lisciviazioneApplicabile,
  })

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <span className="text-xs font-semibold text-stone-700">
          📒 Importa dal quaderno di campagna (emissioni N2O da fertilizzazione)
        </span>
        <span className="text-stone-500">{aperto ? '−' : '+'}</span>
      </button>
      {aperto && (
        <div className="space-y-3 border-t border-stone-200 p-3 text-xs">
          {!haOperazioniFertilizzazione ? (
            <p className="text-stone-500">
              Nessuna fertilizzazione minerale o ammendante organico registrato nel{' '}
              <Link to={`/clienti/${clienteId}/quaderno-campagna`} className="text-forest-700 hover:underline">
                quaderno di campagna
              </Link>{' '}
              di questo cliente: compilalo prima di importare.
            </p>
          ) : (
            <>
              <p className="text-stone-500">
                Calcolato sulle operazioni del{' '}
                <Link to={`/clienti/${clienteId}/quaderno-campagna`} className="text-forest-700 hover:underline">
                  quaderno di campagna
                </Link>{' '}
                (IPCC 2006, Vol. 4 Cap. 11, Tier 1), diviso sui {anni} anni di durata del periodo di
                certificazione di questo calcolo.
              </p>
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                  checked={lisciviazioneApplicabile}
                  onChange={(e) => setLisciviazioneApplicabile(e.target.checked)}
                />
                Lisciviazione/ruscellamento applicabile (clima umido o irrigazione, Tabella 11.3 IPCC)
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-stone-200 bg-white p-2">
                  <p className="font-medium text-stone-700">Scenario di riferimento</p>
                  <p className="mt-1 font-semibold text-stone-900">
                    {formatTCO2(n2oRiferimento.totaleTCO2eq)} t CO2eq/anno
                  </p>
                  <p className="mt-1 text-stone-400">{n2oRiferimento.formulaDiretto}</p>
                </div>
                <div className="rounded-md border border-stone-200 bg-white p-2">
                  <p className="font-medium text-stone-700">Scenario di attività</p>
                  <p className="mt-1 font-semibold text-stone-900">
                    {formatTCO2(n2oAttivita.totaleTCO2eq)} t CO2eq/anno
                  </p>
                  <p className="mt-1 text-stone-400">{n2oAttivita.formulaDiretto}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onImporta(n2oAttivita.totaleTCO2eq, n2oRiferimento.totaleTCO2eq)}
              >
                Importa questi valori nei campi ESA qui sopra
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
