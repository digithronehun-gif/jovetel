import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const HEX = '/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 2. vasszabály: feedből jövő szöveg soha nem markup
      'react/no-danger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Design-szabály: komponensben literál hex szín tilos; márkakép csak képhelyről (7. vasszabály)
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${HEX}]`,
          message:
            'Literál hex szín tilos: használj design tokent (bg-paper, text-ink…, var(--token)).',
        },
        {
          selector: `TemplateElement[value.raw=${HEX}]`,
          message: 'Literál hex szín tilos: használj design tokent.',
        },
        {
          selector: 'Literal[value=/\\/brand\\/moodboard|\\.(webp|jpe?g|avif)$/]',
          message:
            'Márkaképre fájlnévvel hivatkozni tilos: getSlotImage(slot) / <SlotImage slot=… />.',
        },
      ],
    },
  },
  {
    // src/lib modulok nem importálnak UI-t (CLAUDE.md 5. pont, modulhatár-szabály)
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/*', '@/app/*', 'react-dom', 'next/image', 'next/link'],
              message: 'A src/lib modul nem importálhat UI-t.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts', 'tests/**/*.tsx'],
    rules: { 'no-console': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.local/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'src/components/brand/glyphs.generated.ts',
  ]),
])
