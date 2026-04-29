import { describe, expect, it, vi } from 'vitest'
import { resolveAppBaseUrl } from '../src/runtime/utils/resolveAppBaseUrl'
import type { ResolvedModuleOptions } from '../src/types'

vi.mock('h3', async () => {
  const actual = await vi.importActual<any>('h3')
  return {
    ...actual,
    getHeaders: vi.fn(() => ({})),
    getRequestURL: vi.fn(() => ({
      protocol: 'https:',
      host: 'example.com',
    })),
  }
})

const config = {
  enabled: true,
  url: 'https://keycloak.test',
  realm: 'test',
  clientId: 'client',
  mode: 'protect-all',
  cookie: {
    sameSite: 'lax',
    path: '/',
  },
} satisfies ResolvedModuleOptions

describe('resolveAppBaseUrl', () => {
  it('uses configured baseUrl when present', () => {
    expect(resolveAppBaseUrl({} as any, { ...config, baseUrl: 'https://app.example.test' })).toBe(
      'https://app.example.test',
    )
  })

  it('falls back to request origin when baseUrl is not configured', () => {
    expect(resolveAppBaseUrl({} as any, config)).toBe('https://example.com')
  })
})
