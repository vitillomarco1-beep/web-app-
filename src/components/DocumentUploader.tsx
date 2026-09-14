import { useState } from 'react'
import type { FascicoloAgeaMeta } from '../types'
import { formatDate, formatFileSize } from '../lib/format'
import PdfViewerModal from './PdfViewerModal'
import PdfCanvasViewer from './PdfCanvasViewer'

interface Props {
  meta?: FascicoloAgeaMeta
  onChange: (meta: FascicoloAgeaMeta | undefined) => void
  salva: (file: Blob) => Promise<void>
  leggi: () => Promise<Blob | undefined>
  elimina: () => Promise<void>
  etichetta: string
  descrizione?: string
  testoVuoto: string
  confermaRimozione: string
}

const MAX_BYTE = 30 * 1024 * 1024 // 30 MB

export default function DocumentUploader({
  meta,
  onChange,
  salva,
  leggi,
  elimina,
  etichetta,
  descrizione,
  testoVuoto,
  confermaRimozione,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewBlob, setViewBlob] = useState<Blob | null>(null)

  async function handleFile(file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setError('Il documento deve essere un file PDF.')
      return
    }
    if (file.size > MAX_BYTE) {
      setError(`Il file supera la dimensione massima consentita (${formatFileSize(MAX_BYTE)}).`)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await salva(file)
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
      const blob = await leggi()
      if (!blob) {
        setError('File non trovato: prova a ricaricarlo.')
        return
      }
      setViewBlob(blob)
    } catch {
      setError('Impossibile aprire il file.')
    }
  }

  function handleCloseView() {
    setViewBlob(null)
  }

  async function handleRemove() {
    if (!confirm(confermaRimozione)) return
    await elimina()
    onChange(undefined)
  }

  return (
    <div className="space-y-2">
      <label className="label">{etichetta}</label>
      {descrizione && <p className="text-xs text-stone-500">{descrizione}</p>}

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
          <span>{loading ? 'Caricamento in corso…' : testoVuoto}</span>
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

      {viewBlob && (
        <PdfViewerModal titolo={meta?.nomeFile ?? etichetta} onClose={handleCloseView}>
          <PdfCanvasViewer blob={viewBlob} />
        </PdfViewerModal>
      )}
    </div>
  )
}
