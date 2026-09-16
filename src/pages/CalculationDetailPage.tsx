import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { calcoliStore, clientiStore } from '../lib/storage'
import { calcolaBilancio } from '../lib/carbonEngine'
import type { DatiCalcolo } from '../types'
import ResultPanel from '../components/ResultPanel'
import AgricolturaForm from '../components/forms/AgricolturaForm'
import ImboschimentoForm from '../components/forms/ImboschimentoForm'
import ZootecniaForm from '../components/forms/ZootecniaForm'
import { formatDate, TIPO_ATTIVITA_LABEL } from '../lib/format'

export default function CalculationDetailPage() {
  const { clientId, calcId } = useParams<{ clientId: string; calcId: string }>()
  const navigate = useNavigate()
  const [editMode, setEditMode] = useState(false)

  if (!clientId || !calcId) return null

  const cliente = clientiStore.get(clientId)
  const calcolo = calcoliStore.get(calcId)

  if (!cliente || !calcolo) {
    return (
      <div className="card text-center text-sm text-stone-500">
        Calcolo non trovato.{' '}
        <Link to={`/clienti/${clientId}`} className="text-forest-700 hover:underline">
          Torna al cliente
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
    calcoliStore.save(updated)
    setEditMode(false)
  }

  function handleDelete() {
    if (!confirm('Eliminare questo calcolo?')) return
    calcoliStore.remove(calcId!)
    navigate(`/clienti/${clientId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to={`/clienti/${clientId}`} className="text-sm text-stone-500 hover:underline">
            ← {cliente.ragioneSociale}
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
              regioneCliente={cliente.regione}
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
        <ResultPanel
          risultato={calcolo.risultato}
          dati={calcolo.dati}
          nomeTitolare={cliente.ragioneSociale}
        />
      )}
    </div>
  )
}
