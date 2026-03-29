import { runtimeConfigMock } from '../setup'
import { createRuntimeConfig } from './runtimeConfig'

export function setKeycloakConfig(overrides = {}) {
  runtimeConfigMock.keycloak = createRuntimeConfig(overrides).keycloak
}
