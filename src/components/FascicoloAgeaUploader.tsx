import { useState } from 'react'
import type { FascicoloAgeaMeta } from '../types'
import { salvaFascicoloAgea, leggiFascicoloAgea, eliminaFascicoloAgea } from '../lib/fileStore'
import { formatDate, formatFileSize } from '../lib/format'

interface Props {
  clienteId: string
  meta?: FascicoloAgeaMeta
  onChange: (meta: FascicoloAgeaMeta | undefined) => void
}

const MAX_BYTE = 30 * 1024 * 1024 // 30 MB

export default function FascicoloAgeaUploader({ clienteId, meta, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setError('Il fascicolo aziendale deve essere un file PDF.')
      return
    }
    if (file.size > MAX_BYTE) {
      setError(`Il file supera la dimensione massima consentita (${formatFileSize(MAX_BYTE)}).`)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await salvaFascicoloAgea(clienteId, file)
      onChange({
        nomeFile: file.name,
        dimensioneByte: file.size,
        caricatoIl: new Date().toISOString(),
      })
    } catch {
      setError('Si è verificato un errore durante il caricamento del file. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  async function handleView() {
    setError(null)
    try {
      const blob = await leggiFascicoloAgea(clienteId)
      if (!blob) {
        setError('File non trovato: prova a ricaricarlo.')
        return
      }
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setError('Impossibile aprire il file.')
    }
  }

  async function handleRemove() {
    if (!confirm('Rimuovere il fascicolo aziendale AGEA allegato a questo cliente?')) return
    await eliminaFascicoloAgea(clienteId)
    onChange(undefined)
  }

  return (
    <div className="space-y-2">
      <label className="label">Fascicolo aziendale AGEA (PDF)</label>
      <p className="text-xs text-stone-500">
        Allega il fascicolo aziendale AGEA del cliente: contiene i dati aziendali utili per
        impostare correttamente i calcoli (particelle, superfici, coltivazioni, capi allevati).
      </p>

      {meta ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📄</span>
            <div>
              <p className="text-sm font-medium text-stone-800">{meta.nomeFile}</p>
              <p className="text-xs text-stone-500">
                {formatFileSize(meta.dimensioneByte)} · caricato il {formatDate(meta.caricatoIl)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={handleView}>
              Visualizza
            </button>
            <label className="btn-secondary cursor-pointer">
              Sostituisci
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={loading}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            <button type="button" className="btn-danger" onClick={handleRemove}>
              Rimuovi
            </button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-stone-300 p-5 text-center text-sm text-stone-500 transition hover:border-forest-400 hover:bg-forest-50/50">
          <span className="text-2xl">📎</span>
          <span>
            {loading
              ? 'Caricamento in corso…'
              : 'Clicca per allegare il fascicolo aziendale AGEA in PDF'}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={loading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
