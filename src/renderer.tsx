import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title }) => {
  const resolvedTitle = title
    ? `${title} · NeoSite`
    : 'NeoSite · AI landing page builder for instant exports'

  const tailwindConfig = `tailwind.config = { theme: { extend: { colors: { slate: { 950: '#050816' } } } } }`

  return (
    <html lang="en" class="bg-slate-950">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="NeoSite converts your prompt into a production-ready landing page bundle with responsive design and downloadable assets."
        />
        <title>{resolvedTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/static/style.css" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: tailwindConfig }} />
        <script src="https://cdn.tailwindcss.com?plugins=forms,typography" />
      </head>
      <body class="min-h-screen bg-slate-950 font-['Inter',system-ui,sans-serif] antialiased">
        {children}
        <script type="module" src="/static/app.js"></script>
      </body>
    </html>
  )
})
