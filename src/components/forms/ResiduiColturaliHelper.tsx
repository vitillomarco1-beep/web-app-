import { useState } from 'react'
import { COLTURE_RESIDUI, calcolaApportoResiduiColturali } from '../../lib/residuiColturali'
import { formatTCO2 } from '../../lib/format'

interface Props {
  onCalcola: (apportoTCHaAnno: number) => void
}

/** Calcola l'apporto di carbonio dai residui colturali a partire dalla resa in
 * prodotto principale, per compilare il campo "Apporto C da residui" del
 * simulatore RothC senza doverlo stimare a occhio. */
export default function ResiduiColturaliHelper({ onCalcola }: Props) {
  const [aperto, setAperto] = useState(false)
  const [resa, setResa] = useState(0)
  const [nomeColtura, setNomeColtura] = useState(COLTURE_RESIDUI[0].nome)
  const [quotaRestituitaPercento, setQuotaRestituitaPercento] = useState(100)

  const coltura = COLTURE_RESIDUI.find((c) => c.nome === nomeColtura) ?? COLTURE_RESIDUI[0]

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  const risultato =
    resa > 0
      ? calcolaApportoResiduiColturali({
          resaTHaTalQuale: resa,
          coltura,
          quotaResiduoRestituitaAlSuolo: quotaRestituitaPercento / 100,
        })
      : null

  return (
    <div className="col-span-2 -mt-1">
      <button
        type="button"
        className="text-xs font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
        onClick={() => setAperto((a) => !a)}
      >
        {aperto ? '− Chiudi' : '🌾 Calcola da resa colturale'}
      </button>

      {aperto && (
        <div className="mt-2 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs text-stone-500">
            Stima il residuo colturale (paglia, stocchi) restituito al suolo a partire dalla resa
            in prodotto, con un indice di raccolta tipico per coltura.{' '}
            <strong>
              Indici di raccolta e frazioni di sostanza secca/carbonio sono valori indicativi da
              letteratura agronomica generale, non verificati contro una tabella IPCC/ISPRA
              specifica: sostituiscili con la tua fonte di riferimento prima dell'uso in
              certificazione.
            </strong>{' '}
            Il chicco/seme raccolto non è conteggiato: il suo carbonio non è un assorbimento
            duraturo (torna in atmosfera con consumo/respirazione entro l'anno).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Coltura</label>
              <select
                className="input !py-1 text-xs"
                value={nomeColtura}
                onChange={(e) => setNomeColtura(e.target.value)}
              >
                {COLTURE_RESIDUI.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Resa (t/ha, tal quale)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                className="input !py-1 text-xs"
                value={resa}
                onChange={(e) => setResa(num(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">
                Quota di residuo lasciata in campo (%) — il resto (es. paglia raccolta per
                lettiera/mangime) non torna al suolo
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                className="input !py-1 text-xs"
                value={quotaRestituitaPercento}
                onChange={(e) => setQuotaRestituitaPercento(num(e.target.value))}
              />
            </div>
          </div>

          {risultato && (
            <div className="rounded-md bg-white p-2 text-xs text-stone-600">
              <p>
                Residuo totale: {formatTCO2(risultato.residuoTotaleSostanzaSeccaTHa)} t sostanza
                secca/ha — restituito al suolo:{' '}
                {formatTCO2(risultato.residuoRestituitoSostanzaSeccaTHa)} t/ha
              </p>
              <p className="font-semibold text-stone-800">
                Apporto di carbonio stimato: {formatTCO2(risultato.apportoCarbonioTHa)} t C/ha/anno
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary !px-3 !py-1 text-xs"
              disabled={!risultato}
              onClick={() => risultato && onCalcola(Math.round(risultato.apportoCarbonioTHa * 100) / 100)}
            >
              Usa questo valore
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
