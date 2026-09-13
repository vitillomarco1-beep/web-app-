import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gruppiStore, calcoliGruppoStore, clientiStore } from '../lib/storage'
import type { Gruppo, CalcoloGruppo, Cliente } from '../types'
import { formatTCO2, formatDate, TIPO_ATTIVITA_LABEL } from '../lib/format'
import { ATTIVITA_OPZIONI } from '../lib/attivita'

export default function GroupDetailPage() {
  const { gruppoId } = useParams<{ gruppoId: string }>()
  const navigate = useNavigate()
  const [gruppo, setGruppo] = useState<Gruppo | undefined>()
  const [calcoli, setCalcoli] = useState<CalcoloGruppo[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [modificaMembri, setModificaMembri] = useState(false)
  const [nuovoMembroId, setNuovoMembroId] = useState('')

  useEffect(() => {
    if (!gruppoId) return
    setGruppo(gruppiStore.get(gruppoId))
    setCalcoli(calcoliGruppoStore.byGruppo(gruppoId))
    setClienti(clientiStore.all())
  }, [gruppoId])

  if (!gruppoId) return null

  if (!gruppo) {
    return (
      <div className="card text-center text-sm text-stone-500">
        Gruppo non trovato.{' '}
        <Link to="/gruppi" className="text-forest-700 hover:underline">
          Torna alla lista gruppi
        </Link>
        .
      </div>
    )
  }

  function nomeCliente(clienteId: string): string {
    return clienti.find((c) => c.id === clienteId)?.ragioneSociale ?? 'Cliente eliminato'
  }

  function handleDeleteCalcolo(id: string) {
    if (!confirm('Eliminare questo calcolo?')) return
    calcoliGruppoStore.remove(id)
    setCalcoli(calcoliGruppoStore.byGruppo(gruppoId!))
  }

  function aggiornaQuota(clienteId: string, quotaPercento: number) {
    const aggiornato: Gruppo = {
      ...gruppo!,
      membri: gruppo!.membri.map((m) => (m.clienteId === clienteId ? { ...m, quotaPercento } : m)),
    }
    gruppiStore.save(aggiornato)
    setGruppo(aggiornato)
  }

  function rimuoviMembro(clienteId: string) {
    if (gruppo!.membri.length <= 2) {
      alert('Un gruppo richiede almeno 2 membri: eliminalo se non serve più.')
      return
    }
    if (!confirm(`Rimuovere ${nomeCliente(clienteId)} dal gruppo?`)) return
    const aggiornato: Gruppo = {
      ...gruppo!,
      membri: gruppo!.membri.filter((m) => m.clienteId !== clienteId),
    }
    gruppiStore.save(aggiornato)
    setGruppo(aggiornato)
  }

  function aggiungiMembro() {
    if (!nuovoMembroId) return
    const aggiornato: Gruppo = {
      ...gruppo!,
      membri: [...gruppo!.membri, { clienteId: nuovoMembroId, quotaPercento: 0 }],
    }
    gruppiStore.save(aggiornato)
    setGruppo(aggiornato)
    setNuovoMembroId('')
  }

  const totaleCrediti = calcoli.reduce((s, c) => s + c.risultato.beneficioNettoTotaleTCO2, 0)
  const ambitiAttivi = ATTIVITA_OPZIONI.filter((opt) =>
    calcoli.some((c) => c.dati.tipoAttivita === opt.tipo),
  )
  const sommaQuote = gruppo.membri.reduce((s, m) => s + (m.quotaPercento ?? 0), 0)
  const clientiDisponibili = clienti.filter(
    (c) => !gruppo!.membri.some((m) => m.clienteId === c.id),
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/gruppi" className="text-sm text-stone-500 hover:underline">
          ← Tutti i gruppi
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{gruppo.nome}</h1>
            <p className="mt-1 text-sm text-stone-500">
              {gruppo.referente ? `Referente: ${gruppo.referente}` : 'Nessun referente indicato'} ·{' '}
              {gruppo.membri.length} aziende
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
          <button
            className="btn-primary"
            onClick={() => navigate(`/gruppi/${gruppoId}/nuovo-calcolo`)}
          >
            + Nuovo calcolo
          </button>
        </div>
      </div>

      <div className="card flex items-center justify-between">
        <p className="text-sm text-stone-500">Crediti netti totali stimati per il gruppo</p>
        <p className="text-2xl font-bold text-forest-700">
          {formatTCO2(totaleCrediti)} <span className="text-sm font-medium">t CO₂eq</span>
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Aziende membro e ripartizione crediti</h2>
          <button className="btn-secondary" onClick={() => setModificaMembri((v) => !v)}>
            {modificaMembri ? 'Fatto' : 'Gestisci membri'}
          </button>
        </div>

        {sommaQuote !== 100 && (
          <p className="text-xs text-amber-700">
            ⚠️ Le quote sommano al {formatTCO2(sommaQuote)}%, non al 100%. La ripartizione sotto è
            comunque calcolata sulle percentuali indicate.
          </p>
        )}

        <div className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Azienda</th>
                <th className="px-3 py-2">Quota</th>
                <th className="px-3 py-2 text-right">Crediti spettanti</th>
                {modificaMembri && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {gruppo.membri.map((m) => (
                <tr key={m.clienteId}>
                  <td className="px-3 py-2">
                    <Link to={`/clienti/${m.clienteId}`} className="text-forest-700 hover:underline">
                      {nomeCliente(m.clienteId)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {modificaMembri ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          className="input !w-20 !py-1"
                          value={m.quotaPercento ?? 0}
                          onChange={(e) =>
                            aggiornaQuota(m.clienteId, parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-stone-500">%</span>
                      </div>
                    ) : (
                      `${m.quotaPercento ?? 0}%`
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-forest-700">
                    {formatTCO2(totaleCrediti * ((m.quotaPercento ?? 0) / 100))} t CO₂eq
                  </td>
                  {modificaMembri && (
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => rimuoviMembro(m.clienteId)}
                      >
                        Rimuovi
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modificaMembri && clientiDisponibili.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              className="input"
              value={nuovoMembroId}
              onChange={(e) => setNuovoMembroId(e.target.value)}
            >
              <option value="">Aggiungi azienda al gruppo...</option>
              {clientiDisponibili.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ragioneSociale}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={aggiungiMembro} disabled={!nuovoMembroId}>
              Aggiungi
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-stone-900">Calcoli condivisi</h2>
      {calcoli.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun calcolo ancora. Crea il primo calcolo condiviso per questo gruppo.
        </div>
      ) : (
        <div className="space-y-3">
          {calcoli.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to={`/gruppi/${gruppoId}/calcoli/${c.id}`}
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
