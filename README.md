<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# nuxt-keycloak-oidc

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)

🔐 Keycloak authentication for Nuxt using OAuth2 / OpenID Connect (OIDC) with PKCE.

This module provides a fully server-driven authentication flow with secure cookies, automatic token refresh, and flexible route protection.

---

## ✨ Features

- 🔐 Full OIDC Authorization Code Flow (with PKCE)
- 🍪 Secure, configurable cookie handling
- 🔄 Automatic access token refresh
- 🛡 Route protection (`protect-all` / `protect-selected`)
- ⚙️ Runtime config + ENV support
- 🧪 Debug endpoint (dev only)
- 🌍 Works across modern browsers (incl. Safari)

---

## 📦 Installation

```bash
npm install nuxt-keycloak-oidc
```

---

## ⚙️ Setup

Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-keycloak-oidc'],

  keycloak: {
    enabled: true,
    url: 'http://localhost:8080',
    realm: 'your-realm',
    clientId: 'your-client-id',

    clientSecret: 'your-client-secret',

    mode: 'protect-all',

    cookie: {
      sameSite: 'lax',
      path: '/',
    },
  },
})
```

## 🔐 Authentication Flow

The module handles the full authentication lifecycle:

That's it! You can now use My Module in your Nuxt app ✨

```text
User → /api/_oidc/login → Keycloak → /api/_oidc/callback → App
```

### Internal Endpoints

- `/api/_oidc/login`
- `/api/_oidc/callback`
- `/api/_oidc/logout`
- `/api/_oidc/debug` (dev only)

## 🛡 Route Protection

### Protect all routes (default)

```ts
keycloak: {
  mode: 'protect-all'
}
```

Protect selected routes

```ts
keycloak: {
  mode: 'protect-selected'
}
```

---

## 🛣 Route Rules (Advanced)

```ts
export default defineNuxtConfig({
  routeRules: {
    '/public/**': { keycloak: false },
    '/admin/**': { keycloak: true },
  },
})
```

- keycloak: true → protected
- keycloak: false → public

## 🍪 Cookie Configuration

Default:

```ts
cookie: {
  sameSite: 'lax',
  path: '/',
}
```

Available options:

```ts
cookie?: {
  sameSite?: 'lax' | 'none' | 'strict'
  secure?: boolean
  path?: string
  domain?: string
}
```

---

## ⚠️ Browser Compatibility

If you use:

```ts
sameSite: 'none'
```


you must also set:

```ts
secure: true
```

Otherwise, cookies may be dropped (Safari), causing redirect loops.

## 🔧 Environment Variables

```env
NUXT_KEYCLOAK_URL=http://localhost:8080
NUXT_KEYCLOAK_REALM=your-realm
NUXT_KEYCLOAK_CLIENT_ID=your-client-id
NUXT_KEYCLOAK_CLIENT_SECRET=your-client-secret
NUXT_KEYCLOAK_COOKIE_SAME_SITE=none
NUXT_KEYCLOAK_COOKIE_SECURE=true
NUXT_KEYCLOAK_COOKIE_PATH=/
NUXT_KEYCLOAK_COOKIE_DOMAIN=.example.com

```

## 🔄 Handling API Authentication (Optional)

```ts
const { data } = await useFetchApi('/api/protected')
```

- Redirects to login on 401
- Fully optional


```ts
useFetch('/api/protected', {
  onResponseError({ response }) {
    if (response.status === 401) {
      navigateTo('/api/_oidc/login', { external: true })
    }
  }
})
```

## 🏗 Architecture

- Server-only authentication
- No client SDK
- httpOnly cookies
- Middleware-based protection
- Runtime config as source of truth

## 📄 License

MIT


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/my-module/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/my-module

[npm-downloads-src]: https://img.shields.io/npm/dm/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/my-module

[license-src]: https://img.shields.io/npm/l/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/my-module

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
