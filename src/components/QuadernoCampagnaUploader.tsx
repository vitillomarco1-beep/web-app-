import type { QuadernoCampagnaMeta } from '../types'
import { salvaQuadernoCampagnaDoc, leggiQuadernoCampagnaDoc, eliminaQuadernoCampagnaDoc } from '../lib/fileStore'
import DocumentUploader from './DocumentUploader'

interface Props {
  clienteId: string
  meta?: QuadernoCampagnaMeta
  onChange: (meta: QuadernoCampagnaMeta | undefined) => void
}

/** Allega il documento ufficiale del quaderno di campagna digitale (PDF/export
 * dal gestionale del cliente o dal registro regionale), da tenere come prova
 * accanto ai dati strutturati di appezzamenti/operazioni inseriti più sotto in
 * questa pagina: un conto è il documento ufficiale così com'è, un altro sono i
 * dati estratti per alimentare RothC e il calcolo N2O. */
export default function QuadernoCampagnaUploader({ clienteId, meta, onChange }: Props) {
  return (
    <DocumentUploader
      meta={meta}
      onChange={onChange}
      salva={(file) => salvaQuadernoCampagnaDoc(clienteId, file)}
      leggi={() => leggiQuadernoCampagnaDoc(clienteId)}
      elimina={() => eliminaQuadernoCampagnaDoc(clienteId)}
      etichetta="Quaderno di campagna digitale (PDF)"
      descrizione="Allega l'export/stampa del quaderno di campagna digitale ufficiale del cliente (dal gestionale aziendale o dal registro regionale), come prova a corredo dei dati inseriti qui sotto."
      testoVuoto="Clicca per allegare il quaderno di campagna digitale in PDF"
      confermaRimozione="Rimuovere il quaderno di campagna digitale allegato a questo cliente?"
    />
  )
}
