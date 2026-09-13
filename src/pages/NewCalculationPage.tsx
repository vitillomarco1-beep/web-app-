import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import type { TipoAttivita, DatiCalcolo, Calcolo } from '../types'
import { calcolaBilancio } from '../lib/carbonEngine'
import { calcoliStore, clientiStore } from '../lib/storage'
import AgricolturaForm from '../components/forms/AgricolturaForm'
import ImboschimentoForm from '../components/forms/ImboschimentoForm'

const OPZIONI: { tipo: TipoAttivita; titolo: string; descrizione: string; icona: string }[] = [
  {
    tipo: 'agricoltura_agroforestazione',
    titolo: 'Agricoltura e agroforestazione su suoli minerali',
    descrizione:
      'Pratiche su terre coltivate e prati: gestione colture, lavorazione conservativa, agroforestazione, riduzione N2O.',
    icona: '🌾',
  },
  {
    tipo: 'imboschimento',
    titolo: 'Imboschimento',
    descrizione:
      'Nuovo impianto boschivo su prati, terre coltivate o altri terreni con bassa copertura arborea preesistente.',
    icona: '🌳',
  },
]

export default function NewCalculationPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<TipoAttivita | null>(null)

  if (!clientId) return null
  const cliente = clientiStore.get(clientId)

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

  function handleSave(dati: DatiCalcolo) {
    const now = new Date().toISOString()
    const calcolo: Calcolo = {
      id: uuidv4(),
      clientId: clientId!,
      dati,
      risultato: calcolaBilancio(dati),
      createdAt: now,
      updatedAt: now,
    }
    calcoliStore.save(calcolo)
    navigate(`/clienti/${clientId}/calcoli/${calcolo.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/clienti/${clientId}`} className="text-sm text-stone-500 hover:underline">
          ← {cliente.ragioneSociale}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Nuovo calcolo</h1>
      </div>

      {!tipo ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OPZIONI.map((opt) => (
            <button
              key={opt.tipo}
              onClick={() => setTipo(opt.tipo)}
              className="card text-left transition hover:border-forest-400 hover:shadow-md"
            >
              <span className="text-3xl">{opt.icona}</span>
              <p className="mt-3 font-semibold text-stone-900">{opt.titolo}</p>
              <p className="mt-1 text-sm text-stone-500">{opt.descrizione}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button className="text-sm text-stone-500 hover:underline" onClick={() => setTipo(null)}>
            ← Cambia tipo di attività
          </button>
          {tipo === 'agricoltura_agroforestazione' ? (
            <AgricolturaForm onSubmit={handleSave} submitLabel="Crea calcolo" />
          ) : (
            <ImboschimentoForm onSubmit={handleSave} submitLabel="Crea calcolo" />
          )}
        </div>
      )}
    </div>
  )
}
