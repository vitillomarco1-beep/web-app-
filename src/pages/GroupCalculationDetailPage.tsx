import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { calcoliGruppoStore, gruppiStore, clientiStore } from '../lib/storage'
import { calcolaBilancio } from '../lib/carbonEngine'
import type { DatiCalcolo } from '../types'
import ResultPanel from '../components/ResultPanel'
import AgricolturaForm from '../components/forms/AgricolturaForm'
import ImboschimentoForm from '../components/forms/ImboschimentoForm'
import ZootecniaForm from '../components/forms/ZootecniaForm'
import { formatDate, formatTCO2, TIPO_ATTIVITA_LABEL } from '../lib/format'

export default function GroupCalculationDetailPage() {
  const { gruppoId, calcId } = useParams<{ gruppoId: string; calcId: string }>()
  const navigate = useNavigate()
  const [editMode, setEditMode] = useState(false)

  if (!gruppoId || !calcId) return null

  const gruppo = gruppiStore.get(gruppoId)
  const calcolo = calcoliGruppoStore.get(calcId)
  const clienti = clientiStore.all()

  if (!gruppo || !calcolo) {
    return (
      <div className="card text-center text-sm text-stone-500">
        Calcolo non trovato.{' '}
        <Link to={`/gruppi/${gruppoId}`} className="text-forest-700 hover:underline">
          Torna al gruppo
        </Link>
        .
      </div>
    )
  }

  function handleUpdate(dati: DatiCalcolo) {
    const updated = {
      ...calcolo!,
      dati,
      risultato: calcolaBilancio(dati),
      updatedAt: new Date().toISOString(),
    }
    calcoliGruppoStore.save(updated)
    setEditMode(false)
  }

  function handleDelete() {
    if (!confirm('Eliminare questo calcolo?')) return
    calcoliGruppoStore.remove(calcId!)
    navigate(`/gruppi/${gruppoId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to={`/gruppi/${gruppoId}`} className="text-sm text-stone-500 hover:underline">
            ← {gruppo.nome}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">{calcolo.dati.nomeCalcolo}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {TIPO_ATTIVITA_LABEL[calcolo.dati.tipoAttivita]} · {calcolo.dati.areaAttivitaHa} ha ·
            creato il {formatDate(calcolo.createdAt)}
            {calcolo.updatedAt !== calcolo.createdAt &&
              ` · aggiornato il ${formatDate(calcolo.updatedAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setEditMode((e) => !e)}>
            {editMode ? 'Annulla modifica' : 'Modifica'}
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            Elimina
          </button>
        </div>
      </div>

      {editMode ? (
        <>
          {calcolo.dati.tipoAttivita === 'agricoltura_agroforestazione' && (
            <AgricolturaForm
              initial={calcolo.dati}
              onSubmit={handleUpdate}
              submitLabel="Salva modifiche"
            />
          )}
          {calcolo.dati.tipoAttivita === 'imboschimento' && (
            <ImboschimentoForm
              initial={calcolo.dati}
              onSubmit={handleUpdate}
              submitLabel="Salva modifiche"
            />
          )}
          {calcolo.dati.tipoAttivita === 'zootecnia' && (
            <ZootecniaForm
              initial={calcolo.dati}
              onSubmit={handleUpdate}
              submitLabel="Salva modifiche"
            />
          )}
        </>
      ) : (
        <>
          <ResultPanel
            risultato={calcolo.risultato}
            dati={calcolo.dati}
            nomeTitolare={`Gruppo ${gruppo.nome}`}
          />

          {calcolo.risultato.metodologiaDisponibile && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-stone-900">
                Ripartizione tra le aziende del gruppo
              </h3>
              <div className="overflow-hidden rounded-md border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Azienda</th>
                      <th className="px-3 py-2">Quota</th>
                      <th className="px-3 py-2 text-right">Crediti spettanti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {gruppo.membri.map((m) => (
                      <tr key={m.clienteId}>
                        <td className="px-3 py-2">
                          {clienti.find((c) => c.id === m.clienteId)?.ragioneSociale ??
                            'Cliente eliminato'}
                        </td>
                        <td className="px-3 py-2">{m.quotaPercento ?? 0}%</td>
                        <td className="px-3 py-2 text-right font-medium text-forest-700">
                          {formatTCO2(
                            calcolo.risultato.beneficioNettoTotaleTCO2 *
                              ((m.quotaPercento ?? 0) / 100),
                          )}{' '}
                          t CO₂eq
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-stone-500">
                Le quote si modificano dalla scheda del gruppo. La ripartizione è indicativa e non
                sostituisce l'accordo tra le aziende sui costi di certificazione.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
