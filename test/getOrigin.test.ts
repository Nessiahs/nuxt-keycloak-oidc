import { describe, it, expect, vi } from 'vitest'
import type { H3Event } from 'h3'

// 🔥 h3 mocken
vi.mock('h3', () => ({
  getHeaders: vi.fn(),
  getRequestURL: vi.fn(),
}))

import { getHeaders, getRequestURL } from 'h3'
import { getOrigin } from '../src/runtime/utils/getOrigin'

describe('getOrigin', () => {
  const mockEvent = {} as H3Event

  it('uses x-forwarded headers when present', () => {
    vi.mocked(getHeaders).mockReturnValue({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'example.com',
    } as any)

    vi.mocked(getRequestURL).mockReturnValue({
      protocol: 'http:',
      host: 'localhost:3000',
    } as any)

    expect(getOrigin(mockEvent)).toBe('https://example.com')
  })

  it('falls back to request url', () => {
    vi.mocked(getHeaders).mockReturnValue({} as any)

    vi.mocked(getRequestURL).mockReturnValue({
      protocol: 'http:',
      host: 'localhost:3000',
    } as any)

    expect(getOrigin(mockEvent)).toBe('http://localhost:3000')
  })

  it('uses forwarded proto but fallback host', () => {
    vi.mocked(getHeaders).mockReturnValue({
      'x-forwarded-proto': 'https',
    } as any)

    vi.mocked(getRequestURL).mockReturnValue({
      protocol: 'http:',
      host: 'localhost:3000',
    } as any)

    expect(getOrigin(mockEvent)).toBe('https://localhost:3000')
  })

  it('handles missing headers gracefully', () => {
    vi.mocked(getHeaders).mockReturnValue({} as any)

    vi.mocked(getRequestURL).mockReturnValue({
      protocol: 'http:',
      host: 'localhost:3000',
    } as any)

    expect(getOrigin(mockEvent)).toBe('http://localhost:3000')
  })

  it('handles stackblitz headers', () => {
    vi.mocked(getHeaders).mockReturnValue({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'xyz.webcontainer.io',
    } as any)

    vi.mocked(getRequestURL).mockReturnValue({
      protocol: 'http:',
      host: 'localhost:3000',
    } as any)

    expect(getOrigin(mockEvent)).toBe('https://xyz.webcontainer.io')
  })
})
