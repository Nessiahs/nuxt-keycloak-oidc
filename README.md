<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# nuxt-keycloak-oidc

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]


🔐 Keycloak authentication for Nuxt 4 using OAuth2 / OpenID Connect (OIDC) with PKCE.

This module provides a fully server-driven authentication flow with secure cookies, automatic token refresh, and configurable route protection.

---

## ✨ Features

- 🔐 Full OIDC Authorization Code Flow (with PKCE)
- 🍪 Secure, configurable cookie handling
- 🔄 Automatic access token refresh
- 🛡 Route protection (`protect-all` or `protect-selected`)
- ⚙️ Runtime config + ENV support
- 🧪 Built-in debug endpoint (dev only)
- 🌍 Works across modern browsers (incl. Safari)

---

## 📦 Installation

```bash
npm install nuxt-keycloak-oidc
```

## ⚙️ Setup

Add the module to your nuxt.config.ts:

```ts
 export default defineNuxtConfig({
  modules: ['nuxt-keycloak-oidc'],

  keycloak: {
    enabled: true,
    url: 'http://localhost:8080',
    realm: 'your-realm',
    clientId: 'your-client-id',

    // Optional (for confidential clients)
    clientSecret: 'your-client-secret',

    mode: 'protect-all', // or 'protect-selected'

    cookie: {
      sameSite: 'lax',
      path: '/',
      // secure: true,
      // domain: '.example.com',
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

## Internal endpoints

  -	/api/_oidc/login
  -	/api/_oidc/callback
  -	/api/_oidc/logout
  -	/api/_oidc/debug (dev only)

## 🛡 Route Protection

Protect all routes (default)

```ts
keycloak: {
  mode: 'protect-all'
}
```
All pages are protected except internal auth endpoints.


Protect selected routes

```ts
keycloak: {
  mode: 'protect-selected'
}
 ```
You must manually apply protection via middleware.

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

## 🛣 Route Rules (Advanced)

In addition to middleware-based protection, authentication can be controlled via Nuxt `routeRules`.

This allows fine-grained access control directly in `nuxt.config.ts`.

### Example

```ts
export default defineNuxtConfig({
  routeRules: {
    '/public/**': { auth: false },   // disable authentication
    '/admin/**': { auth: true },     // enforce authentication
  },
})
```

### Behavior

  -	auth: true → route requires authentication
    -	auth: false → route is always public (skips auth middleware)

### Notes

  - routeRules take precedence over mode
  - Works in combination with:
  - protect-all
  - protect-selected

## ⚠️ Browser Compatibility

Important: sameSite="none"

If you use:

```ts
sameSite: 'none'
```

you MUST also set:

```ts
secure: true
```
Otherwise cookies will be silently dropped by browsers (especially Safari), causing authentication failures (e.g. redirect loops).

## ✅ Recommended (default)

```ts
sameSite: 'lax'
```

Works for:

  -	Local development
  -	Standard OIDC login flows
  -	All modern browsers

## 🌍 Cross-domain setups

Use only when required:

```ts
cookie: {
  sameSite: 'none',
  secure: true,
  domain: '.example.com',
}
```

## 🔄 Token Handling

  - Access token stored in kc_access
  - Refresh token stored in kc_refresh
  - Tokens are stored as httpOnly cookies
  - Automatic refresh handled server-side

No client-side SDK required.

## 🔁 Refresh Flow

  - Refresh is triggered automatically when access token expires
  - New tokens are verified before being applied
  - Cookies are updated atomically

## 🧪 Debug Endpoint (Development Only)

```bash
GET /api/_oidc/debug
```

Provides insight into:

  -	resolved configuration
  -	cookie settings
  -	session state
  -	security hints

## 🧠 Debugging

Redirect loop?

Check:
1.	Open DevTools → Application → Cookies
2.	Verify cookies exist:
   -	kc_access
   -	kc_refresh

```ts
sameSite: 'none',
secure: false ❌
```

## 🔧 Environment Variables

All options can be provided via runtime config:

``ènv
NUXT_KEYCLOAK_URL=http://localhost:8080
NUXT_KEYCLOAK_REALM=your-realm
NUXT_KEYCLOAK_CLIENT_ID=your-client-id
NUXT_KEYCLOAK_CLIENT_SECRET=your-client-secret
NUXT_KEYCLOAK_COOKIE_SAME_SITE=none
NUXT_KEYCLOAK_COOKIE_SECURE=true
NUXT_KEYCLOAK_COOKIE_PATH=/
NUXT_KEYCLOAK_COOKIE_DOMAIN=.example.com
``

## 🔄 Handling API Authentication (Optional)

This module does not override `useFetch` globally.

Instead, you can use a helper composable:

```ts
const { data, error } = await useKeycloakFetch('/api/protected')
```

Behavior
  - Automatically redirects to login on 401 responses (browser requests)
  - Leaves full control to the developer

### Custom Integration

You can also integrate the logic into your own fetch layer:

```ts
useFetch('/api/protected', {
  onResponseError({ response }) {
    if (response.status === 401) {
      window.location.href = '/api/_oidc/login'
    }
  }
})
```
## 🏗 Architecture
	•	Server-only authentication
	•	No client SDK required
	•	Secure httpOnly cookies
	•	Middleware-based route protection
	•	Runtime config as single source of truth

## 🚀 Production Notes
	•	Always use HTTPS in production
	•	Set cookie.secure = true
	•	Use sameSite: 'none' only when necessary
	•	Configure cookie.domain for multi-subdomain setups



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
