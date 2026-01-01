import JSZip from 'jszip'

export type ThemeOption = 'light' | 'dark' | 'auto'
export type LayoutOption = 'single-column' | 'hero+features' | 'spotlight'

export interface GenerateOptions {
  theme: ThemeOption
  primaryColor: string
  layout: LayoutOption
}

export interface NormalizedOptions extends GenerateOptions {
  primaryColor: string
  palette: Palette
}

export interface Palette {
  primary: string
  primaryAccent: string
  primarySoft: string
  surface: string
  surfaceStrong: string
  text: string
  textMuting: string
  ring: string
  glow: string
}

export interface SiteSection {
  id: string
  type: 'hero' | 'features' | 'story' | 'cta'
  eyebrow?: string
  title: string
  body: string
  items?: Array<{
    title: string
    description: string
  }>
  cta?: {
    label: string
    href: string
  }
}

export interface SiteSpec {
  title: string
  headline: string
  subheadline: string
  promise: string
  keywords: string[]
  sections: SiteSection[]
}

export interface ImageAsset {
  key: string
  filename: string
  alt: string
  role: 'hero' | 'feature'
  dataUri: string
}

export interface OutputFile {
  path: string
  contents: string
  mimeType: string
  encoding?: 'base64'
}

export interface GenerateResult {
  spec: SiteSpec
  options: NormalizedOptions
  files: OutputFile[]
  images: ImageAsset[]
  previewHtml: string
  zipBase64: string
  zipSize: number
  metrics: {
    generationMs: number
    htmlChars: number
    cssChars: number
    promptChars: number
    estimatedTokens: number
  }
}

const DEFAULT_PRIMARY = '#2563eb'
const ALLOWED_THEMES: ThemeOption[] = ['light', 'dark', 'auto']
const ALLOWED_LAYOUTS: LayoutOption[] = ['single-column', 'hero+features', 'spotlight']

const STOP_WORDS = new Set(
  [
    'the',
    'a',
    'an',
    'and',
    'with',
    'for',
    'your',
    'from',
    'this',
    'that',
    'into',
    'on',
    'to',
    'of',
    'by',
    'at',
    'our',
    'we',
    'you',
    'its',
    'in',
    'as',
    'is',
    'are'
  ]
)

export async function generateSite(prompt: string, rawOptions: GenerateOptions): Promise<GenerateResult> {
  const started = Date.now()
  const options = normalizeOptions(rawOptions)
  const normalizedPrompt = prompt.trim().replace(/\s+/g, ' ')

  const keywords = extractKeywords(normalizedPrompt)
  const spec = buildSpec(normalizedPrompt, keywords, options)
  const images = buildImages(spec, options)
  const css = buildCss(spec, options)
  const js = buildScript()
  const html = buildHtml({ spec, options, images, cssHref: 'styles.css', scriptHref: 'script.js' })
  const previewHtml = buildHtml({ spec, options, images, inlineCss: css, inlineScript: js })

  const files: OutputFile[] = [
    { path: 'index.html', contents: html, mimeType: 'text/html' },
    { path: 'styles.css', contents: css, mimeType: 'text/css' },
    { path: 'script.js', contents: js, mimeType: 'application/javascript' }
  ]

  images.forEach((asset) => {
    const { base64 } = decodeDataUri(asset.dataUri)
    files.push({ path: `images/${asset.filename}`, contents: base64, mimeType: 'image/svg+xml', encoding: 'base64' })
  })

  const { base64: zipBase64, size: zipSize } = await createZip(files)
  const ended = Date.now()

  return {
    spec,
    options,
    files,
    images,
    previewHtml,
    zipBase64,
    zipSize,
    metrics: {
      generationMs: ended - started,
      htmlChars: html.length,
      cssChars: css.length,
      promptChars: normalizedPrompt.length,
      estimatedTokens: estimateTokens(normalizedPrompt.length, html.length + css.length)
    }
  }
}

function normalizeOptions(options: GenerateOptions): NormalizedOptions {
  const theme = ALLOWED_THEMES.includes(options.theme) ? options.theme : 'auto'
  const layout = ALLOWED_LAYOUTS.includes(options.layout) ? options.layout : 'hero+features'
  const primaryColor = sanitizeHex(options.primaryColor) || DEFAULT_PRIMARY
  const palette = buildPalette(primaryColor, theme)
  return { theme, layout, primaryColor, palette }
}

function sanitizeHex(value: string | undefined): string | null {
  if (!value) return null
  const hex = value.trim().toLowerCase()
  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/.test(hex)) {
    return expandShortHex(hex)
  }
  return null
}

