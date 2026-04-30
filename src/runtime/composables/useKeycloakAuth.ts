import { navigateTo, useFetch } from '#app'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { OIDC_ROUTES } from '../constants/path'
import type { KeycloakSessionResponse, KeycloakSessionUser } from '../../types/keycloak.types'

export type KeycloakAuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type UseKeycloakAuthReturn = {
  status: ComputedRef<KeycloakAuthStatus>
  user: ComputedRef<KeycloakSessionUser | null>
  login: () => void
  logout: () => void
  refresh: () => Promise<void>
}

export function useKeycloakAuth(): UseKeycloakAuthReturn {
  const session = useFetch<KeycloakSessionResponse>(OIDC_ROUTES.session)

  const status = computed<KeycloakAuthStatus>(() => {
    if (session.pending.value) {
      return 'loading'
    }

    return session.data.value?.authenticated ? 'authenticated' : 'unauthenticated'
  })

  const user = computed(() => (session.data.value?.authenticated ? session.data.value.user : null))

  return {
    status,
    user,
    login: () => {
      void navigateTo(OIDC_ROUTES.login, { external: true })
    },
    logout: () => {
      void navigateTo(OIDC_ROUTES.logout, { external: true })
    },
    refresh: () => session.refresh(),
  }
}
