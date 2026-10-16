// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'

// hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
if (HEVIER) document.documentElement.dataset.ui = 'hevier'

export { HEVIER }
