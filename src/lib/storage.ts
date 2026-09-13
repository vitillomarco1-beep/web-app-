import type { Cliente, Calcolo, AggiornamentoNormativo } from '../types'

const CLIENTS_KEY = 'cfc.clienti.v1'
const CALCS_KEY = 'cfc.calcoli.v1'
const NORMATIVA_KEY = 'cfc.normativa.v1'

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const clientiStore = {
  all(): Cliente[] {
    return readJSON<Cliente[]>(CLIENTS_KEY, [])
  },
  get(id: string): Cliente | undefined {
    return this.all().find((c) => c.id === id)
  },
  save(cliente: Cliente) {
    const all = this.all()
    const idx = all.findIndex((c) => c.id === cliente.id)
    if (idx >= 0) all[idx] = cliente
    else all.unshift(cliente)
    writeJSON(CLIENTS_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      CLIENTS_KEY,
      this.all().filter((c) => c.id !== id),
    )
    // rimuove a cascata i calcoli associati
    writeJSON(
      CALCS_KEY,
      calcoliStore.all().filter((c) => c.clientId !== id),
    )
  },
}

export const calcoliStore = {
  all(): Calcolo[] {
    return readJSON<Calcolo[]>(CALCS_KEY, [])
  },
  byClient(clientId: string): Calcolo[] {
    return this.all()
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  get(id: string): Calcolo | undefined {
    return this.all().find((c) => c.id === id)
  },
  save(calcolo: Calcolo) {
    const all = this.all()
    const idx = all.findIndex((c) => c.id === calcolo.id)
    if (idx >= 0) all[idx] = calcolo
    else all.unshift(calcolo)
    writeJSON(CALCS_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      CALCS_KEY,
      this.all().filter((c) => c.id !== id),
    )
  },
}

export const normativaStore = {
  all(): AggiornamentoNormativo[] {
    return readJSON<AggiornamentoNormativo[]>(NORMATIVA_KEY, [])
  },
  get(id: string): AggiornamentoNormativo | undefined {
    return this.all().find((n) => n.id === id)
  },
  save(voce: AggiornamentoNormativo) {
    const all = this.all()
    const idx = all.findIndex((n) => n.id === voce.id)
    if (idx >= 0) all[idx] = voce
    else all.unshift(voce)
    writeJSON(NORMATIVA_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      NORMATIVA_KEY,
      this.all().filter((n) => n.id !== id),
    )
  },
}
