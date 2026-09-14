import { useState } from 'react'
import type { DatiCalcolo, RisultatoCalcolo } from '../types'
import { formatTCO2 } from '../lib/format'

interface Props {
  risultato: RisultatoCalcolo
  dati?: DatiCalcolo
  nomeTitolare?: string
}

export default function ResultPanel({ risultato, dati, nomeTitolare }: Props) {
  const [generandoReport, setGenerandoReport] = useState(false)

  // Import dinamico: jsPDF porta con sé dipendenze pesanti (html2canvas, ecc.) che
  // non servono al resto dell'app — le carichiamo solo quando serve il report.
  // La scheda va aperta subito, in modo sincrono, prima dell'import: se si aprisse
  // solo a caricamento completato Chrome bloccherebbe il popup perché non lo
  // riconoscerebbe più come diretta conseguenza del click dell'utente.
  async function handleGeneraReport() {
    if (!dati || !nomeTitolare) return
    const finestra = window.open('', '_blank')
    if (!finestra) {
      alert('Il browser ha bloccato l\'apertura del report. Consenti i popup per questo sito e riprova.')
      return
    }
    setGenerandoReport(true)
    try {
      const { mostraReportCalcoloPdf } = await import('../lib/reportPdf')
      mostraReportCalcoloPdf(finestra, nomeTitolare, dati, risultato)
    } finally {
      setGenerandoReport(false)
    }
  }

  if (!risultato.metodologiaDisponibile) {
    return (
      <div className="card space-y-2 border-amber-200 bg-amber-50">
        <h3 className="font-semibold text-stone-900">Calcolo non ancora disponibile</h3>
        <p className="text-sm text-stone-600">
          Per questa attività non esiste ancora un atto delegato dell'UE che ne stabilisca la
          metodologia di certificazione. I dati aziendali e le pratiche inserite restano salvati
          nel fascicolo del cliente: il bilancio in t CO₂eq verrà calcolato non appena la
          normativa sarà pubblicata e la metodologia implementata.
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-4 border-forest-200 bg-forest-50/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-stone-900">Risultato del bilancio</h3>
        {dati && nomeTitolare && (
          <button
            type="button"
            className="btn-secondary"
            disabled={generandoReport}
            onClick={handleGeneraReport}
          >
            {generandoReport ? 'Generazione in corso…' : '📄 Genera report PDF'}
          </button>
        )}
      </div>

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

      <div className="flex items-center justify-between px-1 text-sm text-stone-600">
        <span>
          Numero di unità di credito certificabili{' '}
          <span className="text-xs text-stone-400">
            (1 unità = 1 t CO₂eq, arrotondato per difetto)
          </span>
        </span>
        <span className="text-lg font-bold text-forest-700">
          {Math.floor(risultato.beneficioNettoTotaleTCO2)} unità
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
