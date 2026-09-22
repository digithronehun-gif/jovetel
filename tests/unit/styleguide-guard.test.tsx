import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

describe('/styleguide production-ben 404', () => {
  afterEach(() => {
    delete process.env.APP_ENV
    delete process.env.VERCEL_ENV
  })
  it('APP_ENV=production → notFound()', async () => {
    process.env.APP_ENV = 'production'
    const { default: Page } = await import('@/app/styleguide/page')
    expect(() => Page()).toThrow('NEXT_NOT_FOUND')
  })
  it('VERCEL_ENV=production → notFound()', async () => {
    process.env.VERCEL_ENV = 'production'
    const { default: Page } = await import('@/app/styleguide/page')
    expect(() => Page()).toThrow('NEXT_NOT_FOUND')
  })
})
