import { useState } from 'react'
import type { DatiAgricolturaAgroforestazione } from '../../types'
import { calcolaBilancio, FATTORE_INCERTEZZA_MINIMO } from '../../lib/carbonEngine'
import ChecklistPanel from '../ChecklistPanel'
import ResultPanel from '../ResultPanel'
import RothCTool from './RothCTool'
import { CHECKLIST_AGRICOLTURA } from '../../lib/checklist'

function defaultData(): DatiAgricolturaAgroforestazione {
  return {
    tipoAttivita: 'agricoltura_agroforestazione',
    nomeCalcolo: '',
    areaAttivitaHa: 0,
    dataInizioPeriodoAttivita: new Date().toISOString().slice(0, 10),
    durataPeriodoCertificazioneAnni: 5,
    praticheDescrizione: '',
    pratiche: {
      gestioneColture: false,
      lavorazioneConservativa: false,
      conversionePratiTerreColt: false,
      gestionePrati: false,
      ammendantiOrganici: false,
      agroforestazione: false,
      riduzioneN2O: false,
    },
    applicaAggiornamentoRiferimentoN2O: false,
    assorbimentiAttivitaTCO2: 0,
    assorbimentiRiferimentoTCO2: 0,
    emissioniSuoloAttivitaTCO2: 0,
    emissioniSuoloRiferimentoTCO2: 0,
    emissioniAgricoleAttivitaTCO2: 0,
    emissioniAgricoleRiferimentoTCO2: 0,
    gesAssociatiTCO2: 0,
    fattoreIncertezza: FATTORE_INCERTEZZA_MINIMO,
    deficitCreditiPrecedenteTCO2: 0,
    checklist: {},
  }
}

const PRATICHE_LABELS: [keyof DatiAgricolturaAgroforestazione['pratiche'], string][] = [
  ['gestioneColture', 'Migliore gestione delle colture (colture di copertura, rotazione, residui)'],
  ['lavorazioneConservativa', 'Lavorazione conservativa del suolo'],
  ['conversionePratiTerreColt', 'Conversione di terre coltivate in prati'],
  ['gestionePrati', 'Migliore gestione dei prati (pascolo a rotazione, prati misti)'],
  ['ammendantiOrganici', 'Uso di ammendanti organici / fertilizzanti organici'],
  ['agroforestazione', 'Pratiche agroforestali (alberi, siepi, colture legnose perenni)'],
  ['riduzioneN2O', 'Pratiche di riduzione delle emissioni N2O (fertilizzazione di precisione, ecc.)'],
]

interface Props {
  initial?: DatiAgricolturaAgroforestazione
  onSubmit: (dati: DatiAgricolturaAgroforestazione) => void
  submitLabel?: string
}

