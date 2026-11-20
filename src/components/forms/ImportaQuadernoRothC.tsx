import { useState } from 'react'
import { Link } from 'react-router-dom'
import { appezzamentiStore, operazioniCampoStore } from '../../lib/storage'
import { aggregaInputRothC } from '../../lib/registroCampagna'
import type { ScenarioOperazione } from '../../types'

interface Props {
  clienteId: string
  scenario: ScenarioOperazione
  areaAttivitaHa: number
  durataAnni: number
  onImporta: (apportoResiduiTCHaAnno: number, apportoAmmendantiTCHaAnno: number) => void
}

/** Mostra un'anteprima di cosa calcolerebbe l'importazione dal quaderno di
 * campagna (apporti di carbonio da residui/ammendanti), invece di un
 * bottone "cieco" che compila i campi senza spiegare nulla: se il risultato
 * è zero o se una coltura non è riconosciuta, il motivo si vede subito qui,
 * invece di sembrare che l'importazione "non funzioni". */
export default function ImportaQuadernoRothC({ clienteId, scenario, areaAttivitaHa, durataAnni, onImporta }: Props) {
  const [aperto, setAperto] = useState(false)

  const appezzamenti = appezzamentiStore.byClient(clienteId)
  const operazioni = operazioniCampoStore.byClient(clienteId)
  const anni = durataAnni > 0 ? durataAnni : 1
  const aggregato = aggregaInputRothC(operazioni, appezzamenti, scenario, areaAttivitaHa, anni)

  function importa() {
    const arrotonda = (v: number) => Math.round(v * 1000) / 1000
    onImporta(arrotonda(aggregato.apportoResiduiTCHaAnno), arrotonda(aggregato.apportoAmmendantiTCHaAnno))
  }

  return (
    <div className="col-span-2 rounded-md border border-stone-200 bg-stone-50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1.5 text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <span className="text-xs font-semibold text-stone-700">📒 Importa dal quaderno di campagna</span>
        <span className="text-stone-500">{aperto ? '−' : '+'}</span>
      </button>
      {aperto && (
        <div className="space-y-2 border-t border-stone-200 p-2 text-xs">
          {appezzamenti.length === 0 ? (
            <p className="text-stone-500">
              Nessun appezzamento registrato nel{' '}
              <Link to={`/clienti/${clienteId}/quaderno-campagna`} className="text-forest-700 hover:underline">
                quaderno di campagna
              </Link>{' '}
              di questo cliente: compilalo prima di importare.
            </p>
          ) : (
            <>
              <p className="font-medium text-stone-700">Apporto C da residui</p>
              <p className="text-stone-500">{aggregato.formulaResidui}</p>
              <p className="font-medium text-stone-700">Apporto C da ammendanti</p>
              <p className="text-stone-500">{aggregato.formulaAmmendanti}</p>
              {aggregato.coltureNonRiconosciute.length > 0 && (
                <p className="text-amber-700">
                  ⚠️ Coltura/e non in elenco (apporto escluso): {aggregato.coltureNonRiconosciute.join(', ')}. Vai
                  al{' '}
                  <Link to={`/clienti/${clienteId}/quaderno-campagna`} className="underline">
                    quaderno di campagna
                  </Link>{' '}
                  per correggerla o inserisci l'apporto a mano qui sotto.
                </p>
              )}
              <button type="button" className="btn-secondary" onClick={importa}>
                Importa questi valori
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
