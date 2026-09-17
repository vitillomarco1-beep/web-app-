import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { MangimeSimulazione, SimulazioneZootecnia, TipologiaAllevamento } from '../../types'
import {
  INTENSITA_EMISSIVA_RIFERIMENTO,
  MANGIMI_RIFERIMENTO,
  calcolaSimulazioneZootecnia,
  risolviSostanzaSeccaPercento,
  type MangimeRiferimento,
} from '../../lib/simulazioneZootecnia'
import { calcolaStandardizzazioneLatte } from '../../lib/standardizzazioneLatte'
import {
  GRUPPI_ANALISI_ALIMENTO,
  suggerisciCarbonioDaCeneri,
  type AnalisiAlimento,
} from '../../lib/analisiAlimenti'
import { calcolaMetanoEnterico } from '../../lib/metanoEnterico'
import {
  BO_RIFERIMENTO,
  TECNICHE_SPANDIMENTO,
  calcolaGestioneReflui,
  calcolaTdnMedioDieta,
  type TecnicaSpandimento,
} from '../../lib/gestioneReflui'
import { calcolaThiMensile, formattaThi } from '../../lib/thi'
import { SERVIZI_METEO_REGIONALI } from '../../lib/serviziMeteoRegionali'
import { formatTCO2 } from '../../lib/format'

/** Tipologie per cui ha senso proporre la standardizzazione del latte (produzione
 * principale — o comunque rilevante — espressa in latte). */
const TIPOLOGIE_CON_LATTE: TipologiaAllevamento[] = ['bovini_da_latte', 'ovicaprini']

const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function climaThiVuoto() {
  return NOMI_MESI.map(() => ({ temperaturaC: 0, umiditaRelativaPercento: 0 }))
}

