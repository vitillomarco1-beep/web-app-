import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { clientiStore, appezzamentiStore, operazioniCampoStore } from '../lib/storage'
import type { Appezzamento, OperazioneCampo, ScenarioOperazione, TipoOperazioneCampo } from '../types'
import { COLTURE_RESIDUI } from '../lib/residuiColturali'
import { aggregaInputRothC, aggregaAzoto } from '../lib/registroCampagna'
import { calcolaN2oSuoliAgricoli } from '../lib/n2oSuoliAgricoli'
import { formatTCO2, formatDate } from '../lib/format'

const TIPO_LABEL: Record<TipoOperazioneCampo, string> = {
  raccolta: 'Raccolta (resa)',
  fertilizzazione_minerale: 'Fertilizzazione minerale',
  ammendante_organico: 'Ammendante organico (letame, liquame, compost, digestato...)',
  lavorazione_terreno: 'Lavorazione del terreno',
}

const TIPI_OPERAZIONE: TipoOperazioneCampo[] = [
  'raccolta',
  'fertilizzazione_minerale',
  'ammendante_organico',
  'lavorazione_terreno',
]

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function num(v: string): number {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export default function QuadernoCampagnaPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  const [appezzamentoSelezionatoId, setAppezzamentoSelezionatoId] = useState<string | null>(null)
  const [scenarioAttivo, setScenarioAttivo] = useState<ScenarioOperazione>('attivita')
  const [formAppezzamento, setFormAppezzamento] = useState<{ nome: string; superficieHa: number; colturaPrincipale: string }>({
    nome: '',
    superficieHa: 0,
    colturaPrincipale: COLTURE_RESIDUI[0].nome,
  })
  const [operazioneInModifica, setOperazioneInModifica] = useState<OperazioneCampo | null>(null)
  const [areaTotaleHa, setAreaTotaleHa] = useState(0)
  const [anniRiepilogo, setAnniRiepilogo] = useState(5)
  const [lisciviazioneApplicabile, setLisciviazioneApplicabile] = useState(false)

  if (!clientId) return null
  const cliente = clientiStore.get(clientId)
  if (!cliente) {
    return (
      <div className="card text-center text-sm text-stone-500">
        Cliente non trovato.{' '}
        <Link to="/clienti" className="text-forest-700 hover:underline">
          Torna alla lista clienti
        </Link>
        .
      </div>
    )
  }

  const appezzamenti = appezzamentiStore.byClient(clientId)
  const operazioni = operazioniCampoStore.byClient(clientId)
  const appezzamentoSelezionato = appezzamenti.find((a) => a.id === appezzamentoSelezionatoId) ?? null
  const operazioniAppezzamento = appezzamentoSelezionato
    ? operazioniCampoStore.byAppezzamento(appezzamentoSelezionato.id)
    : []

  const areaTotaleEffettiva = areaTotaleHa > 0 ? areaTotaleHa : appezzamenti.reduce((s, a) => s + a.superficieHa, 0)

  function handleAggiungiAppezzamento(e: React.FormEvent) {
    e.preventDefault()
    if (!formAppezzamento.nome.trim()) return
    appezzamentiStore.save({
      id: uuidv4(),
      clienteId: clientId!,
      nome: formAppezzamento.nome.trim(),
      superficieHa: formAppezzamento.superficieHa,
      colturaPrincipale: formAppezzamento.colturaPrincipale,
    })
    setFormAppezzamento({ nome: '', superficieHa: 0, colturaPrincipale: COLTURE_RESIDUI[0].nome })
    refresh()
  }

  function handleEliminaAppezzamento(id: string) {
    if (!confirm('Eliminare questo appezzamento e tutte le sue operazioni registrate?')) return
    appezzamentiStore.remove(id)
    if (appezzamentoSelezionatoId === id) setAppezzamentoSelezionatoId(null)
    refresh()
  }

  function apriNuovaOperazione() {
    if (!appezzamentoSelezionato) return
    setOperazioneInModifica({
      id: uuidv4(),
      appezzamentoId: appezzamentoSelezionato.id,
      clienteId: clientId!,
      scenario: scenarioAttivo,
      tipo: 'raccolta',
      data: oggiISO(),
    })
  }

  function handleSalvaOperazione(e: React.FormEvent) {
    e.preventDefault()
    if (!operazioneInModifica) return
    operazioniCampoStore.save(operazioneInModifica)
    setOperazioneInModifica(null)
    refresh()
  }

  function handleEliminaOperazione(id: string) {
    if (!confirm('Eliminare questa operazione?')) return
    operazioniCampoStore.remove(id)
    refresh()
  }

  const aggregatoRothCAttivita = aggregaInputRothC(operazioni, appezzamenti, 'attivita', areaTotaleEffettiva, anniRiepilogo)
  const aggregatoRothCRiferimento = aggregaInputRothC(operazioni, appezzamenti, 'riferimento', areaTotaleEffettiva, anniRiepilogo)
  const aggregatoAzotoAttivita = aggregaAzoto(operazioni, 'attivita', anniRiepilogo)
  const aggregatoAzotoRiferimento = aggregaAzoto(operazioni, 'riferimento', anniRiepilogo)
  const n2oAttivita = calcolaN2oSuoliAgricoli({
    fsnKgAnno: aggregatoAzotoAttivita.fsnKgAnno,
    fonKgAnno: aggregatoAzotoAttivita.fonKgAnno,
    lisciviazioneApplicabile,
  })
  const n2oRiferimento = calcolaN2oSuoliAgricoli({
    fsnKgAnno: aggregatoAzotoRiferimento.fsnKgAnno,
    fonKgAnno: aggregatoAzotoRiferimento.fonKgAnno,
    lisciviazioneApplicabile,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/clienti/${clientId}`} className="text-sm text-stone-500 hover:underline">
          ← {cliente.ragioneSociale}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Quaderno di campagna</h1>
        <p className="mt-1 text-sm text-stone-500">
          Registra le operazioni reali per appezzamento e coltura (raccolte, fertilizzazioni,
          ammendanti, lavorazioni): i dati alimentano automaticamente gli apporti di carbonio per
          il simulatore RothC e un calcolo IPCC delle emissioni N2O da fertilizzazione, invece di
          stimare questi totali a occhio per l'intera azienda. Copia i valori calcolati qui sotto
          nel form del calcolo (Agricoltura e agroforestazione).
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-stone-900">Appezzamenti</h2>
        {appezzamenti.length === 0 ? (
          <p className="text-sm text-stone-500">Nessun appezzamento ancora.</p>
        ) : (
          <div className="space-y-2">
            {appezzamenti.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                  appezzamentoSelezionatoId === a.id ? 'border-forest-400 bg-forest-50' : 'border-stone-200'
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setAppezzamentoSelezionatoId(a.id)}
                >
                  <span className="font-medium text-stone-800">{a.nome}</span>{' '}
                  <span className="text-stone-500">
                    — {a.colturaPrincipale} · {a.superficieHa} ha
                  </span>
                </button>
                <button className="btn-danger" onClick={() => handleEliminaAppezzamento(a.id)}>
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAggiungiAppezzamento} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="label text-xs">Nome appezzamento *</label>
            <input
              className="input"
              required
              value={formAppezzamento.nome}
              onChange={(e) => setFormAppezzamento({ ...formAppezzamento, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="label text-xs">Superficie (ha)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={formAppezzamento.superficieHa}
              onChange={(e) => setFormAppezzamento({ ...formAppezzamento, superficieHa: num(e.target.value) })}
            />
          </div>
          <div>
            <label className="label text-xs">Coltura principale</label>
            <select
              className="input"
              value={formAppezzamento.colturaPrincipale}
              onChange={(e) => setFormAppezzamento({ ...formAppezzamento, colturaPrincipale: e.target.value })}
            >
              {COLTURE_RESIDUI.map((c) => (
                <option key={c.nome} value={c.nome}>
                  {c.nome}
                </option>
              ))}
              <option value="Altro">Altro (nome libero — apporto residui da inserire a mano)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              + Aggiungi appezzamento
            </button>
          </div>
        </form>
      </div>

      {appezzamentoSelezionato && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">
              Operazioni — {appezzamentoSelezionato.nome}
            </h2>
            <div className="flex gap-1 rounded-md bg-stone-100 p-1 text-sm">
              <button
                type="button"
                className={`rounded px-3 py-1 ${scenarioAttivo === 'attivita' ? 'bg-white font-medium shadow-sm' : 'text-stone-500'}`}
                onClick={() => setScenarioAttivo('attivita')}
              >
                Attività
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 ${scenarioAttivo === 'riferimento' ? 'bg-white font-medium shadow-sm' : 'text-stone-500'}`}
                onClick={() => setScenarioAttivo('riferimento')}
              >
                Riferimento
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-500">
            {scenarioAttivo === 'attivita'
              ? 'Operazioni effettivamente svolte durante il periodo di attività (pratiche adottate).'
              : "Operazioni storiche, precedenti all'avvio dell'attività, che rappresentano il \"continuare come prima\" (scenario di riferimento)."}
          </p>

          {operazioniAppezzamento.filter((o) => o.scenario === scenarioAttivo).length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna operazione registrata per questo scenario.</p>
          ) : (
            <div className="space-y-1">
              {operazioniAppezzamento
                .filter((o) => o.scenario === scenarioAttivo)
                .map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-stone-200 p-2 text-sm">
                    <div>
                      <span className="font-medium text-stone-700">{TIPO_LABEL[o.tipo]}</span>{' '}
                      <span className="text-stone-500">— {formatDate(o.data)}</span>
                      {o.tipo === 'raccolta' && (
                        <span className="text-stone-500"> — resa {o.resaTHaTalQuale} t/ha</span>
                      )}
                      {o.tipo === 'fertilizzazione_minerale' && (
                        <span className="text-stone-500">
                          {' '}
                          — {o.quantitaKgProdotto} kg, {o.azotoPercentoProdotto}% N
                        </span>
                      )}
                      {o.tipo === 'ammendante_organico' && (
                        <span className="text-stone-500">
                          {' '}
                          — {o.quantitaKgProdotto} kg, {o.sostanzaSeccaPercento}% SS, {o.carbonioSostanzaSeccaPercento}% C,{' '}
                          {o.azotoPercentoTalQuale}% N
                        </span>
                      )}
                      {o.tipo === 'lavorazione_terreno' && (
                        <span className="text-stone-500"> — {o.tipoLavorazione}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setOperazioneInModifica(o)}>
                        Modifica
                      </button>
                      <button className="btn-danger" onClick={() => handleEliminaOperazione(o.id)}>
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <button type="button" className="btn-primary" onClick={apriNuovaOperazione}>
            + Nuova operazione ({scenarioAttivo === 'attivita' ? 'attività' : 'riferimento'})
          </button>
        </div>
      )}

      {operazioneInModifica && (
        <form onSubmit={handleSalvaOperazione} className="card space-y-4 border-forest-300">
          <h3 className="font-semibold text-stone-900">Operazione di campo</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label text-xs">Tipo</label>
              <select
                className="input"
                value={operazioneInModifica.tipo}
                onChange={(e) =>
                  setOperazioneInModifica({ ...operazioneInModifica, tipo: e.target.value as TipoOperazioneCampo })
                }
              >
                {TIPI_OPERAZIONE.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Data</label>
              <input
                type="date"
                className="input"
                value={operazioneInModifica.data}
                onChange={(e) => setOperazioneInModifica({ ...operazioneInModifica, data: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Scenario</label>
              <select
                className="input"
                value={operazioneInModifica.scenario}
                onChange={(e) =>
                  setOperazioneInModifica({ ...operazioneInModifica, scenario: e.target.value as ScenarioOperazione })
                }
              >
                <option value="attivita">Attività</option>
                <option value="riferimento">Riferimento</option>
              </select>
            </div>

            {operazioneInModifica.tipo === 'raccolta' && (
              <>
                <div>
                  <label className="label text-xs">Resa (t/ha, tal quale)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="input"
                    value={operazioneInModifica.resaTHaTalQuale ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, resaTHaTalQuale: num(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Quota residuo restituita al suolo (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input"
                    value={operazioneInModifica.quotaResiduoRestituitaAlSuoloPercento ?? 100}
                    onChange={(e) =>
                      setOperazioneInModifica({
                        ...operazioneInModifica,
                        quotaResiduoRestituitaAlSuoloPercento: num(e.target.value),
                      })
                    }
                  />
                </div>
              </>
            )}

            {operazioneInModifica.tipo === 'fertilizzazione_minerale' && (
              <>
                <div>
                  <label className="label text-xs">Quantità prodotto (kg)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={operazioneInModifica.quantitaKgProdotto ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, quantitaKgProdotto: num(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Titolo azoto del prodotto (% N)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    className="input"
                    value={operazioneInModifica.azotoPercentoProdotto ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, azotoPercentoProdotto: num(e.target.value) })
                    }
                  />
                </div>
              </>
            )}

            {operazioneInModifica.tipo === 'ammendante_organico' && (
              <>
                <div>
                  <label className="label text-xs">Quantità tal quale (kg)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={operazioneInModifica.quantitaKgProdotto ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, quantitaKgProdotto: num(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Sostanza secca (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input"
                    value={operazioneInModifica.sostanzaSeccaPercento ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, sostanzaSeccaPercento: num(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Carbonio su sostanza secca (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input"
                    value={operazioneInModifica.carbonioSostanzaSeccaPercento ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({
                        ...operazioneInModifica,
                        carbonioSostanzaSeccaPercento: num(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Azoto sul tal quale (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    className="input"
                    value={operazioneInModifica.azotoPercentoTalQuale ?? ''}
                    onChange={(e) =>
                      setOperazioneInModifica({ ...operazioneInModifica, azotoPercentoTalQuale: num(e.target.value) })
                    }
                  />
                </div>
              </>
            )}

            {operazioneInModifica.tipo === 'lavorazione_terreno' && (
              <div>
                <label className="label text-xs">Tipo di lavorazione</label>
                <select
                  className="input"
                  value={operazioneInModifica.tipoLavorazione ?? 'convenzionale'}
                  onChange={(e) =>
                    setOperazioneInModifica({
                      ...operazioneInModifica,
                      tipoLavorazione: e.target.value as 'convenzionale' | 'ridotta' | 'no_till',
                    })
                  }
                >
                  <option value="convenzionale">Convenzionale (aratura)</option>
                  <option value="ridotta">Lavorazione ridotta/conservativa</option>
                  <option value="no_till">No-till (semina su sodo)</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-3">
              <label className="label text-xs">Note (facoltativo)</label>
              <input
                className="input"
                value={operazioneInModifica.note ?? ''}
                onChange={(e) => setOperazioneInModifica({ ...operazioneInModifica, note: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Salva operazione
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOperazioneInModifica(null)}>
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold text-stone-900">
          Riepilogo aggregato — da copiare nel form del calcolo
        </h2>
        <p className="text-sm text-stone-500">
          Imposta qui l'area totale e la durata del periodo di certificazione del calcolo per cui
          stai preparando i dati (di default: somma delle superfici degli appezzamenti e 5 anni),
          poi copia i valori calcolati sotto nel simulatore RothC e nel campo "Emissioni N2O dai
          suoli agricoli gestiti" del form Agricoltura e agroforestazione.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label text-xs">Area totale del calcolo (ha)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              placeholder={`${appezzamenti.reduce((s, a) => s + a.superficieHa, 0)}`}
              value={areaTotaleHa || ''}
              onChange={(e) => setAreaTotaleHa(num(e.target.value))}
            />
          </div>
          <div>
            <label className="label text-xs">Durata periodo di certificazione (anni)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={anniRiepilogo}
              onChange={(e) => setAnniRiepilogo(num(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                checked={lisciviazioneApplicabile}
                onChange={(e) => setLisciviazioneApplicabile(e.target.checked)}
              />
              Lisciviazione/ruscellamento applicabile (clima umido o irrigazione, Tabella 11.3 IPCC)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            { scenario: 'riferimento' as const, rothc: aggregatoRothCRiferimento, n2o: n2oRiferimento },
            { scenario: 'attivita' as const, rothc: aggregatoRothCAttivita, n2o: n2oAttivita },
          ]).map(({ scenario, rothc, n2o }) => (
            <div key={scenario} className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs">
              <p className="mb-2 font-semibold text-stone-800">
                Scenario {scenario === 'attivita' ? 'di attività' : 'di riferimento'}
              </p>
              <p className="font-medium text-stone-700">Apporto C da residui (RothC)</p>
              <p className="text-stone-500">{rothc.formulaResidui}</p>
              <p className="mt-1 font-medium text-stone-700">Apporto C da ammendanti (RothC)</p>
              <p className="text-stone-500">{rothc.formulaAmmendanti}</p>
              <p className="mt-2 font-semibold text-stone-800">
                Emissioni N2O da fertilizzazione: {formatTCO2(n2o.totaleTCO2eq)} t CO2eq/anno
              </p>
              <p className="text-stone-500">{n2o.formulaDiretto}</p>
              <p className="text-stone-500">{n2o.formulaVolatilizzazione}</p>
              <p className="text-stone-500">{n2o.formulaLisciviazione}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
