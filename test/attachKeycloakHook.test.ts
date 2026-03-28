import { describe, it, expect, vi } from 'vitest'
import { attachKeycloakHook } from '../src/runtime/utils/attachKeycloakHook'

// mock nuxt
const { mockUseNuxtApp } = vi.hoisted(() => ({
  mockUseNuxtApp: vi.fn(),
}))

vi.mock('#app', () => ({
  useNuxtApp: mockUseNuxtApp,
}))

describe('attachKeycloakHook', () => {
  it('attaches keycloak hook to event context', () => {
    const mockHook = vi.fn()

    mockUseNuxtApp.mockReturnValue({
      $keycloakHook: mockHook,
    })

    const event: any = { context: {} }

    attachKeycloakHook(event)

    expect(event.context.$keycloakHook).toBe(mockHook)
  })

  it('sets undefined if no hook exists', () => {
    mockUseNuxtApp.mockReturnValue({})

    const event: any = { context: {} }

    attachKeycloakHook(event)

    expect(event.context.$keycloakHook).toBeUndefined()
  })
})
