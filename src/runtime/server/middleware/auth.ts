import { attachAuthContext } from '../../utils/attachAuthContext'
import { useRuntimeConfig } from '#app'
import { getRequestURL, defineEventHandler, createError } from 'h3'
import type { ResolvedModuleOptions } from '../../../types'
import { resolveAuthAction } from '../../utils/resolveAuthAction'
import { resolveTokenState } from '../../utils/resolveTokenState'
import { handleRefreshFlow } from '../../utils/handleRefreshFlow'
import { attachKeycloakHook } from '../../utils/attachKeycloakHook'
import { handleUnauthorized } from '../../utils/handleUnauthorized'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  if (url.pathname.startsWith('/api/_oidc/')) {
    return
  }

  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  const rules = event.context.routeRules || {}

  const check = resolveAuthAction({
    rules,
    mode: config.mode,
    accept: event.node.req.headers['accept'],
  })

  switch (check.action) {
    case 'allow':
      return
    case 'unauthorized':
      throw createError({ statusCode: 401 })
  }

  attachKeycloakHook(event)

  const { hasAccess, hasRefresh, accessPayload } = await resolveTokenState(event)

  if (!hasAccess || !accessPayload?.exp) {
    return handleUnauthorized(event, check.isHtmlRequest)
  }

  const expiresAt = accessPayload.exp * 1000
  const isExpiringSoon = expiresAt - Date.now() < 30_000

  if (!isExpiringSoon) {
    await attachAuthContext(event, accessPayload)
    return
  }

  if (hasRefresh) {
    const success = await handleRefreshFlow(event, check.isHtmlRequest)

    if (success) return

    return handleUnauthorized(event, check.isHtmlRequest)
  }

  return handleUnauthorized(event, check.isHtmlRequest)
})
