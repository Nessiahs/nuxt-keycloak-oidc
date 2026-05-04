import {
  addRouteMiddleware,
  defineNuxtRouteMiddleware,
  getRouteRules,
  navigateTo,
  useRuntimeConfig,
} from '#app'
import { HEADER_NAMES } from './constants/headers'
import { OIDC_ROUTES } from './constants/path'
import { isClientRouteProtected, resolveClientProtectionMode } from './utils/clientRouteProtection'
import type { KeycloakSessionResponse } from '../types/keycloak.types'

addRouteMiddleware(
  'keycloak-client-route-protection',
  defineNuxtRouteMiddleware(async (to) => {
    const runtimeConfig = useRuntimeConfig()
    const mode = resolveClientProtectionMode(runtimeConfig.public)
    const rules = getRouteRules({ path: to.path })

    if (!isClientRouteProtected({ path: to.path, mode, rules })) {
      return
    }

    const session = await $fetch<KeycloakSessionResponse>(OIDC_ROUTES.session, {
      credentials: 'include',
      headers: {
        [HEADER_NAMES.CLIENT_ROUTE]: to.fullPath ?? to.path,
      },
    }).catch(() => null)

    if (!session?.authenticated) {
      return navigateTo(OIDC_ROUTES.login, { external: true })
    }
  }),
  { global: true },
)
