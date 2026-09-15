import { useState } from 'react'
import type { DatiCalcolo } from '../types'
import { calcolaBilancio } from '../lib/carbonEngine'
import { formatDate, formatTCO2, TIPO_ATTIVITA_LABEL } from '../lib/format'
import {
  DISCLAIMER_REPORT,
  GWP_VALORI,
  SPIEGAZIONE_CONVERSIONE_CO2EQ,
  calcolaPassaggi,
  checklistPer,
  descrizioneScenari,
  formulaBilancioNetto,
  haQuantificazione,
  introduzioneRothC,
  righeConfrontoRothC,
} from '../lib/reportSteps'

interface Props {
  nomeTitolare: string
  dati: DatiCalcolo
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v)
}

/** Anteprima del report di calcolo come contenuto nativo della pagina (non un
 * embed del PDF): l'anteprima pubblicata di quest'app viene mostrata in un
 * contesto con permessi ristretti, dove un iframe o una nuova scheda con il blob
 * del PDF possono essere bloccati indipendentemente dal codice. Questa vista
 * mostra sempre gli stessi dati/passaggi del PDF scaricabile (stessa fonte:
 * lib/reportSteps.ts), garantendo la trasparenza richiesta anche in quel
 * contesto. Per lo stesso motivo, anche il download avviato da script (doc.save()
 * di jsPDF) può essere bloccato nella stessa anteprima: resta disponibile per chi
 * ospita l'app su un dominio senza queste restrizioni, ma l'azione consigliata è
 * "Stampa / Salva come PDF" (window.print()), che passa dalla stampa nativa del
 * browser invece che da un download avviato dalla pagina — si veda index.css per
 * come viene isolato il solo contenuto del report in fase di stampa.
 *
 * Il risultato viene sempre ricalcolato da "dati" con il motore attuale (mai letto
 * da un risultato eventualmente già salvato): un calcolo creato prima
 * dell'introduzione del dettaglio dei passaggi avrebbe altrimenti un risultato
 * salvato privo di quel dettaglio, e il report lo mostrerebbe incompleto pur
 * essendo aggiornato all'ultima versione dell'app.
 */
