import type { DiaryEntry } from '../db/db'

const W = 1080
const PAD = 80

const TINTA = '#1C2650'
const YEMA = '#F4B41A'
const LECHE = '#F7F5EF'
const DISPLAY = "'Bricolage Grotesque Variable', 'Avenir Next', system-ui, sans-serif"
const BODY = "'Atkinson Hyperlegible', system-ui, sans-serif"
const LETTER = "'Literata Variable', Georgia, serif"

function drawKreska(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, width: number, color: string) {
  // Rayita a 42°: (x, y) es el extremo inferior
  const a = (42 * Math.PI) / 180
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len)
  ctx.stroke()
}

function drawWordmark(ctx: CanvasRenderingContext2D, x: number, baseline: number, size: number) {
  ctx.font = `800 ${size}px ${DISPLAY}`
  ctx.fillStyle = LECHE
  ctx.fillText('tatus', x, baseline)
  const sx = x + ctx.measureText('tatu').width
  const sw = ctx.measureText('s').width
  drawKreska(ctx, sx + sw * 0.42, baseline - size * 0.6, size * 0.22, size * 0.11, YEMA)
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) break
    } else {
      line = test
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  else if (line && lines.length === maxLines) lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:]*$/, '') + '…'
  return lines
}

export async function generateShareCard(
  entry: DiaryEntry,
  childName: string
): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load(`800 60px ${DISPLAY}`),
      document.fonts.load(`700 36px ${DISPLAY}`),
      document.fonts.load(`italic 400 56px ${LETTER}`),
      document.fonts.load(`400 34px ${BODY}`),
    ])
  } catch { /* si no cargan, el canvas usa las de respaldo */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = W
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = TINTA
  ctx.fillRect(0, 0, W, W)

  drawWordmark(ctx, PAD, PAD + 52, 64)

  // Etiqueta de semana
  const pregnancyWeek = Math.max(1, 40 + entry.week)
  const weekText = entry.week < 0 ? `SEMANA ${pregnancyWeek} DE EMBARAZO` : `SEMANA ${entry.week}`
  const label = entry.milestone ? `PRIMERA VEZ · ${weekText}` : weekText
  ctx.font = `700 34px ${DISPLAY}`
  ctx.fillStyle = YEMA
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px'

  // Frase del padre en Literata, centrada en vertical en el bloque central
  const quoteSize = entry.text.length > 160 ? 46 : 56
  const lineHeight = Math.round(quoteSize * 1.42)
  ctx.font = `italic 400 ${quoteSize}px ${LETTER}`
  const lines = wrapLines(ctx, `“${entry.text.trim()}”`, W - PAD * 2, 7)
  const blockH = 34 + 40 + lines.length * lineHeight
  let y = Math.max(260, (W - blockH) / 2 + 20)

  ctx.font = `700 34px ${DISPLAY}`
  ctx.fillText(label, PAD, y)
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  y += 40 + lineHeight * 0.75

  ctx.font = `italic 400 ${quoteSize}px ${LETTER}`
  ctx.fillStyle = LECHE
  for (const line of lines) {
    ctx.fillText(line, PAD, y)
    y += lineHeight
  }

  // Pie: nombre y fecha
  const dateStr = new Date(entry.date).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  ctx.font = `400 34px ${BODY}`
  ctx.fillStyle = 'rgba(247,245,239,0.7)'
  ctx.fillText(`${childName} · ${dateStr}`, PAD, W - PAD)

  // Pie: kreskas contando de diez en diez, como marcas en la pared
  const weekNum = entry.week < 0 ? pregnancyWeek : entry.week
  const lit = (weekNum % 10) + 1
  for (let i = 0; i < 10; i++) {
    const x = W - PAD - (9 - i) * 22 - 14
    drawKreska(ctx, x, W - PAD, 30, 7, i < lit ? YEMA : 'rgba(247,245,239,0.22)')
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))),
      'image/jpeg',
      0.92
    )
  )
}

export async function shareEntry(entry: DiaryEntry, childName: string): Promise<void> {
  const blob = await generateShareCard(entry, childName)
  const file = new File([blob], 'tatus-hito.jpg', { type: 'image/jpeg' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `Tatuś — Semana ${entry.week}` })
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tatus-hito.jpg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
