# nuxt-keycloak-oidc

[![npm
version](https://img.shields.io/npm/v/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![npm
downloads](https://img.shields.io/npm/dm/nuxt-keycloak-oidc)](https://www.npmjs.com/package/nuxt-keycloak-oidc)
[![license](https://img.shields.io/npm/l/nuxt-keycloak-oidc)](./LICENSE)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/bad231b7991d4968a11f847fe50f88f5)](https://app.codacy.com/gh/Nessiahs/nuxt-keycloak-oidc/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![Snyk Security](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc/badge.svg)](https://snyk.io/test/github/Nessiahs/nuxt-keycloak-oidc)

Opinionated Keycloak integration for Nuxt with full SSR support.

Built for simplicity: configure once, and authentication just works across SSR and client navigation.
> SSR-first Keycloak authentication for Nuxt. No custom middleware required.

------------------------------------------------------------------------

## ✨ Features

-   🔐 Keycloak authentication via OpenID Connect (OIDC)
-   ⚡ SSR-first design (works seamlessly with server-side rendering)
-   🔄 Automatic Keycloak configuration discovery
-   🧩 Global middleware integration (Nuxt-native)
-   🛠️ Built-in debug support for development
-   🎯 No need to write your own authentication middleware

------------------------------------------------------------------------

## 📦 Installation

``` bash
npm install nuxt-keycloak-oidc
```

Add the module to your Nuxt config:

``` ts
export default defineNuxtConfig({
  modules: ['nuxt-keycloak-oidc']
})
```

------------------------------------------------------------------------

## ⚙️ Configuration

Configure your Keycloak instance in `nuxt.config.ts`:

``` ts
export default defineNuxtConfig({
  keycloak: {
    url: 'https://your-keycloak-instance',
    realm: 'your-realm',
    clientId: 'your-client-id'
  }
})
```

The module will automatically handle discovery and setup based on your
Keycloak configuration.

------------------------------------------------------------------------

## 🚀 How it works

This module integrates directly into Nuxt using a **global middleware
approach**.

-   Authentication is handled automatically on request
-   No manual middleware setup required
-   Works consistently across SSR and client navigation

The goal is to stay aligned with the Nuxt way of doing things: ➡️
configuration over custom middleware

------------------------------------------------------------------------

## 🔁 Middleware

The module uses a global middleware internally.

This means:

-   every request can be authenticated
-   behavior is consistent across pages
-   no need to manually register or attach middleware

You still retain control through your Nuxt configuration and routing
setup.

------------------------------------------------------------------------

## 🛠️ Debugging

The module provides helpful debug output during development.

This helps you understand:

-   authentication flow
-   token handling
-   redirects and SSR behavior

👉 Ideal for development and troubleshooting Keycloak setups.

------------------------------------------------------------------------

## 🎯 Why this module?

Most OIDC libraries are generic and try to support every provider.

This module is different:

-   built specifically for Keycloak
-   optimized for Nuxt SSR
-   minimal setup required
-   no abstraction overload

------------------------------------------------------------------------

## 🧪 Playground

A working example is available in the `/playground` directory.

``` bash
npm run dev
```

------------------------------------------------------------------------

## 📄 License

MIT