export default function AgricolturaForm({ initial, onSubmit, submitLabel }: Props) {
  const [dati, setDati] = useState<DatiAgricolturaAgroforestazione>(initial ?? defaultData())
  const [showResult, setShowResult] = useState(false)

  const risultatoAnteprima = calcolaBilancio(dati)

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(dati)
      }}
    >
      <div className="card space-y-4">
        <h3 className="font-semibold text-stone-900">Dati generali</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nome del calcolo *</label>
            <input
              className="input"
              required
              placeholder="Es. Azienda Rossi — campagna 2026"
              value={dati.nomeCalcolo}
              onChange={(e) => setDati({ ...dati, nomeCalcolo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Area di attività (ha) *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              required
              value={dati.areaAttivitaHa}
              onChange={(e) => setDati({ ...dati, areaAttivitaHa: num(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Data inizio periodo di attività</label>
            <input
              type="date"
              className="input"
              value={dati.dataInizioPeriodoAttivita}
              onChange={(e) => setDati({ ...dati, dataInizioPeriodoAttivita: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Durata periodo di certificazione (anni)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={dati.durataPeriodoCertificazioneAnni}
              onChange={(e) =>
                setDati({ ...dati, durataPeriodoCertificazioneAnni: num(e.target.value) })
              }
            />
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-stone-900">Pratiche adottate (allegato, sez. 1.1.1.1)</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRATICHE_LABELS.map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                checked={dati.pratiche[key]}
                onChange={(e) =>
                  setDati({ ...dati, pratiche: { ...dati.pratiche, [key]: e.target.checked } })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div>
          <label className="label">Note sulle pratiche (facoltativo)</label>
          <textarea
            className="input"
            rows={2}
            value={dati.praticheDescrizione}
            onChange={(e) => setDati({ ...dati, praticheDescrizione: e.target.value })}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-stone-900">
          Quantificazione (equazioni 1 e 2 dell'allegato)
        </h3>
        <p className="text-sm text-stone-500">
          Inserisci i valori già quantificati (con modelli, misurazioni o fattori di emissione,
          sez. 2.4) per lo scenario di attività e per lo scenario di riferimento, in tonnellate di
          CO₂ equivalente per l'intero periodo di certificazione.
        </p>

        <RothCTool
          areaAttivitaHa={dati.areaAttivitaHa}
          durataPeriodoCertificazioneAnni={dati.durataPeriodoCertificazioneAnni}
          onApplica={(assorbimentiAttivitaTCO2, assorbimentiRiferimentoTCO2, dettaglioRothC) =>
            setDati({ ...dati, assorbimentiAttivitaTCO2, assorbimentiRiferimentoTCO2, dettaglioRothC })
          }
        />

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Assorbimenti di carbonio (biomassa vivente + suoli minerali)
          </legend>
          <div>
            <label className="label">Scenario di attività (t CO₂ assorbite)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.assorbimentiAttivitaTCO2}
              onChange={(e) =>
                setDati({
                  ...dati,
                  assorbimentiAttivitaTCO2: num(e.target.value),
                  dettaglioRothC: undefined,
                })
              }
            />
          </div>
          <div>
            <label className="label">Scenario di riferimento (t CO₂ assorbite)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.assorbimentiRiferimentoTCO2}
              onChange={(e) =>
                setDati({
                  ...dati,
                  assorbimentiRiferimentoTCO2: num(e.target.value),
                  dettaglioRothC: undefined,
                })
              }
            />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Emissioni dal suolo — ambito LULUCF (ESL, suoli minerali)
          </legend>
          <div>
            <label className="label">Scenario di attività (t CO₂eq emesse)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.emissioniSuoloAttivitaTCO2}
              onChange={(e) =>
                setDati({ ...dati, emissioniSuoloAttivitaTCO2: num(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Scenario di riferimento (t CO₂eq emesse)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.emissioniSuoloRiferimentoTCO2}
              onChange={(e) =>
                setDati({ ...dati, emissioniSuoloRiferimentoTCO2: num(e.target.value) })
              }
            />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Emissioni N2O dai suoli agricoli gestiti (ESA)
          </legend>
          <div>
            <label className="label">Scenario di attività (t CO₂eq emesse)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.emissioniAgricoleAttivitaTCO2}
              onChange={(e) =>
                setDati({ ...dati, emissioniAgricoleAttivitaTCO2: num(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Scenario di riferimento (t CO₂eq emesse)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={dati.emissioniAgricoleRiferimentoTCO2}
              onChange={(e) =>
                setDati({ ...dati, emissioniAgricoleRiferimentoTCO2: num(e.target.value) })
              }
            />
          </div>
        </fieldset>

        {dati.pratiche.riduzioneN2O && (
          <label className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
              checked={dati.applicaAggiornamentoRiferimentoN2O}
              onChange={(e) =>
                setDati({ ...dati, applicaAggiornamentoRiferimentoN2O: e.target.checked })
              }
            />
            Applica l'aggiornamento al ribasso del livello di riferimento ESA (−1%/anno dall'avvio
            dell'attività, allegato sez. 2.3.3)
          </label>
        )}

        <div>
          <label className="label">
            GES associati — aumento di altre emissioni (fertilizzanti N2O, calcitazione/urea,
            combustione combustibili) rispetto al riferimento
          </label>
          <input
            type="number"
            step="0.01"
            className="input max-w-xs"
            value={dati.gesAssociatiTCO2}
            onChange={(e) => setDati({ ...dati, gesAssociatiTCO2: num(e.target.value) })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              Fattore di riduzione per incertezza (INC) — minimo {FATTORE_INCERTEZZA_MINIMO * 100}%
              (sez. 2.5)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              className="input"
              value={dati.fattoreIncertezza}
              onChange={(e) => setDati({ ...dati, fattoreIncertezza: num(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Deficit di crediti dal periodo precedente (t CO₂eq)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="input"
              value={dati.deficitCreditiPrecedenteTCO2 ?? 0}
              onChange={(e) =>
                setDati({ ...dati, deficitCreditiPrecedenteTCO2: num(e.target.value) })
              }
            />
          </div>
        </div>
      </div>

      <div className="card">
        <ChecklistPanel
          items={CHECKLIST_AGRICOLTURA}
          value={dati.checklist}
          onChange={(checklist) => setDati({ ...dati, checklist })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowResult((s) => !s)}
        >
          {showResult ? 'Nascondi anteprima' : 'Mostra anteprima risultato'}
        </button>
        <button type="submit" className="btn-primary">
          {submitLabel ?? 'Salva calcolo'}
        </button>
      </div>

      {showResult && <ResultPanel risultato={risultatoAnteprima} />}
    </form>
  )
}
