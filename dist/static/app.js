const form = document.querySelector('#generate-form')
const promptInput = document.querySelector('#prompt-input')
const promptCount = document.querySelector('#prompt-count')
const colorValueInput = document.querySelector('#color-value')
const customColorPicker = document.querySelector('#custom-color')
const customColorText = document.querySelector('#custom-color-text')
const colorSwatches = Array.from(document.querySelectorAll('.color-swatch'))
const layoutCards = Array.from(document.querySelectorAll('[data-layout-option]'))
const layoutValueInput = document.querySelector('#layout-value')
const generateButton = document.querySelector('#generate-button')
const errorMessage = document.querySelector('#error-message')
const progressSteps = Array.from(document.querySelectorAll('.progress-step'))
const viewToggles = Array.from(document.querySelectorAll('.view-toggle'))
const previewShell = document.querySelector('.preview-shell')
const previewFrame = document.querySelector('#preview-frame')
const previewEmpty = document.querySelector('#preview-empty')
const downloadButton = document.querySelector('#download-zip')
const metricDuration = document.querySelector('#metric-duration')
const metricSize = document.querySelector('#metric-size')
const metricTokens = document.querySelector('#metric-tokens')
const specSummary = document.querySelector('#spec-summary')
const codeHtml = document.querySelector('#code-html')
const codeCss = document.querySelector('#code-css')
const codeJs = document.querySelector('#code-js')

const state = {
  previewMode: 'desktop',
  progressTimers: [],
  response: null,
  generating: false
}

if (!form) {
  throw new Error('NeoSite UI failed to initialize. Form not found.')
}

setViewMode('desktop')
setActiveColor(colorValueInput.value)
setActiveLayout(layoutValueInput.value)
updatePromptCount()

promptInput.addEventListener('input', updatePromptCount)

colorSwatches.forEach((button) => {
  button.addEventListener('click', () => {
    const hex = button.dataset.color
    if (!hex) return
    colorValueInput.value = hex
    customColorPicker.value = hex
    customColorText.value = hex
    setActiveColor(hex)
  })
})

customColorPicker.addEventListener('input', (event) => {
  const hex = event.target.value
  colorValueInput.value = hex
  customColorText.value = hex
  setActiveColor(hex)
})

customColorText.addEventListener('input', (event) => {
  const value = event.target.value
  if (!value.startsWith('#')) {
    event.target.value = '#' + value.replace(/[^0-9a-f]/gi, '').slice(0, 6)
    return
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    colorValueInput.value = value
    customColorPicker.value = normalizeHex(value)
    setActiveColor(value)
  }
})

layoutCards.forEach((card) => {
  card.addEventListener('click', () => {
    const layout = card.dataset.layoutOption
    if (!layout) return
    layoutValueInput.value = layout
    setActiveLayout(layout)
  })
})

viewToggles.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const mode = toggle.dataset.previewMode
    if (!mode) return
    setViewMode(mode)
  })
})

