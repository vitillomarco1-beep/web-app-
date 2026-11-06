import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ChevronDown, Dna, FileDown, Loader2, Repeat, Sprout, Stethoscope, Timer, Upload } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, Vuoto, type Tono } from '../components/ui'
import { fmt0, fmt1, fmtData } from '../lib/format'
import { creaPdf, scarica } from '../lib/pdfLista'
import {
  DIM_VUOTA_PROBLEMA, ETA_FECONDAZIONE_MANZE, GG_DIAGNOSI, NOMI_STATO, OBIETTIVI, PERIODO_ATTESA, RITORNO_CALORE,
  calcolaFertilita, giudizio, listaAdatta, riassuntoStorico, type ChiaveObiettivo, type IndiciFertilita, type RigaLista, type StatoRipro,
} from '../lib/fertilita'

const pct = (v: number | null) => (v === null ? '—' : fmt0(v * 100))
const TONO: Record<'buono' | 'medio' | 'scarso', Tono> = { buono: 'verde', medio: 'arancio', scarso: 'rosso' }
const GIUDIZIO = { buono: 'nella norma', medio: 'da migliorare', scarso: 'lontano dall’obiettivo' }
const COLORE_STATO: Record<StatoRipro, string> = {
  gravida: 'bg-emerald-500', fecondata: 'bg-sky-500', vuota: 'bg-arancio-400', attesa: 'bg-stone-300', nonFecondare: 'bg-rose-500', manza: 'bg-violet-400', maschio: 'bg-stone-200', altro: 'bg-stone-200',
}

