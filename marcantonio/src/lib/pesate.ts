// Conversione tra le pesate del carro miscelatore e i kg scaricati in ogni stalla.
//
// Per ogni giro (mattina o sera) i collaboratori fotografano il display della bilancia:
//   foto 1 = carico totale
//   foto 2 = residuo dopo lo scarico nella prima stalla
//   foto 3 = residuo dopo la seconda stalla, scaricato interamente nell'ultima
// Con N stalle in ordine di scarico le letture sono N:
//   letture[0] = carico, letture[i] = residuo dopo la stalla i (i = 1..N-1)
//   scarico stalla[i] = letture[i] - letture[i+1]   (i < N-1)
//   scarico ultima    = letture[N-1]                 (il carro si svuota)

export type Lettura = number | null

/** kg per stalla (nell'ordine di scarico); null se mancano le letture necessarie. */
export function scarichiDaPesate(letture: Lettura[]): Lettura[] {
  const n = letture.length
  return letture.map((_, i) => {
    if (i === n - 1) return letture[i]
    const a = letture[i], b = letture[i + 1]
    return a === null || b === null ? null : a - b
  })
}

/** Ricostruisce le letture dai kg per stalla; null se manca anche un solo valore. */
export function pesateDaScarichi(kg: Lettura[]): number[] | null {
  if (kg.length === 0 || kg.some((k) => k === null)) return null
  const letture = new Array<number>(kg.length)
  letture[kg.length - 1] = kg[kg.length - 1]!
  for (let i = kg.length - 2; i >= 0; i--) letture[i] = letture[i + 1] + kg[i]!
  return letture
}

export function parseKg(s: string | undefined): Lettura {
  const t = (s ?? '').trim()
  if (!t) return null
  // accetta "1.980", "1980", "1980,5": il punto seguito da 3 cifre è separatore delle migliaia
  const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}
