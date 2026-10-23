// Was this page reached by going back? React Router cannot say inside upstream's
// <Routes location> (App.jsx since 1.4.2), which reports every navigation there as POP; the
// browser can: a back or forward fires popstate, a push or replace does not, and each history
// entry has its own key. Used by the Calendar, which opens on this month unless you came back.
let popped = null

export function watchBack(win) {
  const on = () => { popped = win.history.state?.key ?? null }
  win.addEventListener('popstate', on)
  return () => win.removeEventListener('popstate', on)
}

export const cameBack = win => popped != null && popped === win.history.state?.key

if (typeof window !== 'undefined') watchBack(window)
