import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { jsxRenderer } from 'hono/jsx-renderer';
export const renderer = jsxRenderer(({ children, title }) => {
    const resolvedTitle = title
        ? `${title} · NeoSite`
        : 'NeoSite · AI landing page builder for instant exports';
    const tailwindConfig = `tailwind.config = { theme: { extend: { colors: { slate: { 950: '#050816' } } } } }`;
    return (_jsxs("html", { lang: "en", class: "bg-slate-950", children: [_jsxs("head", { children: [_jsx("meta", { charSet: "utf-8" }), _jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }), _jsx("meta", { name: "description", content: "NeoSite converts your prompt into a production-ready landing page bundle with responsive design and downloadable assets." }), _jsx("title", { children: resolvedTitle }), _jsx("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }), _jsx("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }), _jsx("link", { href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", rel: "stylesheet" }), _jsx("link", { href: "/static/style.css", rel: "stylesheet" }), _jsx("script", { dangerouslySetInnerHTML: { __html: tailwindConfig } }), _jsx("script", { src: "https://cdn.tailwindcss.com?plugins=forms,typography" })] }), _jsxs("body", { class: "min-h-screen bg-slate-950 font-['Inter',system-ui,sans-serif] antialiased", children: [children, _jsx("script", { type: "module", src: "/static/app.js" })] })] }));
});
