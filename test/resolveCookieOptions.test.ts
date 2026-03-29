import { describe, it, expect } from 'vitest'
import { resolveCookieOptions } from '../src/runtime/utils/resolveCookieOptions'

describe('resolveCookieOptions', () => {
  const baseConfig = {
    cookie: {
      sameSite: 'lax',
      path: '/',
      secure: undefined,
      domain: undefined,
    },
  } as any

  // ---------------------------------------------------------------------------
  // DEFAULTS (already resolved)
  // ---------------------------------------------------------------------------
  it('applies resolved cookie options', () => {
    const result = resolveCookieOptions(baseConfig, 100)

    expect(result).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 100,
    })

    expect(result.secure).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // OVERRIDES
  // ---------------------------------------------------------------------------
  it('respects user cookie config', () => {
    const config = {
      cookie: {
        sameSite: 'none',
        secure: true,
        path: '/test',
        domain: '.example.com',
      },
    } as any

    const result = resolveCookieOptions(config, 200)

    expect(result).toMatchObject({
      sameSite: 'none',
      secure: true,
      path: '/test',
      domain: '.example.com',
      maxAge: 200,
    })
  })

  // ---------------------------------------------------------------------------
  // MAX AGE
  // ---------------------------------------------------------------------------
  it('includes maxAge correctly', () => {
    const result = resolveCookieOptions(baseConfig, 300)

    expect(result.maxAge).toBe(300)
  })
})
