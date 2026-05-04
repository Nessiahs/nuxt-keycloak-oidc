import { describe, expect, it } from 'vitest'
import {
  isClientRouteProtected,
  resolveClientProtectionMode,
} from '../src/runtime/utils/clientRouteProtection'

describe('isClientRouteProtected', () => {
  it('allows internal OIDC routes', () => {
    expect(
      isClientRouteProtected({
        path: '/api/_oidc/session',
        mode: 'protect-all',
      }),
    ).toBe(false)
  })

  it('protects routes by default in protect-all mode', () => {
    expect(
      isClientRouteProtected({
        path: '/dashboard',
        mode: 'protect-all',
      }),
    ).toBe(true)
  })

  it('allows routes explicitly disabled in protect-all mode', () => {
    expect(
      isClientRouteProtected({
        path: '/public',
        mode: 'protect-all',
        rules: {
          keycloak: false,
        },
      }),
    ).toBe(false)
  })

  it('allows routes by default in protect-selected mode', () => {
    expect(
      isClientRouteProtected({
        path: '/dashboard',
        mode: 'protect-selected',
      }),
    ).toBe(false)
  })

  it('protects routes explicitly enabled in protect-selected mode', () => {
    expect(
      isClientRouteProtected({
        path: '/admin',
        mode: 'protect-selected',
        rules: {
          keycloak: true,
        },
      }),
    ).toBe(true)
  })
})

describe('resolveClientProtectionMode', () => {
  it('resolves protect-selected from public runtime config', () => {
    expect(
      resolveClientProtectionMode({
        keycloak: {
          mode: 'protect-selected',
        },
      }),
    ).toBe('protect-selected')
  })

  it('defaults to protect-all when public runtime config is missing', () => {
    expect(resolveClientProtectionMode(undefined)).toBe('protect-all')
    expect(resolveClientProtectionMode({})).toBe('protect-all')
    expect(
      resolveClientProtectionMode({
        keycloak: {
          mode: 'invalid',
        },
      }),
    ).toBe('protect-all')
  })
})
