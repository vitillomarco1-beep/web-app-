import { useEffect, useState } from 'react'
import { chiaveFoto, leggiFoto } from '../lib/fotoStore'

/** Miniature delle foto della pesata salvate per un giro (data + turno). */
export default function FotoPesate({ data, turno, quante, etichette }: { data: string; turno: string; quante: number; etichette: string[] }) {
  const [urls, setUrls] = useState<(string | null)[]>([])

  useEffect(() => {
    let annullato = false
    const create: string[] = []
    Promise.all(Array.from({ length: quante }, (_, i) => leggiFoto(chiaveFoto(data, turno, i)).catch(() => undefined))).then((blobs) => {
      if (annullato) return
      setUrls(blobs.map((b) => {
        if (!b) return null
        const u = URL.createObjectURL(b)
        create.push(u)
        return u
      }))
    })
    return () => { annullato = true; create.forEach((u) => URL.revokeObjectURL(u)) }
  }, [data, turno, quante])

  if (!urls.some(Boolean)) return null
  return (
    <div className="mt-3 flex gap-2">
      {urls.map((u, i) => u && (
        <a key={i} href={u} target="_blank" rel="noreferrer" className="text-center" title={`Apri foto: ${etichette[i]}`}>
          <img src={u} alt={`Foto pesata: ${etichette[i]}`} className="h-20 w-16 rounded object-cover ring-1 ring-stone-200" />
          <span className="mt-0.5 block text-[10px] text-stone-500">{etichette[i]}</span>
        </a>
      ))}
    </div>
  )
}
