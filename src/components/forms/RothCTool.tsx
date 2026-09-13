import { useState } from 'react'
import { simulaRothC, RAPPORTO_DPM_RPM_DEFAULT } from '../../lib/rothc'
import type { MeseClima, ScenarioRothCInput, RisultatoRothC } from '../../lib/rothc'
import { PROFILI_CLIMATICI } from '../../lib/climaTipico'
import { formatTCO2 } from '../../lib/format'

const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function climaVuoto(): MeseClima[] {
  return NOMI_MESI.map(() => ({ temperaturaC: 0, precipitazioniMm: 0, evaporazioneMm: 0 }))
}

function scenarioVuoto(): ScenarioRothCInput {
  return {
    apportoResiduiTCHaAnno: 0,
    apportoAmmendantiTCHaAnno: 0,
    rapportoDpmRpm: RAPPORTO_DPM_RPM_DEFAULT.seminativi,
    quotaCoperturaVegetativa: 0.8,
  }
}

interface Props {
  areaAttivitaHa: number
  durataPeriodoCertificazioneAnni: number
  onApplica: (assorbimentiAttivitaTCO2: number, assorbimentiRiferimentoTCO2: number) => void
}

export default function RothCTool({
  areaAttivitaHa,
  durataPeriodoCertificazioneAnni,
  onApplica,
}: Props) {
  const [aperto, setAperto] = useState(false)
  const [argillaPercento, setArgillaPercento] = useState(20)
  const [socInizialeTCHa, setSocInizialeTCHa] = useState(0)
  const [durataAnni, setDurataAnni] = useState(durataPeriodoCertificazioneAnni || 5)
  const [clima, setClima] = useState<MeseClima[]>(climaVuoto)
  const [profiloSelezionato, setProfiloSelezionato] = useState('')
  const [riferimento, setRiferimento] = useState<ScenarioRothCInput>(scenarioVuoto)
  const [attivita, setAttivita] = useState<ScenarioRothCInput>(scenarioVuoto)
  const [risultato, setRisultato] = useState<RisultatoRothC | null>(null)

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  function aggiornaMese(i: number, campo: keyof MeseClima, valore: number) {
    setClima((prev) => prev.map((m, idx) => (idx === i ? { ...m, [campo]: valore } : m)))
  }

  function handleCompilaClimaTipico() {
    const profilo = PROFILI_CLIMATICI.find((p) => p.nome === profiloSelezionato)
    if (!profilo) return
    setClima(profilo.climaMensile.map((m) => ({ ...m })))
  }

  function handleCalcola() {
    const r = simulaRothC({
      argillaPercento,
      socInizialeTCHa,
      durataAnni,
      climaMensile: clima,
      riferimento,
      attivita,
    })
    setRisultato(r)
  }

  function handleApplica() {
    if (!risultato) return
    // Un aumento dello stock di carbonio nel suolo (variazione positiva) corrisponde
    // a un assorbimento positivo, nella stessa convenzione di segno "intuitiva" usata
    // dai campi "Assorbimenti di carbonio" del calcolo principale.
    const arrotonda = (v: number) => Math.round(v * 100) / 100
    const assorbimentiAttivitaTCO2 = arrotonda(risultato.attivita.variazioneCO2eqTHa * areaAttivitaHa)
    const assorbimentiRiferimentoTCO2 = arrotonda(
      risultato.riferimento.variazioneCO2eqTHa * areaAttivitaHa,
    )
    onApplica(assorbimentiAttivitaTCO2, assorbimentiRiferimentoTCO2)
  }

  function ScenarioFields({
    valore,
    onChange,
  }: {
    valore: ScenarioRothCInput
    onChange: (v: ScenarioRothCInput) => void
  }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Apporto C da residui (t C/ha/anno)</label>
          <input
            type="number"
            step="0.1"
            className="input"
            value={valore.apportoResiduiTCHaAnno}
            onChange={(e) => onChange({ ...valore, apportoResiduiTCHaAnno: num(e.target.value) })}
          />
        </div>
        <div>
          <label className="label text-xs">Apporto C da ammendanti (t C/ha/anno)</label>
          <input
            type="number"
            step="0.1"
            className="input"
            value={valore.apportoAmmendantiTCHaAnno}
            onChange={(e) =>
              onChange({ ...valore, apportoAmmendantiTCHaAnno: num(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="label text-xs">Rapporto DPM/RPM dei residui</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={valore.rapportoDpmRpm}
            onChange={(e) => onChange({ ...valore, rapportoDpmRpm: num(e.target.value) })}
          />
        </div>
        <div>
          <label className="label text-xs">Copertura vegetativa media (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step="1"
            className="input"
            value={Math.round(valore.quotaCoperturaVegetativa * 100)}
            onChange={(e) =>
              onChange({ ...valore, quotaCoperturaVegetativa: num(e.target.value) / 100 })
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-forest-200 bg-forest-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <span className="text-sm font-semibold text-forest-800">
          🧪 Simulatore RothC — stima l'assorbimento di carbonio nel suolo
        </span>
        <span className="text-forest-700">{aperto ? '−' : '+'}</span>
      </button>

      {aperto && (
        <div className="space-y-5 border-t border-forest-200 px-4 py-4">
          <p className="text-xs text-stone-600">
            Il modello RothC (Rothamsted Carbon Model) simula mese per mese la
            decomposizione della sostanza organica nel suolo, in funzione di clima,
            argilla e apporti di carbonio. È tra i modelli ammessi dall'allegato
            (sez. 2.4.1.1, lett. a) per l'approccio 1 di quantificazione.{' '}
            <strong>
              Questa è una stima di supporto: i comparti organici iniziali sono
              inizializzati da proporzioni tipiche di equilibrio, non da una taratura
              specifica del sito.
            </strong>{' '}
            Per l'uso in certificazione il modello va tarato e convalidato secondo la
            sez. 2.4.1.1, lett. c) e d).
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label text-xs">Argilla nel suolo (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={argillaPercento}
                onChange={(e) => setArgillaPercento(num(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-xs">SOC iniziale misurato (t C/ha)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={socInizialeTCHa}
                onChange={(e) => setSocInizialeTCHa(num(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-xs">Durata simulazione (anni)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={durataAnni}
                onChange={(e) => setDurataAnni(num(e.target.value))}
              />
            </div>
          </div>

          <div>
            <p className="label text-xs">Clima mensile medio (comune ai due scenari)</p>
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-stone-50 p-2">
              <select
                className="input !w-auto flex-1"
                value={profiloSelezionato}
                onChange={(e) => setProfiloSelezionato(e.target.value)}
              >
                <option value="">Compila con clima tipico di una zona...</option>
                {PROFILI_CLIMATICI.map((p) => (
                  <option key={p.nome} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                disabled={!profiloSelezionato}
                onClick={handleCompilaClimaTipico}
              >
                Compila
              </button>
            </div>
            <p className="mb-2 text-xs text-stone-500">
              Valori indicativi da conoscenza climatologica generale, non misurati da una
              stazione reale: usali come punto di partenza e sostituiscili con dati verificati
              della zona specifica quando disponibili.
            </p>
            <div className="overflow-x-auto rounded-md border border-stone-200">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="bg-stone-100 text-stone-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Mese</th>
                    <th className="px-2 py-1.5 text-left">Temp. (°C)</th>
                    <th className="px-2 py-1.5 text-left">Piogge (mm)</th>
                    <th className="px-2 py-1.5 text-left">Evaporazione (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {NOMI_MESI.map((nome, i) => (
                    <tr key={nome}>
                      <td className="px-2 py-1 text-stone-600">{nome}</td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.1"
                          className="input !py-1 text-xs"
                          value={clima[i].temperaturaC}
                          onChange={(e) =>
                            aggiornaMese(i, 'temperaturaC', num(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="1"
                          className="input !py-1 text-xs"
                          value={clima[i].precipitazioniMm}
                          onChange={(e) =>
                            aggiornaMese(i, 'precipitazioniMm', num(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="1"
                          className="input !py-1 text-xs"
                          value={clima[i].evaporazioneMm}
                          onChange={(e) =>
                            aggiornaMese(i, 'evaporazioneMm', num(e.target.value))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-stone-800">Scenario di riferimento</p>
              <ScenarioFields valore={riferimento} onChange={setRiferimento} />
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-stone-800">Scenario di attività</p>
              <ScenarioFields valore={attivita} onChange={setAttivita} />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="btn-secondary" onClick={handleCalcola}>
              Calcola con RothC
            </button>
          </div>

          {risultato && (
            <div className="space-y-3 rounded-md border border-forest-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-stone-500">Scenario di riferimento</p>
                  <p className="text-sm text-stone-700">
                    SOC finale: {formatTCO2(risultato.riferimento.socFinaleTCHa)} t C/ha
                  </p>
                  <p className="text-sm font-semibold text-stone-800">
                    Variazione: {formatTCO2(risultato.riferimento.variazioneSocTCHa)} t C/ha (
                    {formatTCO2(risultato.riferimento.variazioneCO2eqTHa)} t CO₂eq/ha)
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-stone-500">Scenario di attività</p>
                  <p className="text-sm text-stone-700">
                    SOC finale: {formatTCO2(risultato.attivita.socFinaleTCHa)} t C/ha
                  </p>
                  <p className="text-sm font-semibold text-stone-800">
                    Variazione: {formatTCO2(risultato.attivita.variazioneSocTCHa)} t C/ha (
                    {formatTCO2(risultato.attivita.variazioneCO2eqTHa)} t CO₂eq/ha)
                  </p>
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Su {formatTCO2(areaAttivitaHa)} ha, l'assorbimento totale stimato è{' '}
                {formatTCO2(risultato.attivita.variazioneCO2eqTHa * areaAttivitaHa)} t CO₂
                (attività) e {formatTCO2(risultato.riferimento.variazioneCO2eqTHa * areaAttivitaHa)} t
                CO₂ (riferimento). Un aumento dello stock di carbonio corrisponde ad
                assorbimenti positivi.
              </p>
              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={handleApplica}>
                  Usa questi valori nel calcolo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
