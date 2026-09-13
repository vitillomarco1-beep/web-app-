import type { FascicoloAgeaMeta } from '../types'
import { salvaFascicoloAgea, leggiFascicoloAgea, eliminaFascicoloAgea } from '../lib/fileStore'
import DocumentUploader from './DocumentUploader'

interface Props {
  clienteId: string
  meta?: FascicoloAgeaMeta
  onChange: (meta: FascicoloAgeaMeta | undefined) => void
}

export default function FascicoloAgeaUploader({ clienteId, meta, onChange }: Props) {
  return (
    <DocumentUploader
      meta={meta}
      onChange={onChange}
      salva={(file) => salvaFascicoloAgea(clienteId, file)}
      leggi={() => leggiFascicoloAgea(clienteId)}
      elimina={() => eliminaFascicoloAgea(clienteId)}
      etichetta="Fascicolo aziendale AGEA (PDF)"
      descrizione="Allega il fascicolo aziendale AGEA del cliente: contiene i dati aziendali utili per impostare correttamente i calcoli (particelle, superfici, coltivazioni, capi allevati)."
      testoVuoto="Clicca per allegare il fascicolo aziendale AGEA in PDF"
      confermaRimozione="Rimuovere il fascicolo aziendale AGEA allegato a questo cliente?"
    />
  )
}
