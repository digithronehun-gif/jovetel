import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const HEX = '/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/'

const LIB_NO_UI = {
  group: ['@/components/*', '@/app/*', 'react-dom', 'next/image', 'next/link'],
  message: 'A src/lib modul nem importálhat UI-t.',
}

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
      'no-restricted-imports': ['error', { patterns: [LIB_NO_UI] }],
    },
  },
  {
    // 4. vasszabály: a felhasználókon átívelő dbAdmin a src/lib-ben is csak az import, az értesítések és az admin
    // lekérdezések modulja alól érhető el (a többi modul userId-s lekérdezést használ)
    files: ['src/lib/**/*.{ts,tsx}'],
    ignores: ['src/lib/db/**', 'src/lib/ingestion/**', 'src/lib/notifications/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            LIB_NO_UI,
            { group: ['@/lib/db/admin', '**/db/admin'], message: 'A dbAdmin csak az ingestion, a notifications és a db/queries/admin modulból.' },
          ],
        },
      ],
    },
  },
  {
    // 4. vasszabály: a felhasználókon átívelő dbAdmin csak scriptből, cronból és az admin felületről
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['app/api/cron/**', 'app/(admin)/**', 'app/api/admin/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/db/admin', message: 'A dbAdmin csak scripts/, app/api/cron/ és app/(admin)/ alól használható.' },
            { name: '@/lib/db/client', message: 'A felület csak a src/lib/db/queries/* függvényeit hívja (userId-val).' },
            { name: '@/lib/db/schema', message: 'A felület csak a src/lib/db/queries/* függvényeit hívja (userId-val).' },
            { name: '@/lib/db', message: 'A felület csak a src/lib/db/queries/* függvényeit hívja (userId-val).' },
          ],
          patterns: [{ group: ['@/lib/db/seed/*'], message: 'A seed csak scriptből futhat.' }],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'tests/**/*.ts', 'tests/**/*.tsx'],
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
    'tests/.artifacts/**',
    'src/components/brand/glyphs.generated.ts',
  ]),
])
