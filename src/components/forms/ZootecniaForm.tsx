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

type IndiciLatte = NonNullable<DatiZootecnia['indiciLatte']>
type IndiciCarne = NonNullable<DatiZootecnia['indiciCarne']>

interface CampoIndiceNumerico<T> {
  key: keyof T
  label: string
  unita: string
  opzioni?: never
}
interface CampoIndiceSelezione<T> {
  key: keyof T
  label: string
  unita?: never
  opzioni: string[]
}
type CampoIndice<T> = CampoIndiceNumerico<T> | CampoIndiceSelezione<T>

const GRUPPI_INDICI_LATTE: { titolo: string; campi: CampoIndice<IndiciLatte>[] }[] = [
  {
    titolo: 'Riproduzione',
    campi: [
      { key: 'etaPrimoPartoMesi', label: 'Età media al primo parto', unita: 'mesi' },
      { key: 'giorniApertiMedio', label: 'Giorni aperti medi (parto-concepimento)', unita: 'giorni' },
      { key: 'intervalloInterpartoGiorni', label: 'Intervallo interparto', unita: 'giorni' },
      { key: 'tassoConcepimentoPercento', label: 'Tasso di concepimento (CR)', unita: '%' },
      { key: 'tassoGravidanzaPercento', label: 'Tasso di gravidanza (PR)', unita: '%' },
      { key: 'tassoRilevazioneCaloriPercento', label: 'Tasso di rilevazione calori (HDR)', unita: '%' },
      { key: 'inseminazioniPerGravidanzaMedia', label: 'Inseminazioni medie per gravidanza', unita: 'n.' },
      { key: 'tassoAbortoPercento', label: 'Tasso di aborto', unita: '%' },
    ],
  },
  {
    titolo: 'Longevità e struttura di mandria',
    campi: [
      { key: 'vitaMediaProduttivaLattazioni', label: 'Vita media produttiva (lattazioni per capo)', unita: 'n.' },
      { key: 'tassoRimontaPercento', label: 'Tasso di rimonta/sostituzione annuo', unita: '%' },
    ],
  },
  {
    titolo: 'Salute e benessere',
    campi: [
      { key: 'tassoMortalitaPercento', label: 'Tasso di mortalità', unita: '%' },
      { key: 'celluleSomaticheMedie', label: 'Cellule somatiche medie', unita: 'cellule/ml' },
      { key: 'incidenzaMastitePercento', label: 'Incidenza di mastite clinica', unita: '%' },
      { key: 'incidenzaZoppiaPercento', label: 'Incidenza di zoppia', unita: '%' },
    ],
  },
  {
    titolo: 'Produzione',
    campi: [
      { key: 'produzioneMedia305GiorniKg', label: 'Produzione media per lattazione a 305 giorni', unita: 'kg' },
      { key: 'giorniMediInLattazione', label: 'Giorni medi in lattazione (DIM medio)', unita: 'giorni' },
      { key: 'percentualeVaccheAsciuttaPercento', label: 'Vacche in asciutta sul totale mandria', unita: '%' },
    ],
  },
]

