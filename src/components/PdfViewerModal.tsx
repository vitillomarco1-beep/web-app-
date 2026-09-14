import { useEffect } from 'react'

interface Props {
  url: string
  titolo: string
  onClose: () => void
}

/** Mostra un PDF in un overlay all'interno della pagina, invece che in una nuova
 * scheda: aprire una nuova scheda con window.open() richiede i permessi di popup,
 * che nel contesto sandboxato di un'anteprima pubblicata possono essere negati a
 * prescindere dal codice — un iframe nella pagina stessa non ha questo problema. */
export default function PdfViewerModal({ url, titolo, onClose }: Props) {
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
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-white shadow-xl">
        <iframe src={url} title={titolo} className="h-full w-full border-0" />
      </div>
    </div>
  )
}
