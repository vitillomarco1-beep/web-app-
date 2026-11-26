import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { clientiStore, calcoliStore } from '../lib/storage'
import { eliminaFascicoloAgea } from '../lib/fileStore'
import type { Cliente, FascicoloAgeaMeta } from '../types'
import FascicoloAgeaUploader from '../components/FascicoloAgeaUploader'
import ConfirmButton from '../components/ConfirmButton'
import { REGIONI_ITALIANE } from '../lib/serviziMeteoRegionali'
import { FileText } from 'lucide-react'

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
    regione: '',
  })

  useEffect(() => {
    setClienti(clientiStore.all())
  }, [])

  function resetForm() {
    setForm({
      ragioneSociale: '',
      referente: '',
      email: '',
      telefono: '',
      comune: '',
      provincia: '',
      regione: '',
    })
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
      regione: form.regione || undefined,
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
        {!showForm && (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            + Nuovo cliente
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">Nuovo cliente</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block">
                <span className="label">Ragione sociale / Nome azienda agricola *</span>
                <input
                  className="input"
                  required
                  value={form.ragioneSociale}
                  onChange={(e) => setForm({ ...form, ragioneSociale: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Referente</span>
                <input
                  className="input"
                  value={form.referente}
                  onChange={(e) => setForm({ ...form, referente: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Telefono</span>
                <input
                  className="input"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Comune</span>
                <input
                  className="input"
                  value={form.comune}
                  onChange={(e) => setForm({ ...form, comune: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Provincia</span>
                <input
                  className="input"
                  value={form.provincia}
                  onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Regione</span>
                <select
                  className="input"
                  value={form.regione}
                  onChange={(e) => setForm({ ...form, regione: e.target.value })}
                >
                  <option value="">— non specificata —</option>
                  {REGIONI_ITALIANE.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-xs text-stone-500">
                Usata solo per proporre il link al servizio agrometeorologico pubblico della zona
                nel simulatore RothC.
              </p>
            </div>
          </div>

          <FascicoloAgeaUploader
            clienteId={formId}
            meta={fascicoloAgea}
            onChange={setFascicoloAgea}
          />

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={handleCancelForm}>
              Annulla
            </button>
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
                  {(c.comune || c.provincia || c.regione) && (
                    <p>
                      {c.comune}
                      {c.comune && c.provincia ? ' (' + c.provincia + ')' : c.provincia}
                      {c.regione ? (c.comune || c.provincia ? ' — ' : '') + c.regione : ''}
                    </p>
                  )}
                  {c.email && <p>{c.email}</p>}
                  {c.fascicoloAgea && (
                    <p className="flex items-center gap-1 text-forest-700">
                      <FileText className="icon" aria-hidden="true" />Fascicolo AGEA allegato
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  {calcoliStore.byClient(c.id).length} calcoli
                </span>
                <ConfirmButton
                  onConfirm={() => handleDelete(c.id)}
                  label="Elimina"
                  confirmText="Eliminare il cliente e tutti i suoi calcoli?"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
