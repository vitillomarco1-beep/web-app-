import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Capo, StatoCapo } from '../lib/types'
import { Campo, Modale, PageHeader, Vuoto, conferma } from '../components/ui'
import { etaMesi, fmtData, giorniTra, isoGiorno, nuovoId } from '../lib/format'

const STATI: { v: StatoCapo; l: string }[] = [
  { v: 'lattazione', l: 'In lattazione' },
  { v: 'asciutta', l: 'In asciutta' },
  { v: 'manza', l: 'Manza' },
  { v: 'vitella', l: 'Vitella' },
  { v: 'uscita', l: 'Uscita (venduta/morta)' },
]
const etichettaStato = (s: StatoCapo) => STATI.find((x) => x.v === s)?.l ?? s
const RAZZE = ['Frisona Italiana', 'Bruna Italiana', 'Pezzata Rossa', 'Jersey', 'Incrocio', 'Altra']

const nuovo = (): Capo => ({ id: '', matricola: '', nome: '', razza: RAZZE[0], dataNascita: '', stato: 'lattazione', numeroParti: 0 })

export default function MandriaPage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [filtro, setFiltro] = useState<StatoCapo | 'tutti'>('tutti')
  const [cerca, setCerca] = useState('')
  const [modifica, setModifica] = useState<Capo | null>(null)
  const oggi = isoGiorno()

  const conteggi = useMemo(() => {
    const c: Record<string, number> = {}
    dati.capi.forEach((x) => (c[x.stato] = (c[x.stato] ?? 0) + 1))
    return c
  }, [dati.capi])

  const elenco = dati.capi
    .filter((c) => (filtro === 'tutti' ? c.stato !== 'uscita' : c.stato === filtro))
    .filter((c) => `${c.nome} ${c.matricola}`.toLowerCase().includes(cerca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    const capo = { ...modifica, ultimoParto: modifica.ultimoParto || undefined }
    if (capo.id) aggiorna('capi', capo)
    else aggiungi('capi', { ...capo, id: nuovoId() })
    setModifica(null)
  }

  return (
    <>
      <PageHeader titolo="Mandria" descrizione="Anagrafica dei capi e stato produttivo"
        azioni={<button className="btn-primary" onClick={() => setModifica(nuovo())}>+ Nuovo capo</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setFiltro('tutti')} className={`rounded-full px-3 py-1 text-sm ${filtro === 'tutti' ? 'bg-prato-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
          Attivi ({dati.capi.filter((c) => c.stato !== 'uscita').length})
        </button>
        {STATI.map((s) => (
          <button key={s.v} onClick={() => setFiltro(s.v)} className={`rounded-full px-3 py-1 text-sm ${filtro === s.v ? 'bg-prato-700 text-white' : 'bg-white ring-1 ring-stone-200'}`}>
            {s.l} ({conteggi[s.v] ?? 0})
          </button>
        ))}
        <input className="input ml-auto max-w-xs" placeholder="Cerca nome o matricola…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      </div>

      {elenco.length === 0 ? <Vuoto>Nessun capo trovato.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Nome</th><th>Matricola</th><th>Razza</th><th>Età</th><th>Stato</th><th className="num">Parti</th><th>Ultimo parto</th><th className="num">Giorni latt.</th><th></th></tr></thead>
            <tbody>
              {elenco.map((c) => {
                const mesi = c.dataNascita ? etaMesi(c.dataNascita, oggi) : null
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nome || '—'}</td>
                    <td className="font-mono text-xs">{c.matricola}</td>
                    <td>{c.razza}</td>
                    <td>{mesi === null ? '—' : mesi < 24 ? `${mesi} mesi` : `${Math.floor(mesi / 12)} anni`}</td>
                    <td>{etichettaStato(c.stato)}</td>
                    <td className="num">{c.numeroParti}</td>
                    <td>{c.ultimoParto ? fmtData(c.ultimoParto) : '—'}</td>
                    <td className="num">{c.stato === 'lattazione' && c.ultimoParto ? giorniTra(c.ultimoParto, oggi) : '—'}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn-link mr-3" onClick={() => setModifica(c)}>Modifica</button>
                      <button className="btn-danger-link" onClick={() => conferma(`Eliminare ${c.nome || c.matricola}?`) && elimina('capi', c.id)}>Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modifica && (
        <Modale titolo={modifica.id ? 'Modifica capo' : 'Nuovo capo'} onChiudi={() => setModifica(null)}>
          <form onSubmit={salva} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Matricola (marca auricolare) *"><input className="input font-mono" required value={modifica.matricola} onChange={(e) => setModifica({ ...modifica, matricola: e.target.value.toUpperCase() })} /></Campo>
            <Campo label="Nome"><input className="input" value={modifica.nome} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} /></Campo>
            <Campo label="Razza"><select className="input" value={modifica.razza} onChange={(e) => setModifica({ ...modifica, razza: e.target.value })}>{RAZZE.map((r) => <option key={r}>{r}</option>)}</select></Campo>
            <Campo label="Data di nascita *"><input className="input" type="date" required max={oggi} value={modifica.dataNascita} onChange={(e) => setModifica({ ...modifica, dataNascita: e.target.value })} /></Campo>
            <Campo label="Stato"><select className="input" value={modifica.stato} onChange={(e) => setModifica({ ...modifica, stato: e.target.value as StatoCapo })}>{STATI.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></Campo>
            <Campo label="Numero di parti"><input className="input" type="number" min={0} value={modifica.numeroParti} onChange={(e) => setModifica({ ...modifica, numeroParti: Number(e.target.value) })} /></Campo>
            <Campo label="Data ultimo parto"><input className="input" type="date" max={oggi} value={modifica.ultimoParto ?? ''} onChange={(e) => setModifica({ ...modifica, ultimoParto: e.target.value })} /></Campo>
            <Campo label="Note" className="sm:col-span-2"><textarea className="input" value={modifica.note ?? ''} onChange={(e) => setModifica({ ...modifica, note: e.target.value })} /></Campo>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}
    </>
  )
}
