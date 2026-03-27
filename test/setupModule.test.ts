import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import setupModule from '../src/setupModule'

// --- helpers ---
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

    expect(infoSpy).toHaveBeenCalledWith(
      '[nuxt-keycloak] Resolved configuration:',
      expect.objectContaining({
        url: 'http://localhost:8080',
        realm: 'test',
        clientId: 'client',
      }),
    )
  })

  // ---------------------------------------------------------------------------
  // MODE HANDLING
  // ---------------------------------------------------------------------------
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

  it('does not log clientSecret value directly (security)', () => {
    setupModule(validConfig({ clientSecret: 'verysecretvalue' }))

    const calls = infoSpy.mock.calls.flat().join(' ')

    expect(calls).not.toContain('verysecretvalue')
  })

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
