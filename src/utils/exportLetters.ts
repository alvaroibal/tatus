import { db, type FutureLetter, type BabyProfile } from '../db/db'

function formatLetterDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function weekLabel(letter: FutureLetter): string {
  if (letter.week < 0 && letter.pregnancyWeek != null) {
    return `Semana ${letter.pregnancyWeek} de embarazo`
  }
  return `Semana ${letter.week} de vida`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderLetter(letter: FutureLetter, index: number): string {
  const title = letter.title ? `<h2 class="letter-title">${escapeHtml(letter.title)}</h2>` : ''
  const body = escapeHtml(letter.body)
  return `
  <article class="letter" id="carta-${index + 1}">
    <div class="letter-meta">
      <span class="letter-week">${weekLabel(letter)}</span>
      <span class="letter-sep">·</span>
      <span class="letter-date">${formatLetterDate(new Date(letter.date))}</span>
    </div>
    ${title}
    <div class="letter-body">${body}</div>
  </article>`
}

export async function exportLettersHTML(profile: BabyProfile): Promise<string> {
  const letters = await db.futureLetters
    .where('profileId')
    .equals(profile.id!)
    .sortBy('date')

  const lettersHtml = letters.map(renderLetter).join('\n')
  const count = letters.length
  const name = profile.name

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cartas de papá para ${escapeHtml(name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 18px;
      line-height: 1.75;
      color: #1a1a1a;
      background: #fafaf8;
      padding: 3rem 1.5rem 6rem;
    }

    .wrapper {
      max-width: 680px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      padding: 3rem 0 4rem;
      border-bottom: 1px solid #e8e8e4;
      margin-bottom: 4rem;
    }

    header .label {
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 1.5rem;
    }

    header h1 {
      font-size: 2.25rem;
      font-weight: normal;
      color: #111;
      margin-bottom: 0.75rem;
    }

    header .subtitle {
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 0.9rem;
      color: #888;
    }

    .letter {
      margin-bottom: 4rem;
      padding-bottom: 4rem;
      border-bottom: 1px solid #e8e8e4;
    }

    .letter:last-child {
      border-bottom: none;
    }

    .letter-meta {
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 0.8rem;
      color: #999;
      margin-bottom: 1.25rem;
      text-transform: capitalize;
    }

    .letter-sep {
      margin: 0 0.5rem;
    }

    .letter-week {
      font-weight: 600;
      color: #555;
    }

    .letter-title {
      font-size: 1.35rem;
      font-weight: normal;
      color: #222;
      margin-bottom: 1.25rem;
      font-style: italic;
    }

    .letter-body {
      white-space: pre-wrap;
      color: #333;
    }

    footer {
      text-align: center;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 0.75rem;
      color: #bbb;
      margin-top: 5rem;
      padding-top: 2rem;
      border-top: 1px solid #e8e8e4;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <p class="label">Para leer algún día</p>
      <h1>Cartas de papá para ${escapeHtml(name)}</h1>
      <p class="subtitle">${count} ${count === 1 ? 'carta' : 'cartas'} · Desde el principio</p>
    </header>

    ${lettersHtml}

    <footer>
      Generado con Tatuś · Este archivo no necesita internet para funcionar
    </footer>
  </div>
</body>
</html>`
}
