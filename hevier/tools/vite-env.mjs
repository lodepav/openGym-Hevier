// Lets node import the app's own helpers (hevy-export.js, next-planned.js, onerm.js) outside Vite:
// a module hook that gives frontend/src the build-time values Vite would (import.meta.env) and an
// empty import.meta.glob (the locale packs: t() then answers in English, as the export writes).
//
//   import { useViteEnv } from './vite-env.mjs'; useViteEnv(); const m = await import('…/frontend/src/…')
import { register } from 'node:module'

export function useViteEnv(env = { VITE_MOBILE: '1', VITE_HEVIER: '1', MODE: 'production', DEV: false, PROD: true }) {
  register(import.meta.url, { data: env })
}

let ENV = '{}'
export function initialize(data) { ENV = JSON.stringify(data || {}) }

export async function load(url, context, next) {
  const r = await next(url, context)
  if (!url.includes('/frontend/src/') || r.format !== 'module' || r.source == null) return r
  const source = String(r.source).replaceAll('import.meta.env', `(${ENV})`).replaceAll('import.meta.glob(', '(() => ({}))(')
  return { ...r, source }
}