const GRUPPI_INDICI_CARNE: { titolo: string; campi: CampoIndice<IndiciCarne>[] }[] = [
  {
    titolo: 'Riproduzione (vacca nutrice)',
    campi: [
      { key: 'etaPrimoPartoMesi', label: 'Età media al primo parto', unita: 'mesi' },
      { key: 'intervalloInterpartoGiorni', label: 'Intervallo interparto', unita: 'giorni' },
      { key: 'tassoFertilitaPercento', label: 'Tasso di fertilità/gravidanza', unita: '%' },
      { key: 'tassoNatalitaPercento', label: 'Tasso di natalità (vitelli nati vivi)', unita: '%' },
      { key: 'pesoMedioNascitaKg', label: 'Peso medio alla nascita', unita: 'kg' },
      { key: 'tassoMortalitaPerinatalePercento', label: 'Tasso di mortalità perinatale', unita: '%' },
    ],
  },
  {
    titolo: 'Accrescimento e conversione alimentare',
    campi: [
      { key: 'pesoMedioSvezzamentoKg', label: 'Peso medio allo svezzamento', unita: 'kg' },
      { key: 'accrescimentoMedioGiornalieroKg', label: 'Accrescimento medio giornaliero (ADG)', unita: 'kg/giorno' },
      { key: 'pesoVivoFinaleKg', label: 'Peso vivo finale a fine ciclo', unita: 'kg' },
      { key: 'etaMacellazioneMesi', label: 'Età alla macellazione', unita: 'mesi' },
      { key: 'indiceConversioneAlimentare', label: 'Indice di conversione alimentare (ICA)', unita: 'kg s.s./kg accr.' },
    ],
  },
  {
    titolo: 'Longevità e struttura di mandria',
    campi: [
      { key: 'tassoRimontaFattriciPercento', label: 'Tasso di rimonta delle fattrici', unita: '%' },
      { key: 'vitaProduttivaFattriciParti', label: 'Vita produttiva media delle fattrici', unita: 'n. parti' },
    ],
  },
  {
    titolo: 'Salute e benessere',
    campi: [
      { key: 'tassoMortalitaPercento', label: 'Tasso di mortalità generale', unita: '%' },
      { key: 'incidenzaPatologieRespiratoriePercento', label: 'Incidenza di patologie respiratorie (BRD)', unita: '%' },
      { key: 'tassoTrattamentiAntibioticiPercento', label: 'Tasso di trattamenti antibiotici', unita: '%' },
    ],
  },
  {
    titolo: 'Qualità della carcassa',
    campi: [
      { key: 'resaMacellazionePercento', label: 'Resa alla macellazione', unita: '%' },
      { key: 'classificazioneSeurop', label: 'Classificazione SEUROP (conformazione)', opzioni: ['S', 'E', 'U', 'R', 'O', 'P'] },
      { key: 'gradoIngrassamento', label: 'Grado di ingrassamento (scala UE 1-5)', unita: '1-5' },
    ],
  },
]

