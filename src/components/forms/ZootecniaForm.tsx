import { useState } from 'react'
import type { DatiZootecnia } from '../../types'
import ChecklistPanel from '../ChecklistPanel'
import { CHECKLIST_ZOOTECNIA } from '../../lib/checklist'
import { TIPOLOGIA_ALLEVAMENTO_LABEL } from '../../lib/format'
import SimulazioneZootecniaTool from './SimulazioneZootecniaTool'

function defaultData(): DatiZootecnia {
  return {
    tipoAttivita: 'zootecnia',
    nomeCalcolo: '',
    areaAttivitaHa: 0,
    dataInizioPeriodoAttivita: new Date().toISOString().slice(0, 10),
    durataPeriodoCertificazioneAnni: 5,
    praticheDescrizione: '',
    tipologiaAllevamento: 'bovini_da_latte',
    numeroCapiMedio: 0,
    pratiche: {
      additiviAlimentari: false,
      gestioneEffluentiDigestione: false,
      stoccaggioCopertoEffluenti: false,
      pascoloRotazionale: false,
      geneticaEfficienza: false,
      alimentazionePrecisione: false,
    },
    noteMetodologiche: '',
    checklist: {},
  }
}

interface Props {
  initial?: DatiZootecnia
  onSubmit: (dati: DatiZootecnia) => void
  submitLabel?: string
  /** Regione del cliente, per proporre il link al servizio agrometeorologico
   * pubblico della zona (clima e THI). */
  regioneCliente?: string
}

const PRATICHE_LABELS: [keyof DatiZootecnia['pratiche'], string][] = [
  ['additiviAlimentari', 'Additivi alimentari anti-metano (es. 3-NOP, alghe, tannini)'],
  ['gestioneEffluentiDigestione', 'Digestione anaerobica / trattamento avanzato degli effluenti'],
  ['stoccaggioCopertoEffluenti', 'Stoccaggio coperto o impermeabilizzato degli effluenti'],
  ['pascoloRotazionale', 'Pascolo rotazionale o gestione del pascolo a basso impatto'],
  ['alimentazionePrecisione', 'Alimentazione di precisione / miglior efficienza alimentare'],
  ['geneticaEfficienza', 'Selezione genetica orientata a minore intensità di emissione'],
]

export default function ZootecniaForm({ initial, onSubmit, submitLabel, regioneCliente }: Props) {
  const [dati, setDati] = useState<DatiZootecnia>(initial ?? defaultData())

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
      <div className="card space-y-2 border-amber-200 bg-amber-50">
        <h3 className="font-semibold text-stone-900">🚧 Metodologia in preparazione</h3>
        <p className="text-sm text-stone-600">
          A oggi non esiste ancora un atto delegato dell'UE che stabilisca la metodologia di
          certificazione per le attività zootecniche nell'ambito del regolamento (UE) 2024/3012.
          Questa scheda raccoglie fin da ora i dati aziendali e le pratiche di mitigazione, così
          da avere il fascicolo del cliente pronto: il calcolo del bilancio in t CO₂eq verrà
          attivato non appena la normativa sarà pubblicata.
        </p>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-stone-900">Dati generali dell'allevamento</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nome del calcolo *</label>
            <input
              className="input"
              required
              placeholder="Es. Azienda Verdi — allevamento bovino"
              value={dati.nomeCalcolo}
              onChange={(e) => setDati({ ...dati, nomeCalcolo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tipologia di allevamento</label>
            <select
              className="input"
              value={dati.tipologiaAllevamento}
              onChange={(e) =>
                setDati({
                  ...dati,
                  tipologiaAllevamento: e.target.value as DatiZootecnia['tipologiaAllevamento'],
                })
              }
            >
              {Object.entries(TIPOLOGIA_ALLEVAMENTO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Numero medio di capi</label>
            <input
              type="number"
              min={0}
              className="input"
              value={dati.numeroCapiMedio}
              onChange={(e) => setDati({ ...dati, numeroCapiMedio: num(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Superficie aziendale (ha)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={dati.areaAttivitaHa}
              onChange={(e) => setDati({ ...dati, areaAttivitaHa: num(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Data presunta di inizio attività</label>
            <input
              type="date"
              className="input"
              value={dati.dataInizioPeriodoAttivita}
              onChange={(e) => setDati({ ...dati, dataInizioPeriodoAttivita: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Durata prevista del periodo di certificazione (anni)</label>
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
        <h3 className="font-semibold text-stone-900">Pratiche di mitigazione previste/adottate</h3>
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
          <label className="label">Altre note (facoltativo)</label>
          <textarea
            className="input"
            rows={2}
            value={dati.praticheDescrizione}
            onChange={(e) => setDati({ ...dati, praticheDescrizione: e.target.value })}
          />
        </div>
      </div>

      <SimulazioneZootecniaTool
        tipologiaAllevamento={dati.tipologiaAllevamento}
        value={dati.simulazioneZootecnia}
        onChange={(simulazioneZootecnia) => setDati({ ...dati, simulazioneZootecnia })}
        regione={regioneCliente}
      />

      <div className="card">
        <ChecklistPanel
          items={CHECKLIST_ZOOTECNIA}
          value={dati.checklist}
          onChange={(checklist) => setDati({ ...dati, checklist })}
        />
      </div>

      <div>
        <label className="label">Note metodologiche (facoltativo)</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Es. riferimenti a linee guida nazionali o studi già disponibili sull'azienda"
          value={dati.noteMetodologiche}
          onChange={(e) => setDati({ ...dati, noteMetodologiche: e.target.value })}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {submitLabel ?? 'Salva scheda'}
        </button>
      </div>
    </form>
  )
}