function expandShortHex(hex: string): string {
  if (hex.length === 4) {
    return (
      '#' +
      hex
        .slice(1)
        .split('')
        .map((ch) => ch + ch)
        .join('')
    )
  }
  return hex
}

function buildPalette(primaryHex: string, theme: ThemeOption): Palette {
  const { r, g, b } = hexToRgb(primaryHex)
  const hsl = rgbToHsl(r, g, b)

  const accent = hslToHex({ ...hsl, l: clamp(hsl.l + 0.15) })
  const soft = hslToHex({ ...hsl, l: clamp(theme === 'dark' ? hsl.l - 0.25 : hsl.l + 0.25) })
  const surface = theme === 'dark' ? '#070814' : '#f9fbff'
  const surfaceStrong = theme === 'dark' ? '#101225' : '#ffffff'
  const text = theme === 'dark' ? '#f5f7ff' : '#0f172a'
  const textMuting = theme === 'dark' ? '#98a2c3' : '#4b5563'
  const ring = hslToHex({ ...hsl, s: clamp(hsl.s + 0.2), l: clamp(hsl.l + (theme === 'dark' ? 0.05 : -0.1)) })
  const glow = hslToHex({ ...hsl, s: clamp(hsl.s + 0.1), l: clamp(hsl.l + 0.25) })

  return {
    primary: primaryHex,
    primaryAccent: accent,
    primarySoft: soft,
    surface,
    surfaceStrong,
    text,
    textMuting,
    ring,
    glow
  }
}

function buildSpec(prompt: string, keywords: string[], options: NormalizedOptions): SiteSpec {
  const focus = keywords[0] || 'your idea'
  const secondary = keywords[1] || 'customers'
  const tone = keywords[2] || 'growth'

  const title = titleCase(`${focus} launch`)
  const headline = `Launch ${focus} in minutes`
  const subheadline = `NeoSite turns your ${focus} concept into a polished landing page, so you can capture ${secondary} without writing code.`
  const promise = `AI-crafted design, optimized for conversions, styled with your ${options.primaryColor} branding.`

  const baseSections: SiteSection[] = [
    {
      id: 'hero',
      type: 'hero',
      eyebrow: `Built for ${focus}`,
      title: headline,
      body: `${subheadline} Describe what makes it special and let our AI expand it into a launch-ready story.`,
      cta: {
        label: 'Download launch kit',
        href: '#cta'
      }
    },
    {
      id: 'features',
      type: 'features',
      title: 'Why teams choose NeoSite',
      body: 'Each site uses a clean semantic structure, mobile-first styling, and accessible copy that adapts to your story.',
      items: buildFeatureItems(focus, tone)
    },
    {
      id: 'story',
      type: 'story',
      title: 'Tell the story behind the product',
      body: `Informative sections help visitors understand the mission behind ${focus}. Combine product highlights with social proof and clear calls to action.`,
      items: [
        {
          title: 'Audience ready copy',
          description: `Custom messaging tailored to ${secondary}, tuned for clarity and high intent.`
        },
        {
          title: 'Responsive from the start',
          description: 'Layouts collapse elegantly for mobile and tablet screens with adaptive typography scales.'
        }
      ]
    },
    {
      id: 'cta',
      type: 'cta',
      title: 'Ready to launch?',
      body: `Download your landing page as a ZIP, deploy it to InfinityFree, Netlify, or any static host in seconds.`,
      cta: {
        label: 'Get your site bundle',
        href: '#'
      }
    }
  ]

  const sections = customizeSections(baseSections, options.layout)

  return {
    title,
    headline,
    subheadline,
    promise,
    keywords,
    sections
  }
}

function customizeSections(sections: SiteSection[], layout: LayoutOption): SiteSection[] {
  if (layout === 'single-column') {
    return sections.map((section) => {
      if (section.type === 'features' && section.items) {
        return {
          ...section,
          body: section.body + ' Focused single-column storytelling keeps visitors scrolling.',
          items: section.items.slice(0, 2)
        }
      }
      return section
    })
  }
  if (layout === 'spotlight') {
    return sections.map((section) => {
      if (section.type === 'story' && section.items) {
        return {
          ...section,
          eyebrow: 'Deep dive',
          title: 'Spotlight your flagship benefit',
          body: 'Alternate full-width spotlight sections with testimonials or metrics for extra credibility.',
          items: section.items.map((item, idx) => ({
            ...item,
            description: idx === 0 ? `${item.description} Showcase actual numbers or milestones to reinforce trust.` : `${item.description} Expand with a customer quote to humanize the brand.`
          }))
        }
      }
      return section
    })
  }
  return sections
}

