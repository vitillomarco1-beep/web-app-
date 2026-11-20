import type {
  Cliente,
  Calcolo,
  AggiornamentoNormativo,
  Gruppo,
  CalcoloGruppo,
  Appezzamento,
  OperazioneCampo,
} from '../types'

const CLIENTS_KEY = 'cfc.clienti.v1'
const CALCS_KEY = 'cfc.calcoli.v1'
const NORMATIVA_KEY = 'cfc.normativa.v1'
const GRUPPI_KEY = 'cfc.gruppi.v1'
const CALCS_GRUPPO_KEY = 'cfc.calcoliGruppo.v1'
const APPEZZAMENTI_KEY = 'cfc.appezzamenti.v1'
const OPERAZIONI_CAMPO_KEY = 'cfc.operazioniCampo.v1'

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
    // rimuove a cascata appezzamenti e operazioni del quaderno di campagna
    writeJSON(
      APPEZZAMENTI_KEY,
      appezzamentiStore.all().filter((a) => a.clienteId !== id),
    )
    writeJSON(
      OPERAZIONI_CAMPO_KEY,
      operazioniCampoStore.all().filter((o) => o.clienteId !== id),
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

export const gruppiStore = {
  all(): Gruppo[] {
    return readJSON<Gruppo[]>(GRUPPI_KEY, [])
  },
  get(id: string): Gruppo | undefined {
    return this.all().find((g) => g.id === id)
  },
  save(gruppo: Gruppo) {
    const all = this.all()
    const idx = all.findIndex((g) => g.id === gruppo.id)
    if (idx >= 0) all[idx] = gruppo
    else all.unshift(gruppo)
    writeJSON(GRUPPI_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      GRUPPI_KEY,
      this.all().filter((g) => g.id !== id),
    )
    // rimuove a cascata i calcoli di gruppo associati
    writeJSON(
      CALCS_GRUPPO_KEY,
      calcoliGruppoStore.all().filter((c) => c.gruppoId !== id),
    )
  },
}

export const calcoliGruppoStore = {
  all(): CalcoloGruppo[] {
    return readJSON<CalcoloGruppo[]>(CALCS_GRUPPO_KEY, [])
  },
  byGruppo(gruppoId: string): CalcoloGruppo[] {
    return this.all()
      .filter((c) => c.gruppoId === gruppoId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  get(id: string): CalcoloGruppo | undefined {
    return this.all().find((c) => c.id === id)
  },
  save(calcolo: CalcoloGruppo) {
    const all = this.all()
    const idx = all.findIndex((c) => c.id === calcolo.id)
    if (idx >= 0) all[idx] = calcolo
    else all.unshift(calcolo)
    writeJSON(CALCS_GRUPPO_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      CALCS_GRUPPO_KEY,
      this.all().filter((c) => c.id !== id),
    )
  },
}

export const appezzamentiStore = {
  all(): Appezzamento[] {
    return readJSON<Appezzamento[]>(APPEZZAMENTI_KEY, [])
  },
  byClient(clienteId: string): Appezzamento[] {
    return this.all().filter((a) => a.clienteId === clienteId)
  },
  get(id: string): Appezzamento | undefined {
    return this.all().find((a) => a.id === id)
  },
  save(appezzamento: Appezzamento) {
    const all = this.all()
    const idx = all.findIndex((a) => a.id === appezzamento.id)
    if (idx >= 0) all[idx] = appezzamento
    else all.unshift(appezzamento)
    writeJSON(APPEZZAMENTI_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      APPEZZAMENTI_KEY,
      this.all().filter((a) => a.id !== id),
    )
    // rimuove a cascata le operazioni registrate su questo appezzamento
    writeJSON(
      OPERAZIONI_CAMPO_KEY,
      operazioniCampoStore.all().filter((o) => o.appezzamentoId !== id),
    )
  },
}

export const operazioniCampoStore = {
  all(): OperazioneCampo[] {
    return readJSON<OperazioneCampo[]>(OPERAZIONI_CAMPO_KEY, [])
  },
  byClient(clienteId: string): OperazioneCampo[] {
    return this.all()
      .filter((o) => o.clienteId === clienteId)
      .sort((a, b) => b.data.localeCompare(a.data))
  },
  byAppezzamento(appezzamentoId: string): OperazioneCampo[] {
    return this.all()
      .filter((o) => o.appezzamentoId === appezzamentoId)
      .sort((a, b) => b.data.localeCompare(a.data))
  },
  get(id: string): OperazioneCampo | undefined {
    return this.all().find((o) => o.id === id)
  },
  save(operazione: OperazioneCampo) {
    const all = this.all()
    const idx = all.findIndex((o) => o.id === operazione.id)
    if (idx >= 0) all[idx] = operazione
    else all.unshift(operazione)
    writeJSON(OPERAZIONI_CAMPO_KEY, all)
  },
  remove(id: string) {
    writeJSON(
      OPERAZIONI_CAMPO_KEY,
      this.all().filter((o) => o.id !== id),
    )
  },
}
