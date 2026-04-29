

export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  routeRules: {
    '/': { keycloak: false },
    '/public': { keycloak: false },
  },
  compatibilityDate: 'latest',
  keycloak: {
    enabled: true,
    url: 'http://localhost:8080',
    realm: 'nuxt-keycloak',
    clientId: 'nuxt-confidential',
    clientSecret: 'super-secret',
    mode: 'protect-all',
    cookie: {
      sameSite: 'lax',
      path: '/',
    },
  },
})
