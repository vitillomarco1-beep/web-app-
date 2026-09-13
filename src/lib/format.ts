export function formatTCO2(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(d)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const TIPO_ATTIVITA_LABEL: Record<string, string> = {
  agricoltura_agroforestazione: 'Agricoltura e agroforestazione su suoli minerali',
  imboschimento: 'Imboschimento',
  zootecnia: 'Zootecnia (in preparazione)',
}

export const TIPOLOGIA_ALLEVAMENTO_LABEL: Record<string, string> = {
  bovini_da_latte: 'Bovini da latte',
  bovini_da_carne: 'Bovini da carne',
  suini: 'Suini',
  ovicaprini: 'Ovicaprini',
  avicoli: 'Avicoli',
  misto: 'Allevamento misto',
  altro: 'Altro',
}

export const AMBITO_NORMATIVA_LABEL: Record<string, string> = {
  ...TIPO_ATTIVITA_LABEL,
  trasversale: 'Trasversale / generale',
  nuovo_ambito: 'Nuovo ambito non ancora coperto',
}

export const STATO_NORMATIVA_LABEL: Record<string, string> = {
  da_valutare: 'Da valutare',
  in_implementazione: 'In implementazione',
  implementato: 'Implementato',
  monitorato: 'Monitorato',
}

export const STATO_NORMATIVA_STILE: Record<string, string> = {
  da_valutare: 'bg-amber-100 text-amber-800',
  in_implementazione: 'bg-blue-100 text-blue-800',
  implementato: 'bg-forest-100 text-forest-800',
  monitorato: 'bg-stone-200 text-stone-700',
}
