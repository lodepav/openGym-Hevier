// Fork setup for vitest-fast.config.js: test-setup.js only acts where there is a DOM, so only a
// happy-dom file pays for importing happy-dom (about 80 s over the whole suite).
if (typeof document !== 'undefined') await import('../../test-setup.js')
