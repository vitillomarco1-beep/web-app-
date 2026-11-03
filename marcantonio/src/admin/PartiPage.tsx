import { useMemo, useRef, useState } from 'react'
import { Baby, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, FileUp, Printer, Syringe } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, Vuoto } from '../components/ui'
import { abbinaColonne, costruisciAnimali, leggiFile } from '../lib/dairycomp'
import { aggiungiGiorni, fmt0, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { SETTIMANE_ANTICIPO, categoriaParto, idVaccinazione, nellaSettimana, partiPrevisti, settimanaVaccinazioni } from '../lib/parti'

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
  const { dati, imposta, aggiungi, elimina } = useStore()
  const oggi = isoGiorno()
  const lista = dati.partiDC[0]
  const anticipo = dati.parametri.find((p) => p.id === 'anticipoVaccini')?.valore ?? SETTIMANE_ANTICIPO
  const [spostamento, setSpostamento] = useState(0)
  const [dataLista, setDataLista] = useState(oggi)
  const [errore, setErrore] = useState('')
  const [copiato, setCopiato] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const parti = useMemo(() => partiPrevisti(lista, oggi), [lista, oggi])
  const sett = settimanaVaccinazioni(oggi, anticipo, spostamento)
  const daVaccinare = parti.filter((p) => nellaSettimana(p, sett))
  const fatte = new Set(dati.vaccinazioni.map((v) => v.id))
  const mancano = daVaccinare.filter((p) => !fatte.has(idVaccinazione(p))).length
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

  const segna = (p: (typeof parti)[number]) => {
    const id = idVaccinazione(p)
    if (fatte.has(id)) elimina('vaccinazioni', id)
    else aggiungi('vaccinazioni', { id, vacca: p.vacca, dataParto: p.dataParto, fattaIl: oggi })
  }

  const cambiaAnticipo = (n: number) => {
    if (n < 1 || n > 12) return
    imposta('parametri', [...dati.parametri.filter((x) => x.id !== 'anticipoVaccini'), { id: 'anticipoVaccini', valore: n }])
    setSpostamento(0)
  }

  const testo = () =>
    [`Vaccinazioni pre-parto – parti dal ${fmtData(sett.da)} al ${fmtData(sett.a)} (${daVaccinare.length} animali)`,
      ...daVaccinare.map((p) => `${p.vacca}  –  parto ${giornoSett(p.dataParto)} ${fmtData(p.dataParto)}  –  ${categoriaParto(p.lattazione)}${p.gruppo !== null ? `  –  gr. ${p.gruppo}` : ''}`)].join('\n')
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
                <button className="btn-secondary" onClick={() => window.print()} disabled={!daVaccinare.length}><Printer className="h-4 w-4" />Stampa</button>
              </div>
            </div>

            {daVaccinare.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">Nessun parto previsto in questa settimana.</p>
            ) : (
              <>
              <ul className="mt-4 divide-y divide-stone-100 sm:hidden">
                {daVaccinare.map((p) => {
                  const ok = fatte.has(idVaccinazione(p))
                  return (
                    <li key={idVaccinazione(p)}>
                      <label className={`flex items-center gap-3 rounded-lg px-2 py-3 ${ok ? 'bg-emerald-50/60' : ''}`}>
                        <input type="checkbox" className="h-6 w-6 shrink-0 accent-emerald-600" checked={ok} onChange={() => segna(p)} />
                        <span className="w-14 text-lg font-bold text-brand-900">{p.vacca}</span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-medium">{giornoSett(p.dataParto)} {fmtData(p.dataParto)}{p.stimata && <span className="ml-1 text-xs text-stone-400">(stimata)</span>}</span>
                          <span className="block text-xs text-stone-500">{categoriaParto(p.lattazione)}{p.gruppo !== null ? ` · gruppo ${p.gruppo}` : ''}{p.giorniGravidanzaOggi !== null ? ` · ${p.giorniGravidanzaOggi} gg grav.` : ''}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="table">
                  <thead><tr><th className="w-10">Fatta</th><th>Vacca</th><th>Parto previsto</th><th>Categoria</th><th>Gruppo</th><th className="text-right">Gg gravidanza oggi</th></tr></thead>
                  <tbody>
                    {daVaccinare.map((p) => {
                      const ok = fatte.has(idVaccinazione(p))
                      return (
                        <tr key={idVaccinazione(p)} className={ok ? 'bg-emerald-50/60' : ''}>
                          <td><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={ok} onChange={() => segna(p)} aria-label={`Vaccinata ${p.vacca}`} /></td>
                          <td className="font-semibold">{p.vacca}</td>
                          <td className="whitespace-nowrap">{giornoSett(p.dataParto)} {fmtData(p.dataParto)}{p.stimata && <span className="ml-1 text-xs text-stone-400" title="Calcolata dai giorni di gravidanza">(stimata)</span>}</td>
                          <td>{categoriaParto(p.lattazione)}</td>
                          <td>{p.gruppo ?? '—'}</td>
                          <td className="text-right tabular-nums">{p.giorniGravidanzaOggi ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

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
