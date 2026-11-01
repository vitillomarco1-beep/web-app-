import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Analisi } from '../lib/types'
import { BadgeEsito, Campo, Modale, PageHeader, StatTile, Vuoto, conferma } from '../components/ui'
import { fmt0, fmt2, fmtData, isoGiorno, nuovoId } from '../lib/format'
import { LIMITE_CBT, LIMITE_SCC, esito, esitoAnalisi, mediaMobileCbt, mediaMobileScc } from '../lib/qualita'

const vuota = (): Omit<Analisi, 'id'> & { id: string } => ({ id: '', data: isoGiorno(), grasso: 3.8, proteine: 3.4, lattosio: 4.8, cellule: 0, caricaBatterica: 0, inibenti: false, laboratorio: '' })

export default function QualitaPage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [modifica, setModifica] = useState<Analisi | null>(null)
  const oggi = isoGiorno()
  const cbt = mediaMobileCbt(dati.analisi, oggi)
  const scc = mediaMobileScc(dati.analisi, oggi)
  const ordinate = [...dati.analisi].sort((a, b) => b.data.localeCompare(a.data))
  const recenti = ordinate.slice(0, 4)
  const mediaDi = (k: 'grasso' | 'proteine') => (recenti.length ? recenti.reduce((s, a) => s + a[k], 0) / recenti.length : 0)

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    if (modifica.id) aggiorna('analisi', modifica)
    else aggiungi('analisi', { ...modifica, id: nuovoId() })
    setModifica(null)
  }
  const num = (k: keyof Analisi) => (e: { target: { value: string } }) => modifica && setModifica({ ...modifica, [k]: Number(e.target.value) })

  return (
    <>
      <PageHeader titolo="Qualità del latte" descrizione="Analisi di laboratorio e conformità ai requisiti del Reg. (CE) 853/2004"
        azioni={<button className="btn-primary" onClick={() => setModifica(vuota())}>+ Nuova analisi</button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta="Carica batterica – media geom. 2 mesi" valore={cbt.valore ? fmt0(cbt.valore * 1000) : '—'} unita="UFC/ml"
          nota={<span className="flex items-center gap-2"><BadgeEsito esito={esito(cbt.valore, LIMITE_CBT)} /> limite {fmt0(LIMITE_CBT * 1000)} · {cbt.campioni} campioni</span>} />
        <StatTile etichetta="Cellule somatiche – media geom. 3 mesi" valore={scc.valore ? fmt0(scc.valore * 1000) : '—'} unita="/ml"
          nota={<span className="flex items-center gap-2"><BadgeEsito esito={esito(scc.valore, LIMITE_SCC)} /> limite {fmt0(LIMITE_SCC * 1000)} · {scc.campioni} campioni</span>} />
        <StatTile etichetta="Grasso – media ultime 4" valore={recenti.length ? fmt2(mediaDi('grasso')) : '—'} unita="%" />
        <StatTile etichetta="Proteine – media ultime 4" valore={recenti.length ? fmt2(mediaDi('proteine')) : '—'} unita="%" />
      </div>
      <p className="mb-4 text-xs text-stone-500">
        Il Regolamento richiede almeno 2 prelievi al mese per la carica batterica e almeno 1 al mese per le cellule somatiche.
        L'esito "attenzione" segnala valori oltre l'80% del limite.
      </p>

      {ordinate.length === 0 ? <Vuoto>Nessuna analisi registrata.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Data</th><th className="num">Grasso %</th><th className="num">Proteine %</th><th className="num">Lattosio %</th><th className="num">Cellule (×1000/ml)</th><th className="num">CBT (×1000 UFC/ml)</th><th>Inibenti</th><th>Esito</th><th>Laboratorio</th><th></th></tr></thead>
            <tbody>
              {ordinate.map((a) => (
                <tr key={a.id}>
                  <td>{fmtData(a.data)}</td>
                  <td className="num">{fmt2(a.grasso)}</td>
                  <td className="num">{fmt2(a.proteine)}</td>
                  <td className="num">{a.lattosio ? fmt2(a.lattosio) : '—'}</td>
                  <td className="num">{fmt0(a.cellule)}</td>
                  <td className="num">{fmt0(a.caricaBatterica)}</td>
                  <td>{a.inibenti ? <span className="font-medium text-red-700">✕ Positivo</span> : 'Negativo'}</td>
                  <td><BadgeEsito esito={esitoAnalisi(a)} /></td>
                  <td className="text-stone-500">{a.laboratorio || '—'}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-link mr-3" onClick={() => setModifica(a)}>Modifica</button>
                    <button className="btn-danger-link" onClick={() => conferma('Eliminare questa analisi?') && elimina('analisi', a.id)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modifica && (
        <Modale titolo={modifica.id ? 'Modifica analisi' : 'Nuova analisi'} onChiudi={() => setModifica(null)}>
          <form onSubmit={salva} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Data prelievo *"><input className="input" type="date" required max={oggi} value={modifica.data} onChange={(e) => setModifica({ ...modifica, data: e.target.value })} /></Campo>
            <Campo label="Laboratorio"><input className="input" value={modifica.laboratorio ?? ''} onChange={(e) => setModifica({ ...modifica, laboratorio: e.target.value })} /></Campo>
            <Campo label="Grasso (%) *"><input className="input" type="number" step="0.01" min={0} max={10} required value={modifica.grasso} onChange={num('grasso')} /></Campo>
            <Campo label="Proteine (%) *"><input className="input" type="number" step="0.01" min={0} max={10} required value={modifica.proteine} onChange={num('proteine')} /></Campo>
            <Campo label="Lattosio (%)"><input className="input" type="number" step="0.01" min={0} max={10} value={modifica.lattosio ?? ''} onChange={num('lattosio')} /></Campo>
            <Campo label="Cellule somatiche (×1000/ml) *"><input className="input" type="number" min={0} required value={modifica.cellule} onChange={num('cellule')} /></Campo>
            <Campo label="Carica batterica (×1000 UFC/ml) *"><input className="input" type="number" min={0} required value={modifica.caricaBatterica} onChange={num('caricaBatterica')} /></Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={modifica.inibenti} onChange={(e) => setModifica({ ...modifica, inibenti: e.target.checked })} /> Sostanze inibenti rilevate</label>
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
