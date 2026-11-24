import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { AnimaleDC } from '../lib/types'
import { categoria, matricole, nomeAutomaticoGruppo } from '../lib/dairycomp'
import { fecondazioni, giorniUltimoCalore, statoRipro, toro, type StatoRipro } from '../lib/fertilita'
import { CRYPTIUM_60, GESTAZIONE_GG, SETTIMANE_ANTICIPO, VACCINI_PREPARTO, partiPrevisti } from '../lib/parti'
import { normMatricola, SOGLIE } from '../lib/apa'
import { nomePatologia } from '../lib/salute'
import { storicoFecondazioni, type Fecondazione } from '../lib/diagnosi'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, giorniTra, isoGiorno, lunediDi } from '../lib/format'

const STATO: Record<StatoRipro, { testo: string; colore: string }> = {
  gravida: { testo: 'Gravida', colore: 'bg-emerald-100 text-emerald-800' },
  fecondata: { testo: 'Fecondata, da diagnosticare', colore: 'bg-sky-100 text-sky-800' },
  vuota: { testo: 'Vuota da fecondare', colore: 'bg-arancio-100 text-arancio-800' },
  attesa: { testo: 'Fresca (periodo di attesa)', colore: 'bg-stone-100 text-stone-700' },
  nonFecondare: { testo: 'Non fecondare', colore: 'bg-red-100 text-red-800' },
  manza: { testo: 'Manza non fecondata', colore: 'bg-stone-100 text-stone-700' },
  maschio: { testo: 'Maschio', colore: 'bg-stone-100 text-stone-700' },
  altro: { testo: '—', colore: 'bg-stone-100 text-stone-700' },
}
const NOME_VACCINO: Record<string, string> = Object.fromEntries([...VACCINI_PREPARTO, CRYPTIUM_60].map((v) => [v.id, v.breve]))

