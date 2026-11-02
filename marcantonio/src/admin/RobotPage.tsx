import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, Upload } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, Vuoto } from '../components/ui'
import BarChart from '../components/BarChart'
import ImportRobot from '../components/ImportRobot'
import { SOGLIA_FERMO_MIN, daControllare } from '../lib/robot'
import { fmt0, fmt1, fmt2, fmtData } from '../lib/format'

const GIORNI_SETT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const giornoSett = (iso: string) => GIORNI_SETT[new Date(iso + 'T12:00:00').getDay()]
const durata = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`)

export default function RobotPage() {
  const { dati } = useStore()
  const { robotGiorni, robotVacche } = dati
  const [importa, setImporta] = useState(false)
  const [scelto, setScelto] = useState<string | null>(null)
  const [robotGrafico, setRobotGrafico] = useState<string>('tutti')
  const [cerca, setCerca] = useState('')
  const [mostraOcchio, setMostraOcchio] = useState(false)

  const giorni = useMemo(() => [...new Set(robotGiorni.map((g) => g.data))].sort(), [robotGiorni])
  const ultimoCompleto = [...giorni].reverse().find((d) => robotGiorni.some((g) => g.data === d && g.completo))
  const giorno = scelto && giorni.includes(scelto) ? scelto : ultimoCompleto ?? giorni[giorni.length - 1]
  const [filtroStalla, setFiltroStalla] = useState<string>('tutte')
  const stalleRobot = dati.stalle.filter((s) => s.robot?.nomi?.length).sort((a, b) => a.numero - b.numero)
  const stallaFiltro = stalleRobot.find((s) => s.id === filtroStalla)
  const inFiltro = (robot: string) => !stallaFiltro || !!stallaFiltro.robot?.nomi?.includes(robot)
  const robots = [...new Set(robotGiorni.map((g) => g.robot))].filter(inFiltro).sort()
  const stallaDi = (robot: string) => dati.stalle.find((s) => s.robot?.nomi?.includes(robot))

  if (!giorno) {
    return (
      <>
        <PageHeader titolo="Mungiture robot" descrizione="Dati dei robot di mungitura" />
        <Vuoto>
          <p>Non ci sono ancora dati dei robot.</p>
          <button className="btn-primary mt-4" onClick={() => setImporta(true)}><Upload className="h-4 w-4" />Importa da DeLaval</button>
        </Vuoto>
        {importa && <ImportRobot onChiudi={() => setImporta(false)} onImportato={(d) => { setImporta(false); setScelto(d) }} />}
      </>
    )
  }

  const delGiorno = robotGiorni.filter((g) => g.data === giorno && inFiltro(g.robot)).sort((a, b) => a.robot.localeCompare(b.robot))
  const completo = delGiorno.every((g) => g.completo)
  const oraFine = delGiorno.reduce((m, g) => (g.oraUltima > m ? g.oraUltima : m), '')
  const vaccheGiorno = robotVacche.filter((v) => v.data === giorno && v.mungiture > 0 && inFiltro(v.robot))
  const kg = delGiorno.reduce((s, g) => s + g.kg, 0)
  const mungiture = delGiorno.reduce((s, g) => s + g.mungiture, 0)
  const nVacche = vaccheGiorno.length

  // media dei 7 giorni completi precedenti
  const precedenti = giorni.filter((d) => d < giorno && robotGiorni.some((g) => g.data === d && g.completo)).slice(-7)
  const kgGiorno = (d: string) => robotGiorni.filter((g) => g.data === d && inFiltro(g.robot)).reduce((s, g) => s + g.kg, 0)
  const mediaKg = precedenti.length ? precedenti.reduce((s, d) => s + kgGiorno(d), 0) / precedenti.length : null
  const mediaVacca = (vacca: string) => {
    const v = robotVacche.filter((x) => x.vacca === vacca && precedenti.includes(x.data))
    return v.length ? v.reduce((s, x) => s + x.kg, 0) / v.length : null
  }

  const segnalazioni = daControllare(robotVacche.filter((v) => inFiltro(v.robot)), robotGiorni.filter((g) => inFiltro(g.robot)), giorno)
  const urgenti = segnalazioni.filter((s) => s.gravita >= 2)
  const occhio = segnalazioni.filter((s) => s.gravita < 2)

  // grafico
  const ultimi = giorni.slice(-14)
  const serie = ultimi.map((d) => {
    const gg = robotGiorni.filter((g) => g.data === d && inFiltro(g.robot) && (robotGrafico === 'tutti' || g.robot === robotGrafico))
    return { d, kg: gg.reduce((s, g) => s + g.kg, 0), completo: gg.every((g) => g.completo) }
  })

  const haDim = vaccheGiorno.some((v) => typeof v.dim === 'number')
  const elenco = vaccheGiorno
    .filter((v) => v.vacca.includes(cerca.trim()))
    .sort((a, b) => b.kg - a.kg)

  return (
    <>
      <PageHeader titolo="Mungiture robot" descrizione="Dati dei robot di mungitura, giorno per giorno"
        azioni={<>
          <button className="btn-secondary" onClick={() => setImporta(true)}>Importa un file</button>
          <Link to="/area-riservata/carica" className="btn-primary"><Upload className="h-4 w-4" />Carica la settimana</Link>
        </>} />

      {/* Scelta del giorno */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {giorni.slice(-14).map((d) => {
          const parziale = robotGiorni.some((g) => g.data === d && !g.completo)
          return (
            <button key={d} onClick={() => setScelto(d)}
              className={`shrink-0 rounded-xl px-3 py-2 text-center text-sm ${d === giorno ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200 hover:bg-stone-50'}`}>
              <span className="block text-[11px] uppercase opacity-70">{giornoSett(d)}</span>
              <b>{fmtData(d).slice(0, 5)}</b>{parziale && <span className="block text-[10px] opacity-70">in corso</span>}
            </button>
          )
        })}
      </div>
      {!completo && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          ! I dati di questo giorno arrivano fino alle {oraFine}: i totali sono parziali.
        </p>
      )}

      {stalleRobot.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-500">Gruppo:</span>
          {[{ id: 'tutte', label: 'Tutti' }, ...stalleRobot.map((s) => ({ id: s.id, label: `Gruppo ${s.gruppoDairyComp ?? s.numero}` }))].map((x) => (
            <button key={x.id} onClick={() => { setFiltroStalla(x.id); setRobotGrafico('tutti') }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${filtroStalla === x.id ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200 hover:bg-stone-50'}`}>
              {x.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta={`Latte del ${fmtData(giorno)}`} valore={fmt0(kg)} unita="kg"
          nota={completo && mediaKg ? `${kg >= mediaKg ? '▲' : '▼'} ${fmt1(Math.abs((kg / mediaKg - 1) * 100))}% sulla media di ${precedenti.length} giorni` : completo ? '—' : `fino alle ${oraFine}`} />
        <StatTile etichetta="Vacche munte" valore={fmt0(nVacche)} unita="capi" nota={`${fmt0(mungiture)} mungiture`} />
        <StatTile etichetta="Mungiture per vacca" valore={nVacche ? fmt2(mungiture / nVacche) : '—'} unita="al giorno" nota={completo ? undefined : 'giorno in corso'} />
        <StatTile etichetta="Latte per vacca" valore={nVacche ? fmt1(kg / nVacche) : '—'} unita="kg" nota={nVacche ? `${fmt1(kg / Math.max(1, mungiture))} kg per mungitura` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {/* Da controllare */}
        <section className="card xl:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5 text-amber-600" />Vacche da controllare</h2>
          <p className="mt-1 text-xs text-stone-500">Allarmi mastite ripetuti, latte separato, cali di produzione, poche mungiture</p>
          {urgenti.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />Nessuna vacca da segnalare</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {urgenti.map((s) => (
                <li key={s.vacca} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="text-base">Vacca {s.vacca}</b>
                    <span className="text-xs text-stone-500">{s.robot} · <Link to="/area-riservata/salute" state={{ vacca: s.vacca }} className="font-medium text-brand-700 hover:underline">Registra caso</Link></span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
                    {s.motivi.map((m) => <li key={m} className="flex gap-1.5"><span className="text-amber-600">•</span>{m}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {occhio.length > 0 && (
            <div className="mt-3 border-t border-stone-100 pt-3">
              <button className="flex items-center gap-1.5 text-sm font-medium text-brand-700" onClick={() => setMostraOcchio(!mostraOcchio)}>
                <Eye className="h-4 w-4" />Da tenere d'occhio ({occhio.length}) {mostraOcchio ? '▴' : '▾'}
              </button>
              {mostraOcchio && (
                <ul className="mt-2 space-y-1 text-sm text-stone-600">
                  {occhio.map((s) => <li key={s.vacca}><b>{s.vacca}</b>: {s.motivi.join(' · ')}</li>)}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6 xl:col-span-3">
          {/* Robot */}
          <section className="card overflow-x-auto p-0">
            <h2 className="p-5 pb-2 font-semibold">Robot</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Robot</th><th className="num">Vacche</th><th className="num">Mungiture</th><th className="num">Latte (kg)</th>
                  <th className="num">kg/mungitura</th><th className="num">Durata media</th><th className="num">Occupazione</th>
                  <th className="num">Distacchi</th><th className="num">Incomplete</th><th className="num">Non riuscite</th><th className="num">Rifiuti</th>
                </tr>
              </thead>
              <tbody>
                {delGiorno.map((g) => {
                  const st = stallaDi(g.robot)
                  const minutiGiorno = g.completo ? 24 * 60 : Number(g.oraUltima.slice(0, 2)) * 60 + Number(g.oraUltima.slice(3))
                  return (
                    <tr key={g.robot}>
                      <td className="whitespace-nowrap">
                        <b>{g.robot}</b>{st && <span className="ml-2 rounded-full bg-arancio-100 px-2 py-0.5 text-xs text-arancio-800">Stalla {st.numero}</span>}
                        {g.pausaMaxMin >= SOGLIA_FERMO_MIN && <span className="mt-0.5 block text-xs font-medium text-amber-700">! fermo {durata(g.pausaMaxMin)} dalle {g.pausaDalle}</span>}
                      </td>
                      <td className="num">{g.vacche}</td>
                      <td className="num">{g.mungiture}</td>
                      <td className="num font-semibold">{fmt0(g.kg)}</td>
                      <td className="num">{g.mungiture ? fmt1(g.kg / g.mungiture) : '—'}</td>
                      <td className="num">{g.mungiture ? `${fmt1(g.durataSec / g.mungiture / 60)} min` : '—'}</td>
                      <td className="num">{minutiGiorno ? `${fmt0((g.durataSec / 60 / minutiGiorno) * 100)}%` : '—'}</td>
                      <td className="num">{g.mungiture ? `${fmt0((g.kickOff / g.mungiture) * 100)}%` : '—'}</td>
                      <td className="num">{g.mungiture ? `${fmt0((g.incomplete / g.mungiture) * 100)}%` : '—'}</td>
                      <td className={`num ${g.nonMunte ? 'text-amber-700' : ''}`}>{g.nonMunte}</td>
                      <td className="num">{g.rifiutate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="px-5 pb-4 pt-2 text-xs text-stone-500">Occupazione = tempo di mungitura sul tempo del giorno. Distacchi e incomplete in % delle mungiture.</p>
          </section>

          {/* Andamento */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Latte munto al giorno</h2>
              <div className="flex flex-wrap gap-1">
                {['tutti', ...robots].map((r) => (
                  <button key={r} onClick={() => setRobotGrafico(r)}
                    className={`rounded-full px-3 py-1 text-sm ${robotGrafico === r ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
                    {r === 'tutti' ? 'Tutti' : r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <BarChart unita="kg" formatta={fmt0}
                dati={serie.map((s) => ({ etichetta: fmtData(s.d).slice(0, 5), valore: s.kg, dettaglio: `${giornoSett(s.d)} ${fmtData(s.d)}${s.completo ? '' : ' (parziale)'}` }))} />
            </div>
          </section>
        </div>
      </div>

      {/* Confronto tra gruppi */}
      {!stallaFiltro && stalleRobot.length > 1 && (
        <section className="card mt-6 overflow-x-auto p-0">
          <h2 className="p-5 pb-2 font-semibold">Confronto tra gruppi · {fmtData(giorno)}</h2>
          <table className="table">
            <thead>
              <tr><th>Gruppo</th><th>Robot</th><th className="num">Vacche</th><th className="num">Mungiture/vacca</th><th className="num">Latte (kg)</th><th className="num">kg/vacca</th><th className="num">kg/robot</th><th className="num">Da controllare</th></tr>
            </thead>
            <tbody>
              {stalleRobot.map((s) => {
                const nomi = s.robot!.nomi!
                const gg = robotGiorni.filter((g) => g.data === giorno && nomi.includes(g.robot))
                const vv = robotVacche.filter((v) => v.data === giorno && v.mungiture > 0 && nomi.includes(v.robot))
                const kgS = gg.reduce((t, g) => t + g.kg, 0), mS = gg.reduce((t, g) => t + g.mungiture, 0)
                const daC = daControllare(robotVacche.filter((v) => nomi.includes(v.robot)), robotGiorni.filter((g) => nomi.includes(g.robot)), giorno).filter((x) => x.gravita >= 2).length
                return (
                  <tr key={s.id} className="cursor-pointer" onClick={() => setFiltroStalla(s.id)}>
                    <td className="whitespace-nowrap"><b>Gruppo {s.gruppoDairyComp ?? '—'}</b> <span className="text-xs text-stone-500">stalla {s.numero}</span></td>
                    <td className="text-stone-600">{nomi.join(', ')}</td>
                    <td className="num">{vv.length || '—'}</td>
                    <td className="num">{vv.length ? fmt2(mS / vv.length) : '—'}</td>
                    <td className="num font-semibold">{kgS ? fmt0(kgS) : '—'}</td>
                    <td className="num">{vv.length ? fmt1(kgS / vv.length) : '—'}</td>
                    <td className="num">{kgS ? fmt0(kgS / nomi.length) : '—'}</td>
                    <td className={`num ${daC ? 'font-semibold text-amber-700' : 'text-stone-400'}`}>{gg.length ? daC : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            {(() => {
              const nomi = stalleRobot.flatMap((s) => s.robot!.nomi!)
              const gg = robotGiorni.filter((g) => g.data === giorno && nomi.includes(g.robot))
              const vv = robotVacche.filter((v) => v.data === giorno && v.mungiture > 0 && nomi.includes(v.robot))
              const kgT = gg.reduce((t, g) => t + g.kg, 0), mT = gg.reduce((t, g) => t + g.mungiture, 0)
              return (
                <tfoot>
                  <tr className="bg-stone-50 font-semibold">
                    <td className="px-3 py-2">Intera mandria</td>
                    <td className="px-3 py-2 font-normal text-stone-600">{nomi.length} robot</td>
                    <td className="num px-3 py-2">{vv.length}</td>
                    <td className="num px-3 py-2">{vv.length ? fmt2(mT / vv.length) : '—'}</td>
                    <td className="num px-3 py-2">{fmt0(kgT)}</td>
                    <td className="num px-3 py-2">{vv.length ? fmt1(kgT / vv.length) : '—'}</td>
                    <td className="num px-3 py-2">{nomi.length ? fmt0(kgT / nomi.length) : '—'}</td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              )
            })()}
          </table>
          {stalleRobot.length < dati.stalle.filter((s) => s.robot).length && (
            <p className="px-5 pb-4 pt-2 text-xs text-stone-500">I gruppi compaiono qui dopo la prima importazione dei loro file.</p>
          )}
        </section>
      )}

      {/* Vacche del giorno */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
          <h2 className="font-semibold">Vacche del {fmtData(giorno)} <span className="font-normal text-stone-500">({elenco.length})</span></h2>
          <input className="input ml-auto w-44" inputMode="numeric" placeholder="Cerca numero…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Vacca</th><th>Robot</th>{haDim && <th className="num">DIM</th>}<th className="num">Mungiture</th><th className="num">Latte (kg)</th><th className="num">Media 7 gg</th><th className="num">Differenza</th>
              <th className="num">Allarmi AMD</th><th className="num">Separato (kg)</th><th className="num">Sangue max (ppm)</th><th className="num">Ultima</th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((v) => {
              const m = mediaVacca(v.vacca)
              const diff = m && completo ? (v.kg / m - 1) * 100 : null
              return (
                <tr key={v.vacca}>
                  <td className="font-medium">{v.vacca}</td>
                  <td className="text-stone-600">{v.robot}</td>
                  {haDim && <td className="num">{v.dim ?? '—'}</td>}
                  <td className="num">{v.mungiture}</td>
                  <td className="num font-semibold">{fmt1(v.kg)}</td>
                  <td className="num text-stone-500">{m ? fmt1(m) : '—'}</td>
                  <td className={`num ${diff !== null && diff <= -25 ? 'font-semibold text-amber-700' : ''}`}>{diff === null ? '—' : `${diff > 0 ? '+' : ''}${fmt0(diff)}%`}</td>
                  <td className={`num ${v.allarmiAmd ? 'font-semibold text-amber-700' : 'text-stone-400'}`}>{v.allarmiAmd || '·'}</td>
                  <td className={`num ${v.kgSeparato ? 'font-semibold text-amber-700' : 'text-stone-400'}`}>{v.kgSeparato ? fmt1(v.kgSeparato) : '·'}</td>
                  <td className="num text-stone-500">{v.sangueMax ? fmt0(v.sangueMax) : '·'}</td>
                  <td className="num text-stone-500">{v.oraUltima}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {importa && <ImportRobot onChiudi={() => setImporta(false)} onImportato={(d) => { setImporta(false); setScelto(d) }} />}
    </>
  )
}
