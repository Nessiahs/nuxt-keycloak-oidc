import { defineBuildConfig } from 'unbuild'
import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const routeRuleTypes = `

declare module 'nitropack/types' {
  interface NitroRouteConfig {
    keycloak?: boolean
  }

  interface NitroRouteRules {
    keycloak?: boolean
  }
}

declare module 'nitropack' {
  interface NitroRouteConfig {
    keycloak?: boolean
  }

  interface NitroRouteRules {
    keycloak?: boolean
  }
}
`

export default defineBuildConfig({
  entries: ['src/module'],
  declaration: false,
  hooks: {
    async 'build:done'() {
      const typesFile = resolve('dist/types.d.mts')
      const types = await readFile(typesFile, 'utf8')

      if (!types.includes("interface NitroRouteConfig")) {
        await appendFile(typesFile, routeRuleTypes)
      }
    },
  },
})
