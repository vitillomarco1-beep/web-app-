// PDF da stampare (liste vaccinazioni): si genera nel browser e si scarica.
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const bordeaux: [number, number, number] = [97, 56, 70]
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150)
  doc.text('FRATELLI MARCANTONIO', 14, 14)
  doc.setFontSize(16); doc.setTextColor(...bordeaux)
  doc.text(titolo, 14, 22)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90)
  doc.text(sottotitolo, 14, 28)
  let y = 34
  for (const s of sezioni) {
    if (y > 260) { doc.addPage(); y = 16 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...bordeaux)
    doc.text(s.titolo, 14, y + 4)
    if (s.sottotitolo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110); doc.text(s.sottotitolo, 14, y + 9) }
    if (!s.righe.length) {
      doc.setFontSize(10); doc.setTextColor(130); doc.text('Nessun animale.', 14, y + 15)
      y += 22
      continue
    }
    autoTable(doc, {
      startY: y + (s.sottotitolo ? 12 : 7),
      head: [s.colonne],
      body: s.righe.map((r) => r.map(String)),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.2, lineColor: [220, 214, 210], textColor: [40, 40, 40] },
      headStyles: { fillColor: [245, 238, 240], textColor: bordeaux, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold' } },
      didParseCell: (d: any) => { if (d.section === 'body' && s.evidenzia?.[d.row.index]) d.cell.styles.fillColor = [254, 236, 236] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }
  if (note) {
    if (y > 270) { doc.addPage(); y = 16 }
    doc.setFontSize(8); doc.setTextColor(130)
    doc.text(doc.splitTextToSize(note, 182), 14, y)
  }
  const pagine = doc.getNumberOfPages()
  for (let i = 1; i <= pagine; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150)
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
