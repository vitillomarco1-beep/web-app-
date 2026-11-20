import { useState } from 'react'

interface Props {
  onConfirm: () => void
  label?: string
  confirmText?: string
  className?: string
}

/** Bottone di eliminazione con conferma inline, al posto di window.confirm():
 * i dialoghi nativi del browser (confirm/alert/prompt) possono essere
 * bloccati o restituire sempre "annulla" senza avviso negli iframe sandboxed
 * come l'anteprima pubblicata su claude.ai — lo stesso motivo per cui il
 * download del PDF e i popup sono già segnalati come bloccabili altrove in
 * questa app (si veda ReportPreview.tsx). Un primo click mostra "Confermi?"
 * con due bottoni; l'azione scatta solo al secondo click, dentro la pagina
 * stessa, senza dipendere da API del browser che l'ambiente di hosting può
 * disabilitare. */
export default function ConfirmButton({ onConfirm, label = 'Elimina', confirmText = 'Confermi?', className = 'btn-danger' }: Props) {
  const [inConferma, setInConferma] = useState(false)

  if (inConferma) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-red-700">{confirmText}</span>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            setInConferma(false)
            onConfirm()
          }}
        >
          Sì, elimina
        </button>
        <button type="button" className="btn-secondary" onClick={() => setInConferma(false)}>
          Annulla
        </button>
      </span>
    )
  }

  return (
    <button type="button" className={className} onClick={() => setInConferma(true)}>
      {label}
    </button>
  )
}
