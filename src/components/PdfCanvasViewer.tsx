import { useEffect, useRef, useState } from 'react'

interface Props {
  blob: Blob
}

/** Mostra un PDF arbitrario (es. caricato dal cliente) disegnandone le pagine su
 * <canvas> con pdf.js, invece di un iframe/embed con blob: come sorgente: nel
 * contesto di un'anteprima pubblicata quest'ultimo può essere bloccato dalle
 * policy di sicurezza a prescindere dal codice, mentre disegnare su canvas non
 * richiede caricare risorse in un nuovo contesto di navigazione. */
export default function PdfCanvasViewer({ blob }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stato, setStato] = useState<'caricamento' | 'pronto' | 'errore'>('caricamento')

  useEffect(() => {
    let annullato = false

    async function render() {
      try {
        // Build "legacy" di pdf.js: la build principale richiede metodi JS
        // recentissimi (es. Map.prototype.getOrInsertComputed) non ancora supportati
        // da tutte le versioni di Chrome/Chromium in circolazione — la build legacy
        // punta alla massima compatibilità con i browser reali dei clienti.
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        // Il worker di pdf.js è un modulo ES: va istanziato con l'import "?worker" di
        // Vite (che lo carica con new Worker(url, { type: 'module' })), altrimenti il
        // browser lo esegue come script classico, fallisce in silenzio dentro il
        // worker stesso e la generazione resta bloccata per sempre senza errori.
        const PdfWorker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker'))
          .default
        pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

        const arrayBuffer = await blob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        if (annullato || !containerRef.current) return

        containerRef.current.innerHTML = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.4 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto 12px'
          canvas.style.maxWidth = '100%'
          canvas.style.height = 'auto'
          canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          if (annullato) return
          containerRef.current?.appendChild(canvas)
        }
        if (!annullato) setStato('pronto')
      } catch (err) {
        console.error('PdfCanvasViewer', err)
        if (!annullato) setStato('errore')
      }
    }

    render()
    return () => {
      annullato = true
    }
  }, [blob])

  return (
    <div className="h-full overflow-auto bg-stone-100 p-4">
      {stato === 'caricamento' && (
        <p className="pt-10 text-center text-sm text-stone-500">Caricamento del documento…</p>
      )}
      {stato === 'errore' && (
        <p className="pt-10 text-center text-sm text-red-600">
          Impossibile visualizzare il PDF in anteprima.
        </p>
      )}
      <div ref={containerRef} />
    </div>
  )
}