downloadButton.addEventListener('click', () => {
  if (!state.response?.zipBase64) return
  const blob = base64ToBlob(state.response.zipBase64, 'application/zip')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `neosite-${Date.now()}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (state.generating) return

  const prompt = promptInput.value.trim()
  if (prompt.length < 12) {
    showError('Tell us a little more about your idea (min 12 characters).')
    return
  }

  const body = {
    prompt,
    options: {
      theme: form.elements.namedItem('theme').value,
      primaryColor: colorValueInput.value,
      layout: layoutValueInput.value
    }
  }

  try {
    beginGeneration()
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    clearProgressTimers()
    setProgressState(0, 'done')
    setProgressState(1, 'active')

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Generation failed' }))
      throw new Error(error.error || 'We could not generate a site right now.')
    }

    const data = await response.json()
    state.response = data

    setProgressState(1, 'done')
    setProgressState(2, 'active')

    applyPreview(data.previewHtml)
    renderSpec(data.spec)
    renderCode(data.files)
    updateMetrics(data.metrics, data.zipSize)
    downloadButton.disabled = false

    setProgressState(2, 'done')
  } catch (error) {
    console.error('[neosite] generation failed', error)
    showError(error.message || 'We could not generate a site right now. Try again in a minute.')
  } finally {
    finishGeneration()
  }
})

function beginGeneration() {
  state.generating = true
  hideError()
  downloadButton.disabled = true
  setProgressState(0, 'active')
  setProgressState(1, 'idle')
  setProgressState(2, 'idle')
  clearProgressTimers()
  state.progressTimers.push(
    setTimeout(() => setProgressState(1, 'active'), 1200),
    setTimeout(() => setProgressState(2, 'active'), 3200)
  )
  generateButton.disabled = true
  generateButton.classList.add('opacity-70')
  generateButton.textContent = 'Generating…'
}

function finishGeneration() {
  state.generating = false
  clearProgressTimers()
  generateButton.disabled = false
  generateButton.classList.remove('opacity-70')
  generateButton.textContent = 'Generate landing page'
}

function clearProgressTimers() {
  state.progressTimers.forEach((id) => clearTimeout(id))
  state.progressTimers = []
}

function setProgressState(index, stateValue) {
  const item = progressSteps[index]
  if (!item) return
  item.dataset.state = stateValue
}

function applyPreview(html) {
  previewFrame.srcdoc = html
  previewFrame.classList.remove('hidden')
  previewEmpty.classList.add('hidden')
  previewShell.setAttribute('data-mode', state.previewMode)
}

function renderSpec(spec) {
  if (!spec) return
  const sections = spec.sections
    .filter((section) => section.type !== 'hero')
    .map(
      (section) => `<div class="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
        <p class="text-[0.65rem] uppercase tracking-[0.28em] text-blue-300/80">${escapeHtml(section.type)}</p>
        <h4 class="mt-2 text-base font-semibold text-slate-100">${escapeHtml(section.title)}</h4>
        <p class="mt-2 text-sm text-slate-400">${escapeHtml(section.body || '')}</p>
        ${
          section.items
            ? `<ul class="mt-3 space-y-2 text-xs text-slate-300">${section.items
                .map((item) => `<li class="rounded-xl border border-white/5 bg-slate-900/70 px-3 py-2"><span class="font-medium text-slate-200">${escapeHtml(item.title)}:</span> ${escapeHtml(item.description)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>`
    )
    .join('')

  specSummary.innerHTML = `
    <dl class="grid gap-3 text-sm">
      <div>
        <dt>Title</dt>
        <dd>${escapeHtml(spec.title)}</dd>
      </div>
      <div>
        <dt>Headline</dt>
        <dd>${escapeHtml(spec.headline)}</dd>
      </div>
      <div>
        <dt>Promise</dt>
        <dd>${escapeHtml(spec.promise)}</dd>
      </div>
    </dl>
    <div class="mt-4 grid gap-3">${sections}</div>
  `
}

function renderCode(files = []) {
  const htmlFile = files.find((file) => file.path === 'index.html')
  const cssFile = files.find((file) => file.path === 'styles.css')
  const jsFile = files.find((file) => file.path === 'script.js')
  codeHtml.textContent = htmlFile ? htmlFile.contents : '// index.html will appear here after generation'
  codeCss.textContent = cssFile ? cssFile.contents : '/* styles.css will appear here after generation */'
  codeJs.textContent = jsFile ? jsFile.contents : '// script.js will appear here after generation'
}

function updateMetrics(metrics, zipSize) {
  if (metrics) {
    metricDuration.textContent = `${metrics.generationMs} ms`
    metricTokens.textContent = `${metrics.estimatedTokens.toLocaleString()} tokens`
  }
  if (zipSize) {
    metricSize.textContent = formatBytes(zipSize)
  }
}

function setViewMode(mode) {
  state.previewMode = mode
  previewShell.setAttribute('data-mode', mode)
  viewToggles.forEach((toggle) => {
    toggle.classList.toggle('is-active', toggle.dataset.previewMode === mode)
  })
}

function setActiveColor(hex) {
  const normalized = normalizeHex(hex)
  colorSwatches.forEach((button) => {
    button.classList.toggle('is-active', normalizeHex(button.dataset.color) === normalized)
  })
}

function setActiveLayout(layout) {
  layoutCards.forEach((card) => {
    card.classList.toggle('is-active', card.dataset.layoutOption === layout)
  })
}

function showError(message) {
  errorMessage.textContent = message
  errorMessage.classList.remove('hidden')
}

function hideError() {
  errorMessage.classList.add('hidden')
  errorMessage.textContent = ''
}

function updatePromptCount() {
  const length = promptInput.value.length
  promptCount.textContent = `${length} / 600`
}

function normalizeHex(hex) {
  const value = hex.startsWith('#') ? hex : `#${hex}`
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
  }
  return value.toLowerCase()
}

function base64ToBlob(base64, mime) {
  const binary = atob(base64)
  const length = binary.length
  const buffer = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }
  return new Blob([buffer], { type: mime })
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value > 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function escapeHtml(value) {
  if (!value) return ''
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}
