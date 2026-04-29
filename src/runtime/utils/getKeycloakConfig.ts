import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../types'

export function getKeycloakConfig(): ResolvedModuleOptions {
  return useRuntimeConfig().keycloak as ResolvedModuleOptions
}