interface Props {
  tipologiaAllevamento: TipologiaAllevamento
  value: SimulazioneZootecnia | undefined
  onChange: (v: SimulazioneZootecnia) => void
  /** Regione del cliente, per proporre il link al servizio agrometeorologico
   * pubblico della zona (temperatura e umidità per il THI). */
  regione?: string
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

interface AnalisiAlimentoBlockProps {
  analisi: AnalisiAlimento
  onChange: (patch: Partial<AnalisiAlimento>) => void
  /** Se assenti, non esiste un valore di riferimento (alimento personalizzato o
   * razione miscelata): niente "Ripristina default", e il messaggio lo dice
   * esplicitamente invece di lasciare 0 senza spiegazione. */
  defaultSostanzaSeccaPercento?: number
  defaultCarbonioPercento?: number
  /** A cosa servono sostanza secca/carbonio in questo contesto (cambia solo il
   * testo esplicativo): per riga di alimento è l'assorbimento di CO2, per la
   * razione miscelata è la stima del metano enterico. */
  usoLabel?: string
}

/** Sostanza secca/carbonio (che guidano il calcolo indicato da usoLabel) e,
 * facoltativamente, l'intera analisi di laboratorio del referto (proteine,
 * fibra, grassi, minerali, energia, fermentazione, digeribilità nel tempo) —
 * raccolta per completezza del fascicolo anche dove oggi non entra in un
 * calcolo, così da non doverci tornare sopra quando cambierà la normativa.
 * Riusato sia per la riga di un singolo alimento sia per un'unica razione
 * miscelata completa (TMR). */
function AnalisiAlimentoBlock({
  analisi,
  onChange,
  defaultSostanzaSeccaPercento,
  defaultCarbonioPercento,
  usoLabel = "calcolarne l'assorbimento",
}: AnalisiAlimentoBlockProps) {
  const [apertoAnalisiCompleta, setApertoAnalisiCompleta] = useState(false)
  const haRiferimento = defaultSostanzaSeccaPercento != null
  const haAnalisiPropria =
    analisi.sostanzaSeccaPercento != null && analisi.carbonioSostanzaSeccaPercento != null
  const sostanzaSeccaDisplay = analisi.sostanzaSeccaPercento ?? defaultSostanzaSeccaPercento ?? 0
  const carbonioDisplay = analisi.carbonioSostanzaSeccaPercento ?? defaultCarbonioPercento ?? 0
  const suggerimentoCeneri =
    analisi.ceneriPercento != null ? suggerisciCarbonioDaCeneri(analisi.ceneriPercento) : undefined

  function num(v: string): number {
    const parsed = parseFloat(v)
    return isNaN(parsed) ? 0 : parsed
  }

  return (
    <>
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
              onChange({ sostanzaSeccaPercento: num(e.target.value), carbonioSostanzaSeccaPercento: carbonioDisplay })
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
              onChange({ sostanzaSeccaPercento: sostanzaSeccaDisplay, carbonioSostanzaSeccaPercento: num(e.target.value) })
            }
          />
        </div>
        <p className="text-[11px] text-stone-400">
          {haAnalisiPropria
            ? 'Valori da analisi di laboratorio specifica.'
            : haRiferimento
              ? "Valori indicativi di default — sostituiscili con l'analisi di laboratorio se disponibile."
              : `Nessun valore di riferimento: inserisci sostanza secca e frazione di carbonio per ${usoLabel}.`}
        </p>
        {haAnalisiPropria && haRiferimento && (
          <button
            type="button"
            className="text-left text-[11px] text-forest-700 underline"
            onClick={() => onChange({ sostanzaSeccaPercento: undefined, carbonioSostanzaSeccaPercento: undefined })}
          >
            Ripristina default
          </button>
        )}
      </div>

      <div className="border-t border-stone-100 pt-2">
        <button
          type="button"
          className="text-[11px] font-medium text-stone-500 underline"
          onClick={() => setApertoAnalisiCompleta((a) => !a)}
        >
          🧪 {apertoAnalisiCompleta ? 'Nascondi' : 'Inserisci'} analisi di laboratorio completa
          (facoltativa)
        </button>
        {apertoAnalisiCompleta && (
          <div className="mt-2 space-y-3">
            <p className="text-[11px] text-stone-400">
              Dal referto di laboratorio (fieno, insilato, granella, razione miscelata…): tutti i
              valori sono sulla sostanza secca salvo dove indicato. Solo sostanza secca e carbonio
              (sopra) entrano nei calcoli oggi — il resto è raccolto per completezza del fascicolo,
              utile anche se una futura normativa si baserà su altri parametri di questo referto
              (es. NDF per il metano enterico, già usato più sotto).
            </p>
            <div>
              <label className="text-[11px] text-stone-500">Umidità (% tal quale)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                className="input !py-1 w-32 text-xs"
                value={analisi.umiditaPercento ?? 0}
                onChange={(e) => onChange({ umiditaPercento: num(e.target.value) })}
              />
            </div>
            {GRUPPI_ANALISI_ALIMENTO.map((gruppo) => (
              <div key={gruppo.titolo}>
                <p className="text-[11px] font-medium text-stone-600">{gruppo.titolo}</p>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {gruppo.campi.map((campo) => (
                    <div key={campo.key}>
                      <label className="text-[11px] text-stone-500">
                        {campo.label} <span className="text-stone-400">({campo.unita})</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input !py-1 text-xs"
                        value={analisi[campo.key] ?? 0}
                        onChange={(e) => onChange({ [campo.key]: num(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
                {gruppo.titolo.startsWith('Minerali') && (
                  <div className="mt-1">
                    {suggerimentoCeneri ? (
                      <div className="flex flex-wrap items-center gap-2 rounded bg-forest-50 px-2 py-1">
                        <p className="text-[11px] text-stone-500">
                          Carbonio da ceneri: {suggerimentoCeneri.formula}
                        </p>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-forest-700 underline"
                          onClick={() =>
                            onChange({
                              sostanzaSeccaPercento: sostanzaSeccaDisplay,
                              carbonioSostanzaSeccaPercento: suggerimentoCeneri.valore,
                            })
                          }
                        >
                          Usa questo valore
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400">
                        Inserisci le ceneri (% s.s.) per una stima più precisa del carbonio, basata
                        sulla sola sostanza organica invece del default fisso.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

interface RigaMangimeProps {
  mangime: MangimeSimulazione
  onUpdate: (patch: Partial<MangimeSimulazione>) => void
  onRemove: () => void
}

/** Una riga di alimento: nome (dall'elenco o personalizzato), quantità, e il
 * blocco di analisi (sostanza secca/carbonio + laboratorio completo). */
function RigaMangime({ mangime: m, onUpdate, onRemove }: RigaMangimeProps) {
  const rif: MangimeRiferimento | undefined = MANGIMI_RIFERIMENTO.find((r) => r.nome === m.nomeMangime)
  const isCustom = !rif
  const analisi = m.analisiAlimento ?? {}

  function num(v: string): number {
    const parsed = parseFloat(v)
    return isNaN(parsed) ? 0 : parsed
  }

  return (
    <div className="space-y-2 rounded-md border border-stone-200 bg-white p-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-center">
        {isCustom ? (
          <div className="flex gap-1">
            <input
              type="text"
              className="input !py-1 text-xs"
              placeholder="Nome alimento personalizzato"
              value={m.nomeMangime}
              onChange={(e) => onUpdate({ nomeMangime: e.target.value })}
            />
            <button
              type="button"
              title="Scegli dall'elenco"
              className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
              onClick={() =>
                onUpdate({ nomeMangime: MANGIMI_RIFERIMENTO[0].nome, analisiAlimento: undefined })
              }
            >
              ↩
            </button>
          </div>
        ) : (
          <select
            className="input !py-1 text-xs"
            value={m.nomeMangime}
            onChange={(e) =>
              onUpdate({
                nomeMangime: e.target.value === '__custom__' ? '' : e.target.value,
                analisiAlimento: undefined,
              })
            }
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
          onChange={(e) => onUpdate({ quantitaTAnno: num(e.target.value) })}
        />
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
            checked={m.autoprodotto}
            onChange={(e) => onUpdate({ autoprodotto: e.target.checked })}
          />
          Autoprodotto
        </label>
        <button type="button" className="btn-danger !px-2 !py-1 text-xs" onClick={onRemove}>
          Rimuovi
        </button>
      </div>

      <AnalisiAlimentoBlock
        analisi={analisi}
        onChange={(patch) => onUpdate({ analisiAlimento: { ...analisi, ...patch } })}
        defaultSostanzaSeccaPercento={rif ? rif.frazioneSostanzaSecca * 100 : undefined}
        defaultCarbonioPercento={rif ? rif.frazioneCarbonioSostanzaSecca * 100 : undefined}
        usoLabel="calcolarne l'assorbimento"
      />
    </div>
  )
}

/** Strumento di simulazione — esplicitamente non certificabile — per anticipare un
 * possibile bilancio tra assorbimento dell'alimento autoprodotto ed emissioni
 * dirette dell'allevamento (espresse per unità di prodotto: latte, carne, uova),
 * in vista di una futura normativa UE per la zootecnia che oggi non esiste ancora. */
export default function SimulazioneZootecniaTool({
  tipologiaAllevamento,
  value,
  onChange,
  regione,
}: Props) {
  const [aperto, setAperto] = useState(false)
  const [apertoAnalisiLatte, setApertoAnalisiLatte] = useState(false)
  const [apertoMetano, setApertoMetano] = useState(false)
  const [apertoReflui, setApertoReflui] = useState(false)
  const [apertoThi, setApertoThi] = useState(false)
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

  const modalitaMetano = sim.modalitaMetano ?? 'daAlimenti'
  const razioneMiscelata = sim.razioneMiscelata ?? { quantitaTAnno: 0, analisiAlimento: {} }
  const analisiRazioneMiscelata = razioneMiscelata.analisiAlimento ?? {}

  const righeDieta =
    modalitaMetano === 'daRazioneMiscelata'
      ? [
          {
            nomeMangime: 'Razione miscelata (TMR)',
            quantitaTAnno: razioneMiscelata.quantitaTAnno,
            sostanzaSeccaPercento: analisiRazioneMiscelata.sostanzaSeccaPercento ?? 0,
            andfomPercento: analisiRazioneMiscelata.andfomPercento,
            tdnPercento: analisiRazioneMiscelata.tdnPercento,
          },
        ]
      : sim.mangimi.map((m) => ({
          nomeMangime: m.nomeMangime,
          quantitaTAnno: m.quantitaTAnno,
          sostanzaSeccaPercento: risolviSostanzaSeccaPercento(m.nomeMangime, m.analisiAlimento),
          andfomPercento: m.analisiAlimento?.andfomPercento,
          tdnPercento: m.analisiAlimento?.tdnPercento,
        }))

  const risultatoMetano = calcolaMetanoEnterico(righeDieta, sim.ymMetanoEntericoPercento)
  const risultatoTdn = calcolaTdnMedioDieta(righeDieta)

  function aggiornaRazioneMiscelata(patch: Partial<typeof razioneMiscelata>) {
    onChange({ ...sim, razioneMiscelata: { ...razioneMiscelata, ...patch } })
  }

  const gestioneReflui = sim.gestioneReflui ?? {
    sistemaStoccaggio: 'liquido' as const,
    durataStoccaggioMesi: 6,
    fasciaClimatica: 'temperata' as const,
    crostaNaturale: false,
    azotoEscretoKgAnno: 0,
    tecnicaSpandimento: 'spaglio' as const,
  }
  const boRiferimento = BO_RIFERIMENTO[tipologiaAllevamento]
  const digeribilitaPercento =
    gestioneReflui.digeribilitaManualePercento ?? risultatoTdn.tdnPercento ?? 0
  const boUsato = gestioneReflui.boManualeM3PerKgVs ?? boRiferimento?.valore ?? 0
  const risultatoReflui = calcolaGestioneReflui({
    geiMJAnno: risultatoMetano.geiMJAnno,
    digeribilitaPercento,
    boM3PerKgVs: boUsato,
    fonteBo: boRiferimento?.fonte ?? null,
    sistemaStoccaggio: gestioneReflui.sistemaStoccaggio,
    durataStoccaggioMesi: gestioneReflui.durataStoccaggioMesi,
    fasciaClimatica: gestioneReflui.fasciaClimatica,
    crostaNaturale: gestioneReflui.crostaNaturale,
    azotoEscretoKgAnno: gestioneReflui.azotoEscretoKgAnno,
    tecnicaSpandimento: gestioneReflui.tecnicaSpandimento,
    mcfManualePercento: gestioneReflui.mcfManualePercento,
    fracGasmManualePercento: gestioneReflui.fracGasmManualePercento,
  })

  function aggiornaGestioneReflui(patch: Partial<typeof gestioneReflui>) {
    onChange({ ...sim, gestioneReflui: { ...gestioneReflui, ...patch } })
  }

  const climaThiMensile = sim.climaThiMensile ?? climaThiVuoto()
  const risultatoThi = calcolaThiMensile(climaThiMensile)

  function aggiornaMeseThi(i: number, patch: Partial<{ temperaturaC: number; umiditaRelativaPercento: number }>) {
    onChange({
      ...sim,
      climaThiMensile: climaThiMensile.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    })
  }

  function aggiornaAnalisiRazioneMiscelata(patch: Partial<AnalisiAlimento>) {
    aggiornaRazioneMiscelata({ analisiAlimento: { ...analisiRazioneMiscelata, ...patch } })
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
            {sim.mangimi.map((m) => (
              <RigaMangime
                key={m.id}
                mangime={m}
                onUpdate={(patch) => aggiornaMangime(m.id, patch)}
                onRemove={() => rimuoviMangime(m.id)}
              />
            ))}
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

          <div className="rounded-md border border-stone-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              onClick={() => setApertoMetano((a) => !a)}
            >
              <span className="text-xs font-semibold text-stone-700">
                🐄💨 Stima metano enterico dalla razione (IPCC Tier 2 — approfondimento)
              </span>
              <span className="text-stone-500">{apertoMetano ? '−' : '+'}</span>
            </button>
            {apertoMetano && (
              <div className="space-y-3 border-t border-stone-200 p-3 text-xs">
                <p className="text-stone-500">
                  Al variare della fibra (NDF) della razione variano le emissioni di metano in
                  fermentazione ruminale: questa stima usa l'NDF (aNDFom) inserito nell'analisi di
                  laboratorio di ciascun alimento (sopra) per stimare il metano enterico con il
                  metodo Tier 2 IPCC. Copre <strong>solo il metano enterico</strong>, non l'intera
                  intensità emissiva usata nel bilancio (che da letteratura include anche gestione
                  reflui ed emissioni a monte della produzione dell'alimento): resta un
                  approfondimento parziale, <strong>non entra nel bilancio simulato</strong> qui
                  sotto.
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] text-stone-600">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalitaMetano"
                      className="h-3.5 w-3.5 border-stone-300 text-forest-600 focus:ring-forest-500"
                      checked={modalitaMetano === 'daAlimenti'}
                      onChange={() => onChange({ ...sim, modalitaMetano: 'daAlimenti' })}
                    />
                    Da singoli alimenti (sopra)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalitaMetano"
                      className="h-3.5 w-3.5 border-stone-300 text-forest-600 focus:ring-forest-500"
                      checked={modalitaMetano === 'daRazioneMiscelata'}
                      onChange={() => onChange({ ...sim, modalitaMetano: 'daRazioneMiscelata' })}
                    />
                    Da analisi della razione miscelata completa (TMR)
                  </label>
                </div>

                {modalitaMetano === 'daRazioneMiscelata' ? (
                  <div className="space-y-2 rounded-md border border-stone-200 bg-white p-2">
                    <p className="text-[11px] text-stone-400">
                      Un campione della razione unifeed già miscelata ha lo stesso referto di
                      laboratorio di un singolo alimento (sostanza secca, NDF, proteine, minerali,
                      energia…): inseriscilo qui per intero, non solo l'NDF, così i dati sono pronti
                      qualunque parametro finisca per richiedere la normativa futura.
                    </p>
                    <div>
                      <label className="text-[11px] text-stone-500">
                        Razione distribuita alla mandria (t/anno, tal quale)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input !py-1 w-48 text-xs"
                        value={razioneMiscelata.quantitaTAnno}
                        onChange={(e) => aggiornaRazioneMiscelata({ quantitaTAnno: num(e.target.value) })}
                      />
                    </div>
                    <AnalisiAlimentoBlock
                      analisi={analisiRazioneMiscelata}
                      onChange={aggiornaAnalisiRazioneMiscelata}
                      usoLabel="stimare il metano enterico"
                    />
                  </div>
                ) : (
                  <div className="rounded-md bg-stone-50 p-2">
                    <p className="text-stone-600">NDF medio della razione (pesato sulla sostanza secca)</p>
                    <p className="mt-0.5 text-stone-500">{risultatoMetano.formulaNdf}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-end">
                  <div className="rounded-md bg-stone-50 p-2">
                    <p className="text-stone-600">Fattore di conversione del metano (Ym)</p>
                    <p className="mt-0.5 text-stone-500">{risultatoMetano.formulaYm}</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500">
                      Ym manuale (%) — lascia vuoto per il calcolo automatico da NDF
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        className="input !py-1 text-xs"
                        placeholder="automatico"
                        value={sim.ymMetanoEntericoPercento ?? ''}
                        onChange={(e) =>
                          onChange({
                            ...sim,
                            ymMetanoEntericoPercento: e.target.value === '' ? undefined : num(e.target.value),
                          })
                        }
                      />
                      {sim.ymMetanoEntericoPercento != null && (
                        <button
                          type="button"
                          className="btn-secondary !px-2 !py-1 shrink-0 text-xs"
                          onClick={() => onChange({ ...sim, ymMetanoEntericoPercento: undefined })}
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      Per diete da ingrasso ad alto concentrato (≥90% concentrato) la letteratura
                      indica Ym ≈ 3,0%: inseriscilo qui a mano, non è riconosciuto automaticamente.
                    </p>
                  </div>
                </div>
                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Ingestione di energia lorda (GEI)</p>
                  <p className="mt-0.5 text-stone-500">{risultatoMetano.formulaGei}</p>
                </div>
                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Metano enterico stimato</p>
                  <p className="mt-0.5 text-stone-500">{risultatoMetano.formulaCh4}</p>
                </div>
                <div className="rounded-md bg-forest-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-stone-700">In CO2 equivalente (GWP CH4)</p>
                    <span className="font-semibold text-stone-800">
                      {formatTCO2(risultatoMetano.ch4TCO2eq)} t CO2eq
                    </span>
                  </div>
                  <p className="mt-0.5 text-stone-500">{risultatoMetano.formulaCh4CO2eq}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-stone-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              onClick={() => setApertoReflui((a) => !a)}
            >
              <span className="text-xs font-semibold text-stone-700">
                💧 Gestione reflui — emissioni da stoccaggio e spandimento (IPCC Tier 2 — approfondimento)
              </span>
              <span className="text-stone-500">{apertoReflui ? '−' : '+'}</span>
            </button>
            {apertoReflui && (
              <div className="space-y-3 border-t border-stone-200 p-3 text-xs">
                <p className="text-stone-500">
                  Stima il metano e il protossido di azoto (diretto in stoccaggio, indiretto da
                  volatilizzazione allo spandimento) dei reflui zootecnici, con il metodo Tier 2
                  IPCC. Riusa l'energia lorda ingerita già calcolata per il metano enterico (sopra).
                  Copre <strong>solo stoccaggio e spandimento</strong>, non la lisciviazione: resta
                  un approfondimento parziale, <strong>non entra nel bilancio simulato</strong> qui
                  sotto.
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] text-stone-500">Sistema di stoccaggio</label>
                    <select
                      className="input !py-1 text-xs"
                      value={gestioneReflui.sistemaStoccaggio}
                      onChange={(e) =>
                        aggiornaGestioneReflui({
                          sistemaStoccaggio: e.target.value as 'liquido' | 'solido',
                        })
                      }
                    >
                      <option value="liquido">Liquido (vasca/lagone)</option>
                      <option value="solido">Solido (letame palabile)</option>
                    </select>
                  </div>
                  {gestioneReflui.sistemaStoccaggio === 'liquido' && (
                    <>
                      <div>
                        <label className="text-[11px] text-stone-500">
                          Durata media di stoccaggio (mesi)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          className="input !py-1 text-xs"
                          value={gestioneReflui.durataStoccaggioMesi}
                          onChange={(e) =>
                            aggiornaGestioneReflui({ durataStoccaggioMesi: num(e.target.value) })
                          }
                        />
                        <p className="mt-1 text-[11px] text-stone-400">
                          Nelle zone vulnerabili ai nitrati lo spandimento è vietato nei mesi
                          invernali (Direttiva Nitrati): la permanenza reale in vasca è spesso più
                          lunga del minimo tecnico — inserisci il valore realistico del cliente.
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] text-stone-500">Fascia climatica media annua</label>
                        <select
                          className="input !py-1 text-xs"
                          value={gestioneReflui.fasciaClimatica}
                          onChange={(e) =>
                            aggiornaGestioneReflui({
                              fasciaClimatica: e.target.value as 'fredda' | 'temperata' | 'calda',
                            })
                          }
                        >
                          <option value="fredda">Fredda (≤15°C)</option>
                          <option value="temperata">Temperata (15-25°C)</option>
                          <option value="calda">Calda (&gt;25°C)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] text-stone-600">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                          checked={gestioneReflui.crostaNaturale}
                          onChange={(e) => aggiornaGestioneReflui({ crostaNaturale: e.target.checked })}
                        />
                        Si forma una crosta naturale in superficie
                      </label>
                    </>
                  )}
                </div>

                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Digeribilità della razione (DE%, da TDN medio)</p>
                  <p className="mt-0.5 text-stone-500">
                    {risultatoTdn.tdnPercento != null
                      ? risultatoTdn.formula
                      : "Nessun valore di TDN inserito nell'analisi degli alimenti: inseriscilo manualmente qui sotto."}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      className="input !py-1 w-32 text-xs"
                      placeholder="manuale"
                      value={gestioneReflui.digeribilitaManualePercento ?? ''}
                      onChange={(e) =>
                        aggiornaGestioneReflui({
                          digeribilitaManualePercento: e.target.value === '' ? undefined : num(e.target.value),
                        })
                      }
                    />
                    <span className="text-[11px] text-stone-400">
                      % — lascia vuoto per usare il TDN medio della dieta
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-md bg-stone-50 p-2">
                    <p className="text-stone-600">Capacità massima di produzione (Bo)</p>
                    <p className="mt-0.5 text-stone-500">
                      {boRiferimento
                        ? `${n(boRiferimento.valore)} m³ CH4/kg VS — ${boRiferimento.fonte}`
                        : 'Nessun valore di riferimento per questa tipologia: inseriscilo a mano da fonte verificata.'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500">
                      Bo manuale (m³/kg VS) — lascia vuoto per usare il riferimento
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input !py-1 text-xs"
                      placeholder={boRiferimento ? String(boRiferimento.valore) : 'obbligatorio'}
                      value={gestioneReflui.boManualeM3PerKgVs ?? ''}
                      onChange={(e) =>
                        aggiornaGestioneReflui({
                          boManualeM3PerKgVs: e.target.value === '' ? undefined : num(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Sostanza volatile escreta (VS)</p>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaVs}</p>
                </div>
                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Fattore di conversione del metano (MCF)</p>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaMcf}</p>
                </div>
                <div className="rounded-md bg-forest-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-stone-700">Metano da stoccaggio, in CO2 equivalente</p>
                    <span className="font-semibold text-stone-800">
                      {formatTCO2(risultatoReflui.ch4TCO2eq)} t CO2eq
                    </span>
                  </div>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaCh4}</p>
                </div>

                <div>
                  <label className="text-[11px] text-stone-500">Azoto escreto dalla mandria (kg N/anno)</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    className="input !py-1 w-40 text-xs"
                    value={gestioneReflui.azotoEscretoKgAnno}
                    onChange={(e) => aggiornaGestioneReflui({ azotoEscretoKgAnno: num(e.target.value) })}
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    Spesso già disponibile dal Piano di Utilizzazione Agronomica (PUA), se il
                    cliente è in zona vulnerabile ai nitrati.
                  </p>
                </div>
                <div className="rounded-md bg-forest-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-stone-700">N2O diretto da stoccaggio (EF3 = {risultatoReflui.ef3})</p>
                    <span className="font-semibold text-stone-800">
                      {formatTCO2(risultatoReflui.n2oDirettoTCO2eq)} t CO2eq
                    </span>
                  </div>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaN2oDiretto}</p>
                </div>

                <div>
                  <label className="text-[11px] text-stone-500">Tecnica di spandimento in campo</label>
                  <select
                    className="input !py-1 text-xs"
                    value={gestioneReflui.tecnicaSpandimento}
                    onChange={(e) =>
                      aggiornaGestioneReflui({ tecnicaSpandimento: e.target.value as TecnicaSpandimento })
                    }
                  >
                    {(Object.keys(TECNICHE_SPANDIMENTO) as TecnicaSpandimento[]).map((k) => (
                      <option key={k} value={k}>
                        {TECNICHE_SPANDIMENTO[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Azoto volatilizzato allo spandimento (FracGASM)</p>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaFracGasm}</p>
                </div>
                <div className="rounded-md bg-forest-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-stone-700">N2O indiretto da spandimento (EF4 = 0,01)</p>
                    <span className="font-semibold text-stone-800">
                      {formatTCO2(risultatoReflui.n2oIndirettoTCO2eq)} t CO2eq
                    </span>
                  </div>
                  <p className="mt-0.5 text-stone-500">{risultatoReflui.formulaN2oIndiretto}</p>
                </div>

                <div className="rounded-lg bg-amber-600 p-3 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Totale reflui (stoccaggio + spandimento)</span>
                    <span className="shrink-0 text-lg font-bold">
                      {formatTCO2(risultatoReflui.totaleTCO2eq)} t CO2eq
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-100">{risultatoReflui.formulaTotale}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-stone-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              onClick={() => setApertoThi((a) => !a)}
            >
              <span className="text-xs font-semibold text-stone-700">
                🌡️ Indice di stress da caldo (THI) — approfondimento
              </span>
              <span className="text-stone-500">{apertoThi ? '−' : '+'}</span>
            </button>
            {apertoThi && (
              <div className="space-y-3 border-t border-stone-200 p-3 text-xs">
                <p className="text-stone-500">
                  Lo stress da caldo riduce la produttività: a parità di emissioni di metano
                  enterico, l'intensità emissiva per unità di prodotto sale. Il THI (Temperature-
                  Humidity Index) segnala i mesi a rischio da temperatura e umidità media dell'aria
                  (soglie NRC 1971). Resta un approfondimento informativo,{' '}
                  <strong>non entra nel bilancio simulato</strong>.
                </p>

                {regione && SERVIZI_METEO_REGIONALI[regione] && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-forest-200 bg-forest-50 px-3 py-2">
                    <span className="text-stone-600">
                      📍 Temperatura e umidità storiche pubbliche per <strong>{regione}</strong>:{' '}
                      {SERVIZI_METEO_REGIONALI[regione].ente}.
                    </span>
                    <a
                      href={SERVIZI_METEO_REGIONALI[regione].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary !px-2 !py-1 shrink-0"
                    >
                      Apri il portale ↗
                    </a>
                  </div>
                )}

                <div className="overflow-x-auto rounded-md border border-stone-200">
                  <table className="w-full min-w-[420px] text-xs">
                    <thead className="bg-stone-100 text-stone-500">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Mese</th>
                        <th className="px-2 py-1.5 text-left">Temp. (°C)</th>
                        <th className="px-2 py-1.5 text-left">Umidità rel. (%)</th>
                        <th className="px-2 py-1.5 text-left">THI</th>
                        <th className="px-2 py-1.5 text-left">Livello</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {NOMI_MESI.map((nome, i) => {
                        const riga = risultatoThi.righe[i]
                        const coloriLivello = [
                          'text-stone-500',
                          'text-amber-600',
                          'text-amber-700 font-medium',
                          'text-red-600 font-medium',
                          'text-red-700 font-semibold',
                        ]
                        return (
                          <tr key={nome}>
                            <td className="px-2 py-1 text-stone-600">{nome}</td>
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                step="0.1"
                                className="input !py-1 text-xs"
                                value={climaThiMensile[i].temperaturaC}
                                onChange={(e) => aggiornaMeseThi(i, { temperaturaC: num(e.target.value) })}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                className="input !py-1 text-xs"
                                value={climaThiMensile[i].umiditaRelativaPercento}
                                onChange={(e) =>
                                  aggiornaMeseThi(i, { umiditaRelativaPercento: num(e.target.value) })
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-stone-700">{formattaThi(riga.thi)}</td>
                            <td className={`px-2 py-1 ${coloriLivello[riga.categoria.livello]}`}>
                              {riga.categoria.etichetta}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-md bg-stone-50 p-2">
                  <p className="text-stone-600">Riepilogo</p>
                  <p className="mt-0.5 text-stone-500">{risultatoThi.formulaRiepilogo}</p>
                </div>
              </div>
            )}
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
