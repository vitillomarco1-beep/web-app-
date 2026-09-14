import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  titolo: string
  onClose: () => void
  children: ReactNode
}

/** Overlay generico per mostrare un documento all'interno della pagina, invece che
 * in una nuova scheda o in un iframe con un blob: un iframe/embed con src blob:
 * può essere bloccato dalle policy di sicurezza (CSP) di un'anteprima pubblicata
 * indipendentemente dal codice, così come window.open() può essere negato dai
 * permessi di popup. Il contenuto (markup nativo o un canvas) va quindi renderizzato
 * direttamente nel DOM della pagina stessa: si vedano ReportPreview e PdfCanvasViewer. */
export default function PdfViewerModal({ titolo, onClose, children }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900/85 p-3 sm:p-6">
      <div className="flex items-center justify-between pb-3">
        <h3 className="font-medium text-white">{titolo}</h3>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Chiudi ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-white shadow-xl">{children}</div>
    </div>
  )
}
