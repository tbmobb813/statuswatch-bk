// Flat ESLint config (root) — this merges the minimal recommended rules we
// used in the legacy `.eslintrc.cjs` into a flat config that ESLint v9+ can
// consume. It keeps per-package configs operational by not forcing heavy
// rule sets for `frontend` (which uses `eslint-config-next`).
const path = require('node:path');

// Pull in the TypeScript plugin and use its flat-compatible recommended
// presets. The plugin exports `flat/*` configs which are intended for use
// with the flat config system.
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsFlatRecommended = (tsPlugin.configs && tsPlugin.configs['flat/recommended']) || {};

module.exports = [
  // Apply @typescript-eslint flat-recommended rules (these are an array of
  // flat-compatible config objects), spread them into the root flat config
  // array so they integrate correctly.
  ...(Array.isArray(tsFlatRecommended) ? tsFlatRecommended : [tsFlatRecommended]),

  // Global ignores for build artifacts and vendored dirs
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/public/**', '**/.turbo/**'] },

  // Files under `src/` should be parsed as TypeScript when applicable.
  // We wire the parser module and the TS plugin so rules that depend on the
  // type-aware parser won't crash. The plugin object is attached to the
  // config so user rules can reference it.
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: path.resolve(__dirname, 'tsconfig.json'),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
  },

  // Keep frontend build artifacts ignored; frontend keeps its own rules via
  // `frontend/.eslintrc.cjs` (which extends eslint-config-next).
  {
    files: ['frontend/**/*'],
    ignores: ['frontend/.next/**', 'frontend/node_modules/**'],
  },
];
