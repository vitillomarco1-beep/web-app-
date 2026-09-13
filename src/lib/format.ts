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
