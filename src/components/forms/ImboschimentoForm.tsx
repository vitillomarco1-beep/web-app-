import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DatiImboschimento } from '../../types'
import { calcolaBilancio, FATTORE_INCERTEZZA_MINIMO } from '../../lib/carbonEngine'
import ChecklistPanel from '../ChecklistPanel'
import ResultPanel from '../ResultPanel'
import { CHECKLIST_IMBOSCHIMENTO } from '../../lib/checklist'
import {
  LIVELLI_CONFIDENZA,
  calcolaNumeroPlotUE,
  calcolaCampionamentoStratificatoCdm,
  type LivelloConfidenza,
} from '../../lib/campionamentoForestale'

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
  const [apertoCampionamento, setApertoCampionamento] = useState(false)

  const risultatoAnteprima = calcolaBilancio(dati)

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  const pianoCampionamento = dati.pianoCampionamento ?? {
    deviazioneStandard: 0,
    margineErroreE: 0,
    confidenza: 90 as LivelloConfidenza,
    usaStratificazione: false,
    dimensionePlotHa: 0.1,
    strati: [],
  }

  function aggiornaPianoCampionamento(patch: Partial<typeof pianoCampionamento>) {
    setDati({ ...dati, pianoCampionamento: { ...pianoCampionamento, ...patch } })
  }

  function aggiungiStrato() {
    aggiornaPianoCampionamento({
      strati: [...pianoCampionamento.strati, { id: uuidv4(), nome: '', areaHa: 0, deviazioneStandard: 0 }],
    })
  }

  function aggiornaStrato(id: string, patch: Partial<(typeof pianoCampionamento.strati)[number]>) {
    aggiornaPianoCampionamento({
      strati: pianoCampionamento.strati.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function rimuoviStrato(id: string) {
    aggiornaPianoCampionamento({ strati: pianoCampionamento.strati.filter((s) => s.id !== id) })
  }

  const risultatoPlotUE = calcolaNumeroPlotUE(
    pianoCampionamento.deviazioneStandard,
    pianoCampionamento.margineErroreE,
    pianoCampionamento.confidenza,
  )
  const strattiValidi = pianoCampionamento.strati.filter((s) => s.areaHa > 0)
  const risultatoStratificato =
    pianoCampionamento.usaStratificazione && strattiValidi.length > 0
      ? calcolaCampionamentoStratificatoCdm(
          strattiValidi,
          pianoCampionamento.dimensionePlotHa,
          pianoCampionamento.margineErroreE,
          pianoCampionamento.confidenza,
        )
      : null

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

      <div className="rounded-lg border border-sky-300 bg-sky-50/50">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setApertoCampionamento((a) => !a)}
        >
          <span className="text-sm font-semibold text-sky-800">
            📐 Piano di monitoraggio — numero minimo di unità di campionamento
          </span>
          <span className="text-sky-700">{apertoCampionamento ? '−' : '+'}</span>
        </button>

        {apertoCampionamento && (
          <div className="space-y-4 border-t border-sky-200 px-4 py-4 text-xs">
            <p className="text-stone-600">
              Il censimento all'avvio del periodo di attività conta per intero le unità di
              impianto (alberi, filari, metri di siepi). Per i <strong>controlli di
              ricertificazione successivi</strong>, invece, si misura un campione rappresentativo:
              questa sezione stima quante unità servono per una precisione statistica data.{' '}
              <strong>Non entra nel bilancio in t CO2eq</strong> qui sopra: è un supporto alla
              pianificazione del rilievo in campo.
            </p>
            <p className="text-stone-500">
              Formula: n ≥ σ² × Zα² / E² — Atto Delegato UE C(2026) 4666, sez. 2.4.2.2.C, eq. 10,
              così come ripresa da una slide del Master in Carbon Farming (Università degli Studi
              della Tuscia). Non ho potuto verificare il testo integrale dell'atto delegato
              (accesso bloccato in questo ambiente): verifica numero di sezione/equazione e
              formula contro il testo ufficiale prima di un uso diverso dalla pianificazione
              preliminare.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="text-[11px] text-stone-500">
                  Deviazione standard (σ) dello stock di carbonio
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input !py-1 text-xs"
                  value={pianoCampionamento.deviazioneStandard}
                  onChange={(e) => aggiornaPianoCampionamento({ deviazioneStandard: num(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-500">Errore massimo accettabile (E)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input !py-1 text-xs"
                  value={pianoCampionamento.margineErroreE}
                  onChange={(e) => aggiornaPianoCampionamento({ margineErroreE: num(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Stesse unità di σ (es. t s.s./ha). Default indicativo: 10% dello stock medio
                  stimato nell'area.
                </p>
              </div>
              <div>
                <label className="text-[11px] text-stone-500">Livello di confidenza</label>
                <select
                  className="input !py-1 text-xs"
                  value={pianoCampionamento.confidenza}
                  onChange={(e) =>
                    aggiornaPianoCampionamento({ confidenza: Number(e.target.value) as LivelloConfidenza })
                  }
                >
                  {LIVELLI_CONFIDENZA.map((c) => (
                    <option key={c} value={c}>
                      {c}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-md bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-stone-700">Numero minimo di unità di campionamento</p>
                <span className="text-lg font-bold text-sky-800">{risultatoPlotUE.numeroPlotMinimo}</span>
              </div>
              <p className="mt-1 text-stone-500">{risultatoPlotUE.formula}</p>
            </div>

            <label className="flex items-start gap-2 text-stone-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                checked={pianoCampionamento.usaStratificazione}
                onChange={(e) => aggiornaPianoCampionamento({ usaStratificazione: e.target.checked })}
              />
              L'area è suddivisa in più zone con variabilità diversa: stratifica e alloca le unità
              tra le zone (estensione facoltativa, fonte CDM — mercato volontario, non Atto
              Delegato UE)
            </label>

            {pianoCampionamento.usaStratificazione && (
              <div className="space-y-2 rounded-md border border-stone-200 bg-white p-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-stone-500">
                    Area di un'unità di campionamento (ha)
                  </label>
                  <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={aggiungiStrato}>
                    + Aggiungi zona
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input !py-1 w-32 text-xs"
                  value={pianoCampionamento.dimensionePlotHa}
                  onChange={(e) => aggiornaPianoCampionamento({ dimensionePlotHa: num(e.target.value) })}
                />

                {pianoCampionamento.strati.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-center"
                  >
                    <input
                      type="text"
                      placeholder="Nome zona"
                      className="input !py-1 text-xs"
                      value={s.nome}
                      onChange={(e) => aggiornaStrato(s.id, { nome: e.target.value })}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Area (ha)"
                      className="input !py-1 text-xs"
                      value={s.areaHa}
                      onChange={(e) => aggiornaStrato(s.id, { areaHa: num(e.target.value) })}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Dev. standard"
                      className="input !py-1 text-xs"
                      value={s.deviazioneStandard}
                      onChange={(e) => aggiornaStrato(s.id, { deviazioneStandard: num(e.target.value) })}
                    />
                    <button
                      type="button"
                      className="btn-danger !px-2 !py-1 text-xs"
                      onClick={() => rimuoviStrato(s.id)}
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}

                {risultatoStratificato && (
                  <div className="space-y-2 border-t border-stone-100 pt-2">
                    <p className="text-stone-500">{risultatoStratificato.formulaN}</p>
                    <p className="text-stone-500">{risultatoStratificato.formulaIterazione1}</p>
                    {risultatoStratificato.haRichiestoSecondaIterazione && (
                      <p className="text-stone-500">{risultatoStratificato.formulaIterazione2}</p>
                    )}
                    <div className="rounded-md bg-sky-50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-stone-700">Numero totale di unità (stratificato)</p>
                        <span className="text-lg font-bold text-sky-800">
                          {risultatoStratificato.numeroPlotFinale}
                        </span>
                      </div>
                      <p className="mt-1 text-stone-500">{risultatoStratificato.formulaAllocazione}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