function buildFeatureItems(focus: string, tone: string) {
  const base = [
    {
      title: 'Guided storytelling',
      description: `We expand your prompt into a structured narrative highlighting ${focus}.`
    },
    {
      title: 'Ready-to-host bundle',
      description: 'Download HTML, CSS, JS, and optimized assets prepared for any static host.'
    },
    {
      title: 'Conversion-first structure',
      description: `Clear hierarchy, scannable sections, and persuasive copy align with your ${tone} goals.`
    }
  ]
  return base
}

function buildImages(spec: SiteSpec, options: NormalizedOptions): ImageAsset[] {
  const heroHeadline = spec.headline.replace(/<[^>]+>/g, '')
  const hero = createHeroImage(heroHeadline, options)

  const features = (spec.sections.find((section) => section.type === 'features')?.items || []).map((item, index) => createFeatureImage(item.title, index, options))

  return [hero, ...features]
}

function createHeroImage(text: string, options: NormalizedOptions): ImageAsset {
  const display = truncate(text, 42)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" role="img" aria-label="Hero illustration"><defs><linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${options.palette.primary}" /><stop offset="100%" stop-color="${options.palette.primaryAccent}" /></linearGradient><linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.12)" /><stop offset="100%" stop-color="rgba(255,255,255,0)" /></linearGradient></defs><rect width="1200" height="720" fill="url(#gradient)" rx="48" /><circle cx="260" cy="220" r="140" fill="rgba(255,255,255,0.12)" /><circle cx="950" cy="160" r="110" fill="rgba(255,255,255,0.08)" /><rect x="140" y="360" width="920" height="260" rx="36" fill="rgba(7,12,27,0.55)" /><text x="180" y="470" fill="#f8fbff" font-family="'Inter',sans-serif" font-size="56" font-weight="600">${escapeXml(display)}</text><text x="180" y="528" fill="rgba(248,251,255,0.72)" font-family="'Inter',sans-serif" font-size="28">Launch with confidence</text><rect x="180" y="560" width="280" height="64" rx="18" fill="url(#glow)" /></svg>`
  return {
    key: 'hero',
    filename: 'hero.svg',
    alt: `Hero illustration describing ${text}`,
    role: 'hero',
    dataUri: svgToDataUri(svg)
  }
}

