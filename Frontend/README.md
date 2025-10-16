# Frontend — TaxWise (Detailed README)

This document describes the `Frontend/` app in this workspace. It is a React + Vite application that provides the user dashboard, visualizations, forms, and other client-side features for TaxWise. This README is intentionally detailed: it lists key files, describes the component and routing structure, explains styling and theming, provides PowerShell-friendly run/build/debug commands, and gives practical suggestions for testing and hardening.

Status & requirements
- Tech: React 19 (Vite), Tailwind CSS, Framer Motion, Lucide icons
- Dev tools: Node 16+ (package.json lists "engines" in other subprojects; use Node 16+), npm
- Entry: `src/main.jsx`

Table of contents
- Quick start
- Project layout (files you should know)
- Key components & pages
- State, contexts & hooks
- Styling, themes, and assets
- Routing and navigation
- Build, preview & deploy notes
- Debugging & troubleshooting
- Tests & linting
- Suggested improvements and next steps

---

Quick start (PowerShell)

1) Install dependencies and run the dev server

```powershell
cd d:\Programming\BitNBuild-25_GRIND\Frontend
npm install
npm run dev
```

Vite will start (default port 5173). Open the browser at http://localhost:5173 (Vite will print the exact URL).

2) Build for production

```powershell
npm run build
npm run preview
```

`npm run preview` serves the production build locally so you can sanity-check assets and CSS before deploying.

---

Project layout (important files)

- `package.json` — scripts & dependencies. Key deps: `react`, `react-dom`, `vite`, `tailwindcss`, `framer-motion`, `lucide-react`.
- `src/main.jsx` — app entry: mounts React tree, wraps `App` with `AuthProvider` and `BrowserRouter`.
- `src/App.jsx` — main application shell and route mapping. This file imports many pages and shared components and contains hero sections used on the marketing/home pages.
- `src/index.css` — Tailwind entry and base/global styles (includes Google font import and custom `glass-panel` utility).
- `src/App.css` — currently imports Tailwind (keeps place for component-level CSS if needed).
- `src/components/` — UI primitives (buttons, inputs, cards) and composed components (e.g., `logo`, `notification-card`).
- `src/pages/` — route pages. Example: `pages/dashboard/*` contains dashboard subpages (Overview, Analytics, Filings, Clients, Profile, Branding, KYC refresh, Runbook, CA session).
- `src/contexts/` — React Context providers: `AuthContext.jsx`, `BrandingContext.jsx` (the app uses branding to theme UI sections).
- `src/hooks/` — custom hooks such as `useStatementUpload`.
- `src/lib/utils` — small helpers like `cn` (className joiner) used across components.

If you are exploring code, start at `src/main.jsx`, then `src/App.jsx`, then dive into `src/pages/dashboard/*` and `src/components/*`.

---

