import type { DiaryEntry } from '../db/db'

const W = 1080
const PAD = 80

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): void {
  const words = text.split(' ')
  let line = ''
  let drawn = 0

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' '
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      if (drawn === maxLines - 1) {
        ctx.fillText(line.trimEnd() + '…', x, y)
        return
      }
      ctx.fillText(line.trimEnd(), x, y)
      line = words[i] + ' '
      y += lineHeight
      drawn++
    } else {
      line = test
    }
  }
  if (line.trim()) ctx.fillText(line.trimEnd(), x, y)
}

export async function generateShareCard(
  entry: DiaryEntry,
  childName: string
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = W
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, W)
  grad.addColorStop(0, '#1e3a8a')
  grad.addColorStop(1, '#2563eb')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, W)

  // Subtle texture dots
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  for (let r = 0; r < W; r += 60) {
    for (let c = 0; c < W; c += 60) {
      ctx.beginPath()
      ctx.arc(c, r, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const font = '-apple-system, Helvetica Neue, Arial, sans-serif'

  // App name — top left
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `500 36px ${font}`
  ctx.fillText('Tatuś', PAD, PAD + 36)

  // Milestone badge
  let textY = 220
  if (entry.milestone) {
    ctx.fillStyle = '#fbbf24'
    ctx.font = `600 38px ${font}`
    ctx.fillText('★ Hito especial', PAD, textY)
    textY += 70
  }

  // Week label
  const weekLabel = entry.week < 0
    ? `Embarazo — semana ${Math.max(1, 40 + entry.week)}`
    : `Semana ${entry.week} de vida`

  ctx.fillStyle = 'rgba(147,197,253,0.9)'  // blue-300
  ctx.font = `500 48px ${font}`
  ctx.fillText(weekLabel, PAD, textY)
  textY += 80

  // Entry text
  ctx.fillStyle = '#ffffff'
  ctx.font = `400 52px ${font}`
  wrapText(ctx, entry.text, PAD, textY, W - PAD * 2, 76, 6)

  // Bottom — baby name + date
  const dateStr = new Date(entry.date).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `400 36px ${font}`
  ctx.fillText(`${childName} · ${dateStr}`, PAD, W - PAD)

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
