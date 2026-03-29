import { vi } from 'vitest'
import { createRuntimeConfig } from './utils/runtimeConfig'

const runtimeConfigMock = createRuntimeConfig()

// 🔥 global mock für Nuxt server runtime
vi.mock('#imports', () => ({
  useRuntimeConfig: () => runtimeConfigMock,
}))

export { runtimeConfigMock }
