import{c as e,t}from"./jsx-runtime-sR4thDDV.js";import{n,r,t as i}from"./useCurrentProfile-BiGoLt3W.js";import{t as a}from"./toast-Dc7-YCwc.js";import{t as o}from"./MemoriesTabs-BYvq_CXD.js";function s(e){return new Date(e).toLocaleDateString(`es-ES`,{weekday:`long`,day:`numeric`,month:`long`,year:`numeric`})}function c(e){return e.week<0&&e.pregnancyWeek!=null?`Semana ${e.pregnancyWeek} de embarazo`:`Semana ${e.week} de vida`}function l(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function u(e,t){let n=e.title?`<h2 class="letter-title">${l(e.title)}</h2>`:``,r=l(e.body);return`
  <article class="letter" id="carta-${t+1}">
    <div class="letter-meta">
      <span class="letter-week">${c(e)}</span>
      <span class="letter-sep">·</span>
      <span class="letter-date">${s(new Date(e.date))}</span>
    </div>
    ${n}
    <div class="letter-body">${r}</div>
  </article>`}async function d(e){let t=await n.futureLetters.where(`profileId`).equals(e.id).sortBy(`date`),r=(await n.appConfig.toArray())[0]?.role===`mama`?`mamá`:`papá`,i=t.map(u).join(`
`),a=t.length,o=e.name;return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cartas de ${r} para ${l(o)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 18px;
      line-height: 1.75;
      color: #1a1a1a;
      background: #F7F5EF;
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
      color: #1C2650;
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
      <h1>Cartas de ${r} para ${l(o)}</h1>
      <p class="subtitle">${a} ${a===1?`carta`:`cartas`} · Desde el principio</p>
    </header>

    ${i}

    <footer>
      Generado con Tatuś · Este archivo no necesita internet para funcionar
    </footer>
  </div>
</body>
</html>`}var f=t();function p(e){return new Date(e).toLocaleDateString(`es-ES`,{day:`numeric`,month:`short`,year:`numeric`})}function m(e){return e.week<0&&e.pregnancyWeek!=null?`Semana ${e.pregnancyWeek} de embarazo`:`Semana ${e.week} de vida`}function h(e){let t=e.body.replace(/\n/g,` `).trim();return t.length>80?t.slice(0,80)+`…`:t}function g(){let t=e(),{profile:s,isLoading:c}=i(),l=r(async()=>s?.id?n.futureLetters.where(`profileId`).equals(s.id).reverse().sortBy(`date`):[],[s?.id]);if(c||!s)return null;async function u(){if(s){if(await n.futureLetters.where(`profileId`).equals(s.id).count()===0){a(`Escribe al menos una carta antes de exportar.`);return}try{let e=await d(s),t=new Blob([e],{type:`text/html`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`cartas-para-${s.name.toLowerCase()}-${new Date().getFullYear()}.html`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n),a(`Cartas descargadas. Guarda el archivo en un lugar seguro: es lo que irá en el USB.`)}catch{a(`No se han podido exportar las cartas. Vuelve a intentarlo.`)}}}return(0,f.jsxs)(`div`,{className:`pb-6`,children:[(0,f.jsx)(o,{right:(0,f.jsx)(`button`,{onClick:u,className:`text-tinta-600 text-sm font-medium`,children:`Exportar`})}),l===void 0?null:l.length===0?(0,f.jsxs)(`div`,{className:`flex flex-col items-center justify-center py-16 px-8 text-center`,children:[(0,f.jsx)(`p`,{className:`text-5xl mb-4`,children:`✉️`}),(0,f.jsx)(`p`,{className:`text-base font-semibold text-gray-800 mb-2`,children:`La primera carta está por escribirse`}),(0,f.jsxs)(`p`,{className:`text-sm text-gray-500 leading-relaxed max-w-xs`,children:[`Escríbele a `,s.name,` desde ya. Las leerá cuando sea mayor.`]})]}):(0,f.jsx)(`ul`,{className:`px-5 space-y-3`,children:l.map(e=>(0,f.jsx)(`li`,{children:(0,f.jsx)(`button`,{onClick:()=>t(`/cartas/${e.id}`),className:`w-full text-left bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`,children:(0,f.jsxs)(`div`,{className:`flex items-start justify-between gap-3`,children:[(0,f.jsxs)(`div`,{className:`min-w-0`,children:[(0,f.jsxs)(`div`,{className:`flex items-center gap-2 mb-1`,children:[(0,f.jsx)(`span`,{className:`text-xs font-semibold text-tinta-600 capitalize`,children:m(e)}),e.locked&&(0,f.jsx)(`span`,{className:`text-xs text-gray-300`,children:`🔒`})]}),e.title&&(0,f.jsx)(`p`,{className:`font-letter italic text-base text-gray-900 mb-0.5`,children:e.title}),(0,f.jsx)(`p`,{className:`font-letter text-sm text-gray-500 leading-relaxed`,children:h(e)})]}),(0,f.jsx)(`span`,{className:`text-xs text-gray-300 shrink-0 mt-0.5`,children:p(e.date)})]})})},e.id))}),(0,f.jsx)(`button`,{onClick:()=>t(`/cartas/nueva`),className:`fixed bottom-20 right-5 w-14 h-14 bg-tinta-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:bg-tinta-700`,"aria-label":`Escribir carta`,children:`✏️`})]})}export{g as default};