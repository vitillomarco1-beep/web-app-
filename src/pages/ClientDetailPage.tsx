import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { clientiStore, calcoliStore } from '../lib/storage'
import type { Cliente, Calcolo, FascicoloAgeaMeta } from '../types'
import { formatTCO2, formatDate, TIPO_ATTIVITA_LABEL } from '../lib/format'
import { ATTIVITA_OPZIONI } from '../lib/attivita'
import FascicoloAgeaUploader from '../components/FascicoloAgeaUploader'
import { REGIONI_ITALIANE } from '../lib/serviziMeteoRegionali'

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | undefined>()
  const [calcoli, setCalcoli] = useState<Calcolo[]>([])
  const [editMode, setEditMode] = useState(false)
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
    if (!clientId) return
    setCliente(clientiStore.get(clientId))
    setCalcoli(calcoliStore.byClient(clientId))
  }, [clientId])

  if (!clientId) return null

  if (!cliente) {
    return (
      <div className="card text-center text-sm text-stone-500">
        Cliente non trovato.{' '}
        <Link to="/clienti" className="text-forest-700 hover:underline">
          Torna alla lista clienti
        </Link>
        .
      </div>
    )
  }

  function handleDeleteCalcolo(id: string) {
    if (!confirm('Eliminare questo calcolo?')) return
    calcoliStore.remove(id)
    setCalcoli(calcoliStore.byClient(clientId!))
  }

  function apriModifica() {
    setForm({
      ragioneSociale: cliente!.ragioneSociale,
      referente: cliente!.referente ?? '',
      email: cliente!.email ?? '',
      telefono: cliente!.telefono ?? '',
      comune: cliente!.comune ?? '',
      provincia: cliente!.provincia ?? '',
      regione: cliente!.regione ?? '',
    })
    setEditMode(true)
  }

  function handleSalvaModifica(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ragioneSociale.trim()) return
    const aggiornato: Cliente = {
      ...cliente!,
      ragioneSociale: form.ragioneSociale.trim(),
      referente: form.referente.trim() || undefined,
      email: form.email.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      comune: form.comune.trim() || undefined,
      provincia: form.provincia.trim() || undefined,
      regione: form.regione || undefined,
    }
    clientiStore.save(aggiornato)
    setCliente(aggiornato)
    setEditMode(false)
  }

  function handleFascicoloChange(fascicoloAgea: FascicoloAgeaMeta | undefined) {
    const aggiornato = { ...cliente!, fascicoloAgea }
    clientiStore.save(aggiornato)
    setCliente(aggiornato)
  }

  const totaleCrediti = calcoli.reduce((s, c) => s + c.risultato.beneficioNettoTotaleTCO2, 0)
  const ambitiAttivi = ATTIVITA_OPZIONI.filter((opt) =>
    calcoli.some((c) => c.dati.tipoAttivita === opt.tipo),
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/clienti" className="text-sm text-stone-500 hover:underline">
          ← Tutti i clienti
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{cliente.ragioneSociale}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {[cliente.referente, cliente.comune, cliente.provincia, cliente.regione]
                .filter(Boolean)
                .join(' · ') || 'Nessun dettaglio aggiuntivo'}
            </p>
            {ambitiAttivi.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ambitiAttivi.map((opt) => (
                  <span
                    key={opt.tipo}
                    className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-medium text-forest-800"
                  >
                    {opt.icona} {opt.titolo}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => (editMode ? setEditMode(false) : apriModifica())}>
              {editMode ? 'Annulla' : 'Modifica'}
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate(`/clienti/${clientId}/nuovo-calcolo`)}
            >
              + Nuovo calcolo
            </button>
          </div>
        </div>
      </div>

      {editMode && (
        <form onSubmit={handleSalvaModifica} className="card space-y-4">
          <h2 className="font-semibold text-stone-900">Modifica dati cliente</h2>
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
            <div>
              <label className="label">Regione</label>
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
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Salva modifiche
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="card flex items-center justify-between">
        <p className="text-sm text-stone-500">Crediti netti totali stimati per questo cliente</p>
        <p className="text-2xl font-bold text-forest-700">
          {formatTCO2(totaleCrediti)} <span className="text-sm font-medium">t CO₂eq</span>
        </p>
      </div>

      <div className="card">
        <FascicoloAgeaUploader
          clienteId={cliente.id}
          meta={cliente.fascicoloAgea}
          onChange={handleFascicoloChange}
        />
      </div>

      <h2 className="text-lg font-semibold text-stone-900">Calcoli</h2>
      {calcoli.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun calcolo ancora. Crea il primo calcolo per questo cliente.
        </div>
      ) : (
        <div className="space-y-3">
          {calcoli.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to={`/clienti/${clientId}/calcoli/${c.id}`}
                  className="font-semibold text-forest-700 hover:underline"
                >
                  {c.dati.nomeCalcolo}
                </Link>
                <p className="text-sm text-stone-500">
                  {TIPO_ATTIVITA_LABEL[c.dati.tipoAttivita]} · {c.dati.areaAttivitaHa} ha ·{' '}
                  {formatDate(c.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-forest-700">
                    {formatTCO2(c.risultato.beneficioNettoTotaleTCO2)} t CO₂eq
                  </p>
                  {c.risultato.deficitCreditiTCO2 > 0 && (
                    <p className="text-xs text-red-600">
                      Deficit: {formatTCO2(c.risultato.deficitCreditiTCO2)} t CO₂eq
                    </p>
                  )}
                </div>
                <button className="btn-danger" onClick={() => handleDeleteCalcolo(c.id)}>
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
