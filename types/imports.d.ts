declare module '#imports' {
  export function useRuntimeConfig(): {
    keycloak: {
      url: string
      realm: string
      clientId: string
      clientSecret?: string
      mode: string
    }
  }
}