function PannelloIndici<T extends Record<string, number | string | undefined>>({
  titolo,
  descrizione,
  gruppi,
  valori,
  aggiorna,
}: {
  titolo: string
  descrizione: string
  gruppi: { titolo: string; campi: CampoIndice<T>[] }[]
  valori: T
  aggiorna: (key: keyof T, value: number | string) => void
}) {
  const [aperto, setAperto] = useState(false)
  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }
  return (
    <div className="card">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <h3 className="font-semibold text-stone-900">{titolo}</h3>
        <span className="text-stone-500">{aperto ? '−' : '+'}</span>
      </button>
      {aperto && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-stone-500">{descrizione}</p>
          {gruppi.map((gruppo) => (
            <div key={gruppo.titolo}>
              <p className="mb-1 text-sm font-medium text-stone-700">{gruppo.titolo}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gruppo.campi.map((campo) => (
                  <div key={String(campo.key)}>
                    <label className="text-xs text-stone-500">
                      {campo.label}
                      {campo.unita && <span className="text-stone-400"> ({campo.unita})</span>}
                    </label>
                    {campo.opzioni ? (
                      <select
                        className="input"
                        value={(valori[campo.key] as string) ?? ''}
                        onChange={(e) => aggiorna(campo.key, e.target.value)}
                      >
                        <option value="">—</option>
                        {campo.opzioni.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        className="input"
                        value={(valori[campo.key] as number) ?? 0}
                        onChange={(e) => aggiorna(campo.key, num(e.target.value))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ZootecniaForm({ initial, onSubmit, submitLabel, regioneCliente }: Props) {
  const [dati, setDati] = useState<DatiZootecnia>(initial ?? defaultData())

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  function aggiornaIndiceLatte(key: keyof IndiciLatte, value: number | string) {
    setDati({ ...dati, indiciLatte: { ...dati.indiciLatte, [key]: value } })
  }

  function aggiornaIndiceCarne(key: keyof IndiciCarne, value: number | string) {
    setDati({ ...dati, indiciCarne: { ...dati.indiciCarne, [key]: value } })
  }

  const struttureMandria = dati.struttureMandria ?? {
    animaliLattazione: 0,
    animaliAsciutta: 0,
    manze12MesiParto: 0,
    manzette6_12Mesi: 0,
    vitelli0_6Mesi: 0,
  }
  const totaleStruttureMandria =
    struttureMandria.animaliLattazione +
    struttureMandria.animaliAsciutta +
    struttureMandria.manze12MesiParto +
    struttureMandria.manzette6_12Mesi +
    struttureMandria.vitelli0_6Mesi
  const usaStruttureMandria = totaleStruttureMandria > 0

  function aggiornaStrutturaMandria(key: keyof typeof struttureMandria, value: number) {
    const aggiornata = { ...struttureMandria, [key]: value }
    const totale =
      aggiornata.animaliLattazione +
      aggiornata.animaliAsciutta +
      aggiornata.manze12MesiParto +
      aggiornata.manzette6_12Mesi +
      aggiornata.vitelli0_6Mesi
    setDati({ ...dati, struttureMandria: aggiornata, numeroCapiMedio: totale })
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
              disabled={usaStruttureMandria}
              value={dati.numeroCapiMedio}
              onChange={(e) => setDati({ ...dati, numeroCapiMedio: num(e.target.value) })}
            />
            {usaStruttureMandria && (
              <p className="mt-1 text-xs text-stone-400">
                Calcolato automaticamente dalla somma della struttura della mandria qui sotto.
              </p>
            )}
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
        <h3 className="font-semibold text-stone-900">Struttura della mandria per categoria (facoltativo)</h3>
        <p className="text-sm text-stone-500">
          Più precisa di un unico numero di capi aggregato: distingue la mandria adulta (in
          lattazione/asciutta) dalla rimonta (manze, manzette, vitelli) — categorie con fattori di
          emissione del metano enterico molto diversi, usate dal Tier 1 nel pannello di simulazione
          più sotto. Se compilata, il "Numero medio di capi" qui sopra si aggiorna automaticamente.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="text-xs text-stone-500">Animali in lattazione</label>
            <input
              type="number"
              min={0}
              className="input"
              value={struttureMandria.animaliLattazione}
              onChange={(e) => aggiornaStrutturaMandria('animaliLattazione', num(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Animali in asciutta</label>
            <input
              type="number"
              min={0}
              className="input"
              value={struttureMandria.animaliAsciutta}
              onChange={(e) => aggiornaStrutturaMandria('animaliAsciutta', num(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Manze (12 mesi-parto)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={struttureMandria.manze12MesiParto}
              onChange={(e) => aggiornaStrutturaMandria('manze12MesiParto', num(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Manzette (6-12 mesi)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={struttureMandria.manzette6_12Mesi}
              onChange={(e) => aggiornaStrutturaMandria('manzette6_12Mesi', num(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Vitelli (0-6 mesi)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={struttureMandria.vitelli0_6Mesi}
              onChange={(e) => aggiornaStrutturaMandria('vitelli0_6Mesi', num(e.target.value))}
            />
          </div>
        </div>
        {usaStruttureMandria && (
          <p className="text-xs text-stone-400">Totale: {totaleStruttureMandria} capi.</p>
        )}
      </div>

      <PannelloIndici
        titolo="Indici zootecnici e riproduttivi — latte (facoltativo)"
        descrizione="Dati anagrafici/gestionali della mandria da latte, utili per il fascicolo del cliente — non entrano in un calcolo di emissioni oggi. Alcuni (es. giorni aperti, età al primo parto) incidono comunque sull'intensità emissiva per litro di latte: più a lungo una vacca resta improduttiva, più a lungo genera emissioni di mantenimento senza produrre."
        gruppi={GRUPPI_INDICI_LATTE}
        valori={dati.indiciLatte ?? {}}
        aggiorna={aggiornaIndiceLatte}
      />

      <PannelloIndici
        titolo="Indici zootecnici — carne (facoltativo)"
        descrizione="Dati anagrafici/gestionali del comparto carne (linea vacca-vitello/ingrasso), utili per il fascicolo del cliente — non entrano in un calcolo di emissioni oggi. Utile anche per un'azienda prevalentemente da latte che vende vitelli/manze a carne: compila solo i campi pertinenti alla tua azienda."
        gruppi={GRUPPI_INDICI_CARNE}
        valori={dati.indiciCarne ?? {}}
        aggiorna={aggiornaIndiceCarne}
      />

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
        numeroCapiMedio={dati.numeroCapiMedio}
        struttureMandria={dati.struttureMandria}
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
