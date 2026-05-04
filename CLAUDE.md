# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test runner is configured yet.

## Stack versions with breaking changes

- **Next.js 16.2.4** — Read `node_modules/next/dist/docs/` before writing any Next.js code. APIs and conventions may differ from prior major versions.
- **React 19.2.4** — App Router uses React canary builds; `use client` / `use server` directives are required for the correct rendering context.
- **Tailwind CSS v4** — Configuration is CSS-first, not `tailwind.config.js`. Utilities are imported via `@import "tailwindcss"` in `app/globals.css`. Theme tokens are defined with `@theme inline { ... }`. There are no `@tailwind base/components/utilities` directives.
- **ESLint 9** — Flat config format only (`eslint.config.mjs`). Plugin rules use the flat config API.

## Architecture

This is a Next.js App Router project. All routes live under `app/`.

- `app/layout.tsx` — Root layout. Loads Geist Sans and Geist Mono via `next/font/google` and applies them as CSS variables (`--font-geist-sans`, `--font-geist-mono`). Sets `min-h-full flex flex-col` on `<body>`.
- `app/globals.css` — Global styles and Tailwind import. CSS custom properties for `--background` / `--foreground` with a `prefers-color-scheme: dark` override; theme tokens mapped via `@theme inline`.
- `app/page.tsx` — Home page (Server Component by default).

**Path alias:** `@/` resolves to the project root (e.g. `@/app/...`, `@/components/...`).

**Rendering model:** Components are Server Components unless they include `"use client"` at the top. Avoid making components client-side unless they require browser APIs, event handlers, or React hooks.
