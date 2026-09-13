import { useState } from 'react'
import type { DatiImboschimento } from '../../types'
import { calcolaBilancio, FATTORE_INCERTEZZA_MINIMO } from '../../lib/carbonEngine'
import ChecklistPanel from '../ChecklistPanel'
import ResultPanel from '../ResultPanel'
import { CHECKLIST_IMBOSCHIMENTO } from '../../lib/checklist'

function defaultData(): DatiImboschimento {
  return {
    tipoAttivita: 'imboschimento',
    nomeCalcolo: '',
    areaAttivitaHa: 0,
    dataInizioPeriodoAttivita: new Date().toISOString().slice(0, 10),
    durataPeriodoCertificazioneAnni: 5,
    praticheDescrizione: '',
    applicaPerditaLavorazionePratiPermanenti: false,
    stockCarbonioSueloPreesistenteTCO2: 0,
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

interface Props {
  initial?: DatiImboschimento
  onSubmit: (dati: DatiImboschimento) => void
  submitLabel?: string
}

export default function ImboschimentoForm({ initial, onSubmit, submitLabel }: Props) {
  const [dati, setDati] = useState<DatiImboschimento>(initial ?? defaultData())
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
              placeholder="Es. Azienda Bianchi — imboschimento 2026"
              value={dati.nomeCalcolo}
              onChange={(e) => setDati({ ...dati, nomeCalcolo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Area di attività (ha) — minimo 0,5 ha *</label>
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
            <label className="label">
              Durata periodo di certificazione (anni) — periodo di attività min. 35 anni, di
              monitoraggio min. 40
            </label>
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
        <div>
          <label className="label">Descrizione pratiche (impianto, semina, rigenerazione naturale, specie...)</label>
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
          Per l'imboschimento il livello di riferimento per la biomassa vivente è pari a zero
          (allegato, sez. 2.3.2): il calcolo lo applica automaticamente.
        </p>

        <div>
          <label className="label">
            Assorbimenti di carbonio nella biomassa vivente (e, se incluso, nei suoli minerali) —
            scenario di attività (t CO₂ assorbite)
          </label>
          <input
            type="number"
            step="0.01"
            className="input max-w-xs"
            value={dati.assorbimentiAttivitaTCO2}
            onChange={(e) => setDati({ ...dati, assorbimentiAttivitaTCO2: num(e.target.value) })}
          />
        </div>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Emissioni dal suolo — LULUCF (facoltativo, sez. 2.1.3)
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
            Emissioni dai suoli agricoli gestiti (facoltativo)
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

        <div>
          <label className="label">
            GES associati — N2O da fertilizzanti su alberi appena piantati + combustione
            combustibili (t CO₂eq)
          </label>
          <input
            type="number"
            step="0.01"
            className="input max-w-xs"
            value={dati.gesAssociatiTCO2}
            onChange={(e) => setDati({ ...dati, gesAssociatiTCO2: num(e.target.value) })}
          />
        </div>

        <div className="space-y-2 rounded-md bg-amber-50 p-3">
          <label className="flex items-start gap-2 text-sm text-amber-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
              checked={dati.applicaPerditaLavorazionePratiPermanenti}
              onChange={(e) =>
                setDati({ ...dati, applicaPerditaLavorazionePratiPermanenti: e.target.checked })
              }
            />
            Nel periodo di certificazione sono state effettuate lavorazioni su prati permanenti
            (detrazione forfettaria del 12%, allegato sez. 2.2)
          </label>
          {dati.applicaPerditaLavorazionePratiPermanenti && (
            <div className="max-w-xs">
              <label className="label">Stock di carbonio preesistente nel suolo (t CO₂eq)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={dati.stockCarbonioSueloPreesistenteTCO2 ?? 0}
                onChange={(e) =>
                  setDati({
                    ...dati,
                    stockCarbonioSueloPreesistenteTCO2: num(e.target.value),
                  })
                }
              />
            </div>
          )}
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
          items={CHECKLIST_IMBOSCHIMENTO}
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
