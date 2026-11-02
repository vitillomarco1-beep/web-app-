import { useState } from 'react'
import { useStore } from '../lib/store'
import { Modale } from './ui'
import { leggiFileRobot, riepiloga, type FileRobot } from '../lib/robot'
import { fmt0, fmtData, nuovoId } from '../lib/format'

/** Importazione dell'export "Mungiture" dei robot DeLaval. */
export default function ImportRobot({ onChiudi, onImportato }: { onChiudi: () => void; onImportato: (ultimoGiorno: string) => void }) {
  const { dati, imposta, aggiorna, aggiungi } = useStore()
  const [file, setFile] = useState<FileRobot | null>(null)
  const [nomeFile, setNomeFile] = useState('')
  const [errore, setErrore] = useState('')
  const [assegna, setAssegna] = useState<Record<string, string>>({}) // robot → id stalla

  const robotNelFile = file ? [...new Set(file.mungiture.map((m) => m.robot))].sort() : []
  const date = file ? [...new Set(file.mungiture.map((m) => m.data))].sort() : []

  const carica = async (f: File) => {
    setErrore('')
    try {
      const letto = leggiFileRobot(await f.text())
      setFile(letto)
      setNomeFile(f.name)
      // proposta di abbinamento robot → stalla: nomi già salvati, altrimenti la prima stalla DeLaval
      const proposta: Record<string, string> = {}
      const robots = [...new Set(letto.mungiture.map((m) => m.robot))]
      for (const r of robots) {
        const nota = dati.stalle.find((s) => s.robot?.nomi?.includes(r))
        const marca = letto.fonte
        const stessaMarca = dati.stalle.find((s) => s.robot?.marca === marca && (s.robot.numero ?? 1) >= robots.length) ?? dati.stalle.find((s) => s.robot?.marca === marca)
        proposta[r] = (nota ?? stessaMarca)?.id ?? ''
      }
      setAssegna(proposta)
    } catch (e) {
      setErrore((e as Error).message)
    }
  }

  const conferma = () => {
    if (!file) return
    const { giorni, vacche } = riepiloga(file.mungiture)
    const idG = new Set(giorni.map((g) => g.id)), idV = new Set(vacche.map((v) => v.id))
    imposta('robotGiorni', [...dati.robotGiorni.filter((g) => !idG.has(g.id)), ...giorni])
    imposta('robotVacche', [...dati.robotVacche.filter((v) => !idV.has(v.id)), ...vacche])
    aggiungi('importRobot', { id: nuovoId(), fonte: file.fonte, nomeFile, importatoIl: new Date().toISOString(), dal: date[0], al: date[date.length - 1] })
    // salva sulle stalle quali robot appartengono a ciascuna
    for (const s of dati.stalle) {
      if (!s.robot) continue
      const nomi = Object.entries(assegna).filter(([, id]) => id === s.id).map(([r]) => r)
      const altri = (s.robot.nomi ?? []).filter((n) => !robotNelFile.includes(n))
      const nuovi = [...new Set([...altri, ...nomi])].sort()
      if (nuovi.join() !== (s.robot.nomi ?? []).join()) aggiorna('stalle', { ...s, robot: { ...s.robot, nomi: nuovi } })
    }
    onImportato(date[date.length - 1])
  }

  return (
    <Modale titolo="Importa mungiture dei robot" onChiudi={onChiudi}>
      {!file ? (
        <div className="space-y-4 text-sm">
          <p className="text-stone-600">
            Carica l'export delle mungiture: da DeLaval DelPro l'elenco <b>Mungiture</b>, da Lely Horizon il rapporto
            <b>Visite di mungitura</b> (una riga per mungitura, in CSV). Il formato viene riconosciuto da solo.
            Puoi importare più giorni insieme: i giorni già presenti vengono aggiornati.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-6 text-center hover:bg-brand-50">
            <span className="font-semibold text-brand-800">Scegli il file delle mungiture</span>
            <span className="text-xs text-stone-500">.csv esportato da DelPro</span>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) carica(f); e.target.value = '' }} />
          </label>
          {errore && <p className="text-red-700">✕ {errore}</p>}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-stone-600">
            <b>{nomeFile}</b>: {fmt0(file.mungiture.length)} mungiture dal {fmtData(date[0])} al {fmtData(date[date.length - 1])},
            {' '}{new Set(file.mungiture.map((m) => m.vacca)).size} vacche.
            {file.scartate > 0 && <> {file.scartate} righe non riconosciute sono state ignorate.</>}
          </p>
          <div>
            <h3 className="mb-2 font-semibold">A quale stalla appartengono i robot?</h3>
            <div className="space-y-2">
              {robotNelFile.map((r) => (
                <label key={r} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2">
                  <span><b>{r}</b> <span className="text-xs text-stone-500">{fmt0(file.mungiture.filter((m) => m.robot === r).length)} mungiture</span></span>
                  <select className="input w-auto py-1.5" value={assegna[r] ?? ''} onChange={(e) => setAssegna({ ...assegna, [r]: e.target.value })}>
                    <option value="">— nessuna —</option>
                    {dati.stalle.map((s) => <option key={s.id} value={s.id}>Stalla {s.numero}{s.robot ? ` (${s.robot.numero} × ${s.robot.marca})` : ''}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <button className="btn-secondary" onClick={() => setFile(null)}>Cambia file</button>
            <button className="btn-primary" onClick={conferma}>Importa</button>
          </div>
        </div>
      )}
    </Modale>
  )
}
