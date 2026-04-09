# nuxt-keycloak-oidc

[![npm version](https://img.shields.io/npm/v/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![license](https://img.shields.io/npm/l/nuxt-keycloak-oidc)](./LICENSE)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)
[![Codacy Coverage](https://app.codacy.com/project/badge/Coverage/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)
[![Snyk Security](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc/badge.svg)](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc)

Opinionated Keycloak integration for Nuxt with full SSR support.

Built for simplicity: configure once, and authentication just works across SSR and client navigation — including APIs and assets.

> SSR-first Keycloak authentication for Nuxt. No custom middleware required.

---

## ✨ Features

- 🔐 Keycloak authentication via OpenID Connect (OIDC)
- ⚡ SSR-first design (works seamlessly with server-side rendering)
- 🔄 Automatic Keycloak configuration discovery
- 🧩 Global middleware integration (Nuxt-native)
- 🎯 No need to write your own authentication middleware
- 🛣️ Route protection via Nuxt routeRules
- 🔁 Flexible protection modes (`protect-all` / `protect-selected`)
- 🖼️ Protects assets (e.g. images, files) via Nuxt routeRules
- 🍪 Configurable authentication cookies
- ⚙️ Fully configurable via Nuxt config (no runtime wiring required)
- 🔌 Extendable auth context via Nuxt hooks

---

## 📦 Installation

```bash
npm install nuxt-keycloak-oidc
```

Add the module to your Nuxt config:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-keycloak-oidc']
})
```

---

## ⚙️ Configuration

Configure your Keycloak instance in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  keycloak: {
    enabled: true,
    url: 'https://your-keycloak-instance',
    realm: 'your-realm',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret', // optional
    mode: 'protect-all', // or 'protect-selected'
    cookie: {
      sameSite: 'lax',
      secure: true,
      path: '/',
      domain: 'your-domain.com'
    }
  }
})
```

The module automatically discovers Keycloak endpoints via the OIDC well-known configuration.
No manual endpoint configuration is required.

### Required options

- `url`
- `realm`
- `clientId`

### Optional options

- `clientSecret`
- `mode` (defaults to `protect-all`)
- `cookie`

---

## 🛣️ Route protection

The module integrates with Nuxt route rules to control authentication behavior.

This also applies to static assets such as images or files.

### `protect-all` (default)

All routes are protected by default.

You can explicitly exclude routes:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/public/**': { keycloak: false }
  }
})
```

### `protect-selected`

Only routes explicitly marked are protected:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/admin/**': { keycloak: true },
    '/api/**': { keycloak: true },
    '/uploads/**': { keycloak: true }
  }
})
```

This allows protecting not only pages and APIs, but also static assets like images or documents.

---

## 🔌 Auth context & hooks

The module exposes a hook to customize the authentication context.

By default, a minimal auth context is attached to the request:

```ts
event.context.auth = {
  email: payload?.email
}
```

You can extend this context using the provided hook:

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('keycloak:auth:context', async ({ event, payload }) => {
    event.context.auth = {
      ...event.context.auth,
      roles: payload.realm_access?.roles,
      userId: payload.sub
    }
  })
})
```

### Use cases

- attach roles and permissions
- enrich user data
- integrate with external services or databases
- normalize identity provider payloads

The default auth context is minimal and can be extended via the hook.
The hook is executed on each authenticated request.

---

## 🚀 How it works

This module integrates directly into Nuxt using a global middleware approach.

- Authentication is handled automatically on request
- No manual middleware setup required
- Works consistently across SSR and client navigation

### Authentication behavior

The module distinguishes between browser navigation and API requests:

- Browser requests are redirected to the Keycloak login page
- API requests return a `401 Unauthorized` response

This ensures correct behavior for both user-facing pages and programmatic access.

### Redirect handling

When a user is redirected to Keycloak for authentication, the original request is preserved.

After successful login, the user is redirected back to the initial route.

This ensures a seamless authentication experience without losing context.

---

## 🎯 Why this module?

Most OIDC libraries are generic and try to support every provider.

This module is different:

- built specifically for Keycloak
- optimized for Nuxt SSR
- minimal setup required
- no abstraction overload

---

## 🧪 Playground

A working example is available in the `/playground` directory.

```bash
npm run dev
```

---

## 📄 License

MIT
