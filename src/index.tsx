import { Hono } from 'hono'
import { renderer } from './renderer'
import { GenerateOptions, LayoutOption, ThemeOption, generateSite } from './generator'

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#2563eb' },
  { name: 'Coral', value: '#f97316' },
  { name: 'Emerald', value: '#22c55e' },
  { name: 'Magenta', value: '#d946ef' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Gold', value: '#facc15' }
]

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<HomePage />)
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json<{
      prompt?: string
      options?: Partial<GenerateOptions>
    }>()

    const prompt = body?.prompt?.toString().trim() ?? ''
    if (!prompt || prompt.length < 12) {
      return c.json({ status: 'error', error: 'Tell us a little more about your idea (min 12 characters).' }, 400)
    }
    if (prompt.length > 600) {
      return c.json({ status: 'error', error: 'Please keep the description under 600 characters.' }, 400)
    }

    const options = normalizeGenerateOptions(body?.options)
    const result = await generateSite(prompt, options)

    const textFiles = result.files
      .filter((file) => !file.encoding)
      .map((file) => ({ path: file.path, contents: file.contents, mimeType: file.mimeType }))

    return c.json({
      status: 'ok' as const,
      spec: result.spec,
      options: result.options,
      files: textFiles,
      images: result.images.map((image) => ({ key: image.key, alt: image.alt, dataUri: image.dataUri })),
      previewHtml: result.previewHtml,
      zipBase64: result.zipBase64,
      zipSize: result.zipSize,
      metrics: result.metrics
    })
  } catch (error) {
    console.error('[generate] error', error)
    return c.json({ status: 'error', error: 'We could not generate a site right now. Try again in a moment.' }, 500)
  }
})

function normalizeGenerateOptions(options?: Partial<GenerateOptions>): GenerateOptions {
  const theme = (options?.theme || 'auto') as ThemeOption
  const primaryColor = options?.primaryColor || '#2563eb'
  const layout = (options?.layout || 'hero+features') as LayoutOption
  return { theme, primaryColor, layout }
}

