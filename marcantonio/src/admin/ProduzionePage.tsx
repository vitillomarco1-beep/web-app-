import { Milk } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Turno } from '../lib/types'
import { Campo, PageHeader, Vuoto, conferma } from '../components/ui'
import { fmt0, fmt1, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { perGiorno } from '../lib/statistiche'

export default function ProduzionePage() {
  const { dati, aggiungi, elimina } = useStore()
  const capiLatt = dati.capi.filter((c) => c.stato === 'lattazione').length
  const [form, setForm] = useState({ data: isoGiorno(), turno: 'mattina' as Turno, litri: '', capiMunti: String(capiLatt || '') })
  const [mese, setMese] = useState(isoGiorno().slice(0, 7))

  const duplicato = dati.mungiture.some((m) => m.data === form.data && m.turno === form.turno)

  const salva = (e: FormEvent) => {
    e.preventDefault()
    aggiungi('mungiture', { id: nuovoId(), data: form.data, turno: form.turno, litri: Number(form.litri), capiMunti: Number(form.capiMunti) })
    setForm({ ...form, turno: form.turno === 'mattina' ? 'sera' : 'mattina', litri: '' })
  }

  const delMese = dati.mungiture.filter((m) => m.data.startsWith(mese))
  const giorni = [...perGiorno(delMese).values()].sort((a, b) => b.data.localeCompare(a.data))
  const totMese = giorni.reduce((s, g) => s + g.litri, 0)

  const esportaCsv = () => {
    const righe = [['data', 'turno', 'litri', 'capi_munti'], ...[...delMese].sort((a, b) => a.data.localeCompare(b.data)).map((m) => [m.data, m.turno, m.litri, m.capiMunti])]
    const blob = new Blob([righe.map((r) => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `produzione-${mese}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <PageHeader titolo="Produzione" icona={Milk} descrizione="Registro delle mungiture giornaliere" />

      <form onSubmit={salva} className="card mb-6 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Campo label="Data"><input className="input" type="date" required max={isoGiorno()} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Campo>
        <Campo label="Turno">
          <select className="input" value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value as Turno })}>
            <option value="mattina">Mattina</option><option value="sera">Sera</option>
          </select>
        </Campo>
        <Campo label="Litri munti"><input className="input" type="number" min={0} step="1" required value={form.litri} onChange={(e) => setForm({ ...form, litri: e.target.value })} /></Campo>
        <Campo label="Capi munti"><input className="input" type="number" min={1} step="1" required value={form.capiMunti} onChange={(e) => setForm({ ...form, capiMunti: e.target.value })} /></Campo>
        <button className="btn-primary">Registra</button>
        {duplicato && <p className="text-sm text-amber-700 sm:col-span-2 lg:col-span-5">⚠ Esiste già una registrazione per questo giorno e turno: verrà aggiunta una seconda riga.</p>}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">Mese <input className="input ml-2 inline-block w-auto" type="month" value={mese} onChange={(e) => setMese(e.target.value)} /></label>
        <span className="text-sm text-stone-600">Totale: <b className="tabular-nums">{fmt0(totMese)} l</b> in {giorni.length} giorni</span>
        <button className="btn-secondary ml-auto" onClick={esportaCsv} disabled={delMese.length === 0}>Esporta CSV</button>
      </div>

      {giorni.length === 0 ? <Vuoto>Nessuna mungitura registrata in questo mese.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Data</th><th className="num">Mattina (l)</th><th className="num">Sera (l)</th><th className="num">Totale (l)</th><th className="num">Capi</th><th className="num">l/capo</th><th></th></tr></thead>
            <tbody>
              {giorni.map((g) => {
                const righe = delMese.filter((m) => m.data === g.data)
                const t = (tu: Turno) => righe.filter((m) => m.turno === tu)
                const somma = (tu: Turno) => t(tu).reduce((s, m) => s + m.litri, 0)
                return (
                  <tr key={g.data}>
                    <td>{fmtData(g.data)}</td>
                    <td className="num">{t('mattina').length ? fmt0(somma('mattina')) : '—'}</td>
                    <td className="num">{t('sera').length ? fmt0(somma('sera')) : '—'}</td>
                    <td className="num font-semibold">{fmt0(g.litri)}</td>
                    <td className="num">{g.capi}</td>
                    <td className="num">{g.capi ? fmt1(g.litri / g.capi) : '—'}</td>
                    <td className="text-right">
                      <button className="btn-danger-link" onClick={() => conferma(`Eliminare le mungiture del ${fmtData(g.data)}?`) && righe.forEach((m) => elimina('mungiture', m.id))}>Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
