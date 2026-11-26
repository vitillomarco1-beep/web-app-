import { useState } from 'react'
import { PREZZI_MERCATO_CARBONIO } from '../lib/prezziMercatoCarbonio'
import { ChartColumn } from 'lucide-react'

/** Tabella di riferimento dei prezzi dei crediti di carbonio sul mercato
 * volontario mondiale (broker/piattaforme/indici), da consultare come
 * termine di paragone quando si inserisce un prezzo di vendita ipotizzato —
 * non un prezzo del mercato CRCF, che non esiste ancora. */
export default function ReferimentoPrezziMercato() {
  const [aperto, setAperto] = useState(false)

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <span className="text-xs font-semibold text-stone-700">
          <ChartColumn className="icon" aria-hidden="true" />Prezzi orientativi dei crediti sul mercato volontario mondiale (per confronto, non un
          prezzo CRCF)
        </span>
        <span className="text-stone-500">{aperto ? '−' : '+'}</span>
      </button>
      {aperto && (
        <div className="space-y-3 border-t border-stone-200 p-3 text-xs">
          <p className="text-stone-500">
            Nessun registro o banca crediti dell'UE esiste ancora per i crediti certificati sotto
            il Regolamento (UE) 2024/3012: questi prezzi vengono da piattaforme e indici del
            mercato volontario globale (VCM), prevalentemente progetti extra-UE — un ordine di
            grandezza di riferimento, non una previsione del prezzo di un futuro credito CRCF.
            Valuta originale della fonte, non convertita. Il prezzo varia moltissimo per
            tipologia, rating di qualità, regione e permanenza: righe diverse non sono
            direttamente confrontabili tra loro.
          </p>
          <div className="overflow-x-auto rounded-md border border-stone-200">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-stone-100 text-stone-500">
                <tr>
                  <th className="px-2 py-1.5">Fonte</th>
                  <th className="px-2 py-1.5">Tipologia</th>
                  <th className="px-2 py-1.5">Prezzo</th>
                  <th className="px-2 py-1.5">Riferimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {PREZZI_MERCATO_CARBONIO.map((riga) => (
                  <tr key={`${riga.fonte}-${riga.tipologia}`}>
                    <td className="px-2 py-1.5 align-top font-medium text-stone-700">{riga.fonte}</td>
                    <td className="px-2 py-1.5 align-top text-stone-600">{riga.tipologia}</td>
                    <td className="px-2 py-1.5 align-top font-semibold text-stone-800">{riga.prezzo}</td>
                    <td className="px-2 py-1.5 align-top text-stone-500">
                      {riga.dataRiferimento}
                      <span className="mt-0.5 block">{riga.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
