import { OIDC_BASE_PATH } from '../constants/path'
import type { ResolvedModuleOptions } from '../../types'

export type ClientKeycloakRouteRules = {
  keycloak?: boolean
}

export type ClientRouteProtectionInput = {
  path: string
  mode: ResolvedModuleOptions['mode']
  rules?: ClientKeycloakRouteRules
}

export type ClientKeycloakPublicConfig = {
  keycloak?: {
    mode?: ResolvedModuleOptions['mode']
  }
}

export function resolveClientProtectionMode(publicConfig: unknown): ResolvedModuleOptions['mode'] {
  const mode = (publicConfig as ClientKeycloakPublicConfig | undefined)?.keycloak?.mode

  // Default to protect-all if Nuxt typing/runtime config is incomplete.
  // This keeps client-side protection fail-closed.
  return mode === 'protect-selected' ? 'protect-selected' : 'protect-all'
}

export function isClientRouteProtected(input: ClientRouteProtectionInput): boolean {
  if (input.path.startsWith(OIDC_BASE_PATH)) {
    return false
  }

  const keycloak = input.rules?.keycloak

  return input.mode === 'protect-all' ? keycloak !== false : keycloak === true
}
