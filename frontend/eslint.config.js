/* eslint-disable @typescript-eslint/no-require-imports */
// Frontend flat ESLint config that mirrors `next/core-web-vitals` and the
// Next TypeScript presets. Exported as an array so ESLint v9+ flat config
// loader can consume it. This keeps frontend-specific rules local to the
// frontend package and avoids relying on legacy `.eslintrc.*` files.
const nextVitals = require('eslint-config-next/core-web-vitals');
const nextTs = require('eslint-config-next/typescript');

module.exports = [
  // Ensure build artifacts and the config file itself are ignored before
  // any rule sets are applied. Placing ignores first prevents linting of
  // generated files under `.next/` (which previously produced a huge
  // number of noise errors).
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'eslint.config.js'] },

  // Spread Next's recommended flat-compatible configs
  ...(Array.isArray(nextVitals) ? nextVitals : [nextVitals]),
  ...(Array.isArray(nextTs) ? nextTs : [nextTs]),
];
