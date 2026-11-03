// PDF da stampare (liste vaccinazioni): si genera nel browser e si scarica.
/* eslint-disable @typescript-eslint/no-explicit-any */
import logo from '../assets/logo-marcantonio.png'

async function logoDataUrl(): Promise<string | null> {
  try {
    // logo in scala di grigi (stampa in bianco e nero), sfondo bianco
    const img = new Image()
    img.src = logo
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < d.data.length; i += 4) {
      const g = Math.round(0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2])
      d.data[i] = d.data[i + 1] = d.data[i + 2] = g
    }
    ctx.putImageData(d, 0, 0)
    return c.toDataURL('image/png')
  } catch { return null }
}

export interface SezionePdf {
  titolo: string
  sottotitolo?: string
  colonne: string[]
  righe: (string | number)[][]
  evidenzia?: boolean[] // righe da evidenziare (es. in ritardo)
}

export async function creaPdf(titolo: string, sottotitolo: string, sezioni: SezionePdf[], note?: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const nero: [number, number, number] = [0, 0, 0]
  // intestazione: logo a sinistra (proporzioni 600×356), titolo accanto
  const img = await logoDataUrl()
  const lw = 34, lh = lw * 356 / 600
  const x = img ? 14 + lw + 6 : 14
  if (img) doc.addImage(img, 'PNG', 14, 10, lw, lh)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60)
  doc.text('FRATELLI MARCANTONIO · Castelfranco in Miscano', x, 15)
  doc.setFontSize(16); doc.setTextColor(...nero)
  doc.text(titolo, x, 23)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30)
  doc.text(doc.splitTextToSize(sottotitolo, 196 - x), x, 29)
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(14, 33 + (img ? 0 : -2), 196, 33 + (img ? 0 : -2))
  let y = 38
  for (const s of sezioni) {
    if (y > 260) { doc.addPage(); y = 16 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...nero)
    doc.text(s.titolo, 14, y + 4)
    if (s.sottotitolo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40); doc.text(s.sottotitolo, 14, y + 9) }
    if (!s.righe.length) {
      doc.setFontSize(10); doc.setTextColor(40); doc.text('Nessun animale.', 14, y + 15)
      y += 22
      continue
    }
    autoTable(doc, {
      startY: y + (s.sottotitolo ? 12 : 7),
      head: [s.colonne],
      body: s.righe.map((r) => r.map(String)),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.2, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
      headStyles: { fillColor: false as any, textColor: nero, fontStyle: 'bold', lineWidth: 0.3 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      didParseCell: (d: any) => { if (d.section === 'body' && s.evidenzia?.[d.row.index]) d.cell.styles.fontStyle = 'bold' },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }
  if (note) {
    if (y > 270) { doc.addPage(); y = 16 }
    doc.setFontSize(8); doc.setTextColor(40)
    doc.text(doc.splitTextToSize(note, 182), 14, y)
  }
  const pagine = doc.getNumberOfPages()
  for (let i = 1; i <= pagine; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60)
    doc.text(`Stampato il ${new Date().toLocaleDateString('it-IT')} · pagina ${i} di ${pagine}`, 14, 290)
  }
  return doc.output('blob')
}

/** Scarica il file: dentro claude.ai con la conferma del visualizzatore, altrimenti con un link. */
export async function scarica(blob: Blob, nome: string): Promise<'ok' | 'annullato' | 'errore'> {
  try {
    const dl = await (window as any).claude?.use?.('downloads')
    if (dl) {
      try { await dl.save({ filename: nome, data: blob }); return 'ok' } catch (e: any) { if (e?.code === 'declined') return 'annullato'; if (e?.code !== 'unavailable' && e?.code !== 'not_granted') return 'errore' }
    }
  } catch { /* nessuna capacità: si scarica col link */ }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
  return 'ok'
}
