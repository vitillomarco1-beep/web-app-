import { useState } from 'react'
import type { DatiZootecnia } from '../types'
import { calcolaRiepilogoZootecnia } from '../lib/riepilogoZootecnia'
import { TARGET_UE_RIDUZIONE_PERCENTO_2040, TARGET_UE_FONTE } from '../lib/praticheMitigazione'
import { formatTCO2 } from '../lib/format'

interface Props {
  dati: DatiZootecnia
}

const FONTE_EMISSIONI_LABEL: Record<'auto' | 'letteratura' | 'specifiche_aziendali', string> = {
  auto: 'automatico (dato aziendale se disponibile, altrimenti media di letteratura)',
  letteratura: 'media di letteratura',
  specifiche_aziendali: 'dato specifico aziendale',
}

/** Riepilogo di sola lettura della simulazione zootecnica, per la vista "a
 * riposo" del calcolo (ResultPanel): un sommario leggibile in cima (i totali
 * che contano) con il dettaglio tecnico completo — le stesse formule mostrate
 * nel form di modifica — dietro un unico "mostra i dettagli", invece di
 * dover riaprire il form di modifica solo per rivedere un numero. */
export default function RiepilogoZootecnia({ dati }: Props) {
  const [mostraDettaglio, setMostraDettaglio] = useState(false)
  const r = calcolaRiepilogoZootecnia(dati)

  if (!r || !r.haDati) {
    return (
      <div className="card space-y-2 border-amber-200 bg-amber-50">
        <h3 className="font-semibold text-stone-900">Calcolo non ancora disponibile</h3>
        <p className="text-sm text-stone-600">
          Per questa attività non esiste ancora un atto delegato dell'UE che ne stabilisca la
          metodologia di certificazione. Nessun dato di simulazione (metano enterico, gestione
          reflui, bilancio alimento/emissioni) risulta ancora inserito: apri "Modifica" per
          compilarlo.
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-4 border-amber-200 bg-amber-50/50">
      <div>
        <h3 className="font-semibold text-stone-900">Simulazione zootecnica (anticipazione, non certificabile)</h3>
        <p className="mt-1 text-sm text-stone-600">
          Nessun atto delegato dell'UE definisce oggi una metodologia di certificazione per la
          zootecnia: questi sono valori indicativi di pianificazione, calcolati con il metodo IPCC
          (2006) Tier {r.tierMetanoEntericoEtichetta === 'misto Tier 1+2' ? '1+2' : r.tierMetanoEntericoEtichetta.replace('Tier ', '')}
          {' '}sui dati aziendali inseriti — non un bilancio crediti ufficiale.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs uppercase text-stone-500">
            Metano enterico ({r.tierMetanoEntericoEtichetta})
          </p>
          <p className="mt-1 text-lg font-bold text-stone-900">
            {formatTCO2(r.metanoEnterico.ch4TCO2eq)} t CO₂eq
          </p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs uppercase text-stone-500">
            Gestione reflui ({r.sistemaStoccaggioEtichetta})
          </p>
          <p className="mt-1 text-lg font-bold text-stone-900">{formatTCO2(r.reflui.totaleTCO2eq)} t CO₂eq</p>
        </div>
        <div className="rounded-lg bg-forest-600 p-3 text-white">
          <p className="text-xs uppercase text-forest-100">Totale emissioni dirette</p>
          <p className="mt-1 text-lg font-bold">{formatTCO2(r.emissioniDiretteTotaliTCO2eq)} t CO₂eq</p>
        </div>
      </div>

      <div
        className={`rounded-md border p-3 text-sm ${
          r.progressoTargetUe.raggiungeTarget ? 'border-forest-300 bg-forest-50' : 'border-amber-300 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-stone-700">
            📊 Monitoraggio — obiettivo UE −{TARGET_UE_RIDUZIONE_PERCENTO_2040}% al 2040 (non vincolante)
          </p>
          <span
            className={`shrink-0 font-semibold ${r.progressoTargetUe.raggiungeTarget ? 'text-forest-700' : 'text-amber-700'}`}
          >
            {formatTCO2(r.progressoTargetUe.riduzioneStimataPercento)}%
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">{TARGET_UE_FONTE}</p>
      </div>

      <div className="rounded-lg bg-white p-3 text-sm text-stone-600">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-stone-700">
            🧭 Bilancio simulato alimento autoprodotto − emissioni dirette
          </p>
          <span className="text-lg font-bold text-stone-900">
            {formatTCO2(r.bilancioSimulato.bilancioSimulatoTCO2)} t CO₂eq
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          Fonte delle emissioni usata: {FONTE_EMISSIONI_LABEL[r.fonteEmissioniBilancio]}. Ipotesi di
          pianificazione, non un bilancio crediti: nessuna normativa definisce oggi questo confronto.
        </p>
      </div>

      <button
        type="button"
        className="text-sm font-medium text-forest-700 hover:underline"
        onClick={() => setMostraDettaglio((v) => !v)}
      >
        {mostraDettaglio ? '− Nascondi' : '+ Mostra'} il dettaglio completo del calcolo (tutte le formule)
      </button>

      {mostraDettaglio && (
        <div className="space-y-3 border-t border-amber-200 pt-3 text-xs text-stone-600">
          <DettaglioRiga titolo="Metano enterico" formula={r.metanoEnterico.formulaCh4} />
          <DettaglioRiga titolo="Solidi volatili (VS) dei reflui" formula={r.reflui.formulaVs} />
          <DettaglioRiga titolo="Fattore di conversione del metano (MCF)" formula={r.reflui.formulaMcf} />
          <DettaglioRiga titolo="Metano da stoccaggio reflui" formula={r.reflui.formulaCh4} />
          <DettaglioRiga titolo="N2O diretto da stoccaggio" formula={r.reflui.formulaN2oDiretto} />
          <DettaglioRiga titolo="N2O indiretto da stoccaggio (volatilizzazione)" formula={r.reflui.formulaN2oIndirettoStoccaggio} />
          <DettaglioRiga titolo="Azoto disponibile per lo spandimento" formula={r.reflui.formulaNDisponibile} />
          <DettaglioRiga titolo="N2O indiretto da spandimento" formula={r.reflui.formulaN2oIndirettoSpandimento} />
          <DettaglioRiga titolo="Totale gestione reflui" formula={r.reflui.formulaTotale} />
          <DettaglioRiga titolo="Bilancio alimento/emissioni — assorbimento" formula={r.bilancioSimulato.formulaAssorbimento} />
          <DettaglioRiga titolo="Bilancio alimento/emissioni — emissioni" formula={r.bilancioSimulato.formulaEmissioni} />
          <DettaglioRiga titolo="Bilancio alimento/emissioni — totale" formula={r.bilancioSimulato.formulaBilancio} />

          {r.righeMitigazione.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-stone-200">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-stone-100 text-stone-500">
                  <tr>
                    <th className="px-2 py-1.5">Pratica di mitigazione potenziale (stima, non normativa)</th>
                    <th className="px-2 py-1.5 text-right">t CO2eq evitate/anno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {r.righeMitigazione.map((riga) => (
                    <tr key={riga.nome}>
                      <td className="px-2 py-1.5 align-top font-medium text-stone-700">{riga.nome}</td>
                      <td className="px-2 py-1.5 text-right align-top text-stone-600">
                        {formatTCO2(riga.riduzioneMinTCO2eq)}–{formatTCO2(riga.riduzioneMaxTCO2eq)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DettaglioRiga({ titolo, formula }: { titolo: string; formula: string }) {
  return (
    <div>
      <p className="font-medium text-stone-700">{titolo}</p>
      <p className="mt-0.5 font-mono text-stone-500">{formula}</p>
    </div>
  )
}