/** Fertilità: indici calcolati dalla lista completa di DairyComp caricata in Mandria. */
export default function FertilitaPage() {
  const { dati, aggiungi } = useStore()
  const lista = dati.mandriaDC[0]
  const adatta = listaAdatta(lista)
  const tot = useMemo(() => (lista && adatta.ok ? calcolaFertilita(lista) : null), [lista, adatta.ok])
  // le stalle collegate a un gruppo DairyComp, per vedere gli indici stalla per stalla
  const stalle = useMemo(() => dati.stalle.filter((x) => x.gruppoDairyComp !== undefined).sort((a, b) => a.numero - b.numero), [dati.stalle])
  const perStalla = useMemo(() => (lista && adatta.ok ? stalle.map((st) => ({ st, f: calcolaFertilita(lista, [st.gruppoDairyComp!]) })) : []), [lista, adatta.ok, stalle])
  const [vista, setVista] = useState<string>('tutte')
  const sel = perStalla.find((x) => x.st.id === vista)
  const f = sel?.f ?? tot
  const [pdf, setPdf] = useState<'' | 'in corso' | 'errore'>('')

  // una riga di storico per ogni lista: così si vede l'andamento nel tempo
  useEffect(() => {
    if (tot && !dati.storicoFertilita.some((s) => s.id === tot.data)) aggiungi('storicoFertilita', riassuntoStorico(tot))
  }, [tot, dati.storicoFertilita, aggiungi])

  if (!lista || !f || !tot) {
    return (
      <>
        <PageHeader titolo="Fertilità" icona={Dna} descrizione="Indici riproduttivi dalla lista di DairyComp" />
        <Vuoto>
          {!lista
            ? <p>Carica in <b>Mandria</b> la lista completa di DairyComp: gli indici di fertilità si calcolano da lì.</p>
            : <p>Alla lista Mandria del {fmtData(lista.data)} mancano le colonne <b>{adatta.manca.join(', ')}</b>. Aggiungile al comando LIST di DairyComp (per esempio <code>LIST ID GR LATT GLAT RIPRO GDNAS NFEC GUCA UTOR</code>) e ricaricala.</p>}
          <Link to="/area-riservata/mandria" className="btn-primary mt-4 inline-flex"><Upload className="h-4 w-4" />Vai a Mandria</Link>
        </Vuoto>
      </>
    )
  }

  const tile = (k: ChiaveObiettivo, etichetta: string, valore: string, unita: string | undefined, icona: typeof Dna, extra?: string) => {
    const g = giudizio(k, f[k as keyof typeof f] as number | null)
    return (
      <StatTile icona={icona} tono={g ? TONO[g] : 'brand'} etichetta={etichetta} valore={valore} unita={unita}
        nota={<>{g && <b className={g === 'buono' ? 'text-emerald-700' : g === 'medio' ? 'text-arancio-700' : 'text-rose-700'}>{GIUDIZIO[g]}</b>}{g && ' · '}{OBIETTIVI[k].testo}{extra ? ` · ${extra}` : ''}</>} />
    )
  }

  const scaricaPdf = async () => {
    setPdf('in corso')
    try {
      const sez = (titolo: string, sottotitolo: string, righe: RigaLista[]) => ({
        titolo: `${titolo}  (${righe.length})`, sottotitolo, colonne: ['Animale', 'Gruppo', 'Latt.', 'Note', 'Esito'],
        righe: righe.map((r) => [r.a.id, r.a.gruppo ?? '', r.a.lattazione ?? '', r.nota, '']),
      })
      const blob = await creaPdf('Fertilità – lista per il veterinario', `${sel ? `Stalla ${sel.st.numero} · ` : ''}Lista DairyComp del ${fmtData(f.data)}`, [
        sez('Da visitare per gravidanza', `fecondate, ultimo calore da almeno ${GG_DIAGNOSI} giorni, senza diagnosi`, f.daVisitare),
        sez('Vacche vuote oltre i ' + DIM_VUOTA_PROBLEMA + ' giorni', 'non gravide: da controllare', f.vuoteProblema),
        sez('Manze da fecondare', `oltre ${Math.round(ETA_FECONDAZIONE_MANZE / 30.44)} mesi, non ancora fecondate`, f.manzeDaFecondare),
      ].filter((s) => s.righe.length), 'Scrivere l’esito nella colonna a destra e riportarlo poi in DairyComp.')
      const esito = await scarica(blob, `fertilita-veterinario-${sel ? `stalla${sel.st.numero}-` : ''}${f.data}.pdf`)
      setPdf(esito === 'errore' ? 'errore' : '')
    } catch { setPdf('errore') }
  }

  const storico = [...dati.storicoFertilita].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <>
      <PageHeader titolo="Fertilità" icona={Dna} descrizione={`Indici riproduttivi dalla lista Mandria di DairyComp del ${fmtData(f.data)}`}
        azioni={<button className="btn-primary" onClick={scaricaPdf} disabled={pdf === 'in corso'}>{pdf === 'in corso' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Lista per il veterinario</button>} />
      {pdf === 'errore' && <p className="-mt-3 mb-4 text-sm text-red-600">Non sono riuscito a creare il PDF. Riprova.</p>}

      {stalle.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Mandria o stalla">
          {[{ id: 'tutte', label: 'Tutta la mandria' }, ...stalle.map((st) => ({ id: st.id, label: `Stalla ${st.numero}` }))].map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} onClick={() => setVista(v.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${vista === v.id ? 'border-brand-700 bg-brand-700 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-brand-400'}`}>{v.label}</button>
          ))}
        </div>
      )}

      {/* ---- Vacche */}
      <h2 className="mb-3">{sel ? `Stalla ${sel.st.numero}` : 'Vacche'} <span className="text-base font-normal text-stone-500">· {sel ? `${f.vacche} vacche in lattazione (gruppo ${sel.st.gruppoDairyComp})` : `${f.vacche} tra lattazione e asciutta`}</span></h2>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tile('gravidePct', 'Vacche gravide', pct(f.gravidePct), '%', Dna)}
        {tile('gravideA150', `Gravide a ${DIM_VUOTA_PROBLEMA} giorni`, pct(f.gravideA150), '%', CalendarClock, `su ${f.oltre150} vacche oltre ${DIM_VUOTA_PROBLEMA} gg`)}
        {tile('giorniAperti', 'Parto → concepimento', f.giorniAperti === null ? '—' : fmt0(f.giorniAperti), 'giorni', Timer, 'media delle gravide')}
        {tile('interparto', 'Interparto previsto', f.interparto === null ? '—' : fmt0(f.interparto), 'giorni', Repeat)}
        {tile('serviziPerGravidanza', 'Fecondazioni per gravidanza', f.serviziPerGravidanza === null ? '—' : fmt1(f.serviziPerGravidanza), undefined, Repeat, 'vacche gravide')}
        {tile('tassoConcepimento', 'Tasso di concepimento', pct(f.tassoConcepimento), '%', Sprout, `su ${f.fecondazioniNote} fecondazioni con esito`)}
        {tile('primaFecondazione', 'Gravide alla 1ª fecondazione', pct(f.primaFecondazione), '%', Sprout)}
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stato riproduttivo</div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="Distribuzione degli stati riproduttivi">
            {f.perStato.map((s) => <div key={s.stato} className={COLORE_STATO[s.stato]} style={{ width: `${(s.n / f.vacche) * 100}%` }} />)}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-stone-600">
            {f.perStato.map((s) => (
              <li key={s.stato} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${COLORE_STATO[s.stato]}`} /><span className="flex-1">{NOMI_STATO[s.stato]}</span><b className="tabular-nums">{s.n}</b></li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- Confronto tra le stalle */}
      {perStalla.length > 1 && <Confronto righe={[...perStalla.map((x) => ({ nome: `Stalla ${x.st.numero}`, f: x.f, attiva: vista === x.st.id })), { nome: 'Mandria', f: tot, attiva: vista === 'tutte' }]} />}

      {!sel && <>
      {/* ---- Manze */}
      <h2 className="mb-3 mt-8">Manze <span className="text-base font-normal text-stone-500">· {f.manzeGravide} gravide su {f.manze}</span></h2>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tile('etaConcepimento', 'Età al concepimento', f.etaConcepimento === null ? '—' : fmt1(f.etaConcepimento), 'mesi', CalendarClock, 'manze gravide')}
        {tile('etaPrimoParto', 'Età al 1° parto prevista', f.etaPrimoParto === null ? '—' : fmt1(f.etaPrimoParto), 'mesi', Sprout, f.etaPrimoPartoPrimipare !== null ? `primipare dell’ultimo anno: ${fmt1(f.etaPrimoPartoPrimipare)} mesi` : undefined)}
        {tile('serviziManze', 'Fecondazioni per gravidanza', f.serviziManze === null ? '—' : fmt1(f.serviziManze), undefined, Repeat, 'manze gravide')}
        {tile('tassoManze', 'Tasso di concepimento', pct(f.tassoManze), '%', Sprout, 'manze')}
      </div>
      </>}

      {/* ---- Liste di lavoro */}
      <h2 className="mb-3 mt-8">Da fare</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Lista titolo="Da visitare per gravidanza" icona={Stethoscope} tono="text-sky-700" righe={f.daVisitare} vuoto="Nessuna fecondata da controllare."
          spiega={`Fecondate, senza diagnosi, con l’ultimo calore ad almeno ${GG_DIAGNOSI} giorni: ecografia.`} aperta />
        <Lista titolo="Osservare il ritorno in calore" icona={Repeat} tono="text-violet-700" righe={f.ritornoCalore} vuoto="Nessuna in questa finestra."
          spiega={`Fecondate con l’ultimo calore ${RITORNO_CALORE.da}–${RITORNO_CALORE.a} giorni fa: se non sono gravide tornano in calore adesso.`} aperta />
        <Lista titolo="Da fecondare" icona={Sprout} tono="text-arancio-700" righe={f.daFecondare} vuoto="Nessuna vacca vuota da fecondare."
          spiega={`Oltre i ${PERIODO_ATTESA} giorni dal parto, vuote e non ancora gravide.`} />
        <Lista titolo={`Vuote oltre i ${DIM_VUOTA_PROBLEMA} giorni`} icona={Timer} tono="text-rose-700" righe={f.vuoteProblema} vuoto="Nessuna."
          spiega="Non gravide oltre i 150 giorni di lattazione: visita, protocollo o decisione sulla carriera." />
        {!sel && <Lista titolo="Manze da fecondare" icona={Sprout} tono="text-arancio-700" righe={f.manzeDaFecondare} vuoto="Nessuna manza in ritardo."
          spiega={`Manze oltre i ${Math.round(ETA_FECONDAZIONE_MANZE / 30.44)} mesi non ancora fecondate.`} />}
        <Lista titolo="Non fecondare" icona={Dna} tono="text-stone-600" righe={f.nonFecondare} vuoto="Nessuna." spiega="Animali segnati in DairyComp come da non fecondare." />
      </div>

      {/* ---- Tori */}
      {f.tori.length > 0 && (
        <section className="card mt-8">
          <h2>Tori</h2>
          <p className="mt-0.5 text-xs text-stone-500">Gravidanze in corso per toro e fecondazioni ancora in attesa di diagnosi. Il tasso di concepimento per toro non si può calcolare: la lista ha solo l’ultimo toro, e le fecondazioni non riuscite con un toro spariscono quando la vacca viene rifecondata con un altro. Per quello serve il riepilogo fecondazioni per toro di DairyComp.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500"><th className="py-2 pr-3">Toro</th><th className="px-3 text-right">Vacche gravide</th><th className="px-3 text-right">Manze gravide</th><th className="pl-3 text-right">In attesa di diagnosi</th></tr></thead>
              <tbody>
                {f.tori.map((t) => (
                  <tr key={t.toro} className="border-b border-stone-100 last:border-0 tabular-nums">
                    <td className="py-1.5 pr-3 font-medium">{t.toro}</td>
                    <td className="px-3 text-right">{t.vacche || '—'}</td>
                    <td className="px-3 text-right">{t.manze || '—'}</td>
                    <td className="pl-3 text-right text-stone-500">{t.inAttesa || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- Andamento */}
      {!sel && <section className="card mt-8">
        <h2>Andamento</h2>
        <p className="mt-0.5 text-xs text-stone-500">Una riga per ogni lista Mandria caricata: caricandola ogni lunedì si vede come cambiano gli indici.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-3">Lista del</th><th className="px-2 text-right">Gravide</th><th className="px-2 text-right">A 150 gg</th><th className="px-2 text-right">Parto→conc.</th><th className="px-2 text-right">Fec./grav.</th><th className="px-2 text-right">Concep.</th><th className="pl-2 text-right">1ª fec.</th>
            </tr></thead>
            <tbody>
              {storico.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0 tabular-nums">
                  <td className="py-1.5 pr-3">{fmtData(s.data)}</td>
                  <td className="px-2 text-right">{pct(s.gravidePct)}%</td>
                  <td className="px-2 text-right">{pct(s.gravideA150)}%</td>
                  <td className="px-2 text-right">{s.giorniAperti === null ? '—' : `${fmt0(s.giorniAperti)} gg`}</td>
                  <td className="px-2 text-right">{s.serviziPerGravidanza === null ? '—' : fmt1(s.serviziPerGravidanza)}</td>
                  <td className="px-2 text-right">{pct(s.tassoConcepimento)}%</td>
                  <td className="pl-2 text-right">{pct(s.primaFecondazione)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      <p className="mt-6 text-xs text-stone-500">
        Come si calcola: dalla lista Mandria (RIPRO, NFEC, GUCA = giorni dall’ultimo calore, GLAT, GDNAS, UTOR). Per le gravide l’ultimo calore è quello della fecondazione andata a buon fine, quindi parto → concepimento = giorni di lattazione − GUCA;
        interparto previsto = quello + 280 giorni. Il tasso di concepimento conta le fecondazioni con esito noto (l’ultima di una fecondata in attesa di diagnosi non conta).
        Il gruppo 11 (animali da carne) non è contato. Nelle stalle ci sono solo le vacche in lattazione del gruppo collegato alla stalla: asciutte e manze sono contate solo in “Tutta la mandria”. È una fotografia del giorno della lista; gli obiettivi sono valori di riferimento indicativi.
      </p>
    </>
  )
}

function Lista({ titolo, spiega, righe, vuoto, icona: I, tono, aperta = false }: { titolo: string; spiega: string; righe: RigaLista[]; vuoto: string; icona: typeof Dna; tono: string; aperta?: boolean }) {
  const [apri, setApri] = useState(aperta && righe.length <= 12)
  return (
    <section className="card">
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setApri(!apri)} aria-expanded={apri}>
        <I className={`h-5 w-5 shrink-0 ${tono}`} />
        <h3 className="flex-1 font-semibold text-stone-900">{titolo}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${righe.length ? 'bg-brand-50 text-brand-800' : 'bg-stone-100 text-stone-400'}`}>{righe.length}</span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition ${apri ? 'rotate-180' : ''}`} />
      </button>
      <p className="mt-1 text-xs text-stone-500">{spiega}</p>
      {apri && (righe.length === 0 ? <p className="mt-3 text-sm text-stone-400">{vuoto}</p> : (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {righe.map((r) => (
            <li key={r.a.id} className="flex items-baseline gap-3 py-1.5">
              <b className="w-14 shrink-0 tabular-nums">{r.a.id}</b>
              <span className="flex-1 text-stone-600">{r.nota}</span>
              <span className="text-xs text-stone-400">gr. {r.a.gruppo ?? '—'}</span>
            </li>
          ))}
        </ul>
      ))}
    </section>
  )
}

type ChiaveConfronto = 'gravidePct' | 'gravideA150' | 'giorniAperti' | 'interparto' | 'serviziPerGravidanza' | 'tassoConcepimento' | 'primaFecondazione'
const RIGHE_CONFRONTO: { k: ChiaveConfronto; nome: string; fmt: (v: number | null) => string }[] = [
  { k: 'gravidePct', nome: 'Vacche gravide', fmt: (v) => `${pct(v)}%` },
  { k: 'gravideA150', nome: `Gravide a ${DIM_VUOTA_PROBLEMA} giorni`, fmt: (v) => `${pct(v)}%` },
  { k: 'giorniAperti', nome: 'Parto → concepimento', fmt: (v) => (v === null ? '—' : `${fmt0(v)} gg`) },
  { k: 'interparto', nome: 'Interparto previsto', fmt: (v) => (v === null ? '—' : `${fmt0(v)} gg`) },
  { k: 'serviziPerGravidanza', nome: 'Fecondazioni per gravidanza', fmt: (v) => (v === null ? '—' : fmt1(v)) },
  { k: 'tassoConcepimento', nome: 'Tasso di concepimento', fmt: (v) => `${pct(v)}%` },
  { k: 'primaFecondazione', nome: 'Gravide alla 1ª fecondazione', fmt: (v) => `${pct(v)}%` },
]
const TESTO_GIUDIZIO = { buono: 'text-emerald-700', medio: 'text-arancio-700', scarso: 'text-rose-700' }

function Confronto({ righe }: { righe: { nome: string; f: IndiciFertilita; attiva: boolean }[] }) {
  return (
    <section className="card mt-6">
      <h2>Confronto tra le stalle</h2>
      <p className="mt-0.5 text-xs text-stone-500">Verde nella norma, arancio da migliorare, rosso lontano dall’obiettivo. Nelle stalle solo le vacche in lattazione; in “Mandria” anche le asciutte.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-3 text-left font-semibold">Indice</th>
            {righe.map((r) => <th key={r.nome} className={`px-2 text-right font-semibold ${r.attiva ? 'text-brand-800' : ''}`}>{r.nome}<span className="block text-[10px] font-normal normal-case">{r.f.vacche} vacche</span></th>)}
          </tr></thead>
          <tbody>
            {RIGHE_CONFRONTO.map((x) => (
              <tr key={x.k} className="border-b border-stone-100 last:border-0 tabular-nums">
                <td className="py-1.5 pr-3 text-stone-700">{x.nome}</td>
                {righe.map((r) => {
                  const v = r.f[x.k]
                  const g = giudizio(x.k, v)
                  return <td key={r.nome} className={`px-2 text-right font-semibold ${g ? TESTO_GIUDIZIO[g] : 'text-stone-400'} ${r.attiva ? 'bg-brand-50/60' : ''}`}>{x.fmt(v)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
