import { Fragment, useState, type FormEvent } from 'react'
import { AlertTriangle, PackagePlus, Pencil, Plus, Trash2, Pill } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Farmaco } from '../lib/types'
import { Campo, Modale, PageHeader, StatTile, Vuoto } from '../components/ui'
import { costoUnitario, inEsaurimento, nomePatologia } from '../lib/salute'
import { fmt0, fmt1, fmtData, fmtEur, nuovoId } from '../lib/format'

const UNITA = ['ml', 'tubetto', 'dose', 'g', 'compressa', 'bolo', 'flacone', 'siringa', 'pz']
const vuoto = (): Farmaco => ({ id: '', nome: '', unita: 'ml', unitaPerConfezione: 100, prezzoConfezione: 0, giacenza: 0 })
const q = (n: number) => (Number.isInteger(n) ? fmt0(n) : fmt1(n))

/** Magazzino dei farmaci: costo per unità, giacenza, carichi e utilizzi nei casi clinici. */
export default function FarmaciPage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [modifica, setModifica] = useState<Farmaco | null>(null)
  const [carico, setCarico] = useState<{ f: Farmaco; confezioni: string; prezzo: string } | null>(null)
  const [daEliminare, setDaEliminare] = useState<string | null>(null)
  const [dettaglio, setDettaglio] = useState<string | null>(null)

  const farmaci = [...dati.farmaci].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  const valore = farmaci.reduce((s, f) => s + Math.max(0, f.giacenza) * costoUnitario(f), 0)
  const esaurimento = farmaci.filter(inEsaurimento)
  const usi = (id: string) => dati.casi.flatMap((c) => (c.farmaci ?? []).filter((u) => u.farmacoId === id).map((u) => ({ c, u })))
    .sort((a, b) => b.c.dataInizio.localeCompare(a.c.dataInizio))

  const salva = (e: FormEvent) => {
    e.preventDefault()
    if (!modifica) return
    const f = { ...modifica, nome: modifica.nome.trim(), principioAttivo: modifica.principioAttivo?.trim() || undefined, note: modifica.note?.trim() || undefined }
    if (f.id) aggiorna('farmaci', f)
    else aggiungi('farmaci', { ...f, id: nuovoId() })
    setModifica(null)
  }
  const salvaCarico = (e: FormEvent) => {
    e.preventDefault()
    if (!carico) return
    const n = Number(carico.confezioni.replace(',', '.'))
    const prezzo = Number(carico.prezzo.replace(',', '.'))
    if (!(n > 0)) return
    aggiorna('farmaci', { ...carico.f, giacenza: carico.f.giacenza + n * carico.f.unitaPerConfezione, ...(prezzo > 0 ? { prezzoConfezione: prezzo } : {}) })
    setCarico(null)
  }

  return (
    <>
      <PageHeader titolo="Farmaci" icona={Pill} descrizione="Magazzino dei farmaci: costi, giacenze e utilizzi nei trattamenti"
        azioni={<button className="btn-primary" onClick={() => setModifica(vuoto())}><Plus className="h-4 w-4" />Nuovo farmaco</button>} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatTile etichetta="Farmaci in magazzino" valore={fmt0(farmaci.length)} unita="prodotti" />
        <StatTile etichetta="Valore del magazzino" valore={fmtEur(valore)} />
        <StatTile etichetta="In esaurimento" valore={fmt0(esaurimento.length)} unita="prodotti" nota={esaurimento.map((f) => f.nome).slice(0, 3).join(', ') || 'nessuno'} />
      </div>

      {farmaci.length === 0 ? (
        <div className="mt-6"><Vuoto>
          <p>Nessun farmaco in magazzino. Aggiungi i farmaci che usate con prezzo della confezione e quantità: nei casi clinici il costo del trattamento verrà calcolato da solo.</p>
          <button className="btn-primary mt-4" onClick={() => setModifica(vuoto())}><Plus className="h-4 w-4" />Nuovo farmaco</button>
        </Vuoto></div>
      ) : (
        <section className="card mt-6 overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr><th>Farmaco</th><th className="num">Confezione</th><th className="num">Prezzo conf.</th><th className="num">Costo per unità</th><th className="num">Giacenza</th><th className="num">Valore</th><th className="num">Sospensione latte</th><th></th></tr>
            </thead>
            <tbody>
              {farmaci.map((f) => {
                const basso = inEsaurimento(f)
                const nUsi = usi(f.id).length
                return (
                  <Fragment key={f.id}>
                    <tr>
                      <td><b>{f.nome}</b>{f.principioAttivo && <span className="block text-xs text-stone-500">{f.principioAttivo}</span>}</td>
                      <td className="num">{q(f.unitaPerConfezione)} {f.unita}</td>
                      <td className="num">{fmtEur(f.prezzoConfezione)}</td>
                      <td className="num">{fmtEur(costoUnitario(f))} / {f.unita}</td>
                      <td className={`num font-semibold ${basso || f.giacenza < 0 ? 'text-amber-700' : ''}`}>
                        {basso && <AlertTriangle className="mr-1 inline h-4 w-4" />}{q(f.giacenza)} {f.unita}
                        <span className="block text-[11px] font-normal text-stone-400">{f.unitaPerConfezione > 0 ? `${fmt1(f.giacenza / f.unitaPerConfezione)} conf.` : ''}{f.scortaMinima !== undefined ? ` · min ${q(f.scortaMinima)}` : ''}</span>
                      </td>
                      <td className="num">{fmtEur(Math.max(0, f.giacenza) * costoUnitario(f))}</td>
                      <td className="num">{f.sospensioneLatte ? `${f.sospensioneLatte} giorni` : '—'}</td>
                      <td className="whitespace-nowrap text-right">
                        {daEliminare === f.id ? (
                          <span className="text-sm">Eliminare? <button className="btn-danger-link mx-1" onClick={() => { elimina('farmaci', f.id); setDaEliminare(null) }}>Sì</button><button className="btn-link" onClick={() => setDaEliminare(null)}>No</button></span>
                        ) : (
                          <>
                            <button className="btn-link mr-3" onClick={() => setCarico({ f, confezioni: '1', prezzo: String(f.prezzoConfezione).replace('.', ',') })}><PackagePlus className="mr-1 inline h-4 w-4" />Carica</button>
                            {nUsi > 0 && <button className="btn-link mr-3" onClick={() => setDettaglio(dettaglio === f.id ? null : f.id)}>Utilizzi ({nUsi})</button>}
                            <button className="mr-2 text-stone-400 hover:text-brand-700" onClick={() => setModifica(f)} aria-label="Modifica"><Pencil className="h-4 w-4" /></button>
                            <button className="text-stone-400 hover:text-red-700" onClick={() => setDaEliminare(f.id)} aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                    {dettaglio === f.id && (
                      <tr><td colSpan={8} className="bg-stone-50">
                        <ul className="space-y-1 py-1 text-sm">
                          {usi(f.id).map(({ c, u }, i) => (
                            <li key={i}>{fmtData(c.dataInizio)} · vacca <b>{c.vacca}</b> · {nomePatologia(c.patologia)} · {q(u.quantita)} {f.unita} · {fmtEur(u.quantita * u.costoUnitario)}</li>
                          ))}
                        </ul>
                      </td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <p className="px-5 pb-4 pt-2 text-xs text-stone-500">La giacenza scala da sola quando registri un trattamento nella sezione Salute; con "Carica" aggiungi le confezioni acquistate.</p>
        </section>
      )}

      {modifica && (
        <Modale titolo={modifica.id ? `Modifica ${modifica.nome}` : 'Nuovo farmaco'} onChiudi={() => setModifica(null)}>
          <form onSubmit={salva} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nome commerciale *" className="sm:col-span-2"><input className="input" required autoFocus value={modifica.nome} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} /></Campo>
            <Campo label="Principio attivo"><input className="input" value={modifica.principioAttivo ?? ''} onChange={(e) => setModifica({ ...modifica, principioAttivo: e.target.value })} /></Campo>
            <Campo label="Unità di misura">
              <input className="input" list="unita-farmaci" value={modifica.unita} onChange={(e) => setModifica({ ...modifica, unita: e.target.value })} />
              <datalist id="unita-farmaci">{UNITA.map((u) => <option key={u} value={u} />)}</datalist>
            </Campo>
            <Campo label={`Quantità per confezione (${modifica.unita}) *`}><input className="input" type="number" min={0.01} step="any" required value={modifica.unitaPerConfezione || ''} onChange={(e) => setModifica({ ...modifica, unitaPerConfezione: Number(e.target.value) })} /></Campo>
            <Campo label="Prezzo della confezione (€) *"><input className="input" type="number" min={0} step="0.01" required value={modifica.prezzoConfezione || ''} onChange={(e) => setModifica({ ...modifica, prezzoConfezione: Number(e.target.value) })} /></Campo>
            <Campo label={`Giacenza attuale (${modifica.unita})`}><input className="input" type="number" step="any" value={modifica.giacenza} onChange={(e) => setModifica({ ...modifica, giacenza: Number(e.target.value) })} /></Campo>
            <Campo label={`Scorta minima (${modifica.unita}) · avviso sotto questa soglia`}><input className="input" type="number" min={0} step="any" value={modifica.scortaMinima ?? ''} onChange={(e) => setModifica({ ...modifica, scortaMinima: e.target.value === '' ? undefined : Number(e.target.value) })} /></Campo>
            <Campo label="Sospensione latte (giorni)"><input className="input" type="number" min={0} value={modifica.sospensioneLatte ?? ''} onChange={(e) => setModifica({ ...modifica, sospensioneLatte: e.target.value === '' ? undefined : Number(e.target.value) })} /></Campo>
            <Campo label="Note" className="sm:col-span-2"><input className="input" value={modifica.note ?? ''} onChange={(e) => setModifica({ ...modifica, note: e.target.value })} /></Campo>
            <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700 sm:col-span-2">
              Costo per unità: <b>{fmtEur(costoUnitario(modifica))} / {modifica.unita}</b>
              {modifica.giacenza > 0 && <> · valore in magazzino <b>{fmtEur(modifica.giacenza * costoUnitario(modifica))}</b></>}
            </p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}

      {carico && (
        <Modale titolo={`Carica acquisto · ${carico.f.nome}`} onChiudi={() => setCarico(null)}>
          <form onSubmit={salvaCarico} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Confezioni acquistate *"><input className="input" inputMode="decimal" required autoFocus value={carico.confezioni} onChange={(e) => setCarico({ ...carico, confezioni: e.target.value })} /></Campo>
            <Campo label="Prezzo per confezione (€)"><input className="input" inputMode="decimal" value={carico.prezzo} onChange={(e) => setCarico({ ...carico, prezzo: e.target.value })} /></Campo>
            <p className="text-sm text-stone-600 sm:col-span-2">
              Si aggiungono <b>{q((Number(carico.confezioni.replace(',', '.')) || 0) * carico.f.unitaPerConfezione)} {carico.f.unita}</b>: giacenza da {q(carico.f.giacenza)} a {q(carico.f.giacenza + (Number(carico.confezioni.replace(',', '.')) || 0) * carico.f.unitaPerConfezione)} {carico.f.unita}.
              Se il prezzo è cambiato, il nuovo prezzo vale per i trattamenti da ora in poi.
            </p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setCarico(null)}>Annulla</button>
              <button className="btn-primary">Carica</button>
            </div>
          </form>
        </Modale>
      )}
    </>
  )
}