Key components & pages (developer's map)

This project follows a component-first pattern. Below are the most important pieces and what they do.

- `App.jsx`
  - Acts as the top-level page composition for marketing and dashboard views.
  - Imports `DashboardLayout` and several `Dashboard*` pages: Overview, Analytics, Filings, Clients, Profile, Branding, KycRefresh, Runbook, CaSession.
  - Contains hero and marketing components (Live preview, SecurityPanel, PricingPanel) that use `framer-motion` and tailwind utilities.

- `pages/dashboard/` (subpage examples)
  - `DashboardLayout` — the outer frame for dashboard pages (sidebar, header, main content area).
  - `DashboardOverview` — top-level dashboard widgets and summaries.
  - `DashboardAnalytics` — charts and analytics (likely uses `recharts`).

- `components/ui/*`
  - `button`, `card`, `input`, `label`, `tabs`, `notification-card` — small, reusable UI primitives built on Tailwind.

- `contexts/AuthContext.jsx`
  - Provides authentication state to the app. Check this file to see how tokens and user info are stored — sessions may be persisted (localStorage) or ephemeral.

- `contexts/BrandingContext.jsx`
  - The app supports dynamic branding colors. Branding values (primaryColor, accentColor) are consumed by components to build gradients and accent styles.

- Hooks
  - `useStatementUpload` — handles file uploads (bank/statement ingestion) and likely communicates with the backend.

When modifying UI, prefer composing from the `components/ui/*` primitives to keep styles consistent.

---

State management and contexts

State in this frontend is mainly handled using React hooks and Context providers. Key contexts:

- `AuthContext` — central for authentication state (user info, token). Look for methods: `login`, `logout`, `getToken`, `isAuthenticated`.
- `BrandingContext` — holds `branding` object used for theming sections (primaryColor, accentColor). Components use the `useBranding()` hook or `branding` from context.

Global state library: There is no Redux or Zustand in this project — state is local and context-based which keeps complexity low. If you need global immutable stores, consider introducing Zustand or Redux Toolkit for larger scale.

---

Styling, layout & theming

- Tailwind CSS: the project imports `tailwindcss` in `index.css` and uses the `@apply` directive to provide base styles.
- Font: `Plus Jakarta Sans` via Google fonts is included in `index.css`.
- Dark mode: the base CSS sets `color-scheme: light dark` and uses Tailwind `dark:` utilities across components.
- Utilities: `:root` color-scheme, `::selection` styling, and a `.glass-panel` utility are defined in `index.css`.
- The app uses inline style objects in some components to dynamically compose gradients using `branding` context.

Tips for styling
- Use `cn()` helper from `src/lib/utils` for conditional classes.
- Prefer Tailwind utility classes for layout; extract repeated combinations into component-level classes or `@layer utilities` to keep the HTML readable.

---

Routing and navigation

- Router entry: `BrowserRouter` in `src/main.jsx`.
- Routes and navigation are defined in `App.jsx` (via `react-router-dom` `Routes`, `Route`, and `Link`).
- Route-level patterns include marketing sections (home) and the `/dashboard` pages. The app uses nested routes inside `DashboardLayout`.

When adding a new page:
1. Create the page component under `src/pages/`.
2. Add a corresponding `Route` entry in `App.jsx` (or in the dashboard routes inside `DashboardLayout`).
3. Add any navigation links to the sidebar or header.

---

Build & deployment notes

- Vite handles dev server and production build.
- `npm run build` produces optimized assets into `dist/`.
- `npm run preview` uses Vite's preview server to serve the production build locally for testing.

Production deployment tips
- Serve the `dist/` output via a static host (Vercel, Netlify, Nginx). For server-side integration, the backend can serve these static files, but prefer a CDN-backed host for speed.
- Ensure environment-specific API base URLs are injected at build time (e.g., `VITE_API_URL` env var consumed with `import.meta.env.VITE_API_URL`). This project currently doesn't include explicit env instructions in the files we inspected — if the frontend needs to call the backend, add `VITE_API_URL` and reference it in API helper functions.

---

Debugging & troubleshooting

Useful tools and techniques:
- Browser DevTools (Console + Network): watch network calls for failing API requests.
- React DevTools: inspect component tree and context values (Auth, Branding).
- Vite terminal logs: shows module HMR updates and errors.
- Tailwind JIT errors: if classes don't apply, confirm `tailwind.config.js` includes your file globs.

Common issues & fixes
- Missing fonts or FOUC (flash of unstyled content): ensure Google font URL load is allowed and network is not blocked.
- Broken layout after adding classes: clear the browser cache or restart Vite (HMR sometimes leaves stale CSS state).
- API calls failing: check `VITE_API_URL` or the environment variable used by the frontend; also confirm backend is running and CORS is configured.

How to trace a failing UI state
1. Open React DevTools and inspect props/state of the component showing incorrect UI.
2. Check console for runtime warnings (missing keys, deprecated APIs).
3. Inspect network tab and replicate the failing request via curl/Postman.

---

Tests & linting

- Linting: `npm run lint` runs ESLint configured in the repo (see `package.json` scripts). Make sure you have devDependencies installed.
- Unit/Integration tests: there are no test scripts in `package.json` for this frontend by default. Recommended to add `vitest` or `jest` with `@testing-library/react` for component tests.

Suggested test matrix
- Component tests: render key components (`Buttons`, `Card`, `DashboardOverview`) and assert accessible text and interactions.
- Hook tests: test `useStatementUpload` with mocked network requests.
- Integration: run Vite preview and run a smoke test that loads the homepage and verifies main elements.

---

Developer suggestions & next steps

Short-term (low risk):
- Add a `VITE_API_URL` environment variable and document how frontend calls backend APIs.
- Add a `GET /health` smoke endpoint to the backend and implement a small script that the frontend devs can call to confirm the API is reachable before running the UI.
- Add `react-error-boundary` at top-level to gracefully show a fallback UI in case of runtime errors.

Middle-term (medium effort):
- Introduce TypeScript (gradual migration) for improved DX and fewer runtime errors in components.
- Add tests using `vitest` and `@testing-library/react` and configure CI to run them on PRs.
- Add Storybook for visual component documentation and a living styleguide.

Long-term (scale):
- Add performance budgets and Lighthouse checks in CI.
- Internationalization (i18n) support if you expect multi-locale users.

---

Files referenced in this README (quick jump list)
- `src/main.jsx` — entry and provider setup
- `src/App.jsx` — app shell and page composition
- `src/index.css` — global styles, Tailwind imports, and `glass-panel` utility
- `src/components/` — UI primitives
- `src/pages/` — dashboard pages and marketing pages
- `src/contexts/AuthContext.jsx` — authentication context
- `src/contexts/BrandingContext.jsx` — theme/branding provider

---

If you'd like, I can:
- Add a `VITE_API_URL` env example and small `src/lib/api.js` wrapper that consumes it.
- Add `vitest` + `@testing-library/react` with 2 example tests for `App.jsx` and one basic hook test for `useStatementUpload`.
- Create a `Frontend/dev-README-quick.md` with exact PR/branch developer onboarding steps.

Tell me which follow-up you'd like and I'll implement it.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Email notifications setup

Login alerts and concierge updates are sent through [EmailJS](https://www.emailjs.com/) via `Frontend/src/services/emailService.js`. Configure the integration by adding the following variables to your `Frontend/.env.local` (create the file if it does not exist):

```
VITE_EMAILJS_PUBLIC_KEY=pk_...
VITE_EMAILJS_SERVICE_ID=service_...
VITE_EMAILJS_TEMPLATE_ID=template_...
VITE_SUPPORT_EMAIL=support@example.com
VITE_APP_NAME=TaxWise
VITE_DASHBOARD_URL=https://app.example.com/dashboard/overview
```

Match the template variables in EmailJS with the payload defined in `emailService.js` (`user_name`, `login_time`, `device_info`, etc.). After saving the keys, restart the Vite dev server so the new configuration loads.