function HomePage() {
  return (
    <div class="relative min-h-screen bg-slate-950 text-slate-100">
      <div class="pointer-events-none absolute inset-x-0 top-[-20%] flex justify-center blur-3xl">
        <div class="h-64 w-[60%] rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-sky-500/30"></div>
      </div>
      <div class="relative">
        <header class="px-6 pb-12 pt-12 sm:px-10 lg:px-16">
          <div class="mx-auto flex max-w-6xl flex-col gap-10">
            <div class="flex flex-wrap items-center justify-between gap-6">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold shadow-lg shadow-blue-500/30">
                  NS
                </div>
                <div>
                  <p class="text-lg font-semibold tracking-tight">NeoSite</p>
                  <p class="text-sm text-slate-400">Describe your vision → download a production-ready landing page.</p>
                </div>
              </div>
              <div class="flex items-center gap-3 text-sm text-slate-400">
                <span class="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                  <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                  Free-tier friendly stack
                </span>
                <span class="hidden sm:inline">∞ InfinityFree deploy • Vercel API bridge</span>
              </div>
            </div>
            <div class="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10">
              <form
                id="generate-form"
                class="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-xl shadow-blue-500/5 backdrop-blur lg:p-8"
              >
                <div class="flex items-center justify-between">
                  <h2 class="text-base font-semibold tracking-tight sm:text-lg">Describe your landing page</h2>
                  <span id="prompt-count" class="text-xs text-slate-500">
                    0 / 600
                  </span>
                </div>
                <p class="mt-2 text-sm text-slate-400">
                  Spell out the product, audience, and vibe. NeoSite expands it into messaging, visuals, and a downloadable bundle.
                </p>
                <label class="mt-6 block">
                  <span class="text-sm font-medium text-slate-200">Prompt</span>
                  <textarea
                    id="prompt-input"
                    name="prompt"
                    rows={6}
                    maxLength={600}
                    placeholder="e.g. AI-powered nutrition coach for busy founders with weekly meal plans and progress tracking"
                    class="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-inner shadow-black/30 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    required
                  ></textarea>
                </label>

                <fieldset class="mt-6">
                  <legend class="text-sm font-semibold text-slate-200">Theme</legend>
                  <div class="mt-3 grid grid-cols-3 gap-3 text-sm">
                    {['auto', 'light', 'dark'].map((option) => (
                      <label key={option} class="group relative flex cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-blue-500/60">
                        <input
                          type="radio"
                          name="theme"
                          value={option}
                          defaultChecked={option === 'auto'}
                          class="sr-only peer"
                        />
                        <span class="text-[0.65rem] uppercase tracking-wider text-slate-500">{option === 'auto' ? 'System' : option}</span>
                        <span class="text-sm font-medium text-slate-100 capitalize">{option}</span>
                        <span class="absolute inset-0 rounded-2xl border-2 border-blue-500/0 transition peer-checked:border-blue-500/70"></span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset class="mt-6">
                  <legend class="text-sm font-semibold text-slate-200">Primary color</legend>
                  <input type="hidden" id="color-value" name="primaryColor" value="#2563eb" />
                  <div class="mt-3 grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        data-color={preset.value}
                        class="color-swatch group flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 text-xs font-medium text-slate-300 transition"
                        title={`Use ${preset.name} palette`}
                      >
                        <span
                          class="h-8 w-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: preset.value }}
                        ></span>
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div class="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                    <label class="text-xs uppercase tracking-wide text-slate-400">Custom</label>
                    <input
                      type="color"
                      id="custom-color"
                      class="h-9 w-16 cursor-pointer rounded-md border border-white/10 bg-transparent"
                      value="#2563eb"
                    />
                    <input
                      type="text"
                      id="custom-color-text"
                      maxLength={7}
                      class="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-mono tracking-wide text-slate-200 focus:border-blue-500 focus:outline-none"
                      defaultValue="#2563eb"
                    />
                  </div>
                </fieldset>

                <fieldset class="mt-6">
                  <legend class="text-sm font-semibold text-slate-200">Layout</legend>
                  <input type="hidden" id="layout-value" name="layout" value="hero+features" />
                  <div id="layout-options" class="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { key: 'hero+features', title: 'Hero + Features', description: 'Balanced hero, feature cards, CTA', icon: '🌠' },
                      { key: 'single-column', title: 'Single Column', description: 'Stacked narrative for storytelling', icon: '🧾' },
                      { key: 'spotlight', title: 'Spotlight', description: 'Feature spotlight with deep dive', icon: '🎯' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        data-layout-option={item.key}
                        class="layout-card group flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left text-sm transition hover:border-blue-500/60"
                      >
                        <span class="text-xl">{item.icon}</span>
                        <span class="font-semibold text-slate-100">{item.title}</span>
                        <span class="text-xs text-slate-400">{item.description}</span>
                        <span class="mt-auto inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-blue-400/0 transition group-[.is-active]:text-blue-400">
                          <svg viewBox="0 0 24 24" class="h-4 w-4 opacity-0 transition group-[.is-active]:opacity-100" fill="currentColor">
                            <path d="M9.5 16.17 5.83 12.5l-1.42 1.41L9.5 19l10-10-1.41-1.42z" />
                          </svg>
                          Selected
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div id="error-message" class="mt-6 hidden rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-200"></div>

                <button
                  type="submit"
                  id="generate-button"
                  class="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-sky-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-blue-500/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 12h2l3 7 4-14 3 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  Generate landing page
                </button>
                <p class="mt-3 text-xs text-slate-500">
                  Requests run fully serverless. No content is stored. Toggle layout or regenerate anytime.
                </p>
              </form>

              <div class="space-y-6">
                <div class="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5 backdrop-blur lg:p-8">
                  <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Generation steps</h3>
                  <ul id="progress-steps" class="mt-4 grid gap-3 text-sm">
                    {["Expanding your pitch", 'Designing the layout', 'Packaging the zip'].map((label, index) => (
                      <li
                        key={label}
                        data-step-index={index}
                        class="progress-step flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3"
                      >
                        <div class="mt-1 h-2 w-2 rounded-full bg-slate-600"></div>
                        <div>
                          <p class="font-medium text-slate-200">{label}</p>
                          <p class="text-xs text-slate-500">
                            {index === 0 && 'We expand the idea into structured sections and copy.'}
                            {index === 1 && 'Palette, typography, and responsive layout are tailored.'}
                            {index === 2 && 'Assets are bundled into a ready-to-host ZIP file.'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div class="rounded-3xl border border-white/5 bg-slate-900/60 shadow-lg shadow-blue-500/5 backdrop-blur">
                  <div class="flex items-center justify-between border-b border-white/5 px-6 py-4">
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Preview</h3>
                    <div class="flex gap-2 text-xs">
                      <button
                        type="button"
                        data-preview-mode="desktop"
                        class="view-toggle rounded-full bg-slate-800/80 px-3 py-1 font-medium text-slate-300 shadow-sm"
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        data-preview-mode="mobile"
                        class="view-toggle rounded-full px-3 py-1 font-medium text-slate-400 transition hover:bg-slate-800/60"
                      >
                        Mobile
                      </button>
                    </div>
                  </div>
                  <div class="preview-shell relative overflow-hidden border-t border-white/5">
                    <div id="preview-empty" class="flex h-[520px] flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.28),_rgba(15,23,42,0.9))] text-center text-sm text-slate-400">
                      <div class="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-blue-300">No build yet</div>
                      <p>
                        Generate a site to see a live preview. Desktop and mobile scales update instantly.
                      </p>
                    </div>
                    <iframe
                      id="preview-frame"
                      title="Generated preview"
                      class="hidden h-[520px] w-full bg-slate-950"
                      sandbox="allow-same-origin allow-scripts"
                    ></iframe>
                  </div>
                </div>

                <div class="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5 backdrop-blur lg:p-8">
                  <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Download bundle</h3>
                      <p class="mt-1 text-xs text-slate-500">
                        Includes HTML, CSS, JS, and SVG assets. Ready for InfinityFree, Netlify, Vercel static hosting.
                      </p>
                    </div>
                    <button
                      type="button"
                      id="download-zip"
                      disabled
                      class="inline-flex items-center gap-2 rounded-full bg-blue-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4m12 4v3H6v-3" />
                      </svg>
                      Download site.zip
                    </button>
                  </div>
                  <div class="mt-5 grid gap-4 text-xs text-slate-400 sm:grid-cols-3" id="metrics-panel">
                    <div class="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                      <p class="text-[0.7rem] uppercase tracking-wide text-slate-500">Generation</p>
                      <p class="mt-1 text-sm font-semibold text-slate-200" id="metric-duration">
                        –
                      </p>
                    </div>
                    <div class="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                      <p class="text-[0.7rem] uppercase tracking-wide text-slate-500">Bundle size</p>
                      <p class="mt-1 text-sm font-semibold text-slate-200" id="metric-size">
                        –
                      </p>
                    </div>
                    <div class="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                      <p class="text-[0.7rem] uppercase tracking-wide text-slate-500">Estimated tokens</p>
                      <p class="mt-1 text-sm font-semibold text-slate-200" id="metric-tokens">
                        –
                      </p>
                    </div>
                  </div>
                </div>

                <div class="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5 backdrop-blur lg:p-8">
                  <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Generated spec</h3>
                  <div id="spec-summary" class="mt-4 grid gap-4 text-sm text-slate-300">
                    <p>Fill in the prompt to view section summaries, call-to-actions, and feature copy.</p>
                  </div>
                  <details class="mt-5 rounded-2xl border border-white/5 bg-slate-950/70">
                    <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200">
                      View code bundle
                    </summary>
                    <div class="space-y-4 px-4 pb-4 pt-2 text-xs">
                      <div>
                        <div class="mb-1 font-semibold text-slate-300">index.html</div>
                        <pre class="code-block" id="code-html"></pre>
                      </div>
                      <div>
                        <div class="mb-1 font-semibold text-slate-300">styles.css</div>
                        <pre class="code-block" id="code-css"></pre>
                      </div>
                      <div>
                        <div class="mb-1 font-semibold text-slate-300">script.js</div>
                        <pre class="code-block" id="code-js"></pre>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </header>
        <footer class="border-t border-white/5 px-6 py-8 text-xs text-slate-500 sm:px-10 lg:px-16">
          <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p>NeoSite · Generated landing pages with exportable HTML/CSS assets.</p>
            <p class="flex items-center gap-2">
              <span class="hidden md:inline">Stack: Cloudflare Pages + Hono · Expo bridge ready</span>
              <span class="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-white/80">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Health check: <a class="underline" href="/api/health">/api/health</a>
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default app
