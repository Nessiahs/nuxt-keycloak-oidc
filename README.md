# nuxt-keycloak-oidc

[![npm version](https://img.shields.io/npm/v/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![license](https://img.shields.io/npm/l/nuxt-keycloak-oidc)](./LICENSE)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)
[![Codacy Coverage](https://app.codacy.com/project/badge/Coverage/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard)
[![Snyk Security](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc/badge.svg)](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc)

Opinionated Keycloak integration for Nuxt with full SSR support and cluster-ready token handling.

Built for simplicity: configure once, and authentication just works across SSR and client navigation — including APIs, assets, and multi-instance Kubernetes deployments.

> SSR-first Keycloak authentication for Nuxt. No custom middleware, sticky sessions, or shared server-side session store required.

---

## ✨ Features

- 🔐 Keycloak authentication via OpenID Connect (OIDC)
- ⚡ SSR-first design (works seamlessly with server-side rendering)
- 🔄 Automatic Keycloak configuration discovery
- 🧩 Global middleware integration (Nuxt-native)
- 🎯 No need to write your own authentication middleware
- 🛣️ Route protection via Nuxt routeRules
- 🧭 Client-side SPA navigation protection
- 🔁 Flexible protection modes (`protect-all` / `protect-selected`)
- 🖼️ Protects assets (e.g. images, files) via Nuxt routeRules
- 🍪 Configurable authentication cookies with optional stateless sealing
- 🧱 Cluster-ready token storage without sticky sessions or shared server storage
- ⚙️ Fully configurable via Nuxt config (no runtime wiring required)
- 👤 `useKeycloakAuth` composable for safe session state, login, logout, and refresh
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
    cookieSecret: '', // optional, set NUXT_KEYCLOAK_COOKIE_SECRET in production
    baseUrl: 'https://your-app-domain.com', // optional, recommended for production
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
- `cookieSecret`
- `baseUrl`
- `mode` (defaults to `protect-all`)
- `cookie`

### Production base URL

By default, the module derives the application origin from the current request. This keeps local development and simple deployments configuration-free.

For production deployments behind proxies, CDNs, ingress controllers, or load balancers, configure `baseUrl` explicitly:

```ts
export default defineNuxtConfig({
  keycloak: {
    baseUrl: 'https://your-app-domain.com'
  }
})
```

When configured, `baseUrl` is used to build stable OIDC callback and logout redirect URLs. If it is omitted, the module falls back to the request-derived origin.

### Stateless sealed token cookies

By default, the module stores access and refresh tokens in HttpOnly cookies. This keeps deployments stateless and works well with multiple Nuxt instances in Kubernetes because every pod can handle every request without sticky sessions, Redis, Nitro storage, or a database-backed session store.

For production, you can additionally seal token cookie contents with a shared secret:

```ts
export default defineNuxtConfig({
  keycloak: {
    cookieSecret: '',
    cookie: {
      secure: true,
      sameSite: 'lax',
      path: '/'
    }
  }
})
```

Set `NUXT_KEYCLOAK_COOKIE_SECRET` in your deployment environment. All Nuxt instances must use the same value so they can open cookies created by each other.

If `cookieSecret` is omitted, the module keeps the backwards-compatible raw HttpOnly cookie behavior. When an HTTPS `baseUrl` is configured, the module warns if token cookies are not sealed or if `cookie.secure` is not enabled.

### Cluster-ready by default

The authentication state does not live in a local server memory store. That means requests can be routed to any Nuxt instance without losing the session.

This is useful for:

- Kubernetes deployments with multiple replicas
- rolling updates
- autoscaling
- load-balanced SSR/API requests
- deployments without Redis or sticky sessions

For production clusters, configure the same `NUXT_KEYCLOAK_COOKIE_SECRET` on every instance to enable sealed token cookies across all pods.

---

## 🛣️ Route protection

The module integrates with Nuxt route rules to control authentication behavior.

This also applies to static assets such as images or files.

Route rules are enforced on the initial SSR request and on client-side SPA navigation. During client-side navigation, the module checks whether the target route is protected and verifies the current session through the server-side session endpoint.

If a client-side navigation targets a protected route after the session expired, the requested route is sent to the session endpoint as a short-lived server-side redirect target. After the Keycloak login completes, the user is redirected back to the originally requested route, including query parameters and hash fragments.

The browser never receives access or refresh tokens. The client route guard only receives an authenticated/unauthenticated session result from:

```text
GET /api/_oidc/session
```

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

## 👤 Client session state

Use `useKeycloakAuth` in pages, layouts, components, stores, or composables when the client UI needs to know the current session state.

```vue
<script setup lang="ts">
const { status, user, login, logout, refresh } = useKeycloakAuth()
</script>

<template>
  <button v-if="status === 'unauthenticated'" @click="login">
    Login
  </button>

  <div v-else-if="status === 'authenticated'">
    <span>{{ user?.preferred_username ?? user?.email }}</span>
    <button @click="logout">Logout</button>
  </div>
</template>
```

The composable is backed by:

```text
GET /api/_oidc/session
```

The session endpoint validates the current HttpOnly token cookies on the server and refreshes the session when possible. It returns only safe user fields and never returns access or refresh tokens to client-side JavaScript.

Returned user fields:

- `sub`
- `email`
- `email_verified`
- `name`
- `preferred_username`
- `given_name`
- `family_name`

Application-specific roles, groups, permissions, or custom claims should be normalized server-side through the `keycloak:auth:context` hook and exposed through an application-owned endpoint when needed.

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

## 🚢 Release

Releases are created by the release workflow after CI succeeds on `main`.

The workflow uses semantic-release to determine the next version, generate the changelog, and create the release tag. If a new version is created, the same workflow publishes the package to npm.

The npm publish job runs linting, formatting checks, tests, and the package build before publishing. It uses the semantic-release version as the npm package version and publishes via npm Trusted Publishing.


---

## 📄 License

MIT
