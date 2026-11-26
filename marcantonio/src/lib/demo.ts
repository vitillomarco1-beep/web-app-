// Versione dimostrativa per i clienti: si costruisce con `npm run build:demo` (VITE_DEMO=1).
// Dati inventati, salvati solo nel browser di chi la apre, nessun archivio condiviso, nessun accesso da fare.
export const DEMO = import.meta.env.VITE_DEMO === '1'

export type Scenario = 'robot' | 'sala'
export const NOME_DEMO = 'Azienda Agricola Demo'

const K_SCENARIO = 'gestionale-demo:scenario'
/** I dati inventati valgono una settimana: dal lunedì dopo si rigenerano, così liste e date restano attuali. */
const settimana = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
export const chiaveDatiDemo = (s: Scenario) => `gestionale-demo:dati:${s}:${settimana()}`

export function scenarioDemo(): Scenario {
  try { return localStorage.getItem(K_SCENARIO) === 'sala' ? 'sala' : 'robot' } catch { return 'robot' }
}

/** Cambia stalla dimostrativa (ognuna conserva le sue modifiche). */
export function scegliScenario(s: Scenario) {
  try { localStorage.setItem(K_SCENARIO, s) } catch { /* storage bloccato */ }
  window.location.hash = '#/area-riservata'
  window.location.reload()
}

/** Riporta la stalla dimostrativa ai dati iniziali. */
export function ricominciaDemo() {
  try { localStorage.removeItem(chiaveDatiDemo(scenarioDemo())) } catch { /* storage bloccato */ }
  window.location.hash = '#/area-riservata'
  window.location.reload()
}
