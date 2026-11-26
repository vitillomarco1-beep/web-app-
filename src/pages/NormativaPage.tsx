import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { normativaStore } from '../lib/storage'
import { salvaDocumentoNormativa, leggiDocumentoNormativa, eliminaDocumentoNormativa } from '../lib/fileStore'
import type { AggiornamentoNormativo, AmbitoNormativa, FascicoloAgeaMeta, StatoNormativa } from '../types'
import {
  formatDate,
  AMBITO_NORMATIVA_LABEL,
  STATO_NORMATIVA_LABEL,
  STATO_NORMATIVA_STILE,
} from '../lib/format'
import DocumentUploader from '../components/DocumentUploader'
import ConfirmButton from '../components/ConfirmButton'

function nuovoFormId() {
  return uuidv4()
}

function formVuoto() {
  return {
    titolo: '',
    riferimentoNormativo: '',
    dataPubblicazione: '',
    ambito: 'trasversale' as AmbitoNormativa,
    sintesi: '',
    impattoSulCalcolo: '',
    stato: 'da_valutare' as StatoNormativa,
  }
}

export default function NormativaPage() {
  const [voci, setVoci] = useState<AggiornamentoNormativo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formId, setFormId] = useState(nuovoFormId)
  const [documento, setDocumento] = useState<FascicoloAgeaMeta | undefined>()
  const [form, setForm] = useState(formVuoto)

  useEffect(() => {
    ricarica()
  }, [])

  function ricarica() {
    setVoci(
      normativaStore
        .all()
        .sort((a, b) => (b.dataPubblicazione ?? b.createdAt).localeCompare(a.dataPubblicazione ?? a.createdAt)),
    )
  }

  function resetForm() {
    setForm(formVuoto())
    setFormId(nuovoFormId())
    setDocumento(undefined)
    setEditId(null)
  }

  function apriNuovo() {
    resetForm()
    setShowForm(true)
  }

  function apriModifica(voce: AggiornamentoNormativo) {
    setForm({
      titolo: voce.titolo,
      riferimentoNormativo: voce.riferimentoNormativo ?? '',
      dataPubblicazione: voce.dataPubblicazione ?? '',
      ambito: voce.ambito,
      sintesi: voce.sintesi ?? '',
      impattoSulCalcolo: voce.impattoSulCalcolo ?? '',
      stato: voce.stato,
    })
    setFormId(voce.id)
    setDocumento(voce.documento)
    setEditId(voce.id)
    setShowForm(true)
  }

  function handleCancelForm() {
    // Se è stato caricato un documento per una voce mai salvata, evitiamo di lasciarlo orfano.
    if (documento && !editId) eliminaDocumentoNormativa(formId)
    resetForm()
    setShowForm(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo.trim()) return
    const now = new Date().toISOString()
    const esistente = editId ? normativaStore.get(editId) : undefined
    const voce: AggiornamentoNormativo = {
      id: formId,
      titolo: form.titolo.trim(),
      riferimentoNormativo: form.riferimentoNormativo.trim() || undefined,
      dataPubblicazione: form.dataPubblicazione || undefined,
      ambito: form.ambito,
      sintesi: form.sintesi.trim() || undefined,
      impattoSulCalcolo: form.impattoSulCalcolo.trim() || undefined,
      stato: form.stato,
      documento,
      createdAt: esistente?.createdAt ?? now,
      updatedAt: now,
    }
    normativaStore.save(voce)
    ricarica()
    resetForm()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    eliminaDocumentoNormativa(id)
    normativaStore.remove(id)
    ricarica()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Normativa</h1>
          <p className="mt-1 text-sm text-stone-500">
            Tieni traccia di nuove direttive, regolamenti e bozze rilevanti per il calcolo dei
            crediti di carbonio, con le note su cosa comportano per l'app.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn-primary whitespace-nowrap" onClick={() => apriNuovo()}>
            + Nuovo aggiornamento
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">
            {editId ? 'Modifica aggiornamento' : 'Nuovo aggiornamento normativo'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block">
                <span className="label">Titolo *</span>
                <input
                  className="input"
                  required
                  placeholder="Es. Regolamento delegato — riumidificazione torbiere"
                  value={form.titolo}
                  onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Riferimento normativo</span>
                <input
                  className="input"
                  placeholder="Es. C(2027) 1234 final"
                  value={form.riferimentoNormativo}
                  onChange={(e) => setForm({ ...form, riferimentoNormativo: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Data di pubblicazione</span>
                <input
                  type="date"
                  className="input"
                  value={form.dataPubblicazione}
                  onChange={(e) => setForm({ ...form, dataPubblicazione: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Ambito interessato</span>
                <select
                  className="input"
                  value={form.ambito}
                  onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoNormativa })}
                >
                  {Object.entries(AMBITO_NORMATIVA_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="block">
                <span className="label">Stato</span>
                <select
                  className="input"
                  value={form.stato}
                  onChange={(e) => setForm({ ...form, stato: e.target.value as StatoNormativa })}
                >
                  {Object.entries(STATO_NORMATIVA_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <label className="block">
              <span className="label">Sintesi — cosa dice</span>
              <textarea
                className="input"
                rows={3}
                value={form.sintesi}
                onChange={(e) => setForm({ ...form, sintesi: e.target.value })}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="label">Impatto sul calcolo — cosa dobbiamo aggiornare nell'app</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Es. aggiungere il fattore X alla metodologia Y, rivedere il periodo di monitoraggio..."
                value={form.impattoSulCalcolo}
                onChange={(e) => setForm({ ...form, impattoSulCalcolo: e.target.value })}
              />
            </label>
          </div>

          <DocumentUploader
            meta={documento}
            onChange={setDocumento}
            salva={(file) => salvaDocumentoNormativa(formId, file)}
            leggi={() => leggiDocumentoNormativa(formId)}
            elimina={() => eliminaDocumentoNormativa(formId)}
            etichetta="Documento ufficiale (PDF)"
            descrizione="Allega il testo ufficiale (regolamento, direttiva, bozza) per averlo sempre a portata di mano."
            testoVuoto="Clicca per allegare il documento in PDF"
            confermaRimozione="Rimuovere il documento allegato a questo aggiornamento?"
          />

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={handleCancelForm}>
              Annulla
            </button>
            <button type="submit" className="btn-primary">
              {editId ? 'Salva modifiche' : 'Salva aggiornamento'}
            </button>
          </div>
        </form>
      )}

      {voci.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun aggiornamento normativo registrato finora.
        </div>
      ) : (
        <div className="space-y-3">
          {voci.map((v) => (
            <div key={v.id} className="card space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{v.titolo}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATO_NORMATIVA_STILE[v.stato]}`}
                    >
                      {STATO_NORMATIVA_LABEL[v.stato]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {AMBITO_NORMATIVA_LABEL[v.ambito]}
                    {v.riferimentoNormativo && ` · ${v.riferimentoNormativo}`}
                    {v.dataPubblicazione && ` · ${formatDate(v.dataPubblicazione)}`}
                    {v.documento && ' · documento allegato'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => apriModifica(v)}>
                    Modifica
                  </button>
                  <ConfirmButton onConfirm={() => handleDelete(v.id)} label="Elimina" />
                </div>
              </div>
              {v.sintesi && (
                <p className="text-sm text-stone-600">
                  <span className="font-medium text-stone-700">Sintesi: </span>
                  {v.sintesi}
                </p>
              )}
              {v.impattoSulCalcolo && (
                <p className="rounded-md bg-amber-50 p-2.5 text-sm text-amber-900">
                  <span className="font-medium">Impatto sul calcolo: </span>
                  {v.impattoSulCalcolo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
