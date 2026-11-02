import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Upload } from 'lucide-react'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { StatTile } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, isoGiorno, lunediDi } from '../lib/format'
import { SOGLIA_FERMO_MIN, daControllare } from '../lib/robot'
import { applicaGruppiRobot } from '../lib/gruppi'
import { inLattazione, perGruppo, riepilogo, ultimoImport } from '../lib/dairycomp'
import { giorniCaricati } from './CaricaSettimanaPage'

const saluto = () => { const h = new Date().getHours(); return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera' }

/** Cruscotto "Oggi": solo dati veri (robot, DairyComp, scarichi) e le cose da fare. */
export default function DashboardPage() {
  const { dati } = useStore()
  const { sessione } = useAuth()
  const oggi = isoGiorno()
  const lunScorso = aggiungiGiorni(lunediDi(oggi), -7)
  const dataLunga = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

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

  const cose: { testo: string; link: string; tipo: 'carica' | 'avviso' }[] = [
    ...(gruppiDaCaricare.length ? [{ testo: `Carica i file dei robot della settimana scorsa: mancano ${gruppiDaCaricare.map((s) => `gruppo ${s.gruppoDairyComp ?? s.numero}`).join(', ')}`, link: '/area-riservata/carica', tipo: 'carica' as const }] : []),
    ...(daSistemare.length ? [{ testo: `${daSistemare.length} vacche da sistemare in DairyComp (munte dal robot di un altro gruppo)`, link: '/area-riservata/latte', tipo: 'avviso' as const }] : []),
    ...(robotFermi.map((g) => ({ testo: `Robot ${g.robot} fermo ${Math.floor(g.pausaMaxMin / 60)} h ${String(g.pausaMaxMin % 60).padStart(2, '0')} dalle ${g.pausaDalle} del ${fmtData(g.data)}`, link: '/area-riservata/mungiture', tipo: 'avviso' as const }))),
    ...(scarichiDaVerificare ? [{ testo: 'Verifica gli scarichi di razione della settimana scorsa', link: '/area-riservata/alimentazione', tipo: 'avviso' as const }] : []),
  ]

  return (
    <>
      <div className="mb-6">
        <p className="text-sm capitalize text-stone-500">{dataLunga}</p>
        <h1 className="font-serif text-3xl font-bold text-brand-900">{saluto()}{sessione?.utente ? '' : ''}</h1>
      </div>

      {/* Cose da fare */}
      <section className="card mb-6">
        <h2 className="font-semibold">Da fare</h2>
        {cose.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />Tutto in ordine: nessuna attività in sospeso.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {cose.map((c) => (
              <li key={c.testo}>
                <Link to={c.link} className="flex items-center gap-3 py-3 text-sm hover:text-brand-800">
                  {c.tipo === 'carica' ? <Upload className="h-5 w-5 shrink-0 text-brand-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />}
                  <span className="flex-1">{c.testo}</span>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!giorno ? (
        <section className="card text-center">
          <p className="text-stone-600">Non ci sono ancora dati dei robot.</p>
          <Link to="/area-riservata/carica" className="btn-primary mt-4"><Upload className="h-4 w-4" />Carica la settimana</Link>
        </section>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Mungiture del {fmtData(giorno)}</h2>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile etichetta="Latte munto" valore={fmt0(kg)} unita="kg"
              nota={media ? `${kg >= media ? '▲' : '▼'} ${fmt1(Math.abs((kg / media - 1) * 100))}% sulla media di ${precedenti.length} giorni` : undefined} />
            <StatTile etichetta="Vacche munte" valore={fmt0(vacche)} unita="capi" nota={`${delGiorno.length} robot`} />
            <StatTile etichetta="Latte per vacca" valore={vacche ? fmt1(kg / vacche) : '—'} unita="kg" />
            <StatTile etichetta="Mungiture per vacca" valore={vacche ? fmt2(mungiture / vacche) : '—'} unita="al giorno" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            <section className="card xl:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5 text-amber-600" />Vacche da controllare</h2>
                <Link to="/area-riservata/mungiture" className="btn-link">Tutte</Link>
              </div>
              {segnalazioni.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />Nessuna vacca da segnalare</p>
              ) : (
                <ul className="mt-2 divide-y divide-stone-100 text-sm">
                  {segnalazioni.slice(0, 6).map((s) => (
                    <li key={s.vacca} className="py-2">
                      <div className="flex justify-between"><b>Vacca {s.vacca}</b><span className="text-xs text-stone-500">{s.robot}</span></div>
                      <div className="text-stone-600">{s.motivi.join(' · ')}</div>
                    </li>
                  ))}
                  {segnalazioni.length > 6 && <li className="pt-2 text-xs text-stone-500">e altre {segnalazioni.length - 6}…</li>}
                </ul>
              )}
            </section>
            <section className="card xl:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Latte munto al giorno</h2>
                <Link to="/area-riservata/mungiture" className="btn-link">Dettagli</Link>
              </div>
              <div className="mt-4"><BarChart unita="kg" formatta={fmt0} dati={serie} /></div>
            </section>
          </div>
        </>
      )}

      {/* Gruppi */}
      {gruppi.length > 0 && (
        <section className="card mt-6 overflow-x-auto p-0">
          <div className="flex items-center justify-between p-5 pb-2">
            <h2 className="font-semibold">Gruppi in lattazione</h2>
            <Link to="/area-riservata/latte" className="btn-link">Gruppi e mandria</Link>
          </div>
          <table className="table">
            <thead><tr><th>Gruppo</th><th className="num">Vacche</th><th className="num">DIM medio</th><th className="num">Latte/vacca</th><th className="num">Primipare</th></tr></thead>
            <tbody>
              {gruppi.map(({ g, r, stalla }) => (
                <tr key={String(g)}>
                  <td><b>Gruppo {g ?? '—'}</b>{stalla?.robot && <span className="ml-2 text-xs text-stone-500">{stalla.robot.numero} × {stalla.robot.marca}</span>}</td>
                  <td className="num">{r.capi}</td>
                  <td className="num">{r.dimMedio !== null ? fmt0(r.dimMedio) : '—'}</td>
                  <td className="num">{r.latteMedio !== null ? `${fmt1(r.latteMedio)} kg` : '—'}</td>
                  <td className="num">{r.lattazioneMedia !== null ? `${fmt0((r.primipare / r.capi) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 pb-4 pt-2 text-xs text-stone-500">Lista DairyComp del {fmtData(listaReale!.data)}; latte medio dai robot.</p>
        </section>
      )}
    </>
  )
}
