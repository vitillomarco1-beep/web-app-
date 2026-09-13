import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { clientiStore, calcoliStore } from '../lib/storage'
import { eliminaFascicoloAgea } from '../lib/fileStore'
import type { Cliente, FascicoloAgeaMeta } from '../types'
import FascicoloAgeaUploader from '../components/FascicoloAgeaUploader'

function nuovoFormId() {
  return uuidv4()
}

export default function ClientsPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formId, setFormId] = useState(nuovoFormId)
  const [fascicoloAgea, setFascicoloAgea] = useState<FascicoloAgeaMeta | undefined>()
  const [form, setForm] = useState({
    ragioneSociale: '',
    referente: '',
    email: '',
    telefono: '',
    comune: '',
    provincia: '',
  })

  useEffect(() => {
    setClienti(clientiStore.all())
  }, [])

  function resetForm() {
    setForm({ ragioneSociale: '', referente: '', email: '', telefono: '', comune: '', provincia: '' })
    setFormId(nuovoFormId())
    setFascicoloAgea(undefined)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ragioneSociale.trim()) return
    const cliente: Cliente = {
      id: formId,
      ragioneSociale: form.ragioneSociale.trim(),
      referente: form.referente.trim() || undefined,
      email: form.email.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      comune: form.comune.trim() || undefined,
      provincia: form.provincia.trim() || undefined,
      fascicoloAgea,
      createdAt: new Date().toISOString(),
    }
    clientiStore.save(cliente)
    setClienti(clientiStore.all())
    resetForm()
    setShowForm(false)
  }

  function handleCancelForm() {
    // Se è stato caricato un PDF prima di annullare, evitiamo di lasciarlo orfano.
    if (fascicoloAgea) eliminaFascicoloAgea(formId)
    resetForm()
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare il cliente e tutti i suoi calcoli?')) return
    await eliminaFascicoloAgea(id)
    clientiStore.remove(id)
    setClienti(clientiStore.all())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Clienti</h1>
          <p className="mt-1 text-sm text-stone-500">
            Gestisci i clienti per cui calcolare il bilancio dei crediti di carbonio.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
        >
          {showForm ? 'Annulla' : '+ Nuovo cliente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-semibold text-stone-900">Nuovo cliente</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Ragione sociale / Nome azienda agricola *</label>
              <input
                className="input"
                required
                value={form.ragioneSociale}
                onChange={(e) => setForm({ ...form, ragioneSociale: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Referente</label>
              <input
                className="input"
                value={form.referente}
                onChange={(e) => setForm({ ...form, referente: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input
                className="input"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Comune</label>
              <input
                className="input"
                value={form.comune}
                onChange={(e) => setForm({ ...form, comune: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input
                className="input"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
              />
            </div>
          </div>

          <FascicoloAgeaUploader
            clienteId={formId}
            meta={fascicoloAgea}
            onChange={setFascicoloAgea}
          />

          <div className="flex justify-end gap-2">
            <button type="submit" className="btn-primary">
              Salva cliente
            </button>
          </div>
        </form>
      )}

      {clienti.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun cliente ancora registrato.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clienti.map((c) => (
            <div key={c.id} className="card flex flex-col justify-between">
              <div>
                <Link
                  to={`/clienti/${c.id}`}
                  className="text-lg font-semibold text-forest-700 hover:underline"
                >
                  {c.ragioneSociale}
                </Link>
                <div className="mt-2 space-y-1 text-sm text-stone-500">
                  {c.referente && <p>Referente: {c.referente}</p>}
                  {(c.comune || c.provincia) && (
                    <p>
                      {c.comune}
                      {c.comune && c.provincia ? ' (' + c.provincia + ')' : c.provincia}
                    </p>
                  )}
                  {c.email && <p>{c.email}</p>}
                  {c.fascicoloAgea && (
                    <p className="flex items-center gap-1 text-forest-700">
                      📄 Fascicolo AGEA allegato
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {calcoliStore.byClient(c.id).length} calcoli
                </span>
                <button className="btn-danger" onClick={() => handleDelete(c.id)}>
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
