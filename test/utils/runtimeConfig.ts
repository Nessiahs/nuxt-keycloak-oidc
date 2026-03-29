export function createRuntimeConfig(overrides = {}) {
  return {
    keycloak: {
      clientId: 'client',
      url: 'http://localhost',
      realm: 'test',
      enabled: true,
      mode: 'protect-all',
      publicRoutes: [],
      ...overrides,
    },
  }
}
