/**
 * Legacy ESLint config (commonjs) used to set ignorePatterns across the repo.
 * We avoid using the flat config (`eslint.config.js`) because that disables
 * legacy shareable configs in subprojects (like the Next frontend). Using
 * ignorePatterns here silences the deprecated .eslintignore warning while
 * preserving existing per-package ESLint setups.
 */
module.exports = {
  ignorePatterns: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/public/**",
    "**/.turbo/**"
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  }
};
