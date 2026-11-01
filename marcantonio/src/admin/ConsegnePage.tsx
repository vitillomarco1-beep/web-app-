import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Consegna } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile, Vuoto, conferma } from '../components/ui'
import { fmt0, fmt2, fmtData, fmtEur, isoGiorno, nuovoId } from '../lib/format'
import { totaleConsegne } from '../lib/statistiche'

export default function ConsegnePage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [mese, setMese] = useState(isoGiorno().slice(0, 7))
  const [modifica, setModifica] = useState<Consegna | null>(null)

  const ultimoPrezzo = [...dati.consegne].sort((a, b) => b.data.localeCompare(a.data))[0]
  const acquirenti = [...new Set(dati.consegne.map((c) => c.acquirente))].sort()
  const delMese = dati.consegne.filter((c) => c.data.startsWith(mese)).sort((a, b) => b.data.localeCompare(a.data))
  const tot = totaleConsegne(delMese)

  const perAcquirente = acquirenti
    .map((a) => ({ a, ...totaleConsegne(delMese.filter((c) => c.acquirente === a)) }))
    .filter((x) => x.litri > 0)

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    if (modifica.id) aggiorna('consegne', modifica)
    else aggiungi('consegne', { ...modifica, id: nuovoId() })
    setModifica(null)
  }
  const nuova = (): Consegna => ({
    id: '', data: isoGiorno(), acquirente: ultimoPrezzo?.acquirente ?? '', litri: 0, prezzoLitro: ultimoPrezzo?.prezzoLitro ?? 0.55, documento: '',
  })

  return (
    <>
      <PageHeader titolo="Consegne latte" descrizione="Latte conferito a terzi (non trasformato in caseificio) e ricavi"
        azioni={<button className="btn-primary" onClick={() => setModifica(nuova())}>+ Nuova consegna</button>} />

      <div className="mb-4">
        <label className="text-sm">Mese <input className="input ml-2 inline-block w-auto" type="month" value={mese} onChange={(e) => setMese(e.target.value)} /></label>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile etichetta="Litri consegnati" valore={fmt0(tot.litri)} unita="l" nota={`${delMese.length} consegne`} />
        <StatTile etichetta="Ricavo lordo" valore={fmtEur(tot.importo)} />
        <StatTile etichetta="Prezzo medio" valore={fmt2(tot.prezzoMedio)} unita="€/l" />
      </div>

      {perAcquirente.length > 1 && (
        <div className="card mb-6 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Acquirente</th><th className="num">Litri</th><th className="num">Importo</th><th className="num">€/l medio</th></tr></thead>
            <tbody>{perAcquirente.map((x) => <tr key={x.a}><td>{x.a}</td><td className="num">{fmt0(x.litri)}</td><td className="num">{fmtEur(x.importo)}</td><td className="num">{fmt2(x.prezzoMedio)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {delMese.length === 0 ? <Vuoto>Nessuna consegna in questo mese.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Data</th><th>Acquirente</th><th>Documento</th><th className="num">Litri</th><th className="num">€/l</th><th className="num">Importo</th><th></th></tr></thead>
            <tbody>
              {delMese.map((c) => (
                <tr key={c.id}>
                  <td>{fmtData(c.data)}</td><td>{c.acquirente}</td><td className="text-stone-500">{c.documento || '—'}</td>
                  <td className="num">{fmt0(c.litri)}</td><td className="num">{fmt2(c.prezzoLitro)}</td><td className="num font-semibold">{fmtEur(c.litri * c.prezzoLitro)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-link mr-3" onClick={() => setModifica(c)}>Modifica</button>
                    <button className="btn-danger-link" onClick={() => conferma('Eliminare questa consegna?') && elimina('consegne', c.id)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modifica && (
        <Modale titolo={modifica.id ? 'Modifica consegna' : 'Nuova consegna'} onChiudi={() => setModifica(null)}>
          <form onSubmit={salva} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Data *"><input className="input" type="date" required value={modifica.data} onChange={(e) => setModifica({ ...modifica, data: e.target.value })} /></Campo>
            <Campo label="N. documento (DDT)"><input className="input" value={modifica.documento ?? ''} onChange={(e) => setModifica({ ...modifica, documento: e.target.value })} /></Campo>
            <Campo label="Acquirente *" className="sm:col-span-2">
              <input className="input" list="acquirenti" required value={modifica.acquirente} onChange={(e) => setModifica({ ...modifica, acquirente: e.target.value })} />
              <datalist id="acquirenti">{acquirenti.map((a) => <option key={a} value={a} />)}</datalist>
            </Campo>
            <Campo label="Litri *"><input className="input" type="number" min={1} required value={modifica.litri || ''} onChange={(e) => setModifica({ ...modifica, litri: Number(e.target.value) })} /></Campo>
            <Campo label="Prezzo (€/l) *"><input className="input" type="number" min={0} step="0.001" required value={modifica.prezzoLitro} onChange={(e) => setModifica({ ...modifica, prezzoLitro: Number(e.target.value) })} /></Campo>
            <p className="text-sm text-stone-600 sm:col-span-2">Importo: <b>{fmtEur(modifica.litri * modifica.prezzoLitro)}</b></p>
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
