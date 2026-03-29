import { describe, it, expect } from 'vitest'
import { resolveAuthAction } from '../src/runtime/utils/resolveAuthAction'

describe('resolveAuthAction', () => {
  // ---------------------------------------------------------------------------
  // PROTECT ALL MODE
  // ---------------------------------------------------------------------------
  describe('protect-all mode', () => {
    it('protects route by default when no rule is defined', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
      })

      expect(result.isProtected).toBe(true)
    })

    it('does not protect route when explicitly disabled', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { auth: false },
      })

      expect(result.isProtected).toBe(false)
      expect(result.action).toBe('allow')
    })

    it('protects route when explicitly enabled', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { auth: true },
        accept: 'text/html',
      })

      expect(result.isProtected).toBe(true)
      expect(result.action).toBe('redirect')
    })
  })

  // ---------------------------------------------------------------------------
  // PROTECT SELECTED MODE
  // ---------------------------------------------------------------------------
  describe('protect-selected mode', () => {
    it('does not protect route by default', () => {
      const result = resolveAuthAction({
        mode: 'protect-selected',
      })

      expect(result.isProtected).toBe(false)
      expect(result.action).toBe('allow')
    })

    it('protects route only when explicitly enabled', () => {
      const result = resolveAuthAction({
        mode: 'protect-selected',
        rules: { auth: true },
        accept: 'text/html',
      })

      expect(result.isProtected).toBe(true)
      expect(result.action).toBe('redirect')
    })

    it('does not protect route when explicitly false', () => {
      const result = resolveAuthAction({
        mode: 'protect-selected',
        rules: { auth: false },
      })

      expect(result.isProtected).toBe(false)
      expect(result.action).toBe('allow')
    })
  })

  // ---------------------------------------------------------------------------
  // HTML VS API REQUEST
  // ---------------------------------------------------------------------------
  describe('request type handling', () => {
    it('returns redirect for HTML requests', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { keycloak: true },
        accept: 'text/html',
      })

      expect(result.isHtmlRequest).toBe(true)
      expect(result.action).toBe('redirect')
    })

    it('returns unauthorized for non-HTML requests', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { keycloak: true },
        accept: 'application/json',
      })

      expect(result.isHtmlRequest).toBe(false)
      expect(result.action).toBe('unauthorized')
    })
  })

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('treats missing accept header as non-HTML request', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { keycloak: true },
      })

      expect(result.isHtmlRequest).toBe(false)
      expect(result.action).toBe('unauthorized')
    })

    it('handles mixed accept headers', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: { keycloak: true },
        accept: 'application/json, text/html',
      })

      expect(result.isHtmlRequest).toBe(true)
      expect(result.action).toBe('redirect')
    })

    it('returns allow when route is not protected regardless of accept', () => {
      const result = resolveAuthAction({
        mode: 'protect-selected',
        rules: { keycloak: false },
        accept: 'text/html',
      })

      expect(result.action).toBe('allow')
    })

    it('treats empty rules object like undefined', () => {
      const result = resolveAuthAction({
        mode: 'protect-all',
        rules: {},
      })

      expect(result.isProtected).toBe(true)
    })
  })
})
