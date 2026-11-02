import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleDashed, FileUp, Upload, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Stalla } from '../lib/types'
import { PageHeader } from '../components/ui'
import { leggiFileRobot, riepiloga, type FileRobot } from '../lib/robot'
import { aggiungiGiorni, fmt0, fmtData, isoGiorno, lunediDi, nuovoId } from '../lib/format'

interface FileScelto { nome: string; letto?: FileRobot; errore?: string; avvisi: string[] }

/** Giorni completi della settimana già caricati per i robot di una stalla. */
export function giorniCaricati(robotGiorni: { data: string; robot: string; completo: boolean }[], stalla: Stalla, lunedi: string) {
  const nomi = stalla.robot?.nomi ?? []
  const domenica = aggiungiGiorni(lunedi, 6)
  return new Set(robotGiorni.filter((g) => nomi.includes(g.robot) && g.completo && g.data >= lunedi && g.data <= domenica).map((g) => g.data)).size
}

export default function CaricaSettimanaPage() {
  const { dati, imposta, aggiorna, aggiungi } = useStore()
  const oggi = isoGiorno()
  const [lunedi, setLunedi] = useState(aggiungiGiorni(lunediDi(oggi), -7))
  const [scelti, setScelti] = useState<Record<string, FileScelto>>({}) // id stalla → file
  const [salvato, setSalvato] = useState<string | null>(null)
  const domenica = aggiungiGiorni(lunedi, 6)
  const stalle = [...dati.stalle].filter((s) => s.robot).sort((a, b) => a.numero - b.numero)

  const scegli = async (stalla: Stalla, f: File) => {
    setSalvato(null)
    const voce: FileScelto = { nome: f.name, avvisi: [] }
    try {
      voce.letto = leggiFileRobot(await f.text())
      const marca = stalla.robot?.marca
      if (marca && marca !== 'Altro' && voce.letto.fonte !== marca) voce.avvisi.push(`Il file è un export ${voce.letto.fonte}, ma la stalla ha robot ${marca}.`)
      const m = voce.letto.mungiture
      const robot = [...new Set(m.map((x) => x.robot))]
      // robot che appartengono già a un'altra stalla: probabilmente è il file di un altro gruppo
      const altrove = robot.map((r) => [r, dati.stalle.find((s) => s.id !== stalla.id && s.robot?.nomi?.includes(r))] as const).filter(([, s]) => s)
      if (altrove.length) {
        const s0 = altrove[0][1]!
        throw new Error(`Questo file contiene i robot ${altrove.map(([r]) => r).join(', ')}, che sono del gruppo ${s0.gruppoDairyComp ?? '—'} (stalla ${s0.numero}). Caricalo nella casella di quel gruppo.`)
      }
      if (stalla.robot && robot.length !== stalla.robot.numero) voce.avvisi.push(`Nel file ci sono ${robot.length} robot (${robot.join(', ')}), la stalla ne ha ${stalla.robot.numero}.`)
      const date = [...new Set(m.map((x) => x.data))].sort()
      const nellaSettimana = date.filter((d) => d >= lunedi && d <= domenica)
      if (!nellaSettimana.length) voce.avvisi.push(`Il file va dal ${fmtData(date[0])} al ${fmtData(date[date.length - 1])}: nessun giorno della settimana scelta.`)
      else if (nellaSettimana.length < 7) voce.avvisi.push(`Il file copre ${nellaSettimana.length} giorni su 7 della settimana.`)
    } catch (e) {
      voce.errore = (e as Error).message
      voce.letto = undefined
    }
    setScelti({ ...scelti, [stalla.id]: voce })
  }

  const pronti = Object.entries(scelti).filter(([, v]) => v.letto)

  const salva = () => {
    let giorni = [...dati.robotGiorni], vacche = [...dati.robotVacche]
    for (const [idStalla, v] of pronti) {
      const { giorni: g, vacche: va } = riepiloga(v.letto!.mungiture)
      const idG = new Set(g.map((x) => x.id)), idV = new Set(va.map((x) => x.id))
      giorni = [...giorni.filter((x) => !idG.has(x.id)), ...g]
      vacche = [...vacche.filter((x) => !idV.has(x.id)), ...va]
      const date = [...new Set(v.letto!.mungiture.map((x) => x.data))].sort()
      aggiungi('importRobot', { id: nuovoId(), fonte: v.letto!.fonte, nomeFile: v.nome, importatoIl: new Date().toISOString(), dal: date[0], al: date[date.length - 1] })
      // i robot del file appartengono alla stalla scelta
      const stalla = dati.stalle.find((s) => s.id === idStalla)
      if (stalla?.robot) {
        const nomi = [...new Set([...(stalla.robot.nomi ?? []), ...v.letto!.mungiture.map((x) => x.robot)])].sort()
        if (nomi.join() !== (stalla.robot.nomi ?? []).join()) aggiorna('stalle', { ...stalla, robot: { ...stalla.robot, nomi } })
      }
    }
    imposta('robotGiorni', giorni)
    imposta('robotVacche', vacche)
    setSalvato(`${pronti.length} file salvat${pronti.length === 1 ? 'o' : 'i'}`)
    setScelti({})
  }

  return (
    <>
      <PageHeader titolo="Carica la settimana" descrizione="Ogni lunedì: i file dei robot con le mungiture della settimana precedente" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn-secondary px-3" onClick={() => { setLunedi(aggiungiGiorni(lunedi, -7)); setScelti({}) }} aria-label="Settimana precedente">‹</button>
        <h2 className="text-lg font-semibold">Settimana dal {fmtData(lunedi)} al {fmtData(domenica)}</h2>
        <button className="btn-secondary px-3" disabled={lunedi >= lunediDi(oggi)} onClick={() => { setLunedi(aggiungiGiorni(lunedi, 7)); setScelti({}) }} aria-label="Settimana successiva">›</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {stalle.map((s) => {
          const caricati = giorniCaricati(dati.robotGiorni, s, lunedi)
          const v = scelti[s.id]
          const completa = caricati >= 7
          return (
            <section key={s.id} className={`card flex flex-col ${completa ? 'ring-1 ring-green-200' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-xl font-bold text-brand-900">Gruppo {s.gruppoDairyComp ?? '—'}</h3>
                  <p className="text-sm text-stone-500">Stalla {s.numero} · {s.robot!.numero} robot {s.robot!.marca}{s.robot!.nomi?.length ? ` (${s.robot!.nomi.join(', ')})` : ''}</p>
                </div>
                {completa
                  ? <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-200"><CheckCircle2 className="h-4 w-4" />7/7 giorni</span>
                  : <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600"><CircleDashed className="h-4 w-4" />{caricati}/7 giorni</span>}
              </div>

              <div className="mt-4 flex-1">
                {!v ? (
                  <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-5 text-center hover:bg-brand-50">
                    <FileUp className="h-6 w-6 text-brand-600" />
                    <span className="text-sm font-semibold text-brand-800">{completa ? 'Ricarica il file' : 'Scegli il file'}</span>
                    <span className="text-xs text-stone-500">{s.robot!.marca === 'Lely' ? 'rapporto "Visite di mungitura" di Horizon (.csv)' : 'export "Mungiture" di DelPro (.csv)'}</span>
                    <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) scegli(s, f); e.target.value = '' }} />
                  </label>
                ) : (
                  <div className={`rounded-2xl p-4 text-sm ring-1 ring-inset ${v.errore ? 'bg-red-50 ring-red-200' : 'bg-stone-50 ring-stone-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <b className="break-all">{v.nome}</b>
                      <button onClick={() => { const n = { ...scelti }; delete n[s.id]; setScelti(n) }} className="text-stone-400 hover:text-stone-700" aria-label="Togli il file"><X className="h-4 w-4" /></button>
                    </div>
                    {v.errore ? <p className="mt-2 text-red-700">✕ {v.errore}</p> : v.letto && (() => {
                      const m = v.letto.mungiture
                      const date = [...new Set(m.map((x) => x.data))].sort()
                      return (
                        <ul className="mt-2 space-y-0.5 text-stone-700">
                          <li>Dal {fmtData(date[0])} al {fmtData(date[date.length - 1])}</li>
                          <li>{fmt0(m.length)} mungiture · {new Set(m.map((x) => x.vacca)).size} vacche</li>
                          <li>Robot: {[...new Set(m.map((x) => x.robot))].sort().join(', ')}</li>
                        </ul>
                      )
                    })()}
                    {v.avvisi.map((a) => <p key={a} className="mt-2 text-amber-800">! {a}</p>)}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary px-6 py-3" disabled={!pronti.length} onClick={salva}>
          <Upload className="h-4 w-4" />Salva {pronti.length ? `${pronti.length} file` : 'i file'}
        </button>
        {salvato && <span className="flex items-center gap-1.5 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />{salvato}. <Link to="/area-riservata/mungiture" className="font-medium underline">Vai alle mungiture</Link></span>}
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Puoi caricare anche file con più giorni o con giorni già presenti: vengono aggiornati senza doppioni.
        La lista di DairyComp (riproduzione) si carica da <Link to="/area-riservata/latte" className="text-brand-700 hover:underline">Gruppi e mandria</Link>.
      </p>
    </>
  )
}
