import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { gruppiStore, calcoliGruppoStore, clientiStore } from '../lib/storage'
import type { Gruppo, Cliente } from '../types'

function nomiMembri(gruppo: Gruppo, clienti: Cliente[]): string {
  return gruppo.membri
    .map((m) => clienti.find((c) => c.id === m.clienteId)?.ragioneSociale ?? 'Cliente eliminato')
    .join(', ')
}

export default function GroupsPage() {
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [referente, setReferente] = useState('')
  const [note, setNote] = useState('')
  const [membriSelezionati, setMembriSelezionati] = useState<string[]>([])

  useEffect(() => {
    setGruppi(gruppiStore.all())
    setClienti(clientiStore.all())
  }, [])

  function resetForm() {
    setNome('')
    setReferente('')
    setNote('')
    setMembriSelezionati([])
  }

  function toggleMembro(clienteId: string) {
    setMembriSelezionati((prev) =>
      prev.includes(clienteId) ? prev.filter((id) => id !== clienteId) : [...prev, clienteId],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || membriSelezionati.length < 2) return
    const quota = Math.round((100 / membriSelezionati.length) * 100) / 100
    const gruppo: Gruppo = {
      id: uuidv4(),
      nome: nome.trim(),
      referente: referente.trim() || undefined,
      note: note.trim() || undefined,
      membri: membriSelezionati.map((clienteId) => ({ clienteId, quotaPercento: quota })),
      createdAt: new Date().toISOString(),
    }
    gruppiStore.save(gruppo)
    setGruppi(gruppiStore.all())
    resetForm()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminare il gruppo e tutti i suoi calcoli condivisi?')) return
    gruppiStore.remove(id)
    setGruppi(gruppiStore.all())
  }

  function handleCancelForm() {
    resetForm()
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Gruppi di gestori</h1>
          <p className="mt-1 text-sm text-stone-500">
            Più aziende che collaborano per un'unica certificazione condivisa, ripartendo i
            costi e i crediti risultanti.
          </p>
        </div>
        <button
          className="btn-primary whitespace-nowrap"
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
        >
          {showForm ? 'Annulla' : '+ Nuovo gruppo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-semibold text-stone-900">Nuovo gruppo di gestori</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome del gruppo *</label>
              <input
                className="input"
                required
                placeholder="Es. Consorzio Valle Verde"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Referente / coordinatore</label>
              <input className="input" value={referente} onChange={(e) => setReferente(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div>
            <label className="label">Aziende membro (almeno 2) *</label>
            {clienti.length === 0 ? (
              <p className="text-sm text-stone-500">
                Nessun cliente disponibile:{' '}
                <Link to="/clienti" className="text-forest-700 hover:underline">
                  creane prima uno
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-2">
                {clienti.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                      checked={membriSelezionati.includes(c.id)}
                      onChange={() => toggleMembro(c.id)}
                    />
                    {c.ragioneSociale}
                  </label>
                ))}
              </div>
            )}
            {membriSelezionati.length === 1 && (
              <p className="mt-1 text-xs text-amber-700">
                Seleziona almeno un'altra azienda: un gruppo richiede almeno 2 membri.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="submit" className="btn-primary" disabled={membriSelezionati.length < 2}>
              Salva gruppo
            </button>
          </div>
        </form>
      )}

      {gruppi.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun gruppo ancora registrato.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gruppi.map((g) => (
            <div key={g.id} className="card flex flex-col justify-between">
              <div>
                <Link
                  to={`/gruppi/${g.id}`}
                  className="text-lg font-semibold text-forest-700 hover:underline"
                >
                  {g.nome}
                </Link>
                <div className="mt-2 space-y-1 text-sm text-stone-500">
                  {g.referente && <p>Referente: {g.referente}</p>}
                  <p>{g.membri.length} aziende: {nomiMembri(g, clienti)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {calcoliGruppoStore.byGruppo(g.id).length} calcoli
                </span>
                <button className="btn-danger" onClick={() => handleDelete(g.id)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
