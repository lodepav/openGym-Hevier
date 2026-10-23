// Was this page reached by going back? React Router cannot say inside upstream's
// <Routes location> (App.jsx since 1.4.2), which reports every navigation there as POP; the
// browser can: a back or forward fires popstate, a push or replace does not, and each history
// entry has its own key. Used by the Calendar, which opens on this month unless you came back.
let popped = null

if (typeof window !== 'undefined') window.addEventListener('popstate', () => { popped = window.history.state?.key ?? null })

export const cameBack = win => popped != null && popped === win.history.state?.key
