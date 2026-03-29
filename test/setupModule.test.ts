import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import setupModule from '../src/setupModule'

// Helper to generate a valid base configuration
// Allows overriding specific fields to test edge cases
function validConfig(overrides: any = {}) {
  return {
    url: 'http://localhost:8080',
    realm: 'test',
    clientId: 'client',
    mode: 'protect-all',
    ...overrides,
  }
}

describe('setupModule', () => {
  let infoSpy: any
  let warnSpy: any

  // Mock console methods to verify logging behavior
  // without polluting test output
  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------
  it('throws when url is missing', () => {
    expect(() => setupModule(validConfig({ url: '' }))).toThrow(/url/)
  })

  it('throws when realm is missing', () => {
    expect(() => setupModule(validConfig({ realm: '' }))).toThrow(/realm/)
  })

  it('throws when clientId is missing', () => {
    expect(() => setupModule(validConfig({ clientId: '' }))).toThrow(/clientId/)
  })

  it('throws with multiple missing fields', () => {
    expect(() =>
      setupModule({
        mode: 'protect-all',
      } as any),
    ).toThrow(/url, realm, clientId/)
  })

  // ---------------------------------------------------------------------------
  // SUCCESS PATH
  // ---------------------------------------------------------------------------
  it('does not throw with valid config', () => {
    expect(() => setupModule(validConfig())).not.toThrow()
  })

  it('logs resolved configuration', () => {
    setupModule(validConfig())

    const log = infoSpy.mock.calls[0][0]

    expect(log).toContain('[nuxt-keycloak] Resolved configuration')
    expect(log).toContain('url: http://localhost:8080')
    expect(log).toContain('realm: test')
    expect(log).toContain('clientId: client')
    expect(log).toContain('cookie')
    expect(log).toContain('sameSite')
    expect(log).toContain('secure')
    expect(log).toContain('path')
    expect(log).toContain('domain')
  })

  // ---------------------------------------------------------------------------
  // MODE HANDLING
  // ---------------------------------------------------------------------------
  it('warns when sameSite is "none" without secure=true', () => {
    setupModule(
      validConfig({
        cookie: {
          sameSite: 'none',
          secure: false,
        },
      }),
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('sameSite="none" requires secure=true'),
    )
  })

  it('warns in protect-selected mode', () => {
    setupModule(validConfig({ mode: 'protect-selected' }))

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('protect-selected mode active'))
  })

  it('logs info in protect-all mode', () => {
    setupModule(validConfig({ mode: 'protect-all' }))

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('protect-all mode active'))
  })

  // ---------------------------------------------------------------------------
  // CLIENT SECRET HANDLING
  // ---------------------------------------------------------------------------
  it('warns when clientSecret is missing', () => {
    setupModule(validConfig({ clientSecret: undefined }))

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No clientSecret'))
  })

  it('logs masked clientSecret when provided', () => {
    setupModule(validConfig({ clientSecret: 'supersecret123456' }))

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('********'))
  })

  it('masks short clientSecret fully', () => {
    setupModule(validConfig({ clientSecret: 'short' }))

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('*****'))
  })

  // ---------------------------------------------------------------------------
  // EDGE CASES (ENTERPRISE LEVEL)
  // ---------------------------------------------------------------------------
  it('handles undefined config fields gracefully', () => {
    expect(() =>
      setupModule({
        url: undefined,
        realm: undefined,
        clientId: undefined,
        mode: 'protect-all',
      } as any),
    ).toThrow()
  })

  it('handles empty strings as missing values', () => {
    expect(() =>
      setupModule(
        validConfig({
          url: '',
          realm: '',
          clientId: '',
        }),
      ),
    ).toThrow(/url, realm, clientId/)
  })

  // Ensure sensitive data (clientSecret) is never exposed in logs
  it('does not log clientSecret value directly (security)', () => {
    setupModule(validConfig({ clientSecret: 'verysecretvalue' }))

    const calls = infoSpy.mock.calls.flat().join(' ')

    expect(calls).not.toContain('verysecretvalue')
  })

  // Ensure module always produces some observable output for debugging
  it('always logs something (observability)', () => {
    setupModule(validConfig())

    expect(infoSpy).toHaveBeenCalled()
  })

  it('does not crash when optional fields are missing', () => {
    expect(() =>
      setupModule({
        url: 'http://localhost',
        realm: 'test',
        clientId: 'client',
        mode: 'protect-all',
      }),
    ).not.toThrow()
  })
})

describe('route registration', () => {
  let addServerHandlerMock: any
  let addPluginMock: any
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    addServerHandlerMock = vi.fn()
    addPluginMock = vi.fn()
    vi.doMock('@nuxt/kit', async (importOriginal) => {
      const actual = await importOriginal<any>()

      return {
        ...actual,
        addPlugin: addPluginMock,
        addServerHandler: addServerHandlerMock,
        createResolver: () => ({
          resolve: (p: string) => p,
        }),
      }
    })
  })

  it('registers keycloak runtime plugin', async () => {
    const module = await import('../src/module')

    await module.default(
      {
        enabled: true,
        url: 'http://localhost',
        realm: 'test',
        clientId: 'client',
        mode: 'protect-all',
      },
      {
        options: {
          runtimeConfig: {},
        },
      } as any,
    )

    expect(addPluginMock).toHaveBeenCalledTimes(1)

    expect(addPluginMock).toHaveBeenCalledWith(expect.stringContaining('./runtime/plugin'))
  })

  it('registers all auth routes and middleware', async () => {
    const module = await import('../src/module')

    await module.default(
      {
        enabled: true,
        url: 'http://localhost',
        realm: 'test',
        clientId: 'client',
        mode: 'protect-all',
      },
      {
        options: {
          runtimeConfig: {},
        },
      } as any,
    )

    const calls = addServerHandlerMock.mock.calls

    expect(calls).toEqual(
      expect.arrayContaining([
        [expect.objectContaining({ route: '/api/_oidc/login' })],
        [expect.objectContaining({ route: '/api/_oidc/callback' })],
        [expect.objectContaining({ route: '/api/_oidc/logout' })],
        [expect.objectContaining({ route: '/api/_oidc/debug' })],
        [expect.objectContaining({ middleware: true })],
      ]),
    )
  })
})
