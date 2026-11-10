import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['build', 'dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, chrome: 'readonly' },
    },
    rules: {
      // chrome.storage.local / .session only — the spec rules out localStorage.
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use chrome.storage instead.' },
        { object: 'window', property: 'sessionStorage', message: 'Use chrome.storage instead.' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use chrome.storage.local instead.' },
        { name: 'sessionStorage', message: 'Use chrome.storage.session instead.' },
      ],
    },
  },

  // core/ is pure data and functions: no React, no chrome, no services.
  // Keeping it that way is what makes it testable without a browser.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', '**/services/**', '**/state/**', '**/ui/**', '**/platform/**'],
              message: 'core/ must stay free of React, chrome, and services.',
            },
          ],
        },
      ],
    },
  },

  // The UI talks to state/ (which owns TripManager) and to core types. It never
  // reaches a service, and so can never reach Google, directly.
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/services/**'],
              message: 'Go through state/ (TripProvider → TripManager), not a service.',
            },
          ],
        },
      ],
    },
  },

  // Only these two files may address Google or call fetch.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/GoogleApiClient.ts', 'src/services/SheetsTripRepository.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/googleapis\\.com/]',
          message: 'Only GoogleApiClient and SheetsTripRepository may address Google APIs.',
        },
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message: 'All network access goes through GoogleApiClient.',
        },
      ],
    },
  },

  {
    files: ['test/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
])
