import { useState } from 'react'
import type { DatiAgricolturaAgroforestazione } from '../../types'
import { calcolaBilancio, FATTORE_INCERTEZZA_MINIMO } from '../../lib/carbonEngine'
import ChecklistPanel from '../ChecklistPanel'
import ResultPanel from '../ResultPanel'
import ReferimentoPrezziMercato from '../ReferimentoPrezziMercato'
import RothCTool from './RothCTool'
import ImportaQuadernoN2O from './ImportaQuadernoN2O'
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
  /** Regione del cliente, passata al simulatore RothC per proporre il link al
   * servizio agrometeorologico pubblico della zona. */
  regioneCliente?: string
  /** Comune del cliente, solo per precompilare la ricerca località di Open-Meteo
   * nel simulatore RothC. */
  comuneCliente?: string
  /** Id del cliente, per leggere il suo quaderno di campagna (appezzamenti e
   * operazioni) e importarne gli apporti direttamente nel simulatore RothC e
   * nel calcolo delle emissioni N2O — si veda lib/registroCampagna.ts. */
  clienteId?: string
}

export default function AgricolturaForm({ initial, onSubmit, submitLabel, regioneCliente, comuneCliente, clienteId }: Props) {
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
            <label className="block">
              <span className="label">Nome del calcolo *</span>
              <input
                className="input"
                required
                placeholder="Es. Azienda Rossi — campagna 2026"
                value={dati.nomeCalcolo}
                onChange={(e) => setDati({ ...dati, nomeCalcolo: e.target.value })}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Area di attività (ha) *</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                required
                value={dati.areaAttivitaHa}
                onChange={(e) => setDati({ ...dati, areaAttivitaHa: num(e.target.value) })}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Data inizio periodo di attività</span>
              <input
                type="date"
                className="input"
                value={dati.dataInizioPeriodoAttivita}
                onChange={(e) => setDati({ ...dati, dataInizioPeriodoAttivita: e.target.value })}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Durata periodo di certificazione (anni)</span>
              <input
                type="number"
                min={1}
                className="input"
                value={dati.durataPeriodoCertificazioneAnni}
                onChange={(e) =>
                  setDati({ ...dati, durataPeriodoCertificazioneAnni: num(e.target.value) })
                }
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-stone-900">
          Prezzo di vendita e costo di certificazione (facoltativo)
        </h3>
        <p className="text-sm text-stone-500">
          Nessun prezzo di mercato ufficiale esiste oggi per i crediti CRCF (la banca/registro
          crediti dell'UE non è ancora operativa): inserisci qui una tua ipotesi di prezzo di
          vendita e il costo totale di certificazione che stimi, per ricavare un possibile ricavo
          netto e un prezzo di pareggio — non un dato di mercato.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="label">Prezzo di vendita ipotizzato (€/t CO2eq)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={dati.prezzoCrediti?.prezzoVenditaEuroPerTCO2 ?? ''}
                onChange={(e) =>
                  setDati({
                    ...dati,
                    prezzoCrediti: {
                      ...dati.prezzoCrediti,
                      prezzoVenditaEuroPerTCO2: e.target.value === '' ? undefined : num(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Costo totale di certificazione (€)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={dati.prezzoCrediti?.costoCertificazioneTotaleEuro ?? ''}
                onChange={(e) =>
                  setDati({
                    ...dati,
                    prezzoCrediti: {
                      ...dati.prezzoCrediti,
                      costoCertificazioneTotaleEuro: e.target.value === '' ? undefined : num(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
        <ReferimentoPrezziMercato />
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
          <label className="block">
            <span className="label">Note sulle pratiche (facoltativo)</span>
            <textarea
              className="input"
              rows={2}
              value={dati.praticheDescrizione}
              onChange={(e) => setDati({ ...dati, praticheDescrizione: e.target.value })}
            />
          </label>
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
          regione={regioneCliente}
          comune={comuneCliente}
          clienteId={clienteId}
          onApplica={(assorbimentiAttivitaTCO2, assorbimentiRiferimentoTCO2, dettaglioRothC) =>
            setDati({ ...dati, assorbimentiAttivitaTCO2, assorbimentiRiferimentoTCO2, dettaglioRothC })
          }
        />

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Assorbimenti di carbonio (biomassa vivente + suoli minerali)
          </legend>
          <div>
            <label className="block">
              <span className="label">Scenario di attività (t CO₂ assorbite)</span>
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
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Scenario di riferimento (t CO₂ assorbite)</span>
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
            </label>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Emissioni dal suolo — ambito LULUCF (ESL, suoli minerali)
          </legend>
          <div>
            <label className="block">
              <span className="label">Scenario di attività (t CO₂eq emesse)</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={dati.emissioniSuoloAttivitaTCO2}
                onChange={(e) =>
                  setDati({ ...dati, emissioniSuoloAttivitaTCO2: num(e.target.value) })
                }
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Scenario di riferimento (t CO₂eq emesse)</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={dati.emissioniSuoloRiferimentoTCO2}
                onChange={(e) =>
                  setDati({ ...dati, emissioniSuoloRiferimentoTCO2: num(e.target.value) })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-stone-800">
            Emissioni N2O dai suoli agricoli gestiti (ESA)
          </legend>
          <div>
            <label className="block">
              <span className="label">Scenario di attività (t CO₂eq emesse)</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={dati.emissioniAgricoleAttivitaTCO2}
                onChange={(e) =>
                  setDati({ ...dati, emissioniAgricoleAttivitaTCO2: num(e.target.value) })
                }
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Scenario di riferimento (t CO₂eq emesse)</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={dati.emissioniAgricoleRiferimentoTCO2}
                onChange={(e) =>
                  setDati({ ...dati, emissioniAgricoleRiferimentoTCO2: num(e.target.value) })
                }
              />
            </label>
          </div>
        </fieldset>

        {clienteId && (
          <ImportaQuadernoN2O
            clienteId={clienteId}
            durataPeriodoCertificazioneAnni={dati.durataPeriodoCertificazioneAnni}
            onImporta={(attivitaTCO2, riferimentoTCO2) =>
              setDati({
                ...dati,
                emissioniAgricoleAttivitaTCO2: Math.round(attivitaTCO2 * 1000) / 1000,
                emissioniAgricoleRiferimentoTCO2: Math.round(riferimentoTCO2 * 1000) / 1000,
              })
            }
          />
        )}

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
          <label className="block">
            <span className="label">
            GES associati — aumento di altre emissioni (fertilizzanti N2O, calcitazione/urea,
            combustione combustibili) rispetto al riferimento
          </span>
            <input
              type="number"
              step="0.01"
              className="input max-w-xs"
              value={dati.gesAssociatiTCO2}
              onChange={(e) => setDati({ ...dati, gesAssociatiTCO2: num(e.target.value) })}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="label">
              Fattore di riduzione per incertezza (INC) — minimo {FATTORE_INCERTEZZA_MINIMO * 100}%
              (sez. 2.5)
            </span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                className="input"
                value={dati.fattoreIncertezza}
                onChange={(e) => setDati({ ...dati, fattoreIncertezza: num(e.target.value) })}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="label">Deficit di crediti dal periodo precedente (t CO₂eq)</span>
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
            </label>
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
