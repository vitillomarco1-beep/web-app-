import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { MangimeSimulazione, SimulazioneZootecnia, TipologiaAllevamento } from '../../types'
import {
  INTENSITA_EMISSIVA_RIFERIMENTO,
  MANGIMI_RIFERIMENTO,
  calcolaSimulazioneZootecnia,
} from '../../lib/simulazioneZootecnia'
import { calcolaStandardizzazioneLatte } from '../../lib/standardizzazioneLatte'
import { formatTCO2 } from '../../lib/format'

/** Tipologie per cui ha senso proporre la standardizzazione del latte (produzione
 * principale — o comunque rilevante — espressa in latte). */
const TIPOLOGIE_CON_LATTE: TipologiaAllevamento[] = ['bovini_da_latte', 'ovicaprini']

interface Props {
  tipologiaAllevamento: TipologiaAllevamento
  value: SimulazioneZootecnia | undefined
  onChange: (v: SimulazioneZootecnia) => void
}

function simulazioneVuota(tipologia: TipologiaAllevamento): SimulazioneZootecnia {
  return {
    mangimi: [],
    modalitaProduzione: 'annuale',
    produzioneAnnuaTProdotto: 0,
    intensitaEmissivaTCO2eqPerTProdotto:
      INTENSITA_EMISSIVA_RIFERIMENTO[tipologia]?.defaultTCO2PerTProdotto ?? 0,
  }
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

/** Strumento di simulazione — esplicitamente non certificabile — per anticipare un
 * possibile bilancio tra assorbimento dell'alimento autoprodotto ed emissioni
 * dirette dell'allevamento (espresse per unità di prodotto: latte, carne, uova),
 * in vista di una futura normativa UE per la zootecnia che oggi non esiste ancora. */
export default function SimulazioneZootecniaTool({
  tipologiaAllevamento,
  value,
  onChange,
}: Props) {
  const [aperto, setAperto] = useState(false)
  const [apertoAnalisiLatte, setApertoAnalisiLatte] = useState(false)
  const sim = value ?? simulazioneVuota(tipologiaAllevamento)
  const modalita = sim.modalitaProduzione ?? 'annuale'
  const riferimento = INTENSITA_EMISSIVA_RIFERIMENTO[tipologiaAllevamento]
  const mostraStandardizzazioneLatte = TIPOLOGIE_CON_LATTE.includes(tipologiaAllevamento)
  const analisiLatte = sim.analisiLatte ?? {
    mediaStallaKgCapoGiorno: 0,
    numeroAnimaliMungitura: 0,
    grassoPercento: 0,
    proteinaPercento: 0,
    lattosioPercento: 0,
  }
  const risultatoStandardizzazione = calcolaStandardizzazioneLatte(analisiLatte)

  function num(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  function aggiornaAnalisiLatte(patch: Partial<typeof analisiLatte>) {
    onChange({ ...sim, analisiLatte: { ...analisiLatte, ...patch } })
  }

  function applicaStandardizzazione(valoreTAnno: number) {
    onChange({
      ...sim,
      modalitaProduzione: 'annuale',
      produzioneAnnuaTProdotto: valoreTAnno,
    })
  }

  function impostaModalitaAnnuale() {
    onChange({ ...sim, modalitaProduzione: 'annuale' })
  }

  function impostaModalitaGiornaliera() {
    const kgGiorno = sim.produzioneGiornalieraStallaKgGiorno ?? 0
    onChange({
      ...sim,
      modalitaProduzione: 'giornaliera',
      produzioneGiornalieraStallaKgGiorno: kgGiorno,
      produzioneAnnuaTProdotto: (kgGiorno * 365) / 1000,
    })
  }

  function aggiornaProduzioneGiornaliera(kgGiorno: number) {
    onChange({
      ...sim,
      produzioneGiornalieraStallaKgGiorno: kgGiorno,
      produzioneAnnuaTProdotto: (kgGiorno * 365) / 1000,
    })
  }

  function aggiungiMangime() {
    const nuovo: MangimeSimulazione = {
      id: uuidv4(),
      nomeMangime: MANGIMI_RIFERIMENTO[0].nome,
      quantitaTAnno: 0,
      autoprodotto: true,
    }
    onChange({ ...sim, mangimi: [...sim.mangimi, nuovo] })
  }

  function aggiornaMangime(id: string, patch: Partial<MangimeSimulazione>) {
    onChange({ ...sim, mangimi: sim.mangimi.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  }

  function rimuoviMangime(id: string) {
    onChange({ ...sim, mangimi: sim.mangimi.filter((m) => m.id !== id) })
  }

  const risultato = calcolaSimulazioneZootecnia(
    sim.mangimi,
    sim.produzioneAnnuaTProdotto,
    sim.intensitaEmissivaTCO2eqPerTProdotto,
  )

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setAperto((a) => !a)}
      >
        <span className="text-sm font-semibold text-amber-800">
          🧭 Simulazione bilancio alimento/emissioni (anticipazione, non certificabile)
        </span>
        <span className="text-amber-700">{aperto ? '−' : '+'}</span>
      </button>

      {aperto && (
        <div className="space-y-4 border-t border-amber-200 px-4 py-4">
          <p className="text-xs text-stone-600">
            <strong>
              Nessun atto delegato dell'UE definisce oggi una metodologia di certificazione per la
              zootecnia.
            </strong>{' '}
            Questo strumento anticipa un'ipotesi discussa in letteratura — bilanciare
            l'assorbimento di carbonio dell'alimento autoprodotto ingerito dagli animali con le
            emissioni dirette dell'allevamento, espresse per unità di prodotto (stessa logica su
            entrambi i lati) — a scopo di pianificazione. Il risultato{' '}
            <strong>non entra nel bilancio ufficiale dei crediti</strong> e non va presentato a un
            cliente come credito certificabile.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="label !mb-0 text-xs">Alimento ingerito dall'allevamento</p>
              <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={aggiungiMangime}>
                + Aggiungi alimento
              </button>
            </div>
            {sim.mangimi.length === 0 && (
              <p className="text-xs text-stone-400">Nessun alimento inserito.</p>
            )}
            {sim.mangimi.map((m) => {
              const rif = MANGIMI_RIFERIMENTO.find((r) => r.nome === m.nomeMangime)
              const isCustom = !rif
              const haAnalisiPropria =
                m.sostanzaSeccaPercento != null && m.carbonioSostanzaSeccaPercento != null
              const sostanzaSeccaDisplay =
                m.sostanzaSeccaPercento ?? (rif ? rif.frazioneSostanzaSecca * 100 : 0)
              const carbonioDisplay =
                m.carbonioSostanzaSeccaPercento ?? (rif ? rif.frazioneCarbonioSostanzaSecca * 100 : 0)

              return (
                <div key={m.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-center">
                    {isCustom ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          className="input !py-1 text-xs"
                          placeholder="Nome alimento personalizzato"
                          value={m.nomeMangime}
                          onChange={(e) => aggiornaMangime(m.id, { nomeMangime: e.target.value })}
                        />
                        <button
                          type="button"
                          title="Scegli dall'elenco"
                          className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
                          onClick={() =>
                            aggiornaMangime(m.id, {
                              nomeMangime: MANGIMI_RIFERIMENTO[0].nome,
                              sostanzaSeccaPercento: undefined,
                              carbonioSostanzaSeccaPercento: undefined,
                            })
                          }
                        >
                          ↩
                        </button>
                      </div>
                    ) : (
                      <select
                        className="input !py-1 text-xs"
                        value={m.nomeMangime}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            aggiornaMangime(m.id, {
                              nomeMangime: '',
                              sostanzaSeccaPercento: undefined,
                              carbonioSostanzaSeccaPercento: undefined,
                            })
                          } else {
                            aggiornaMangime(m.id, {
                              nomeMangime: e.target.value,
                              sostanzaSeccaPercento: undefined,
                              carbonioSostanzaSeccaPercento: undefined,
                            })
                          }
                        }}
                      >
                        {MANGIMI_RIFERIMENTO.map((r) => (
                          <option key={r.nome} value={r.nome}>
                            {r.nome}
                          </option>
                        ))}
                        <option value="__custom__">➕ Alimento personalizzato…</option>
                      </select>
                    )}
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      className="input !py-1 text-xs"
                      placeholder="t/anno"
                      value={m.quantitaTAnno}
                      onChange={(e) => aggiornaMangime(m.id, { quantitaTAnno: num(e.target.value) })}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                        checked={m.autoprodotto}
                        onChange={(e) => aggiornaMangime(m.id, { autoprodotto: e.target.checked })}
                      />
                      Autoprodotto
                    </label>
                    <button
                      type="button"
                      className="btn-danger !px-2 !py-1 text-xs"
                      onClick={() => rimuoviMangime(m.id)}
                    >
                      Rimuovi
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2 sm:grid-cols-[8rem_8rem_1fr_auto] sm:items-center">
                    <div>
                      <label className="text-[11px] text-stone-500">Sostanza secca %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        className="input !py-1 text-xs"
                        value={sostanzaSeccaDisplay}
                        onChange={(e) =>
                          aggiornaMangime(m.id, {
                            sostanzaSeccaPercento: num(e.target.value),
                            carbonioSostanzaSeccaPercento: carbonioDisplay,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-stone-500">Carbonio % s.s.</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        className="input !py-1 text-xs"
                        value={carbonioDisplay}
                        onChange={(e) =>
                          aggiornaMangime(m.id, {
                            sostanzaSeccaPercento: sostanzaSeccaDisplay,
                            carbonioSostanzaSeccaPercento: num(e.target.value),
                          })
                        }
                      />
                    </div>
                    <p className="text-[11px] text-stone-400">
                      {haAnalisiPropria
                        ? 'Valori da analisi di laboratorio specifica dell\'alimento.'
                        : rif
                          ? 'Valori indicativi di default — sostituiscili con l\'analisi di laboratorio dell\'alimento se disponibile.'
                          : 'Alimento personalizzato: inserisci sostanza secca e frazione di carbonio per calcolarne l\'assorbimento (nessun default disponibile).'}
                    </p>
                    {haAnalisiPropria && rif && (
                      <button
                        type="button"
                        className="text-left text-[11px] text-forest-700 underline"
                        onClick={() =>
                          aggiornaMangime(m.id, {
                            sostanzaSeccaPercento: undefined,
                            carbonioSostanzaSeccaPercento: undefined,
                          })
                        }
                      >
                        Ripristina default
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {risultato.righeMangimi.length > 0 && (
            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-500">
                  <tr>
                    <th className="px-2 py-1.5">Alimento</th>
                    <th className="px-2 py-1.5">Calcolo</th>
                    <th className="px-2 py-1.5 text-right">t CO2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {risultato.righeMangimi.map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 align-top font-medium text-stone-700">
                        {r.nomeMangime}
                        {!r.autoprodotto && <span className="text-stone-400"> (acquistato)</span>}
                      </td>
                      <td className="px-2 py-1.5 align-top text-stone-500">{r.formula}</td>
                      <td className="px-2 py-1.5 text-right align-top font-semibold text-stone-800">
                        {formatTCO2(r.assorbimentoTCO2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-md bg-white p-3 text-xs">
            <p className="text-stone-600">Assorbimento totale da alimento autoprodotto</p>
            <p className="mt-0.5 text-stone-500">{risultato.formulaAssorbimento}</p>
          </div>

          {mostraStandardizzazioneLatte && (
            <div className="rounded-md border border-stone-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setApertoAnalisiLatte((a) => !a)}
              >
                <span className="text-xs font-semibold text-stone-700">
                  📋 Standardizza da analisi del latte (FPCM / ECM / FCM 3,5%)
                </span>
                <span className="text-stone-500">{apertoAnalisiLatte ? '−' : '+'}</span>
              </button>
              {apertoAnalisiLatte && (
                <div className="space-y-3 border-t border-stone-200 p-3">
                  <p className="text-xs text-stone-500">
                    Inserisci la media di stalla al giorno per capo (facile da rilevare al
                    sopralluogo), il numero di animali in mungitura e i valori di grasso, proteina
                    e lattosio delle analisi periodiche (bollettino qualità latte, caseificio o
                    cooperativa): il latte viene così standardizzato per capo e poi moltiplicato
                    per il numero di animali in mungitura e per 365 giorni, per una produzione
                    annua di mandria comparabile nel tempo e tra aziende diverse.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div>
                      <label className="label !mb-1 text-xs">Media di stalla (kg/capo/giorno)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1 text-xs"
                        value={analisiLatte.mediaStallaKgCapoGiorno}
                        onChange={(e) =>
                          aggiornaAnalisiLatte({ mediaStallaKgCapoGiorno: num(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="label !mb-1 text-xs">Animali in mungitura</label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="input !py-1 text-xs"
                        value={analisiLatte.numeroAnimaliMungitura}
                        onChange={(e) =>
                          aggiornaAnalisiLatte({ numeroAnimaliMungitura: num(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="label !mb-1 text-xs">Grasso %</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1 text-xs"
                        value={analisiLatte.grassoPercento}
                        onChange={(e) => aggiornaAnalisiLatte({ grassoPercento: num(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label !mb-1 text-xs">Proteina %</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1 text-xs"
                        value={analisiLatte.proteinaPercento}
                        onChange={(e) =>
                          aggiornaAnalisiLatte({ proteinaPercento: num(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="label !mb-1 text-xs">Lattosio %</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1 text-xs"
                        value={analisiLatte.lattosioPercento}
                        onChange={(e) =>
                          aggiornaAnalisiLatte({ lattosioPercento: num(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-forest-50 p-2">
                      <div>
                        <p className="text-xs font-medium text-stone-700">
                          FPCM (4,0% grasso / 3,3% proteina — IDF){' '}
                          <span className="font-normal text-forest-700">consigliato</span>
                        </p>
                        <p className="text-xs text-stone-500">{risultatoStandardizzazione.formulaFpcm}</p>
                        <p className="text-xs text-stone-400">
                          Coerente con l'intensità emissiva di riferimento usata sotto (Tsigkas et
                          al. 2026, espressa in t CO2eq/t di FPCM).
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
                        onClick={() => applicaStandardizzazione(risultatoStandardizzazione.fpcmTAnno)}
                      >
                        Usa FPCM ({n(risultatoStandardizzazione.fpcmTAnno)} t)
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 p-2">
                      <div>
                        <p className="text-xs font-medium text-stone-700">
                          ECM (energetico — Sjaunja et al. 1990)
                        </p>
                        <p className="text-xs text-stone-500">{risultatoStandardizzazione.formulaEcm}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
                        onClick={() => applicaStandardizzazione(risultatoStandardizzazione.ecmTAnno)}
                      >
                        Usa ECM ({n(risultatoStandardizzazione.ecmTAnno)} t)
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 p-2">
                      <div>
                        <p className="text-xs font-medium text-stone-700">
                          FCM 3,5% (grasso — Gaines 1928)
                        </p>
                        <p className="text-xs text-stone-500">{risultatoStandardizzazione.formulaFcm35}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
                        onClick={() => applicaStandardizzazione(risultatoStandardizzazione.fcm35TAnno)}
                      >
                        Usa FCM 3,5% ({n(risultatoStandardizzazione.fcm35TAnno)} t)
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-stone-400">
                    "Usa ..." imposta il valore scelto come produzione annua (modalità "Dato
                    annuale") nel campo qui sotto — puoi comunque modificarlo a mano in qualsiasi
                    momento.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="label !mb-1 text-xs">
                  Produzione di {riferimento?.prodotto ?? 'prodotto principale'}
                </p>
                <div className="mb-2 flex gap-3 text-xs text-stone-600">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalitaProduzione"
                      className="h-3.5 w-3.5 border-stone-300 text-forest-600 focus:ring-forest-500"
                      checked={modalita === 'annuale'}
                      onChange={impostaModalitaAnnuale}
                    />
                    Dato annuale
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalitaProduzione"
                      className="h-3.5 w-3.5 border-stone-300 text-forest-600 focus:ring-forest-500"
                      checked={modalita === 'giornaliera'}
                      onChange={impostaModalitaGiornaliera}
                    />
                    Media di stalla al giorno del sopralluogo
                  </label>
                </div>

                {modalita === 'annuale' ? (
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="input"
                    placeholder="t/anno"
                    value={sim.produzioneAnnuaTProdotto}
                    onChange={(e) =>
                      onChange({ ...sim, produzioneAnnuaTProdotto: num(e.target.value) })
                    }
                  />
                ) : (
                  <div className="space-y-1">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="input"
                      placeholder="kg/giorno"
                      value={sim.produzioneGiornalieraStallaKgGiorno ?? 0}
                      onChange={(e) => aggiornaProduzioneGiornaliera(num(e.target.value))}
                    />
                    <p className="text-xs text-stone-400">
                      {n(sim.produzioneGiornalieraStallaKgGiorno ?? 0)} kg/giorno × 365 giorni ÷
                      1000 = {n(sim.produzioneAnnuaTProdotto)} t/anno stimate. Meno preciso di un
                      dato annuale reale (non tiene conto di stagionalità, lattazione, ecc.): usalo
                      solo se il dato annuale non è disponibile.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="label text-xs">Intensità emissiva (t CO2eq per t di prodotto)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="input"
                  value={sim.intensitaEmissivaTCO2eqPerTProdotto}
                  onChange={(e) =>
                    onChange({ ...sim, intensitaEmissivaTCO2eqPerTProdotto: num(e.target.value) })
                  }
                />
                {riferimento ? (
                  <p className="mt-1 text-xs text-stone-400">
                    Intervallo di letteratura: {formatTCO2(riferimento.rangeMinTCO2PerTProdotto)}–
                    {formatTCO2(riferimento.rangeMaxTCO2PerTProdotto)} t CO2eq/t. {riferimento.fonte}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-stone-400">
                    Nessun valore di riferimento per questa tipologia di allevamento (troppo
                    eterogenea): inserisci un valore da una fonte verificata.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-md bg-white p-3 text-xs">
              <p className="text-stone-600">Emissioni dirette totali</p>
              <p className="mt-0.5 text-stone-500">{risultato.formulaEmissioni}</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-600 p-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                Bilancio simulato (alimento autoprodotto − emissioni dirette)
              </span>
              <span className="shrink-0 text-xl font-bold">
                {formatTCO2(risultato.bilancioSimulatoTCO2)} t CO2eq
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-100">{risultato.formulaBilancio}</p>
            <p className="mt-2 text-xs font-medium text-amber-100">
              ⚠️ Simulazione non certificabile: nessuna normativa la definisce oggi.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