export default function ReportPreview({ nomeTitolare, dati }: Props) {
  const [scaricando, setScaricando] = useState(false)
  const risultato = calcolaBilancio(dati)

  async function handleScaricaPdf() {
    setScaricando(true)
    try {
      const { costruisciReportCalcoloPdf } = await import('../lib/reportPdf')
      const doc = costruisciReportCalcoloPdf(nomeTitolare, dati)
      doc.save(`report-${dati.nomeCalcolo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`)
    } finally {
      setScaricando(false)
    }
  }

  const passaggi = calcolaPassaggi(dati, risultato)
  const checklist = checklistPer(dati)

  return (
    <div className="report-print-area mx-auto max-w-2xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Report di calcolo — crediti di carbonio</h2>
          <p className="mt-1 text-sm text-stone-500">
            {nomeTitolare} — {dati.nomeCalcolo}
          </p>
          <p className="text-sm text-stone-500">Metodologia: {TIPO_ATTIVITA_LABEL[dati.tipoAttivita]}</p>
          <p className="text-xs text-stone-400">
            Documento generato il {new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date())}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 print:hidden">
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              🖨️ Stampa / Salva come PDF
            </button>
            <button type="button" className="btn-secondary" disabled={scaricando} onClick={handleScaricaPdf}>
              {scaricando ? 'Generazione…' : '⬇️ Scarica PDF'}
            </button>
          </div>
          <p className="max-w-[16rem] text-right text-xs text-stone-400">
            Nell'anteprima Claude questi pulsanti possono non rispondere: funzionano una volta
            pubblicata l'app su un dominio proprio. Il report resta comunque consultabile qui sopra.
          </p>
        </div>
      </div>

      <ReportTable
        titolo="Dati generali"
        righe={[
          ['Area di attività', `${n(dati.areaAttivitaHa)} ha`],
          ['Data inizio periodo di attività', formatDate(dati.dataInizioPeriodoAttivita)],
          ['Durata periodo di certificazione', `${dati.durataPeriodoCertificazioneAnni} anni`],
        ]}
      />

      {!risultato.metodologiaDisponibile ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Per questa metodologia non esiste ancora un atto delegato dell'UE che ne stabilisca la
          metodologia di certificazione: il bilancio in t CO₂eq non è ancora calcolabile. I dati
          aziendali sono comunque registrati, pronti per quando la normativa sarà pubblicata.
        </div>
      ) : (
        <>
          {haQuantificazione(dati) && (
            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest-600 text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-2">Dati di input (quantificazione)</th>
                    <th className="px-3 py-2">Scenario di riferimento</th>
                    <th className="px-3 py-2">Scenario di attività</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="px-3 py-2 font-medium text-stone-800">Assorbimenti di carbonio (t CO2)</td>
                    <td className="px-3 py-2">{n(dati.assorbimentiRiferimentoTCO2)}</td>
                    <td className="px-3 py-2">{n(dati.assorbimentiAttivitaTCO2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-stone-800">Emissioni dal suolo — ESL (t CO2eq)</td>
                    <td className="px-3 py-2">{n(dati.emissioniSuoloRiferimentoTCO2)}</td>
                    <td className="px-3 py-2">{n(dati.emissioniSuoloAttivitaTCO2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-stone-800">
                      Emissioni agricole N2O — ESA (t CO2eq)
                    </td>
                    <td className="px-3 py-2">{n(dati.emissioniAgricoleRiferimentoTCO2)}</td>
                    <td className="px-3 py-2">{n(dati.emissioniAgricoleAttivitaTCO2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-stone-800">GES associati (t CO2eq)</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">{n(dati.gesAssociatiTCO2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {haQuantificazione(dati) && (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              <p className="mb-1 font-semibold text-stone-800">
                Come si interpretano lo scenario di riferimento e quello di attività
              </p>
              <p>{descrizioneScenari(dati)}</p>
            </div>
          )}

          {dati.tipoAttivita === 'agricoltura_agroforestazione' && dati.dettaglioRothC && (
            <div className="space-y-2">
              <div className="rounded-md border border-forest-200 bg-forest-50/40 p-4 text-sm text-stone-600">
                <p className="mb-1 font-semibold text-stone-800">
                  Dettaglio della simulazione RothC per gli assorbimenti di carbonio
                </p>
                <p>{introduzioneRothC(dati.dettaglioRothC)}</p>
              </div>
              <div className="overflow-hidden rounded-md border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-forest-600 text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2">Passaggio della simulazione</th>
                      <th className="px-3 py-2 text-right">Scenario di riferimento</th>
                      <th className="px-3 py-2 text-right">Scenario di attività</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {righeConfrontoRothC(dati.dettaglioRothC).map((riga, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-stone-800">{riga.etichetta}</td>
                        <td className="px-3 py-2 text-right">{riga.riferimento}</td>
                        <td className="px-3 py-2 text-right">{riga.attivita}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {passaggi.length > 0 && (
            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest-600 text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-2" colSpan={2}>
                      Passaggi del calcolo (equazioni 1 e 2 dell'allegato)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {passaggi.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 align-top font-medium text-stone-800">
                        {p.etichetta}
                        {p.formula && (
                          <p className="mt-0.5 font-mono text-xs font-normal text-stone-500">{p.formula}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top">{p.valore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg bg-forest-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="font-medium">Bilancio netto totale certificabile</span>
              <span className="text-xl font-bold">{n(risultato.beneficioNettoTotaleTCO2)} t CO₂eq</span>
            </div>
            <p className="mt-1 font-mono text-xs text-forest-100">{formulaBilancioNetto(dati, risultato)}</p>
          </div>

          <div className="flex items-center justify-between px-1 text-sm text-stone-600">
            <span>
              Numero di unità di credito certificabili{' '}
              <span className="text-xs text-stone-400">
                (1 unità certificata = 1 t CO₂eq; arrotondamento per difetto)
              </span>
            </span>
            <span className="text-lg font-bold text-forest-700">
              {Math.floor(risultato.beneficioNettoTotaleTCO2)} unità
            </span>
          </div>

          {risultato.deficitCreditiTCO2 > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Attenzione: risultato negativo. Deficit di {formatTCO2(risultato.deficitCreditiTCO2)} t
              CO₂eq da riportare al periodo di certificazione successivo.
            </div>
          )}

          {checklist && (
            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest-600 text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-2">Requisiti di ammissibilità e addizionalità</th>
                    <th className="px-3 py-2">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {checklist.items.map((item) => {
                    const soddisfatto = checklist.valori[item.key]
                    return (
                      <tr key={item.key}>
                        <td className="px-3 py-2">{item.label}</td>
                        <td
                          className={`px-3 py-2 font-medium ${soddisfatto ? 'text-forest-700' : 'text-amber-700'}`}
                        >
                          {soddisfatto ? 'Soddisfatto' : 'Da verificare'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="overflow-hidden rounded-md border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-forest-600 text-xs uppercase text-white">
            <tr>
              <th className="px-3 py-2" colSpan={3}>
                Conversione dei gas serra in CO₂ equivalente
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {GWP_VALORI.map((g) => (
              <tr key={g.formula}>
                <td className="px-3 py-2 font-medium text-stone-800">
                  {g.gas} ({g.formula})
                </td>
                <td className="px-3 py-2 text-right font-semibold text-forest-700">GWP = {g.gwp}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{g.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-stone-200 bg-white p-3 text-xs text-stone-600">
          {SPIEGAZIONE_CONVERSIONE_CO2EQ}
        </p>
      </div>

      <p className="border-t border-stone-200 pt-4 text-xs italic text-stone-400">{DISCLAIMER_REPORT}</p>
    </div>
  )
}

function ReportTable({
  titolo,
  righe,
  allineaDestra,
}: {
  titolo: string
  righe: [string, string][]
  allineaDestra?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-forest-600 text-xs uppercase text-white">
          <tr>
            <th className="px-3 py-2" colSpan={2}>
              {titolo}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {righe.map(([etichetta, valore], i) => (
            <tr key={i}>
              <td className="px-3 py-2 font-medium text-stone-800">{etichetta}</td>
              <td className={`px-3 py-2 ${allineaDestra ? 'text-right' : ''}`}>{valore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
