import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Gauge, Milk, Pill, RotateCw, Syringe, Tag, Upload, type LucideIcon } from 'lucide-react'
import { useStore } from '../lib/store'
import { MotivoChip } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, isoGiorno, lunediDi } from '../lib/format'
import { SOGLIA_FERMO_MIN, daControllare } from '../lib/robot'
import { applicaGruppiRobot } from '../lib/gruppi'
import { inLattazione, perGruppo, riepilogo, ultimoImport } from '../lib/dairycomp'
import { inEsaurimento } from '../lib/salute'
import { giorniCaricati } from './CaricaSettimanaPage'
import { VACCINI_VITELLI, etaAl, finestra, idVacVitello, prossimoMartedi, vitelli } from '../lib/vitelli'
import { calcolaMargine, settimaneConDati } from '../lib/margine'
import { statoAsciutta } from '../lib/parti'
import { SETTIMANE_ANTICIPO, vaccinataTutto, nellaSettimana, partiPrevisti, settimanaVaccinazioni } from '../lib/parti'

const saluto = () => { const h = new Date().getHours(); return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera' }

type Cosa = { testo: string; link: string; tipo: 'carica' | 'avviso' | 'farmaco' | 'vaccino' }
const STILE_COSA: Record<Cosa['tipo'], { barra: string; icona: string; I: LucideIcon }> = {
  carica: { barra: 'bg-brand-600', icona: 'bg-brand-100 text-brand-700', I: Upload },
  avviso: { barra: 'bg-arancio-500', icona: 'bg-arancio-100 text-arancio-700', I: AlertTriangle },
  farmaco: { barra: 'bg-rose-500', icona: 'bg-rose-100 text-rose-700', I: Pill },
  vaccino: { barra: 'bg-sky-500', icona: 'bg-sky-100 text-sky-700', I: Syringe },
}

/** Cruscotto "Oggi": solo dati veri (robot, DairyComp, scarichi, farmaci) e le cose da fare. */
export default function DashboardPage() {
  const { dati } = useStore()
  const oggi = isoGiorno()
  const lunScorso = aggiungiGiorni(lunediDi(oggi), -7)
  const dataLunga = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ---- Cose da fare
  const gruppiDaCaricare = dati.stalle.filter((s) => s.robot).sort((a, b) => a.numero - b.numero).filter((s) => giorniCaricati(dati.robotGiorni, s, lunScorso) < 7)
  const listaDC = ultimoImport(dati.importDC)
  const listaReale = listaDC && !listaDC.nomeFile.endsWith('(esempio)') ? listaDC : undefined
  const gruppiDC = listaReale ? applicaGruppiRobot(listaReale.animali, dati.robotVacche, dati.robotGiorni, dati.stalle, listaReale.data) : undefined
  const daSistemare = gruppiDC?.incoerenze ?? []
  const scarichiDaVerificare = dati.scarichi.some((s) => s.data >= lunScorso && s.data <= aggiungiGiorni(lunScorso, 6)) && !dati.verifiche.some((v) => v.settimana === lunScorso)

  // ---- Robot: ultimo giorno completo
  const giorniRobot = [...new Set(dati.robotGiorni.filter((g) => g.completo).map((g) => g.data))].sort()
  const giorno = giorniRobot[giorniRobot.length - 1]
  const delGiorno = dati.robotGiorni.filter((g) => g.data === giorno)
  const kg = delGiorno.reduce((s, g) => s + g.kg, 0)
  const mungiture = delGiorno.reduce((s, g) => s + g.mungiture, 0)
  const vacche = dati.robotVacche.filter((v) => v.data === giorno && v.mungiture > 0).length
  const precedenti = giorniRobot.slice(-8, -1)
  const kgGiorno = (d: string) => dati.robotGiorni.filter((g) => g.data === d).reduce((s, g) => s + g.kg, 0)
  const media = precedenti.length ? precedenti.reduce((s, d) => s + kgGiorno(d), 0) / precedenti.length : null
  const segnalazioni = giorno ? daControllare(dati.robotVacche, dati.robotGiorni, giorno).filter((x) => x.gravita >= 2) : []
  const robotFermi = delGiorno.filter((g) => g.pausaMaxMin >= SOGLIA_FERMO_MIN)
  const serie = giorniRobot.slice(-14).map((d) => ({ etichetta: fmtData(d).slice(0, 5), valore: kgGiorno(d), dettaglio: fmtData(d) }))

  // ---- Gruppi (DairyComp + latte dai robot)
  const gruppi = gruppiDC
    ? perGruppo(gruppiDC.animali.filter(inLattazione)).map(([g, a]) => ({ g, r: riepilogo(a), stalla: dati.stalle.find((s) => s.gruppoDairyComp === g) }))
    : []
  const maxLatte = Math.max(1, ...gruppi.map((x) => x.r.latteMedio ?? 0))

  // Vaccinazioni pre-parto della settimana (dalla lista parti di DairyComp)
  const settVacc = settimanaVaccinazioni(isoGiorno(), dati.parametri.find((p) => p.id === 'anticipoVaccini')?.valore ?? SETTIMANE_ANTICIPO)
  const fatteVacc = new Set(dati.vaccinazioni.map((v) => v.id))
  const daVaccinare = partiPrevisti(dati.partiDC[0]).filter((p) => nellaSettimana(p, settVacc) && !vaccinataTutto(p, fatteVacc))

  // Lista parti di DairyComp: va ricaricata ogni 2 mesi
  const listaParti = dati.partiDC[0]
  const listaPartiVecchia = !listaParti || listaParti.data < aggiungiGiorni(isoGiorno(), -60)

  // Vaccinazioni dei vitelli del prossimo martedì
  const martedi = prossimoMartedi()
  const listaVitelli = dati.vitelliDC[0]
  const fatteVit = new Set(dati.vaccinazioniVitelli.map((v) => v.id))
  const vitelliDaFare = listaVitelli ? vitelli(listaVitelli).reduce((t, c) => t + VACCINI_VITELLI.filter((v) => { const w = finestra(v), e = etaAl(c, martedi); return e >= w.da && e <= w.a && !fatteVit.has(idVacVitello(c.id, v.id)) }).length, 0) : 0
  const giornoSettimana = new Date().getDay()

  // Vacche al pareggio (IOFC stimato): producono circa quanto mangiano
  const settIofc = dati.razioni.length ? settimaneConDati(dati)[0] : undefined
  // incrociate con la messa in asciutta: se è già imminente non serve l'avviso
  const alPareggio = (settIofc ? calcolaMargine(dati, settIofc).vacche.filter((v) => v.alPareggio) : [])
    .map((v) => ({ v, s: statoAsciutta(v.vacca, dati.partiDC[0]) }))
  const anticipare = alPareggio.filter((x) => x.s.tipo === 'vicina')
  const altre = alPareggio.filter((x) => x.s.tipo === 'lontana' || x.s.tipo === 'non gravida' || x.s.tipo === 'sconosciuto')
  const descr = (x: (typeof alPareggio)[number]) => x.s.tipo === 'non gravida' ? 'non gravida' : x.s.tipo === 'sconosciuto' ? 'non in lista parti' : `gravida ${'giorniGravidanza' in x.s ? x.s.giorniGravidanza : '?'} gg`

  const cose: Cosa[] = [
    ...(anticipare.length ? [{ testo: `Al pareggio e vicine all'asciutta (circa 200 gg di gravidanza): valuta di anticiparla – ${anticipare.slice(0, 8).map((x) => `${x.v.vacca} (${fmt1(x.v.kgGiorno)} kg, asciutta prevista ${x.s.tipo === 'vicina' ? fmtData(x.s.dataAsciutta) : ''})`).join(', ')}${anticipare.length > 8 ? '…' : ''}`, link: '/area-riservata/alimentazione?scheda=margine', tipo: 'avviso' as const }] : []),
    ...(altre.length ? [{ testo: `${altre.length} ${altre.length === 1 ? 'vacca al pareggio' : 'vacche al pareggio'} lontane dall'asciutta (producono circa quanto mangiano, stima): ${altre.slice(0, 8).map((x) => `${x.v.vacca} (${fmt1(x.v.kgGiorno)} kg, ${descr(x)})`).join(', ')}${altre.length > 8 ? '…' : ''}`, link: '/area-riservata/alimentazione?scheda=margine', tipo: 'avviso' as const }] : []),
    ...(listaVitelli && listaVitelli.data < martedi && (giornoSettimana === 1 || giornoSettimana === 2) ? [{ testo: 'Carica la lista vitelli di DairyComp per le vaccinazioni di martedì', link: '/area-riservata/vitelli', tipo: 'carica' as const }] : []),
    ...(vitelliDaFare ? [{ testo: `Vaccinazioni vitelli di martedì ${fmtData(martedi)}: ${vitelliDaFare} ${vitelliDaFare === 1 ? 'vaccino' : 'vaccini'} da fare`, link: '/area-riservata/vitelli', tipo: 'vaccino' as const }] : []),
    ...(listaPartiVecchia ? [{ testo: listaParti ? `Carica la lista parti aggiornata da DairyComp (l'ultima è del ${fmtData(listaParti.data)})` : 'Carica la lista parti da DairyComp', link: '/area-riservata/parti', tipo: 'carica' as const }] : []),
    ...(daVaccinare.length ? [{ testo: `Vaccinazioni pre-parto: ${daVaccinare.length} ${daVaccinare.length === 1 ? 'animale' : 'animali'} con parto dal ${fmtData(settVacc.da)} al ${fmtData(settVacc.a)}`, link: '/area-riservata/parti', tipo: 'vaccino' as const }] : []),
    ...(gruppiDaCaricare.length ? [{ testo: `Carica i file dei robot della settimana scorsa: mancano ${gruppiDaCaricare.map((s) => `gruppo ${s.gruppoDairyComp ?? s.numero}`).join(', ')}`, link: '/area-riservata/carica', tipo: 'carica' as const }] : []),
    ...(daSistemare.length ? [{ testo: `${daSistemare.length} vacche da sistemare in DairyComp (munte dal robot di un altro gruppo)`, link: '/area-riservata/latte', tipo: 'avviso' as const }] : []),
    ...robotFermi.map((g) => ({ testo: `Robot ${g.robot} fermo ${Math.floor(g.pausaMaxMin / 60)} h ${String(g.pausaMaxMin % 60).padStart(2, '0')} dalle ${g.pausaDalle} del ${fmtData(g.data)}`, link: '/area-riservata/mungiture', tipo: 'avviso' as const })),
    ...dati.farmaci.filter(inEsaurimento).map((f) => ({ testo: f.giacenza <= 0 ? `Farmaco finito: ${f.nome}` : `Farmaco in esaurimento: ${f.nome} (restano ${Math.round(f.giacenza * 10) / 10} ${f.unita})`, link: '/area-riservata/farmaci', tipo: 'farmaco' as const })),
    ...(scarichiDaVerificare ? [{ testo: 'Verifica gli scarichi di razione della settimana scorsa', link: '/area-riservata/alimentazione', tipo: 'avviso' as const }] : []),
  ]

  const variazione = media ? (kg / media - 1) * 100 : null
  const kpi = giorno ? [
    { etichetta: 'Latte munto', valore: fmt0(kg), unita: 'kg', I: Milk, extra: variazione !== null ? `${variazione >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(variazione))}% sulla media` : '' },
    { etichetta: 'Vacche munte', valore: fmt0(vacche), unita: 'capi', I: Tag, extra: `${delGiorno.length} robot` },
    { etichetta: 'Latte per vacca', valore: vacche ? fmt1(kg / vacche) : '—', unita: 'kg', I: Gauge, extra: mungiture ? `${fmt1(kg / mungiture)} kg a mungitura` : '' },
    { etichetta: 'Mungiture per vacca', valore: vacche ? fmt2(mungiture / vacche) : '—', unita: 'al giorno', I: RotateCw, extra: `${fmt0(mungiture)} mungiture` },
  ] : []

  return (
    <>
      {/* Benvenuto */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-6 text-white shadow-xl shadow-brand-900/20 sm:p-8">
        <svg className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-[0.08]" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="98" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="100" r="42" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full text-white/[0.06]" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0 80c240 40 480 40 720 0s480-40 720 0v40H0z" />
        </svg>
        <div className="relative">
          <p className="text-sm capitalize text-brand-200">{dataLunga}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{saluto()}</h1>
          <p className="mt-1 text-brand-100">
            {giorno ? <>Ecco la situazione delle mungiture del <b className="text-white">{fmtData(giorno)}</b>.</> : 'Carica i file dei robot per vedere la situazione della stalla.'}
            {cose.length > 0 && <> Hai <b className="text-arancio-300">{cose.length} {cose.length === 1 ? 'cosa' : 'cose'} da fare</b>.</>}
          </p>
          {kpi.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpi.map((k) => (
                <div key={k.etichetta} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-100">{k.etichetta}</span>
                    <k.I className="h-4 w-4 shrink-0 text-arancio-300" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold tabular-nums">{k.valore}</span>
                    <span className="text-sm text-brand-100">{k.unita}</span>
                  </div>
                  {k.extra && <div className="mt-0.5 text-xs text-brand-200">{k.extra}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cose da fare */}
      <section className="mb-6">
        <h2 className="mb-3 font-serif text-xl font-bold text-brand-900">Da fare</h2>
        {cose.length === 0 ? (
          <div className="card flex items-center gap-3 text-emerald-800"><CheckCircle2 className="h-6 w-6" />Tutto in ordine: nessuna attività in sospeso.</div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {cose.map((c) => {
              const st = STILE_COSA[c.tipo]
              return (
                <li key={c.testo}>
                  <Link to={c.link} className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-4 pl-5 text-sm shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-brand-200">
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${st.barra}`} />
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.icona}`}><st.I className="h-[18px] w-[18px]" /></span>
                    <span className="flex-1 font-medium text-stone-800">{c.testo}</span>
                    <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!giorno ? (
        <section className="card text-center">
          <p className="text-stone-600">Non ci sono ancora dati dei robot.</p>
          <Link to="/area-riservata/carica" className="btn-primary mt-4"><Upload className="h-4 w-4" />Carica la settimana</Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-5">
          <section className="card xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><AlertTriangle className="h-4 w-4" /></span>
                Vacche da controllare
                {segnalazioni.length > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">{segnalazioni.length}</span>}
              </h2>
              <Link to="/area-riservata/mungiture" className="btn-link">Tutte</Link>
            </div>
            {segnalazioni.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />Nessuna vacca da segnalare</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {segnalazioni.slice(0, 6).map((s) => (
                  <li key={s.vacca} className="flex gap-3 rounded-xl bg-stone-50 p-3">
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white font-serif font-bold leading-none text-brand-800 ring-1 ring-stone-200">
                      <span className="font-sans text-[9px] font-medium uppercase text-stone-400">vacca</span>{s.vacca}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1">{s.motivi.map((m) => <MotivoChip key={m} testo={m} />)}</div>
                      <div className="mt-1 text-[11px] text-stone-400">robot {s.robot}</div>
                    </div>
                  </li>
                ))}
                {segnalazioni.length > 6 && <li className="pt-1 text-center text-xs text-stone-500">e altre {segnalazioni.length - 6}…</li>}
              </ul>
            )}
          </section>
          <section className="card xl:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Milk className="h-4 w-4" /></span>
                Latte munto al giorno
              </h2>
              <Link to="/area-riservata/mungiture" className="btn-link">Dettagli</Link>
            </div>
            <div className="mt-4"><BarChart unita="kg" formatta={fmt0} dati={serie} altezza={240} /></div>
            <p className="mt-1 text-xs text-stone-400">In arancio l'ultimo giorno completo.</p>
          </section>
        </div>
      )}

      {/* Gruppi */}
      {gruppi.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-brand-900">Gruppi in lattazione</h2>
            <Link to="/area-riservata/latte" className="btn-link">Gruppi e mandria</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {gruppi.map(({ g, r, stalla }) => (
              <Link key={String(g)} to="/area-riservata/latte" className="card block transition hover:shadow-md">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-lg font-bold text-brand-900">Gruppo {g ?? '—'}</span>
                  {stalla?.robot && <span className="rounded-full bg-arancio-100 px-2 py-0.5 text-[11px] font-semibold text-arancio-800">{stalla.robot.numero} × {stalla.robot.marca}</span>}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-3xl font-bold tabular-nums text-stone-900">{r.latteMedio !== null ? fmt1(r.latteMedio) : '—'}</span>
                  <span className="text-sm text-stone-500">kg/vacca</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700" style={{ width: `${((r.latteMedio ?? 0) / maxLatte) * 100}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="font-semibold text-stone-800">{r.capi}</div><div className="text-stone-500">vacche</div></div>
                  <div><div className="font-semibold text-stone-800">{r.dimMedio !== null ? fmt0(r.dimMedio) : '—'}</div><div className="text-stone-500">DIM medio</div></div>
                  <div><div className="font-semibold text-stone-800">{r.lattazioneMedia !== null ? `${fmt0((r.primipare / r.capi) * 100)}%` : '—'}</div><div className="text-stone-500">primipare</div></div>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">Lista DairyComp del {fmtData(listaReale!.data)}; latte medio dai robot.</p>
        </section>
      )}
    </>
  )
}
