import { useMemo, useRef, useState } from 'react'
import { Baby, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, FileDown, FileUp, Loader2, Syringe } from 'lucide-react'
import { creaPdf, scarica } from '../lib/pdfLista'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, Vuoto } from '../components/ui'
import { abbinaColonne, costruisciAnimali, isCloseUp, leggiFile } from '../lib/dairycomp'
import { aggiungiGiorni, fmt0, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { ASCIUTTA_GG_A, ASCIUTTA_GG_DA, asciutteDellaSettimana, SETTIMANE_ANTICIPO, VACCINI_PREPARTO, categoriaParto, doseInUnita, farmacoDelVaccino, idVaccinazione, nellaSettimana, partiPrevisti, settimanaVaccinazioni, vaccinataTutto, type PartoPrevisto, type VaccinoPreparto } from '../lib/parti'

const giornoSett = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short' })
}
const breve = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

/** Parti previsti da DairyComp e lista settimanale delle vacche da vaccinare prima del parto. */
export default function PartiPage() {
  const { dati, imposta, aggiungi, aggiorna, elimina } = useStore()
  const oggi = isoGiorno()
  const lista = dati.partiDC[0]
  const anticipo = dati.parametri.find((p) => p.id === 'anticipoVaccini')?.valore ?? SETTIMANE_ANTICIPO
  const [spostamento, setSpostamento] = useState(0)
  const [dataLista, setDataLista] = useState(oggi)
  const [errore, setErrore] = useState('')
  const [copiato, setCopiato] = useState(false)
  const [pdf, setPdf] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Il gruppo, se manca nella lista parti, viene preso dall'ultima lista Mandria di DairyComp
  const mandria = dati.mandriaDC[0]
  const parti = useMemo(() => {
    const gruppi = new Map((mandria?.animali ?? []).map((a) => [a.id, a.gruppo]))
    return partiPrevisti(lista, oggi).map((p) => (p.gruppo === null && gruppi.has(p.vacca) ? { ...p, gruppo: gruppi.get(p.vacca) ?? null } : p))
  }, [lista, oggi, mandria])
  const nomeGr = (g: number | null) => (g === null ? null : isCloseUp(g) ? `gruppo ${g} · close up` : `gruppo ${g}`)
  const etichettaGr = (g: number | null) =>
    g === null ? '—' : isCloseUp(g)
      ? <span className="inline-flex items-center gap-1"><span>{g}</span><span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">close up</span></span>
      : g
  const sett = settimanaVaccinazioni(oggi, anticipo, spostamento)
  const daVaccinare = parti.filter((p) => nellaSettimana(p, sett))
  const fatte = new Set(dati.vaccinazioni.map((v) => v.id))
  const mancano = daVaccinare.filter((p) => !vaccinataTutto(p, fatte)).length
  const scorte = VACCINI_PREPARTO.map((v) => {
    const f = farmacoDelVaccino(dati.farmaci, v)
    const servono = daVaccinare.filter((p) => !fatte.has(idVaccinazione(p, v.id))).length
    const dosiMagazzino = f ? Math.max(0, Math.floor(f.giacenza / doseInUnita(f.unita, v))) : null
    return { v, f, servono, dosiMagazzino, confezioni: Math.ceil(servono / v.dosiConf) }
  })
  const prossime = Array.from({ length: 8 }, (_, i) => {
    const s = settimanaVaccinazioni(oggi, 0, i)
    return { ...s, n: parti.filter((p) => nellaSettimana(p, s)).length }
  })

  const carica = async (f: File) => {
    setErrore('')
    const file = leggiFile(await f.text())
    const m = abbinaColonne(file.intestazioni)
    if (m.id === undefined) { setErrore('Non trovo la colonna con il numero della vacca (ID).'); return }
    if (m.dataParto === undefined && m.giorniGravidanza === undefined) {
      setErrore(`Nel file non trovo né la data del parto prevista (DUE) né i giorni di gravidanza (DCC). Colonne lette: ${file.intestazioni.join(', ')}`)
      return
    }
    const animali = costruisciAnimali(file, m)
    imposta('partiDC', [{ id: nuovoId(), data: dataLista, importatoIl: new Date().toISOString(), nomeFile: f.name, animali }])
    setSpostamento(0)
  }

  /** Segna o toglie un vaccino; se il vaccino è nel magazzino farmaci, la dose viene scaricata (o restituita). */
  const segna = (p: PartoPrevisto, v: VaccinoPreparto) => {
    const id = idVaccinazione(p, v.id)
    const esistente = dati.vaccinazioni.find((x) => x.id === id)
    if (esistente) {
      elimina('vaccinazioni', id)
      const f = esistente.scarico && dati.farmaci.find((x) => x.id === esistente.scarico!.farmacoId)
      if (f) aggiorna('farmaci', { ...f, giacenza: f.giacenza + esistente.scarico!.quantita })
      return
    }
    const f = farmacoDelVaccino(dati.farmaci, v)
    const quantita = f ? doseInUnita(f.unita, v) : 0
    aggiungi('vaccinazioni', { id, vacca: p.vacca, dataParto: p.dataParto, vaccino: v.id, fattaIl: oggi, ...(f ? { scarico: { farmacoId: f.id, quantita } } : {}) })
    if (f) aggiorna('farmaci', { ...f, giacenza: Math.round((f.giacenza - quantita) * 100) / 100 })
  }
  const aggiungiAlMagazzino = (v: VaccinoPreparto) =>
    aggiungi('farmaci', { id: nuovoId(), nome: v.nome, unita: 'ml', unitaPerConfezione: v.mlConf, prezzoConfezione: 0, giacenza: 0, note: `Vaccino pre-parto, ${v.doseMl} ml a capo (${v.dosiConf} dosi a confezione)` })

  const bottoni = (p: PartoPrevisto, grandi = false) => (
    <div className="flex flex-wrap gap-2">
      {VACCINI_PREPARTO.map((v) => {
        const ok = fatte.has(idVaccinazione(p, v.id))
        return (
          <button key={v.id} type="button" onClick={() => segna(p, v)} aria-pressed={ok}
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition ${grandi ? 'px-3.5 py-2 text-sm' : 'px-3 py-1 text-xs'} ${ok ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-brand-400'}`}>
            {ok ? <Check className="h-3.5 w-3.5" /> : <Syringe className="h-3.5 w-3.5" />}{v.breve}
          </button>
        )
      })}
    </div>
  )

  const cambiaAnticipo = (n: number) => {
    if (n < 1 || n > 12) return
    imposta('parametri', [...dati.parametri.filter((x) => x.id !== 'anticipoVaccini'), { id: 'anticipoVaccini', valore: n }])
    setSpostamento(0)
  }

  const testo = () =>
    [`Vaccinazioni pre-parto (${VACCINI_PREPARTO.map((v) => v.breve).join(' + ')}) – parti dal ${fmtData(sett.da)} al ${fmtData(sett.a)} (${daVaccinare.length} animali)`,
      ...daVaccinare.map((p) => `${p.vacca}  –  parto ${giornoSett(p.dataParto)} ${fmtData(p.dataParto)}  –  ${categoriaParto(p.lattazione)}${p.gruppo !== null ? `  –  ${nomeGr(p.gruppo)}` : ''}`)].join('\n')
  const scaricaPdf = async () => {
    setPdf(true)
    try {
      const blob = await creaPdf('Vaccinazioni pre-parto', `Parti previsti dal ${fmtData(sett.da)} al ${fmtData(sett.a)} · ${VACCINI_PREPARTO.map((v) => `${v.nome} ${v.doseMl} ml`).join(' + ')}`, [{
        titolo: `Vacche da vaccinare (${daVaccinare.length})`,
        colonne: ['Vacca', 'Parto previsto', 'Categoria', 'Gruppo', 'Gg gravid.', ...VACCINI_PREPARTO.map((v) => v.breve)],
        righe: daVaccinare.map((p) => [p.vacca, `${giornoSett(p.dataParto)} ${fmtData(p.dataParto)}`, categoriaParto(p.lattazione), p.gruppo === null ? '' : isCloseUp(p.gruppo) ? `${p.gruppo} close up` : p.gruppo, p.giorniGravidanzaOggi ?? '', ...VACCINI_PREPARTO.map((v) => (fatte.has(idVaccinazione(p, v.id)) ? 'fatto' : ''))]),
      }])
      await scarica(blob, `vaccinazioni-preparto-${sett.da}.pdf`)
    } finally { setPdf(false) }
  }
  const copia = async () => {
    try { await navigator.clipboard.writeText(testo()); setCopiato(true); setTimeout(() => setCopiato(false), 2000) } catch { /* appunti non disponibili */ }
  }

  const caricatore = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="label">Data della lista</span>
        <input type="date" className="input" value={dataLista} onChange={(e) => setDataLista(e.target.value)} />
      </label>
      <input ref={input} type="file" accept=".csv,.txt,.prn,text/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void carica(f); e.target.value = '' }} />
      <button className="btn-primary" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" />{lista ? 'Carica una lista nuova' : 'Carica la lista dei parti'}</button>
    </div>
  )

  return (
    <>
      <PageHeader titolo="Parti e vaccinazioni" icona={Baby} descrizione="Dalla lista dei parti previsti di DairyComp: chi vaccinare questa settimana" />

      {!lista ? (
        <Vuoto>
          <p>Esporta da DairyComp la lista dei parti previsti con il <b>numero della vacca</b> e la <b>data parto prevista (DUE)</b> o i <b>giorni di gravidanza (DCC)</b>, poi caricala qui.</p>
          <p className="mt-1">Ogni martedì trovi le vacche che partoriscono nella settimana tra {anticipo} settimane.</p>
          <div className="mt-4 flex justify-center">{caricatore}</div>
          {errore && <p className="mt-3 text-sm text-red-600">{errore}</p>}
        </Vuoto>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <StatTile icona={Syringe} tono="brand" etichetta="Da vaccinare" valore={fmt0(mancano)} unita={`su ${daVaccinare.length}`} nota={`parti ${breve(sett.da)} – ${breve(sett.a)}`} />
            <StatTile icona={Baby} tono="verde" etichetta="Gravide in lista" valore={fmt0(parti.length)} unita="animali" nota={`lista del ${fmtData(lista.data)}`} />
            <StatTile icona={CalendarDays} tono="arancio" etichetta="Parti nei prossimi 7 giorni" valore={fmt0(parti.filter((p) => p.dataParto >= oggi && p.dataParto < aggiungiGiorni(oggi, 7)).length)} unita={parti.filter((p) => p.dataParto >= oggi && p.dataParto < aggiungiGiorni(oggi, 7)).length === 1 ? 'animale' : 'animali'} />
          </div>

          <div className="card mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2>Vacche da vaccinare</h2>
                <p className="mt-0.5 text-sm text-stone-500">Parto previsto tra <b>{giornoSett(sett.da)} {fmtData(sett.da)}</b> e <b>{giornoSett(sett.a)} {fmtData(sett.a)}</b>{spostamento !== 0 && <> · <button className="btn-link" onClick={() => setSpostamento(0)}>torna a questa settimana</button></>}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button className="btn-secondary px-3" aria-label="Settimana precedente" onClick={() => setSpostamento((s) => s - 1)}><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-secondary px-3" aria-label="Settimana successiva" onClick={() => setSpostamento((s) => s + 1)}><ChevronRight className="h-4 w-4" /></button>
                <button className="btn-secondary" onClick={copia} disabled={!daVaccinare.length}>{copiato ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiato ? 'Copiata' : 'Copia lista'}</button>
                <button className="btn-primary" onClick={scaricaPdf} disabled={!daVaccinare.length || pdf}>{pdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Scarica PDF</button>
              </div>
            </div>

            {daVaccinare.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">Nessun parto previsto in questa settimana.</p>
            ) : (
              <>
              <ul className="mt-4 divide-y divide-stone-100 sm:hidden">
                {daVaccinare.map((p) => {
                  const ok = vaccinataTutto(p, fatte)
                  return (
                    <li key={`${p.vacca}|${p.dataParto}`} className={`rounded-lg px-2 py-3 ${ok ? 'bg-emerald-50/60' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-lg font-bold text-brand-900">{p.vacca}</span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-medium">{giornoSett(p.dataParto)} {fmtData(p.dataParto)}{p.stimata && <span className="ml-1 text-xs text-stone-400">(stimata)</span>}</span>
                          <span className="block text-xs text-stone-500">{categoriaParto(p.lattazione)}{p.gruppo !== null ? ` · ${nomeGr(p.gruppo)}` : ''}{p.giorniGravidanzaOggi !== null ? ` · ${p.giorniGravidanzaOggi} gg grav.` : ''}</span>
                        </span>
                      </div>
                      <div className="mt-2 pl-[4.25rem]">{bottoni(p, true)}</div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="table">
                  <thead><tr><th>Vacca</th><th>Parto previsto</th><th>Categoria</th><th>Gruppo</th><th className="text-right">Gg gravidanza oggi</th><th>Vaccini fatti</th></tr></thead>
                  <tbody>
                    {daVaccinare.map((p) => {
                      const ok = vaccinataTutto(p, fatte)
                      return (
                        <tr key={`${p.vacca}|${p.dataParto}`} className={ok ? 'bg-emerald-50/60' : ''}>
                          <td className="font-semibold">{p.vacca}</td>
                          <td className="whitespace-nowrap">{giornoSett(p.dataParto)} {fmtData(p.dataParto)}{p.stimata && <span className="ml-1 text-xs text-stone-400" title="Calcolata dai giorni di gravidanza">(stimata)</span>}</td>
                          <td>{categoriaParto(p.lattazione)}</td>
                          <td>{etichettaGr(p.gruppo)}</td>
                          <td className="text-right tabular-nums">{p.giorniGravidanzaOggi ?? '—'}</td>
                          <td>{bottoni(p)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {daVaccinare.length > 0 && (
            <div className="card mt-6 print:hidden">
              <h2>Dosi per questa settimana</h2>
              <p className="mt-0.5 text-sm text-stone-500">I due vaccini si fanno insieme, {VACCINI_PREPARTO[0].doseMl} ml a capo ciascuno. Spuntando un vaccino la dose viene tolta dal magazzino Farmaci.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scorte.map(({ v, f, servono, dosiMagazzino, confezioni }) => {
                  const poche = dosiMagazzino !== null && dosiMagazzino < servono
                  return (
                    <div key={v.id} className={`rounded-xl border p-4 ${poche ? 'border-rose-200 bg-rose-50/60' : 'border-stone-200'}`}>
                      <div className="font-semibold text-brand-900">{v.nome}</div>
                      <div className="mt-1 text-sm text-stone-600">
                        Da fare: <b>{servono}</b> {servono === 1 ? 'dose' : 'dosi'} · {servono * v.doseMl} ml · {confezioni} {confezioni === 1 ? 'flacone' : 'flaconi'} da {v.dosiConf} dosi
                      </div>
                      <div className="mt-1 text-sm">
                        {f ? (
                          <span className={poche ? 'font-semibold text-rose-700' : 'text-stone-600'}>In magazzino: {dosiMagazzino} {dosiMagazzino === 1 ? 'dose' : 'dosi'}{poche ? ' – non bastano' : ''}</span>
                        ) : (
                          <span className="text-stone-500">Non è nel magazzino Farmaci. <button className="btn-link" onClick={() => aggiungiAlMagazzino(v)}>Aggiungilo</button></span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <AsciutteCard />

          <div className="mt-6 grid gap-6 lg:grid-cols-2 print:hidden">
            <div className="card">
              <h2>Parti nelle prossime settimane</h2>
              <div className="mt-3 space-y-1.5">
                {prossime.map((s, i) => (
                  <div key={s.da} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${i === anticipo + spostamento ? 'bg-brand-50 font-semibold text-brand-900' : ''}`}>
                    <span>{breve(s.da)} – {breve(s.a)}{i === 0 && <span className="ml-1 text-stone-400">(questa settimana)</span>}</span>
                    <span className="tabular-nums">{s.n} {s.n === 1 ? 'parto' : 'parti'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card space-y-4">
              <div>
                <h2>Impostazioni</h2>
                <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  Vaccinare le vacche che partoriscono tra
                  <input type="number" min={1} max={12} className="input w-20" value={anticipo} onChange={(e) => cambiaAnticipo(Number(e.target.value))} />
                  settimane
                </label>
                <p className="mt-1 text-xs text-stone-500">Es. martedì 3 novembre → parti da lunedì 7 a domenica 13 dicembre (5 settimane).</p>
              </div>
              <div>
                <p className="text-sm text-stone-600">Lista attuale: <b>{lista.nomeFile}</b> del {fmtData(lista.data)} · {lista.animali.length} animali</p>
                <p className="mt-1 text-xs text-stone-500">Prossimo aggiornamento consigliato: entro il {fmtData(aggiungiGiorni(lista.data, 60))} (ogni 2 mesi te lo ricorda il cruscotto).</p>
                <div className="mt-3">{caricatore}</div>
                {errore && <p className="mt-2 text-sm text-red-600">{errore}</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

/** Vacche da mettere in asciutta nella settimana (parto previsto − 60 giorni): il protocollo si fa partire il lunedì. */
function AsciutteCard() {
  const { dati } = useStore()
  const [sp, setSp] = useState(0)
  const s = asciutteDellaSettimana(dati.partiDC[0], isoGiorno(), sp)
  // ancora munte dai robot nell'ultimo giorno caricato?
  const ultimo = dati.robotVacche.reduce((m, v) => (v.data > m ? v.data : m), '')
  const munte = new Set(dati.robotVacche.filter((v) => v.data === ultimo && v.mungiture > 0).map((v) => v.vacca))
  return (
    <div className="card mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Messa in asciutta della settimana</h2>
          <p className="mt-0.5 text-sm text-stone-500">Lunedì {fmtData(s.da)} · vacche a {ASCIUTTA_GG_DA}–{ASCIUTTA_GG_A} giorni dal parto previsto · avviso sul cruscotto il lunedì{sp !== 0 && <> · <button className="btn-link" onClick={() => setSp(0)}>questa settimana</button></>}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-secondary px-3" aria-label="Settimana precedente" onClick={() => setSp((x) => x - 1)}><ChevronLeft className="h-4 w-4" /></button>
          <button className="btn-secondary px-3" aria-label="Settimana successiva" onClick={() => setSp((x) => x + 1)}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {s.vacche.length === 0 ? <p className="mt-3 text-sm text-stone-500">Nessuna vacca da mettere in asciutta questo lunedì.</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Vacca</th><th className="text-right">Gg al parto</th><th>Parto previsto</th><th>Categoria</th><th>Gruppo</th><th className="text-right">Gg gravidanza oggi</th></tr></thead>
            <tbody>
              {s.vacche.map(({ p, dataAsciutta, giorniAlParto }) => (
                <tr key={p.vacca}>
                  <td className="font-semibold">{p.vacca}{ultimo && munte.has(p.vacca) && dataAsciutta < isoGiorno() && <span className="ml-2 rounded-full bg-arancio-100 px-2 py-0.5 text-[11px] font-semibold text-arancio-800" title={`Munta dal robot il ${fmtData(ultimo)}`}>ancora munta</span>}</td>
                  <td className="text-right tabular-nums">{giorniAlParto}</td>
                  <td className="whitespace-nowrap">{fmtData(p.dataParto)}</td>
                  <td>{categoriaParto(p.lattazione)}</td>
                  <td>{p.gruppo ?? '—'}</td>
                  <td className="text-right tabular-nums">{p.giorniGravidanzaOggi ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
