import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = {
  '@/app': fileURLToPath(new URL('./app', import.meta.url)),
  '@/emails': fileURLToPath(new URL('./emails', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
          environment: 'node',
          env: { TZ: 'UTC' },
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 120_000,
          hookTimeout: 180_000,
          globalSetup: ['tests/db/global-setup.ts'],
        },
      },
    ],
  },
})