function createFeatureImage(title: string, index: number, options: NormalizedOptions): ImageAsset {
  const badge = ['alpha', 'beta', 'growth'][index % 3]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Feature icon"><defs><radialGradient id="dot" cx="0.5" cy="0.35" r="0.75"><stop offset="0%" stop-color="${options.palette.primaryAccent}" /><stop offset="100%" stop-color="${options.palette.primarySoft}" /></radialGradient></defs><rect width="400" height="400" rx="48" fill="${options.palette.surfaceStrong}" /><circle cx="200" cy="180" r="110" fill="url(#dot)" opacity="0.95" /><path d="M160 244h80" stroke="${options.palette.primary}" stroke-width="20" stroke-linecap="round" /><text x="200" y="322" text-anchor="middle" fill="${options.palette.text}" font-family="'Inter',sans-serif" font-size="36" font-weight="600">${escapeXml(badge)}</text></svg>`
  return {
    key: `feature-${index}`,
    filename: `feature-${index + 1}.svg`,
    alt: `${title} icon`,
    role: 'feature',
    dataUri: svgToDataUri(svg)
  }
}

function buildCss(_spec: SiteSpec, options: NormalizedOptions): string {
  return `:root {
  color-scheme: ${options.theme === 'dark' ? 'dark' : 'light'};
  --bg: ${options.palette.surface};
  --surface: ${options.palette.surfaceStrong};
  --text: ${options.palette.text};
  --text-soft: ${options.palette.textMuting};
  --primary: ${options.palette.primary};
  --primary-accent: ${options.palette.primaryAccent};
  --primary-soft: ${options.palette.primarySoft};
  --ring: ${options.palette.ring};
  --glow: ${options.palette.glow};
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  line-height: 1.55;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a {
  color: inherit;
}

header {
  padding: clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 6vw, 6rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative;
}

nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
}

.brand__badge {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.9rem;
  background: linear-gradient(135deg, var(--primary) 0%, rgba(59, 130, 246, 0.6) 100%);
  display: grid;
  place-items: center;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
}

nav ul {
  list-style: none;
  display: flex;
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  color: var(--text-soft);
  font-size: 0.95rem;
}

.cta-button {
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-accent) 100%);
  color: white;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 12px 38px rgba(37, 99, 235, 0.32);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 42px rgba(37, 99, 235, 0.4);
}

main {
  flex: 1;
  padding: 0 clamp(1.5rem, 6vw, 6rem) clamp(3rem, 8vw, 8rem);
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr));
  gap: clamp(2rem, 4vw, 5rem);
  align-items: center;
  background: var(--surface);
  border-radius: 2.5rem;
  padding: clamp(2.5rem, 4vw, 4rem);
  position: relative;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(15, 23, 42, 0.12);
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent);
  z-index: 0;
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero__eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--primary);
}

.hero__headline {
  font-size: clamp(2.4rem, 4vw, 3.6rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.hero__body {
  color: var(--text-soft);
  font-size: 1.05rem;
  max-width: 36rem;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.hero__cta a {
  background: var(--primary);
  color: white;
  padding: 0.9rem 1.75rem;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.28);
}

.hero__meta {
  font-size: 0.95rem;
  color: var(--text-soft);
}

.hero__media {
  position: relative;
  z-index: 1;
  border-radius: 2rem;
  overflow: hidden;
  box-shadow: 0 32px 60px rgba(15, 23, 42, 0.18);
}

.hero__media img {
  width: 100%;
  display: block;
}

.section {
  margin-top: clamp(3rem, 6vw, 5rem);
  display: grid;
  gap: clamp(1.5rem, 3vw, 2.75rem);
}

.section__eyebrow {
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-size: 0.8rem;
  color: var(--primary);
  font-weight: 600;
}

.section__title {
  font-size: clamp(2rem, 3vw, 2.75rem);
  font-weight: 700;
}

.section__body {
  max-width: 36rem;
  color: var(--text-soft);
  font-size: 1.05rem;
}

.section__grid {
  display: grid;
  gap: 1.75rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.card {
  background: var(--surface);
  border-radius: 1.5rem;
  padding: 1.75rem;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.14);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.card__icon img {
  width: 72px;
  height: 72px;
}

.card__title {
  font-weight: 600;
  font-size: 1.25rem;
}

.card__body {
  color: var(--text-soft);
}

.cta {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent);
  border-radius: 2rem;
  padding: clamp(2.5rem, 5vw, 4rem);
  display: grid;
  gap: 1.5rem;
  text-align: center;
  border: 1px solid rgba(37, 99, 235, 0.18);
}

.cta h2 {
  font-size: clamp(2.2rem, 3vw, 2.8rem);
  margin: 0;
}

.cta p {
  color: var(--text-soft);
  max-width: 40rem;
  margin: 0 auto;
}

.cta a {
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.25rem;
  font-weight: 600;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  text-decoration: none;
  box-shadow: 0 20px 45px rgba(37, 99, 235, 0.28);
}

footer {
  margin-top: clamp(4rem, 8vw, 6rem);
  padding: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 6vw, 6rem);
  color: var(--text-soft);
  font-size: 0.9rem;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

@media (max-width: 900px) {
  nav ul {
    display: none;
  }
  .hero {
    border-radius: 2rem;
  }
}

@media (max-width: 640px) {
  header {
    padding: 2rem 1.25rem;
  }
  main {
    padding: 0 1.25rem 3rem;
  }
  .card {
    border-radius: 1.25rem;
  }
}
`
}

function buildScript(): string {
  return `'use strict';
(() => {
  const navToggle = document.querySelector('[data-mobile-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('is-open');
    });
  }

  const smoothLinks = document.querySelectorAll('a[href^="#"]');
  smoothLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
`
}

interface BuildHtmlOptions {
  spec: SiteSpec
  options: NormalizedOptions
  images: ImageAsset[]
  cssHref?: string
  scriptHref?: string
  inlineCss?: string
  inlineScript?: string
}

function buildHtml({ spec, options, images, cssHref, scriptHref, inlineCss, inlineScript }: BuildHtmlOptions): string {
  const heroImage = images.find((asset) => asset.role === 'hero')
  const featureImages = images.filter((asset) => asset.role === 'feature')

  const styleTag = inlineCss ? `<style>${inlineCss}</style>` : `<link rel="stylesheet" href="${cssHref}" />`
  const scriptTag = inlineScript ? `<script>${inlineScript}</script>` : `<script src="${scriptHref}"></script>`

  const renderFeatureCard = (item: NonNullable<SiteSection['items']>[number], index: number) => {
    const asset = featureImages[index]
    const imageTag = asset ? `<div class="card__icon"><img src="${inlineCss ? asset.dataUri : `images/${asset.filename}`}" alt="${escapeHtml(asset.alt)}" loading="lazy" /></div>` : ''
    return `<div class="card">
  ${imageTag}
  <div class="card__title">${escapeHtml(item.title)}</div>
  <div class="card__body">${escapeHtml(item.description)}</div>
</div>`
  }

  const sectionsMarkup = spec.sections
    .filter((section) => section.type !== 'hero')
    .map((section) => {
      const eyebrow = section.eyebrow ? `<div class="section__eyebrow">${escapeHtml(section.eyebrow)}</div>` : ''
      const body = section.body ? `<div class="section__body">${escapeHtml(section.body)}</div>` : ''
      const items = section.items?.length
        ? `<div class="section__grid">${section.items.map(renderFeatureCard).join('')}</div>`
        : ''

      if (section.type === 'cta') {
        const ctaLabel = section.cta ? escapeHtml(section.cta.label) : 'Launch now'
        return `<section id="cta" class="section cta">
  <h2>${escapeHtml(section.title)}</h2>
  <p>${escapeHtml(section.body)}</p>
  <a href="${section.cta?.href || '#'}">${ctaLabel}</a>
</section>`
      }

      return `<section class="section" id="${escapeHtml(section.id)}">
  ${eyebrow}
  <h2 class="section__title">${escapeHtml(section.title)}</h2>
  ${body}
  ${items}
</section>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en" data-theme="${options.theme}" data-layout="${options.layout}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(spec.title)} · NeoSite</title>
    <meta name="description" content="${escapeHtml(spec.promise)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    ${styleTag}
  </head>
  <body data-layout="${options.layout}">
    <header>
      <nav>
        <div class="brand">
          <div class="brand__badge">N</div>
          <span>NeoSite</span>
        </div>
        <button class="cta-button" data-mobile-toggle type="button">Menu</button>
        <ul data-nav-links>
          <li><a href="#hero">Overview</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#story">Story</a></li>
        </ul>
        <a class="cta-button" href="#cta">Download bundle</a>
      </nav>
      <div class="hero" id="hero">
        <div class="hero__content">
          <span class="hero__eyebrow">${escapeHtml(spec.sections.find((section) => section.type === 'hero')?.eyebrow || 'Launch ready')}</span>
          <h1 class="hero__headline">${escapeHtml(spec.headline)}</h1>
          <p class="hero__body">${escapeHtml(spec.subheadline)}</p>
          <div class="hero__cta">
            <a href="#cta">Download site</a>
            <div class="hero__meta">${escapeHtml(spec.promise)}</div>
          </div>
        </div>
        ${heroImage ? `<div class="hero__media"><img src="${inlineCss ? heroImage.dataUri : `images/${heroImage.filename}`}" alt="${escapeHtml(heroImage.alt)}" /></div>` : ''}
      </div>
    </header>
    <main>
${sectionsMarkup}
    </main>
    <footer>
      Crafted with NeoSite · Effortless landing page generation powered by AI.
    </footer>
    ${scriptTag}
  </body>
</html>`
}

async function createZip(files: OutputFile[]) {
  const zip = new JSZip()
  files.forEach((file) => {
    if (file.encoding === 'base64') {
      zip.file(file.path, file.contents, { base64: true })
    } else {
      zip.file(file.path, file.contents)
    }
  })
  const content = await zip.generateAsync({ type: 'uint8array' })
  return {
    base64: encodeUint8ArrayToBase64(content),
    size: content.byteLength
  }
}

function encodeUint8ArrayToBase64(buffer: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64')
  }
  let binary = ''
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${encodeStringToBase64(svg)}`
}

function decodeDataUri(dataUri: string): { mime: string; base64: string } {
  const match = dataUri.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw new Error('Unsupported data URI')
  }
  return { mime: match[1], base64: match[2] }
}

function encodeStringToBase64(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64')
  }
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function estimateTokens(promptChars: number, outputChars: number): number {
  const total = promptChars + outputChars
  return Math.ceil(total / 4)
}

function extractKeywords(prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word))

  const frequency = new Map<string, number>()
  words.forEach((word) => {
    frequency.set(word, (frequency.get(word) || 0) + 1)
  })

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1) + '…' : value
}

function titleCase(value: string) {
  return value.replace(/(^|\s)([a-z])/g, (_, space, char) => `${space || ''}${char.toUpperCase()}`)
}

function escapeHtml(value: string): string {
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

function escapeXml(value: string): string {
  return escapeHtml(value)
}

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  ;[r, g, b] = [r, g, b].map((value) => value / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h, s, l }
}

function hslToHex({ h, s, l }: HSL): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}
