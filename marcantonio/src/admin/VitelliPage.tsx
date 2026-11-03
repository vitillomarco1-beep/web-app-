import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, FileDown, FileUp, Loader2, Syringe } from 'lucide-react'
import { creaPdf, scarica } from '../lib/pdfLista'
import { useStore } from '../lib/store'
import type { Farmaco } from '../lib/types'
import { PageHeader, StatTile, Vuoto } from '../components/ui'
import { abbinaColonne, costruisciAnimali, leggiFile } from '../lib/dairycomp'
import { aggiungiGiorni, fmt0, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { VACCINI_VITELLI, etaAl, finestra, idVacVitello, prossimoMartedi, vitelli, type VaccinoVitello, type Vitello } from '../lib/vitelli'

const farmacoDi = (farmaci: Farmaco[], v: VaccinoVitello) =>
  farmaci.find((f) => { const n = f.nome.toLowerCase().replace(/\s+/g, ' '); return v.id === 'intranasal' ? n.includes('intranasal') : (n.includes('respi 4') || n.includes('respi4')) && !n.includes('intranasal') })
const dose = (f: Farmaco, v: VaccinoVitello) => (f.unita === 'ml' ? v.doseMl : 1)

/** Vitelli: lista DairyComp e vaccinazioni del martedì mattina. */
export default function VitelliPage() {
  const { dati, imposta, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const lista = dati.vitelliDC[0]
  const [spost, setSpost] = useState(0)
  const martedi = aggiungiGiorni(prossimoMartedi(oggi), 7 * spost)
  const [dataLista, setDataLista] = useState(oggi)
  const [errore, setErrore] = useState('')
  const [copiato, setCopiato] = useState(false)
  const [pdf, setPdf] = useState<'' | 'in corso' | 'ok' | 'errore'>('')
  const input = useRef<HTMLInputElement>(null)

  const tutti = useMemo(() => vitelli(lista), [lista])
  // Il ritardo si conta solo per i martedì da quando si usa l'app (prima lista caricata)
  const inizioNum = dati.parametri.find((x) => x.id === 'inizioVitelli')?.valore
  const inizio = inizioNum ? `${String(inizioNum).slice(0, 4)}-${String(inizioNum).slice(4, 6)}-${String(inizioNum).slice(6, 8)}` : lista?.data ?? oggi
  /** Martedì in cui il vitello era nella finestra del vaccino. */
  const martediFinestra = (c: Vitello, da: number) => { const e = etaAl(c, martedi); return aggiungiGiorni(martedi, -7 * Math.ceil((e - da - 6) / 7)) }
  const fatte = new Map(dati.vaccinazioniVitelli.map((v) => [v.id, v]))
  const sezioni = VACCINI_VITELLI.map((v) => {
    const w = finestra(v)
    const daFare = tutti.filter((c) => { const e = etaAl(c, martedi); return e >= w.da && e <= w.a }).sort((a, b) => etaAl(b, martedi) - etaAl(a, martedi))
    // in ritardo: hanno superato la finestra (fino a 3 settimane) senza il vaccino segnato
    const ritardo = tutti.filter((c) => { const e = etaAl(c, martedi); return e > w.a && e <= w.a + 21 && martediFinestra(c, w.da) >= prossimoMartedi(inizio) && !fatte.has(idVacVitello(c.id, v.id)) })
    return { v, w, daFare, ritardo }
  })
  const totDaFare = sezioni.reduce((t, s) => t + s.daFare.filter((c) => !fatte.has(idVacVitello(c.id, s.v.id))).length, 0)
  const totRitardo = sezioni.reduce((t, s) => t + s.ritardo.length, 0)
  const listaVecchia = lista && lista.data < martedi && martedi <= aggiungiGiorni(oggi, 7)

  const carica = async (f: File) => {
    setErrore('')
    const file = leggiFile(await f.text())
    const m = abbinaColonne(file.intestazioni)
    if (m.id === undefined) { setErrore('Non trovo la colonna con il numero del vitello (ID).'); return }
    if (m.giorniVita === undefined && m.dataNascita === undefined) {
      setErrore(`Non trovo né i giorni di vita né la data di nascita. Colonne lette: ${file.intestazioni.join(', ')}`); return
    }
    if (!inizioNum) imposta('parametri', [...dati.parametri.filter((x) => x.id !== 'inizioVitelli'), { id: 'inizioVitelli', valore: Number(dataLista.replace(/-/g, '')) }])
    imposta('vitelliDC', [{ id: nuovoId(), data: dataLista, importatoIl: new Date().toISOString(), nomeFile: f.name, animali: costruisciAnimali(file, m) }])
    setSpost(0)
  }

  const segna = (c: Vitello, v: VaccinoVitello) => {
    const id = idVacVitello(c.id, v.id)
    const es = fatte.get(id)
    if (es) {
      elimina('vaccinazioniVitelli', id)
      const f = es.scarico && dati.farmaci.find((x) => x.id === es.scarico!.farmacoId)
      if (f) aggiorna('farmaci', { ...f, giacenza: f.giacenza + es.scarico!.quantita })
      return
    }
    const f = farmacoDi(dati.farmaci, v)
    const q = f ? dose(f, v) : 0
    aggiungi('vaccinazioniVitelli', { id, vitello: c.id, vaccino: v.id, fattaIl: martedi <= oggi ? oggi : martedi, eta: etaAl(c, martedi), ...(f ? { scarico: { farmacoId: f.id, quantita: q } } : {}) })
    if (f) aggiorna('farmaci', { ...f, giacenza: Math.round((f.giacenza - q) * 100) / 100 })
  }

  const testo = () => [`Vaccinazioni vitelli – martedì ${fmtData(martedi)}`, ...sezioni.flatMap((s) => s.daFare.length || s.ritardo.length
    ? [``, `${s.v.nome} (${s.v.via}, ${s.v.doseMl} ml) – ${s.daFare.length + s.ritardo.length} vitelli`, ...[...s.daFare, ...s.ritardo].map((c) => `${c.id}  –  ${etaAl(c, martedi)} giorni${c.gruppo !== null ? `  –  gr. ${c.gruppo}` : ''}${s.ritardo.includes(c) ? '  (in ritardo)' : ''}`)]
    : [])].join('\n')
  const scaricaPdf = async () => {
    setPdf('in corso')
    try {
      const blob = await creaPdf('Vaccinazioni vitelli', `Martedì ${fmtData(martedi)} · età calcolata al martedì · lista DairyComp del ${fmtData(lista!.data)}`,
        sezioni.map((x) => {
          const tutti = [...x.daFare, ...x.ritardo]
          return {
            titolo: `${x.v.nome}  (${tutti.length})`,
            sottotitolo: `${x.v.via} · ${x.v.doseMl} ml · vitelli di ${x.w.da}-${x.w.a} giorni (obiettivo ${x.v.obiettivo})`,
            colonne: ['Vitello', 'Età (gg)', 'Nato il', 'Gruppo', 'Note', 'Fatto'],
            righe: tutti.map((c) => [c.id, etaAl(c, martedi), fmtData(c.nascita), c.gruppo ?? '', x.ritardo.includes(c) ? 'in ritardo' : fatte.has(idVacVitello(c.id, x.v.id)) ? 'già segnato' : '', '']),
            evidenzia: tutti.map((c) => x.ritardo.includes(c)),
          }
        }),
        'Le righe in grassetto sono vitelli in ritardo (finestra del vaccino già passata). Segnare i vaccini fatti anche nell’app, sezione Vitelli e vaccini.')
      const esito = await scarica(blob, `vaccinazioni-vitelli-${martedi}.pdf`)
      setPdf(esito === 'errore' ? 'errore' : esito === 'ok' ? 'ok' : '')
    } catch { setPdf('errore') }
  }
  const copia = async () => { try { await navigator.clipboard.writeText(testo()); setCopiato(true); setTimeout(() => setCopiato(false), 2000) } catch { /* appunti non disponibili */ } }

  const caricatore = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block"><span className="label">Data della lista</span>
        <input type="date" className="input" value={dataLista} onChange={(e) => setDataLista(e.target.value)} />
      </label>
      <input ref={input} type="file" accept=".csv,.txt,.prn,text/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void carica(f); e.target.value = '' }} />
      <button className="btn-primary" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" />{lista ? 'Carica la lista nuova' : 'Carica la lista vitelli'}</button>
    </div>
  )

  const pulsante = (c: Vitello, v: VaccinoVitello) => {
    const ok = fatte.has(idVacVitello(c.id, v.id))
    return (
      <button type="button" onClick={() => segna(c, v)} aria-pressed={ok}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${ok ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-brand-400'}`}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <Syringe className="h-3.5 w-3.5" />}{ok ? 'Fatto' : 'Da fare'}
      </button>
    )
  }

  return (
    <>
      <PageHeader titolo="Vitelli e vaccini" icona={Syringe} descrizione="Vaccinazioni del martedì mattina dalla lista vitelli di DairyComp" />

      {!lista ? (
        <Vuoto>
          <p>Esporta da DairyComp la lista dei vitelli con <b>numero</b>, <b>gruppo</b> e <b>giorni di vita</b> (o data di nascita) e caricala qui, possibilmente il martedì mattina.</p>
          <div className="mt-4 flex justify-center">{caricatore}</div>
          {errore && <p className="mt-3 text-sm text-red-600">{errore}</p>}
        </Vuoto>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile icona={Syringe} tono="brand" etichetta="Da vaccinare" valore={fmt0(totDaFare)} unita="vaccini" nota={`martedì ${fmtData(martedi)}`} />
            <StatTile icona={AlertTriangle} tono="rosso" etichetta="In ritardo" valore={fmt0(totRitardo)} unita="vaccini" nota="finestra passata senza vaccino segnato" />
            {VACCINI_VITELLI.slice(0, 2).map((v, i) => {
              const f = farmacoDi(dati.farmaci, v)
              const servono = sezioni.filter((s) => (i === 0 ? s.v.id === 'intranasal' : s.v.id !== 'intranasal')).reduce((t, s) => t + s.daFare.filter((c) => !fatte.has(idVacVitello(c.id, s.v.id))).length + s.ritardo.length, 0)
              const inMag = f ? Math.max(0, Math.floor(f.giacenza / dose(f, v))) : null
              return <StatTile key={v.id} icona={Syringe} tono={inMag !== null && inMag < servono ? 'rosso' : 'verde'} etichetta={i === 0 ? 'Dosi Intranasal' : 'Dosi Respi 4'} valore={fmt0(servono)} unita="da fare"
                nota={f ? `in magazzino: ${inMag} dosi${inMag! < servono ? ' – non bastano' : ''}` : 'non è nel magazzino Farmaci'} />
            })}
          </div>

          {listaVecchia && (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-arancio-200 bg-arancio-50/60 p-4 text-sm text-arancio-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>La lista è del {fmtData(lista.data)}: i vitelli nati dopo non ci sono. Per il martedì carica la lista aggiornata quella mattina.</span>
            </div>
          )}

          {pdf === 'errore' && <p className="mt-4 text-sm text-red-600">Non sono riuscito a creare il PDF. Riprova.</p>}
          <div className="card mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2>Vaccinazioni di martedì {fmtData(martedi)}</h2>
                <p className="mt-0.5 text-sm text-stone-500">Età calcolata al martedì{spost !== 0 && <> · <button className="btn-link" onClick={() => setSpost(0)}>torna al prossimo martedì</button></>}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button className="btn-secondary px-3" aria-label="Martedì precedente" onClick={() => setSpost((s) => s - 1)}><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-secondary px-3" aria-label="Martedì successivo" onClick={() => setSpost((s) => s + 1)}><ChevronRight className="h-4 w-4" /></button>
                <button className="btn-secondary" onClick={copia}>{copiato ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiato ? 'Copiata' : 'Copia lista'}</button>
                <button className="btn-primary" onClick={scaricaPdf} disabled={pdf === 'in corso'}>{pdf === 'in corso' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Scarica PDF</button>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              {sezioni.map(({ v, w, daFare, ritardo }) => {
                const fatti = daFare.filter((c) => fatte.has(idVacVitello(c.id, v.id))).length
                const etaMedia = daFare.length ? daFare.reduce((t, c) => t + etaAl(c, martedi), 0) / daFare.length : null
                return (
                  <div key={v.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
                      <div>
                        <span className="font-semibold text-brand-900">{v.nome}</span>
                        <span className="ml-2 text-xs text-stone-500">{v.via} · {v.doseMl} ml · vitelli di {w.da}–{w.a} giorni (obiettivo {v.obiettivo})</span>
                      </div>
                      <span className="text-sm text-stone-600">{fatti}/{daFare.length} fatti{etaMedia !== null && ` · età media ${etaMedia.toLocaleString('it-IT', { maximumFractionDigits: 1 })} gg`}</span>
                    </div>
                    {daFare.length === 0 && ritardo.length === 0 ? <p className="py-2 text-sm text-stone-500">Nessun vitello.</p> : (
                      <ul className="divide-y divide-stone-100">
                        {[...daFare, ...ritardo].map((c) => {
                          const tardi = ritardo.includes(c)
                          return (
                            <li key={c.id} className={`flex items-center gap-3 py-2 ${fatte.has(idVacVitello(c.id, v.id)) ? 'bg-emerald-50/50' : ''}`}>
                              <span className="w-16 text-lg font-bold text-brand-900">{c.id}</span>
                              <span className="min-w-0 flex-1 text-sm">
                                <span className="font-medium">{etaAl(c, martedi)} giorni</span>
                                <span className="text-stone-500"> · nato il {fmtData(c.nascita)}{c.gruppo !== null && ` · gruppo ${c.gruppo}`}</span>
                                {tardi && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">in ritardo</span>}
                              </span>
                              {pulsante(c, v)}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card mt-6 space-y-3 print:hidden">
            <h2>Lista vitelli</h2>
            <p className="text-sm text-stone-600">Lista attuale: <b>{lista.nomeFile}</b> del {fmtData(lista.data)} · {tutti.length} vitelli con età</p>
            <p className="text-xs text-stone-500">Le vaccinazioni si fanno il martedì: ogni vitello capita una sola volta in ciascuna finestra di 7 giorni, quindi in media viene vaccinato all'età obiettivo (3, 15 e 35 giorni). Spuntando un vaccino, la dose viene tolta dal magazzino Farmaci se c'è un farmaco con quel nome.</p>
            {caricatore}
            {errore && <p className="text-sm text-red-600">{errore}</p>}
          </div>
        </>
      )}
    </>
  )
}