/** Cerca una vacca (numero o matricola) e mostra la sua scheda con tutte le informazioni dell'app. */
export default function CercaVacca({ iniziale, onChiudi }: { iniziale?: string; onChiudi: () => void }) {
  const { dati } = useStore()
  const animali = useMemo(() => dati.mandriaDC[0]?.animali ?? [], [dati.mandriaDC])
  const matr = useMemo(() => matricole(dati.mandriaDC[0], dati.partiDC[0], dati.vitelliDC[0]), [dati.mandriaDC, dati.partiDC, dati.vitelliDC])
  const [testo, setTesto] = useState('')
  const [scelta, setScelta] = useState<string | null>(iniziale ?? null)
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!scelta) campo.current?.focus() }, [scelta])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  const q = testo.trim().toLowerCase()
  const trovati = q
    ? animali.filter((a) => a.id.toLowerCase().includes(q) || (matr.get(a.id) ?? '').toLowerCase().includes(q))
      .sort((a, b) => Number(b.id.toLowerCase() === q) - Number(a.id.toLowerCase() === q) || a.id.localeCompare(b.id, 'it', { numeric: true }))
      .slice(0, 30)
    : []
  const apri = () => { if (trovati.length) setScelta(trovati[0].id) }
  const animale = scelta ? animali.find((a) => a.id === scelta) : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:p-4" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-label="Scheda vacca" className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          {scelta && <button className="text-stone-500 hover:text-brand-700" onClick={() => { setScelta(null); setTesto('') }} aria-label="Cerca un'altra vacca"><ArrowLeft className="h-5 w-5" /></button>}
          <h2 className="text-lg font-semibold">{scelta ? `Vacca ${scelta}` : 'Cerca una vacca'}</h2>
          <button onClick={onChiudi} className="ml-auto text-stone-400 hover:text-stone-700" aria-label="Chiudi"><X className="h-6 w-6" /></button>
        </div>

        {!scelta ? (
          <>
            <form className="relative" onSubmit={(e) => { e.preventDefault(); apri() }}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input ref={campo} className="input py-3 pl-10 text-lg" inputMode="numeric" placeholder="Numero della vacca o matricola" value={testo} onChange={(e) => setTesto(e.target.value)} />
            </form>
            {!animali.length && <p className="mt-4 text-sm text-stone-500">Carica prima la lista Mandria di DairyComp.</p>}
            {q && !trovati.length && <p className="mt-4 text-sm text-stone-500">Nessun animale trovato.</p>}
            <ul className="mt-3 divide-y divide-stone-100">
              {trovati.map((a) => (
                <li key={a.id}>
                  <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-stone-50" onClick={() => setScelta(a.id)}>
                    <span className="w-16 font-serif text-lg font-bold text-brand-900">{a.id}</span>
                    <span className="text-sm text-stone-600">Gruppo {a.gruppo ?? '—'} · {categoria(a)}{a.lattazione ? ` · ${a.lattazione}ª latt.` : ''}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${STATO[statoRipro(a)].colore}`}>{STATO[statoRipro(a)].testo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : animale ? (
          <Scheda a={animale} matricola={matr.get(animale.id) ?? null} />
        ) : (
          <p className="text-sm text-stone-500">La vacca {scelta} non è nell'ultima lista Mandria.</p>
        )}
      </div>
    </div>
  )
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{titolo}</h3>
      {children}
    </section>
  )
}
function Voci({ voci }: { voci: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {voci.map(([k, v]) => (
        <div key={k}><dt className="text-[11px] text-stone-500">{k}</dt><dd className="font-medium text-stone-900">{v}</dd></div>
      ))}
    </dl>
  )
}
const ESITO: Record<Fecondazione['esito'], { testo: string; colore: string }> = {
  gravida: { testo: 'Gravida', colore: 'bg-emerald-100 text-emerald-800' },
  ritorno: { testo: 'Tornata in calore', colore: 'bg-stone-100 text-stone-700' },
  attesa: { testo: 'In attesa di diagnosi', colore: 'bg-sky-100 text-sky-800' },
  vuota: { testo: 'Vuota', colore: 'bg-arancio-100 text-arancio-800' },
}
const giornoFec = (f: Fecondazione) =>
  f.data ? fmtData(f.data)
    : f.tra ? <span className="text-stone-600">tra il {fmtData(f.tra[0]).slice(0, 5)} e il {fmtData(f.tra[1]).slice(0, 5)}</span>
      : f.prima ? <span className="text-stone-500">prima del {fmtData(f.prima)}</span> : '—'

/** Quando fare un vaccino: futuro, questa settimana o già passato senza registrazione. */
function Quando({ data, fine, testo }: { data: string; fine: string; testo: string }) {
  const oggi = isoGiorno()
  if (fine < oggi) return <span className="text-arancio-700">era da fare {testo.replace('settimana del', 'nella settimana del').replace('martedì', 'martedì')} · non risulta segnato</span>
  if (data <= oggi) return <b>{testo} (adesso)</b>
  return <>{testo}</>
}
const Nessuno = ({ children }: { children: ReactNode }) => <p className="text-sm text-stone-500">{children}</p>

function Scheda({ a, matricola }: { a: AnimaleDC; matricola: string | null }) {
  const { dati } = useStore()
  const lista = dati.mandriaDC[0]
  const oggi = isoGiorno()
  const passati = giorniTra(lista.data, oggi) // giorni dalla lista a oggi

  // gruppo e stalla
  const stalla = dati.stalle.find((s) => s.gruppoDairyComp !== undefined && s.gruppoDairyComp === a.gruppo)
  const nomeGruppo = dati.nomiGruppi.find((x) => x.id === String(a.gruppo))?.nome
    || nomeAutomaticoGruppo(lista.animali.filter((x) => x.gruppo === a.gruppo), stalla?.numero, a.gruppo)

  // riproduzione
  const stato = statoRipro(a)
  const nFec = fecondazioni(a)
  const guca = giorniUltimoCalore(a)
  const tor = toro(a)
  const dataUltimoParto = (a.lattazione ?? 0) >= 1 && a.dim ? aggiungiGiorni(lista.data, -a.dim) : null
  const dataUltimoCalore = guca ? aggiungiGiorni(lista.data, -guca) : null
  const daFile = partiPrevisti(dati.partiDC[0]).find((p) => p.vacca === a.id)
  const parto = daFile?.dataParto ?? (stato === 'gravida' && guca ? aggiungiGiorni(lista.data, GESTAZIONE_GG - guca) : null)
  const ggGravidanza = stato === 'gravida' && guca ? guca + passati : daFile?.giorniGravidanzaOggi ?? null
  const mancano = parto ? giorniTra(oggi, parto) : null

  // vaccini
  const vaccini = dati.vaccinazioni.filter((v) => v.vacca === a.id).sort((x, y) => y.fattaIl.localeCompare(x.fattaIl))
  const fatto = (id: string) => parto && vaccini.some((v) => v.vaccino === id && v.dataParto === parto)
  const martediC60 = parto ? aggiungiGiorni(lunediDi(aggiungiGiorni(parto, -60)), 1) : null
  const settPreparto = parto ? lunediDi(aggiungiGiorni(parto, -7 * SETTIMANE_ANTICIPO)) : null

  const fecondazioniStorico = storicoFecondazioni(dati.fotoRipro, a, lista.data)
  // storico dalle liste Mandria del lunedì
  const storico = [...dati.fotoRipro].sort((x, y) => y.data.localeCompare(x.data)).map((f) => ({ data: f.data, r: f.animali[a.id] })).filter((x) => x.r)

  // controlli APA
  const apa = matricola
    ? [...dati.controlliApa].sort((x, y) => y.data.localeCompare(x.data)).map((c) => {
      const k = Object.keys(c.vacche).find((m) => normMatricola(m) === normMatricola(matricola))
      return k ? { data: c.data, v: c.vacche[k] } : null
    }).filter((x): x is NonNullable<typeof x> => x !== null)
    : []

  // robot: ultimi 7 giorni con dati
  const robot = dati.robotVacche.filter((r) => r.vacca === a.id).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 7)
  const kgMedi = robot.length ? robot.reduce((s, r) => s + r.kg, 0) / robot.length : null

  // salute e note
  const casi = dati.casi.filter((c) => c.vacca.trim() === a.id).sort((x, y) => y.dataInizio.localeCompare(x.dataInizio))
  const note = dati.note.filter((n) => n.vacca === a.id).sort((x, y) => y.creataIl.localeCompare(x.creataIl)).slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-4xl font-bold text-brand-900">{a.id}</span>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATO[stato].colore}`}>{STATO[stato].testo}</span>
        {a.codiceRiproduttivo && <span className="text-xs text-stone-500">DairyComp: {a.codiceRiproduttivo}</span>}
      </div>
      <p className="mt-1 text-xs text-stone-500">Dati della lista Mandria del {fmtData(lista.data)}</p>

      <Sezione titolo="Anagrafica">
        <Voci voci={[
          ['Matricola', matricola ?? '—'],
          ['Gruppo', <>{a.gruppo ?? '—'} <span className="font-normal text-stone-500">· {nomeGruppo}</span></>],
          ['Stalla', stalla ? `Stalla ${stalla.numero}` : '—'],
          ['Categoria', categoria(a)],
          ['Lattazione', a.lattazione ? `${a.lattazione}ª` : a.lattazione === 0 ? 'Manza' : '—'],
          ['Età', a.giorniVita ? `${fmt1((a.giorniVita + passati) / 365.25)} anni` : '—'],
          ...((a.lattazione ?? 0) >= 1 ? [['Giorni di lattazione', a.dim !== null ? fmt0(a.dim + passati) : '—'] as [string, ReactNode], ['Ultimo parto', dataUltimoParto ? fmtData(dataUltimoParto) : '—'] as [string, ReactNode]] : []),
        ]} />
      </Sezione>

      <Sezione titolo="Riproduzione">
        <Voci voci={[
          ['Fecondazioni', fmt0(nFec)],
          ['Ultimo toro', tor ?? '—'],
          ['Ultimo calore', dataUltimoCalore ? `${fmtData(dataUltimoCalore)} (${fmt0(guca! + passati)} gg fa)` : '—'],
          ...(ggGravidanza ? [['Gravida da', `${fmt0(ggGravidanza)} giorni`] as [string, ReactNode]] : []),
          ...(parto ? [['Parto previsto', <>{fmtData(parto)} <span className="font-normal text-stone-500">({mancano! >= 0 ? `tra ${fmt0(mancano!)} gg` : `${fmt0(-mancano!)} gg fa`}{daFile && !daFile.stimata ? '' : ', stimato'})</span></>] as [string, ReactNode]] : []),
          ...(stato === 'vuota' && a.dim ? [['Giorni aperti', fmt0(a.dim + passati)] as [string, ReactNode]] : []),
        ]} />
      </Sezione>

      {fecondazioniStorico.length > 0 && (
        <Sezione titolo={a.lattazione ? 'Fecondazioni di questa lattazione' : 'Fecondazioni'}>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th className="num">N°</th><th>Giorno</th><th>Toro</th><th>Esito</th></tr></thead>
              <tbody>
                {fecondazioniStorico.map((f) => (
                  <tr key={f.numero}>
                    <td className="num font-semibold">{f.numero}ª</td>
                    <td>{giornoFec(f)}</td>
                    <td>{f.toro ?? <span className="text-stone-400">—</span>}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESITO[f.esito].colore}`}>{ESITO[f.esito].testo}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {fecondazioniStorico.some((f) => !f.data || !f.toro) && (
            <p className="mt-1 text-[11px] text-stone-500">Giorno e toro si leggono dalla lista del lunedì: da ora vengono salvati per ogni nuova fecondazione. Per quelle più vecchie la lista non li riporta.</p>
          )}
        </Sezione>
      )}

      {parto && mancano! > -7 && (
        <Sezione titolo="Vaccini prima del parto">
          <ul className="space-y-1 text-sm">
            <li>Cryptium 60 gg: {fatto(CRYPTIUM_60.id) ? <b className="text-emerald-700">fatto</b> : <Quando data={martediC60!} fine={aggiungiGiorni(martediC60!, 6)} testo={`martedì ${fmtData(martediC60!)}`} />}</li>
            <li>Rotavec + Cryptium: {VACCINI_PREPARTO.every((v) => fatto(v.id)) ? <b className="text-emerald-700">fatti</b> : <Quando data={settPreparto!} fine={aggiungiGiorni(settPreparto!, 6)} testo={`settimana del ${fmtData(settPreparto!)}`} />}</li>
          </ul>
        </Sezione>
      )}
      {vaccini.length > 0 && (
        <Sezione titolo="Vaccini registrati">
          <ul className="space-y-1 text-sm">
            {vaccini.map((v) => <li key={v.id}>{fmtData(v.fattaIl)} · {NOME_VACCINO[v.vaccino ?? ''] ?? v.vaccino ?? 'vaccino'} <span className="text-stone-500">(parto del {fmtData(v.dataParto)})</span></li>)}
          </ul>
        </Sezione>
      )}

      <Sezione titolo="Controlli APA">
        {apa.length ? (
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th>Data</th><th className="num">Latte kg</th><th className="num">Grasso %</th><th className="num">Proteine %</th><th className="num">G/P</th><th className="num">Cellule</th><th className="num">Lattosio %</th></tr></thead>
              <tbody>
                {apa.map(({ data, v: [kg, g, p, c, l] }) => (
                  <tr key={data}>
                    <td>{fmtData(data)}</td>
                    <td className="num">{kg !== null ? fmt1(kg) : '—'}</td>
                    <td className="num">{g !== null ? fmt2(g) : '—'}</td>
                    <td className="num">{p !== null ? fmt2(p) : '—'}</td>
                    <td className={`num ${g && p && g / p < 1 ? 'text-arancio-700' : ''}`}>{g && p ? fmt2(g / p) : '—'}</td>
                    <td className={`num ${c !== null && c > SOGLIE.celluleAlte ? 'font-semibold text-red-700' : c !== null && c > SOGLIE.cellule ? 'text-arancio-700' : ''}`}>{c !== null ? `${fmt0(c)}.000` : '—'}</td>
                    <td className={`num ${l !== null && l < SOGLIE.lattosio ? 'text-arancio-700' : ''}`}>{l !== null ? fmt2(l) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Nessuno>{matricola ? 'Nessun controllo APA per questa vacca.' : 'Matricola non presente nella lista: non posso collegare i controlli APA.'}</Nessuno>}
      </Sezione>

      <Sezione titolo="Robot di mungitura">
        {robot.length ? (
          <>
            <p className="mb-2 text-sm">Media ultimi {robot.length} giorni: <b>{fmt1(kgMedi!)} kg</b> al giorno · robot {robot[0].robot}</p>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead><tr><th>Giorno</th><th className="num">Kg</th><th className="num">Mungiture</th><th className="num">Rifiutate</th><th className="num">Sangue</th><th>Avvisi</th></tr></thead>
                <tbody>
                  {robot.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtData(r.data)}</td>
                      <td className="num">{fmt1(r.kg)}</td>
                      <td className="num">{r.mungiture}</td>
                      <td className="num">{r.rifiutate}</td>
                      <td className="num">{r.sangueMax !== null ? fmt0(r.sangueMax) : '—'}</td>
                      <td className="text-xs text-stone-600">{[r.kickOff && `${r.kickOff} stacchi`, r.incomplete && `${r.incomplete} incomplete`, r.kgSeparato && `${fmt1(r.kgSeparato)} kg separati`, r.allarmiAmd && `${r.allarmiAmd} allarmi`].filter(Boolean).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <Nessuno>Nessun dato del robot per questa vacca.</Nessuno>}
      </Sezione>

      <Sezione titolo="Salute">
        {casi.length ? (
          <ul className="space-y-2 text-sm">
            {casi.map((c) => (
              <li key={c.id} className="rounded-lg bg-stone-50 px-3 py-2">
                <b>{nomePatologia(c.patologia)}</b>{c.quarti?.length ? ` (${c.quarti.join(', ')})` : ''} · dal {fmtData(c.dataInizio)}
                {c.dataFine ? <span className="text-stone-500"> al {fmtData(c.dataFine)}</span> : <span className="ml-1 rounded-full bg-arancio-100 px-2 py-0.5 text-[11px] font-medium text-arancio-800">in corso</span>}
                {c.trattamento && <div className="text-stone-600">{c.trattamento}</div>}
              </li>
            ))}
          </ul>
        ) : <Nessuno>Nessun caso registrato.</Nessuno>}
      </Sezione>

      {note.length > 0 && (
        <Sezione titolo="Note">
          <ul className="space-y-1 text-sm">
            {note.map((n) => <li key={n.id}>{fmtData(n.creataIl.slice(0, 10))} · {n.testo}</li>)}
          </ul>
        </Sezione>
      )}

      {storico.length > 1 && (
        <Sezione titolo="Storico dalle liste del lunedì">
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead><tr><th>Lista</th><th>Stato</th><th className="num">Fecondazioni</th><th className="num">Gruppo</th></tr></thead>
              <tbody>
                {storico.map(({ data, r: [s, n, g] }) => (
                  <tr key={data}><td>{fmtData(data)}</td><td>{STATO[s].testo}</td><td className="num">{n}</td><td className="num">{g >= 0 ? g : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sezione>
      )}
    </div>
  )
}
